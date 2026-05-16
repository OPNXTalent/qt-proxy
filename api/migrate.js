// api/migrate.js
// One-time localStorage thread migration to Supabase
// Called by qt.html on first authenticated load

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const userEmail = req.headers['x-user-email'] || null;
  if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Look up subscriber
    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id&limit=1`,
      { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const subs = await subRes.json();
    if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });
    const userId = subs[0].id;

    // Call the migrate_local_threads RPC
    const { threads } = req.body || {};
    if (!threads || !Array.isArray(threads)) {
      return res.status(400).json({ error: 'threads array required' });
    }

    const rpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/migrate_local_threads`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        p_user_id:     userId,
        p_device_hint: 'qt.html localStorage migration',
        p_threads:     threads
      })
    });

    const result = await rpcRes.json();
    return res.status(200).json(result);
  } catch (err) {
    console.error('migrate error:', err.message);
    return res.status(500).json({ error: 'Migration failed' });
  }
}
