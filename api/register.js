export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let email, display_name, tier, status;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    email        = body?.email?.trim().toLowerCase();
    display_name = body?.display_name?.trim();
    tier         = body?.tier   || 'free';
    status       = body?.status || 'active';
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  // Basic email format guard
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // Validate display_name
  if (!display_name || display_name.length < 3 || display_name.length > 30) {
    return res.status(400).json({ error: 'Display name must be 3–30 characters' });
  }
  if (!/^[a-zA-Z0-9_.\- ]{3,30}$/.test(display_name)) {
    return res.status(400).json({ error: 'Display name contains invalid characters' });
  }

  // Whitelist allowed tiers — callers cannot self-promote to paid tiers
  const ALLOWED_TIERS = ['free', 'trial'];
  if (!ALLOWED_TIERS.includes(tier)) {
    return res.status(403).json({ error: 'Invalid tier' });
  }

  try {
    // Service role key bypasses RLS — safe for server-side inserts only
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
      method: 'POST',
      headers: {
        'apikey':        SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=representation'
      },
      body: JSON.stringify({ email, display_name, tier, status })
    });

    if (!supaRes.ok) {
      const errText = await supaRes.text();
      console.error('Supabase insert failed:', errText);
      return res.status(500).json({ error: 'Subscriber insert failed', detail: errText });
    }

    const inserted = await supaRes.json();
    return res.status(200).json({ success: true, subscriber: inserted?.[0] || null });

  } catch (err) {
    console.error('api/register error:', err.message);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
}
