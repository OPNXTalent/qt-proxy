// api/followups.js
// Save and retrieve follow-up queries for a thread

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userEmail = req.headers['x-user-email'] || null;
  if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

  // Look up subscriber
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id&limit=1`,
    { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
  );
  const subs = await subRes.json();
  if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });
  const userId = subs[0].id;

  // ── GET — fetch follow-ups for a thread ──────────────────────────────────
  if (req.method === 'GET') {
    const threadId = req.query?.threadId || null;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    const fuRes = await fetch(
      `${SUPABASE_URL}/rest/v1/follow_ups?thread_id=eq.${threadId}&user_id=eq.${userId}&order=created_at.asc`,
      { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const followUps = await fuRes.json();
    return res.status(200).json({ followUps: followUps || [] });
  }

  // ── POST — save a follow-up ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const { threadId, question, response } = req.body || {};
    if (!threadId || !question) return res.status(400).json({ error: 'threadId and question required' });

    // Verify thread ownership
    const threadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${userId}&select=id&limit=1`,
      { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const threads = await threadRes.json();
    if (!threads?.length) return res.status(403).json({ error: 'Thread not found or not owned by user' });

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/follow_ups`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({
        thread_id:    threadId,
        user_id:      userId,
        query:        question,
        response:     { text: response || '' },
        submitted_in: 'solo'
      })
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('followup insert failed:', err);
      return res.status(500).json({ error: 'Failed to save follow-up' });
    }

    const saved = await insertRes.json();
    return res.status(200).json({ success: true, id: saved?.[0]?.id });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
