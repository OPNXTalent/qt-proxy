export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

const QT_SYSTEM_PROMPT = `You are the QT Prism — the interactive application of Quantum Theology as established in the manuscript Quantum Theology: Echad b'Emet. You speak from within the framework, not about it. You are not a survey of Christian thought. You are not a defense attorney for God. You refract — making visible the Hebrew wavelengths Scripture was always carrying that the Greek philosophical lens collapsed into an undifferentiated beam.

IDENTITY: You speak as the framework under all pressure. You do not default to standard Western apologetic tradition, Reformed/Arminian/Catholic systematic theology, Greek philosophical categories, free will defense, greater good arguments, or passive theological language designed to protect inherited categories.

HEBREW LEXICAL PRECISION — non-negotiable:
- Tov (\u05D8\u05D5\u05B9\u05D1): Relational coherence toward purpose. Never moral goodness in the Greek sense.
- Ra (\u05E8\u05B8\u05E2): Calamity, disorder, decoherence. Never an independent ontology or rival kingdom. Isaiah 45:7 uses active verbs — read them.
- Echad (\u05D0\u05B6\u05D7\u05B8\u05D3): Covenantal compound oneness. Never numerical singularity.
- Shamayim (\u05E9\u05B8\u05C1\u05DE\u05B7\u05D9\u05B4\u05DD): Not heaven (singular). Explicitly plural — layered nested dimensions. Canonical Scripture identifies three registers: visible sky, celestial/angelic realm (Daniel 10, Ephesians 6:12), divine throne-room (Isaiah 6, Revelation 4-5). Never collapse these.
- Davar (\u05D3\u05B8\u05BC\u05D1\u05B8\u05E8): Word as constitutive speech-act. Not label or description.
- Yada (\u05D9\u05B8\u05D3\u05B7\u05E2): Intimate participatory knowing within relationship. Not detached observation.
- Olam (\u05E2\u05D5\u05B9\u05DC\u05B8\u05DD): Age, realm, hidden dimension. Not Greek timeless eternity.

OBSERVER FRAME ASYMMETRY: From within Olam HaZeh — temporal, sequential — creaturely agency is genuine and choices are real. From Olam HaBa — God's eternal present-state simultaneity — every outcome is known not as prediction but as eternally present fact. These frames do not contradict because determinism requires temporal causation flowing forward, a constraint that does not apply to an observer outside the temporal manifold. When foreknowledge and freedom are pressed as contradictory: deploy this asymmetry. Do not call it mystery. Name the frames.

ANGELIC EXISTENCE: Angels and non-human intelligences operate within the interpenetration zone — the celestial register of shamayim that overlaps with Olam HaZeh but is not bound by it. Not confined to sequential time. Not in God's eternal present-state simultaneity. When questions involve angelic existence, draw from canonical Scripture first (Daniel 10, Ezekiel 1, Isaiah 6, Job 1-2, Genesis 6, Jude 6, 2 Peter 2:4). Second Temple texts including 1 Enoch may corroborate — they were authoritative in the temple epoch Jesus inhabited and 1 Enoch is quoted in canonical Scripture (Jude 14-15) — but always distinguish canonical from non-canonical sources explicitly.

THEODICY PRESSURE: Do not defend. When a question charges God with authoring evil or asks how a good God allows suffering — interrogate the premise. The charge presupposes a moral standard independent of and superior to God. By whose framework is the verdict rendered? From what frame? If God is Echad — the relational ground of all being — the category evil only has meaning within the relational structure God authored. The Job precedent: God does not answer from within the creature's courtroom. He dismantles the courtroom from the whirlwind.

SECOND THRONE: Name functional dualism directly when it appears. Attributing blessing to God and suffering to Satan is not monotheism — it is functional dualism wearing monotheism's clothes. Job 1:21 and Isaiah 45:7 do not build a second throne. Neither do you.

LANGUAGE DISCIPLINE: Use active verbs when describing divine action. Never use: God allows, God permits, God lets — when the text uses active construction. Never soften a text to protect a category. Never close with: we must hold this in tension, it is a mystery, we cannot fully understand.`; 

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const QUERY_LIMIT = 3;
const WINDOW_HOURS = 24;

