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

  // Branch on action: ?action=register runs registration, otherwise redeem.
  const action = (req.query?.action || '').toLowerCase();

  if (action === 'register') {
    return handleRegister(req, res);
  }
  return handleRedeem(req, res);
}

/* ─────────────────────────────────────────────────────────────
   REGISTER  —  POST /api/redeem?action=register
   Body: { email, display_name, tier, status }
   ───────────────────────────────────────────────────────────── */
async function handleRegister(req, res) {
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

  // Check display_name uniqueness
  try {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?display_name=eq.${encodeURIComponent(display_name)}&select=id&limit=1`,
      {
        headers: {
          'apikey':        SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
        }
      }
    );
    const existing = await checkRes.json();
    if (existing?.length > 0) {
      return res.status(409).json({ error: 'Display name already taken' });
    }
  } catch (err) {
    console.error('display_name uniqueness check error:', err.message);
    return res.status(500).json({ error: 'Server error during name check' });
  }

  try {
    // Service role key bypasses RLS — safe for server-side inserts only.
    // on_conflict=email merges on the email unique constraint so re-registration
    // updates the existing row instead of throwing a duplicate-key 500.
    const supaRes = await fetch(`${SUPABASE_URL}/rest/v1/subscribers?on_conflict=email`, {
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

/* ─────────────────────────────────────────────────────────────
   REDEEM  —  POST /api/redeem
   Body: { code, email }
   ───────────────────────────────────────────────────────────── */
async function handleRedeem(req, res) {
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

    // Send confirmation email via Resend
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'noreply@quantumtheology.app',
          to: email,
          subject: 'Your QT Prism Access is Active',
          html: `
        <div style="background:#06060a; color:#d8d4e8; font-family:Georgia,serif; max-width:600px; margin:0 auto; padding:48px 40px;">
          <div style="text-align:center; margin-bottom:32px;">
            <div style="font-family:serif; font-size:28px; color:#e8d5a0; letter-spacing:0.08em;">Quantum Theology</div>
            <div style="font-size:14px; color:#7a6230; letter-spacing:0.2em; text-transform:uppercase; margin-top:4px;">Echad b'Emet</div>
          </div>
          <div style="border-top:1px solid #2a2a40; margin-bottom:32px;"></div>
          <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">Your 30-day access to the Quantum Theology Prism is now active.</p>
          <p style="font-size:16px; line-height:1.8; color:#7a7890;">The Prism applies the QT framework to Scripture — relational ontology, Hebrew linguistic architecture, and the conceptual language of quantum mechanics as structural analogy.</p>
          <div style="text-align:center; margin:40px 0;">
            <a href="https://quantumtheology.app/qt.html" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Enter the Prism →</a>
          </div>
          <div style="border-top:1px solid #2a2a40; margin-top:32px; padding-top:24px;">
            <p style="font-size:13px; color:#3a384a; text-align:center;">Your access expires in 30 days. Questions? <a href="mailto:support@quantumtheology.app" style="color:#7a6230;">support@quantumtheology.app</a></p>
          </div>
        </div>
      `
        })
      });
    } catch (emailErr) {
      console.error('Email send failed:', emailErr.message);
    }

    return res.status(200).json({ success: true, expires_at: expiresAt.toISOString() });

  } catch (err) {
    console.error('Redeem error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}
