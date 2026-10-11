import { verifySupabaseIdentity, admitPrismAiRequest } from '../lib/server-auth.js';
import { getOrIssueGuestIdentity, guestCookieHeader } from '../lib/guest-identity.js';
import financeHandler from '../lib/finance-handler.js';
import clientConfigHandler from '../lib/client-config-handler.js';
// api/transcribe.js
// Receives a base64-encoded audio clip from the browser (recorded via
// MediaRecorder), forwards it to OpenAI's transcription endpoint, and
// returns the plain text transcript.
//
// Uses gpt-4o-mini-transcribe — current OpenAI pricing (mid-2026) puts this
// at roughly $0.003/minute, about half the cost of gpt-4o-transcribe, with
// accuracy that's more than sufficient for short dictated queries. Swap the
// MODEL constant below to 'gpt-4o-transcribe' if accuracy on harder audio
// (background noise, accents) turns out to matter more than cost.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb', // a few minutes of compressed voice audio, generous headroom
    },
  },
};

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODEL = 'gpt-4o-mini-transcribe';

export default async function handler(req, res) {
  if (req.query?.prism_client_config === '1') return clientConfigHandler(req,res);
  if (req.query?.prism_owner_finance === '1') return financeHandler(req,res);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Verify signed-in callers; preserve voice input for genuine guest sessions.
  const auth = await verifySupabaseIdentity({
    authorizationHeader: req.headers.authorization,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY
  });
  if (auth.provided && !auth.identity) return res.status(auth.unavailable ? 503 : 401).json({error:'Authentication required'});
  let principal;
  try {
    if (auth.identity) principal = 'user:'+auth.identity.userId;
    else {
      const guest = await getOrIssueGuestIdentity({
        cookieHeader:req.headers.cookie,
        supabaseUrl:process.env.SUPABASE_URL,
        serviceRoleKey:process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      if (guest.issued) res.setHeader('Set-Cookie',guestCookieHeader(guest.credential));
      principal = 'guest:'+guest.guestId;
    }
  } catch {
    return res.status(503).json({error:'Voice verification temporarily unavailable'});
  }
  let admission;
  try {
    admission = await admitPrismAiRequest({req,route:'voice',principal,maxPerMinute:8,maxParallel:2,leaseSeconds:120});
  } catch (err) {
    console.error('[transcribe] admission failed',err.message);
    return res.status(503).json({error:'Voice security check temporarily unavailable'});
  }
  if (!admission.allowed) return res.status(admission.status).json({error:admission.reason});
  res.once('finish',admission.release);
  res.once('close',admission.release);

  if (!OPENAI_API_KEY) {
    console.error('[transcribe] OPENAI_API_KEY is not set');
    return res.status(500).json({ error: 'Transcription is not configured' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  const { audio, mimeType } = body || {};
  if (!audio) return res.status(400).json({ error: 'Missing audio data' });

  try {
    const buffer = Buffer.from(audio, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ error: 'Empty audio data' });
    }

    const blob = new Blob([buffer], { type: mimeType || 'audio/webm' });
    const form = new FormData();
    form.append('file', blob, 'audio.webm');
    form.append('model', MODEL);

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: form
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text().catch(() => '(no body)');
      console.error(`[transcribe] OpenAI error — status ${openaiRes.status}: ${errText}`);
      return res.status(502).json({ error: 'Transcription failed' });
    }

    const data = await openaiRes.json();
    return res.status(200).json({ text: (data.text || '').trim() });

  } catch (err) {
    console.error('[transcribe] error:', err.message);
    return res.status(500).json({ error: 'Server error' });
  }
}