// Tier query limits per month (approximate daily = monthly/30)
const TIER_LIMITS = {
  scholar: 150,
  theologian: 350,
  companion: 500,
};

// ── CRISIS DETECTION ──────────────────────────────────────────────────────────
// Checked against the user's raw input before any Anthropic API call.
// Phrases are lower-cased and matched as substrings so variations surface naturally.
const CRISIS_SIGNALS = [
  'want to die', 'want to kill myself', 'kill myself', 'end my life',
  'ending my life', 'take my life', 'taking my life', 'suicide', 'suicidal',
  'no reason to live', 'not worth living', 'life is not worth', 'rather be dead',
  'better off dead', 'better off without me', "don't want to be here",
  "don't want to be alive", 'hurt myself', 'harm myself', 'self-harm',
  'cut myself', 'cutting myself', 'overdose', 'od myself',
  'i give up', "can't go on", 'cannot go on', 'no way out',
];

function detectCrisis(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return CRISIS_SIGNALS.some(signal => lower.includes(signal));
}

async function getSubscriber(email) {
  if (!email) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await res.json();
  return data?.[0] || null;
}
async function getCodeRedemption(email) {
  if (!email) return null;
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/code_redemptions?email=eq.${encodeURIComponent(email)}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await res.json();
  if (!data || data.length === 0) return null;
  const redemption = data[0];
  const expires = new Date(redemption.access_expires_at);
  if (expires > new Date()) return redemption;
  return null;
}
async function getQueryLog(ip) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/query_log?ip_address=eq.${encodeURIComponent(ip)}&limit=1`,
    {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  const data = await res.json();
  return data?.[0] || null;
}

async function insertQueryLog(ip) {
  await fetch(`${SUPABASE_URL}/rest/v1/query_log`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ ip_address: ip, query_count: 1, first_query_at: new Date().toISOString() })
  });
}

async function incrementQueryLog(ip, currentCount) {
  await fetch(`${SUPABASE_URL}/rest/v1/query_log?ip_address=eq.${encodeURIComponent(ip)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query_count: currentCount + 1 })
  });
}

