// api/threads.js
// Drop into C:\Users\khogg\qt-proxy\api\

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const TIER_RETENTION = {
  scholar:    90,
  theologian: 180,
  companion:  365,
  free:       1,
  trial:      7
};

function headers() {
  return {
    'apikey':        SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type':  'application/json'
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const email = body?.email || req.query?.email;

  if (!email) return res.status(400).json({ error: 'Email required' });

  // ── GET — load all threads for user ──
  if (req.method === 'GET') {
    try {
      // Get subscriber tier for retention calculation
      const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}&select=tier&limit=1`,
        { headers: headers() }
      );
      const subData = await subRes.json();
      const tier = subData?.[0]?.tier || 'free';
      const retentionDays = TIER_RETENTION[tier] || 1;

      // Fetch threads within retention window
      const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();
      const threadsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/threads?email=eq.${encodeURIComponent(email)}&created_at=gte.${cutoff}&order=created_at.desc&limit=100`,
        { headers: headers() }
      );
      const threads = await threadsRes.json();
      return res.status(200).json({ threads: threads || [], tier, retentionDays });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST — save new thread ──
  if (req.method === 'POST') {
    const { id, query, query_type, response, follow_ups, title, tier } = body;
    if (!id || !query) return res.status(400).json({ error: 'id and query required' });

    const retentionDays = TIER_RETENTION[tier] || 90;

    try {
      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/threads`, {
        method: 'POST',
        headers: { ...headers(), 'Prefer': 'resolution=merge-duplicates' },
        body: JSON.stringify({
          id,
          email,
          query,
          query_type: query_type || 'verse',
          response:   response || null,
          follow_ups: follow_ups || [],
          title:      title || null,
          tier:       tier || 'scholar',
          retention_days: retentionDays,
          updated_at: new Date().toISOString()
        })
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        return res.status(500).json({ error: errText });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH — update thread title or follow-ups ──
  if (req.method === 'PATCH') {
    const { id, title, follow_ups, response } = body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const updates = { updated_at: new Date().toISOString() };
    if (title      !== undefined) updates.title      = title;
    if (follow_ups !== undefined) updates.follow_ups = follow_ups;
    if (response   !== undefined) updates.response   = response;

    try {
      const patchRes = await fetch(
        `${SUPABASE_URL}/rest/v1/threads?id=eq.${encodeURIComponent(id)}&email=eq.${encodeURIComponent(email)}`,
        {
          method:  'PATCH',
          headers: { ...headers(), 'Prefer': 'return=minimal' },
          body:    JSON.stringify(updates)
        }
      );
      if (!patchRes.ok) {
        const errText = await patchRes.text();
        return res.status(500).json({ error: errText });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE — remove a thread ──
  if (req.method === 'DELETE') {
    const { id } = body;
    if (!id) return res.status(400).json({ error: 'id required' });

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/threads?id=eq.${encodeURIComponent(id)}&email=eq.${encodeURIComponent(email)}`,
        { method: 'DELETE', headers: headers() }
      );
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
