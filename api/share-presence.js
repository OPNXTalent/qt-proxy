// api/share-presence.js
// Two operations:
// POST — recipient heartbeat: updates last_viewed_at on the share record
//         First heartbeat also triggers referral credit for the sender (once only)
// GET  — sender polls: returns { active: bool } based on last_viewed_at freshness

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY    = process.env.SUPABASE_ANON_KEY;

// A share is considered "active" if last_viewed_at is within this many seconds
const PRESENCE_WINDOW_SECONDS = 60;

function headers(service = false) {
  const key = service ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://theprism.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  // ── GET — sender polls for presence ────────────────────────────────────────
  if (req.method === 'GET') {
    const token = req.query?.token;
    if (!token) return res.status(400).json({ error: 'token required' });

    const fetchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/shares?token=eq.${encodeURIComponent(token)}&select=last_viewed_at&limit=1`,
      { headers: headers(true) }
    );

    if (!fetchRes.ok) return res.status(500).json({ error: 'fetch failed' });

    const rows = await fetchRes.json();
    if (!rows?.length) return res.status(404).json({ active: false });

    const lastViewed = rows[0].last_viewed_at;
    if (!lastViewed) return res.status(200).json({ active: false });

    const secondsAgo = (Date.now() - new Date(lastViewed).getTime()) / 1000;
    return res.status(200).json({ active: secondsAgo <= PRESENCE_WINDOW_SECONDS });
  }

  // ── POST — recipient heartbeat ──────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { token } = body || {};
    if (!token) return res.status(400).json({ error: 'token required' });

    // Fetch current share record — need sender_email and referral_credited
    const fetchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/shares?token=eq.${encodeURIComponent(token)}&select=id,sender_email,referral_credited&limit=1`,
      { headers: headers(true) }
    );

    if (!fetchRes.ok) return res.status(500).json({ error: 'fetch failed' });
    const rows = await fetchRes.json();
    if (!rows?.length) return res.status(404).json({ error: 'share not found' });

    const share = rows[0];

    // Update last_viewed_at
    await fetch(
      `${SUPABASE_URL}/rest/v1/shares?id=eq.${encodeURIComponent(share.id)}`,
      {
        method: 'PATCH',
        headers: { ...headers(true), 'Prefer': 'return=minimal' },
        body: JSON.stringify({ last_viewed_at: new Date().toISOString() })
      }
    );

    // First heartbeat — credit the sender once
    if (!share.referral_credited && share.sender_email) {
      try {
        // Call credit_referral_query RPC
        const creditRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/credit_referral_query`, {
          method: 'POST',
          headers: headers(true),
          body: JSON.stringify({ p_email: share.sender_email })
        });

        if (creditRes.ok) {
          // Mark as credited so it only fires once
          await fetch(
            `${SUPABASE_URL}/rest/v1/shares?id=eq.${encodeURIComponent(share.id)}`,
            {
              method: 'PATCH',
              headers: { ...headers(true), 'Prefer': 'return=minimal' },
              body: JSON.stringify({ referral_credited: true })
            }
          );
        }
      } catch (err) {
        console.error('Referral credit failed:', err.message);
        // Non-fatal — heartbeat still succeeds
      }
    }

    return res.status(200).json({ ok: true, credited: !share.referral_credited && !!share.sender_email });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