async function resetQueryLog(ip) {
  await fetch(`${SUPABASE_URL}/rest/v1/query_log?ip_address=eq.${encodeURIComponent(ip)}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ query_count: 1, first_query_at: new Date().toISOString() })
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET /api/interpret — preflight status check ───────────────────────────
  // Called on page load to pre-render lock state before a query is attempted.
  // Authenticated users (email param present and active) are always unlocked.
  if (req.method === 'GET') {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const { email } = req.query || {};

    // Authenticated user — always unlocked, no rate limit applies
    if (email) {
      try {
        const subscriber = await getSubscriber(email);
        const redemption = await getCodeRedemption(email);
        if ((subscriber && subscriber.status === 'active') || redemption) {
          return res.status(200).json({ locked: false });
        }
      } catch {}
    }

    // Anonymous — check IP log
    try {
      const log = await getQueryLog(ip);
      if (log) {
        const firstQuery = new Date(log.first_query_at);
        const hoursSinceFirst = (Date.now() - firstQuery.getTime()) / (1000 * 60 * 60);
        if (hoursSinceFirst < WINDOW_HOURS && log.query_count >= QUERY_LIMIT) {
          const hoursRemaining = WINDOW_HOURS - hoursSinceFirst; // float — send precise value for ticker
          return res.status(200).json({
            locked: true,
            hoursRemaining: Math.ceil(hoursRemaining),   // rounded for display text
            secondsRemaining: Math.floor(hoursRemaining * 3600), // precise for live ticker
            queriesUsed: log.query_count
          });
        }
      }
    } catch {}

    return res.status(200).json({ locked: false });
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';

  // Parse body first so we can check email and run crisis detection
  let prompt, messages, userEmail;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    prompt = body?.prompt;
    messages = body?.messages;
    userEmail = body?.email || null;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // ── CRISIS DETECTION — runs before any auth or rate-limit check ──────────────
  // Extract the last user-role message text for analysis
  const lastUserText = (() => {
    if (messages && messages.length > 0) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          const c = messages[i].content;
          return typeof c === 'string' ? c : (Array.isArray(c) ? c.map(b => b.text || '').join(' ') : '');
        }
      }
    }
    return prompt || '';
  })();

  if (detectCrisis(lastUserText)) {
    return res.status(200).json({ crisis: true });
  }

  // Check if subscriber
  try {
    if (userEmail) {
      const subscriber = await getSubscriber(userEmail);
      const redemption = await getCodeRedemption(userEmail);
      if ((subscriber && subscriber.status === 'active') || redemption) {
  // Active subscriber or valid code — skip rate limit, go straight to API
  const apiMessages = messages || (prompt ? [{ role: 'user', content: prompt }] : null);
  if (!apiMessages || apiMessages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }
  const tier = subscriber?.tier || 'trial';

  // Stream the response
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-QT-Tier', tier);
  res.setHeader('X-QT-Subscriber', 'true');

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      stream: true,
      system: QT_SYSTEM_PROMPT,
      messages: apiMessages
    })
  });

  if (!anthropicRes.ok) {
    const errText = await anthropicRes.text();
    res.write(`data: ${JSON.stringify({ type: 'error', error: errText })}\n\n`);
    return res.end();
  }

  const reader = anthropicRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            res.write(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`);
          } else if (parsed.type === 'message_stop') {
            res.write(`data: ${JSON.stringify({ type: 'done', tier })}\n\n`);
          }
        } catch {}
      }
    }
  }
  return res.end();
}
    }
  } catch (err) {
    console.error('Subscriber check failed:', err.message);
  }

  // Not a subscriber — apply IP rate limit
  try {
    const log = await getQueryLog(ip);
    if (log) {
      const firstQuery = new Date(log.first_query_at);
      const hoursSinceFirst = (Date.now() - firstQuery.getTime()) / (1000 * 60 * 60);
      if (hoursSinceFirst >= WINDOW_HOURS) {
        await resetQueryLog(ip);
      } else if (log.query_count >= QUERY_LIMIT) {
        const hoursRemaining = Math.ceil(WINDOW_HOURS - hoursSinceFirst);
        return res.status(429).json({
          error: 'Query limit reached',
          message: `You've used all ${QUERY_LIMIT} free queries. Access resets in ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}.`,
          hoursRemaining
        });
      } else {
        await incrementQueryLog(ip, log.query_count);
      }
    } else {
      await insertQueryLog(ip);
    }
  } catch (err) {
    console.error('Rate limit check failed:', err.message);
  }

  const apiMessages = messages || (prompt ? [{ role: 'user', content: prompt }] : null);
  if (!apiMessages || apiMessages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  try {
    // Stream for free tier too
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-QT-Tier', 'free');
    res.setHeader('X-QT-Subscriber', 'false');

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 3000,
        stream: true,
        system: QT_SYSTEM_PROMPT,
        messages: apiMessages
      })
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      res.write(`data: ${JSON.stringify({ type: 'error', error: errText })}\n\n`);
      return res.end();
    }

    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              res.write(`data: ${JSON.stringify({ type: 'delta', text: parsed.delta.text })}\n\n`);
            } else if (parsed.type === 'message_stop') {
              res.write(`data: ${JSON.stringify({ type: 'done', tier: 'free' })}\n\n`);
            }
          } catch {}
        }
      }
    }
    return res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    return res.end();
  }
}
