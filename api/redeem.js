export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let code, email;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    code = body?.code?.trim().toUpperCase();
    email = body?.email?.trim().toLowerCase();
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  if (!code || !email) {
    return res.status(400).json({ success: false, message: 'Code and email are required' });
  }

  try {
    // Check if already redeemed by this email
    const redemptionCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/code_redemptions?email=eq.${encodeURIComponent(email)}&code=eq.${encodeURIComponent(code)}&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const existing = await redemptionCheck.json();
    if (existing?.length > 0) {
      const expiry = new Date(existing[0].access_expires_at);
      if (expiry > new Date()) {
        return res.status(200).json({ success: true, message: 'Code already active', expires_at: existing[0].access_expires_at });
      }
    }

    // Validate code and check redemption limit
    const codeCheck = await fetch(
      `${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(code)}&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const codes = await codeCheck.json();

    if (!codes || codes.length === 0) {
      return res.status(200).json({ success: false, message: 'INVALID CODE' });
    }

    const accessCode = codes[0];
    if (accessCode.redemption_count >= accessCode.max_redemptions) {
      return res.status(200).json({ success: false, message: 'CODE LIMIT REACHED' });
    }

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert redemption record
    await fetch(`${SUPABASE_URL}/rest/v1/code_redemptions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        code,
        email,
        access_expires_at: expiresAt.toISOString()
      })
    });

    // Increment redemption count
    await fetch(
      `${SUPABASE_URL}/rest/v1/access_codes?code=eq.${encodeURIComponent(code)}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ redemption_count: accessCode.redemption_count + 1 })
      }
    );

    return res.status(200).json({ success: true, expires_at: expiresAt.toISOString() });

  } catch (err) {
    console.error('Redeem error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
