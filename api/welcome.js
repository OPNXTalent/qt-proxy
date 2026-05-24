// api/welcome.js
// Sends a welcome email to new free account registrants via Resend.
// Called after submitFreeAccount() in qt.html.
// Also deposits 3 bonus queries into the subscriber's account.

const RESEND_API_KEY        = process.env.RESEND_API_KEY;
const SUPABASE_URL           = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders() {
  return {
    'apikey':        SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type':  'application/json'
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { email } = body || {};
  if (!email) return res.status(400).json({ error: 'Email required' });

  // 1. Credit 3 bonus queries
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: { ...sbHeaders(), 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        purchased_credits: 3
      })
    });
  } catch(err) {
    console.error('Credit error:', err.message);
  }

  // 2. Send welcome email via Resend
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email');
    return res.status(200).json({ success: true, email_sent: false });
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to The Prism</title>
</head>
<body style="margin:0;padding:0;background:#0d0d14;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d14;padding:48px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#0d0d14;border:1px solid #2a2a40;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding:40px 48px 24px;border-bottom:1px solid rgba(201,168,76,0.2);text-align:center;">
              <div style="font-family:'Arial',sans-serif;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#7a6830;margin-bottom:8px;">OPNX LLC</div>
              <div style="font-size:28px;letter-spacing:0.15em;color:#c9a84c;font-family:'Arial',sans-serif;font-weight:bold;">THE PRISM</div>
              <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#7a7890;margin-top:4px;font-family:'Arial',sans-serif;">Echad b'Emet</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px;">
              <p style="font-family:'Georgia',serif;font-style:italic;font-size:20px;color:#d8d4ea;line-height:1.6;margin:0 0 24px;">
                Welcome. You have brought a question — and the Prism is ready to work.
              </p>
              <p style="font-family:'Arial',sans-serif;font-size:15px;color:#9090a8;line-height:1.8;margin:0 0 20px;">
                Your free account is active. Three queries every 24 hours, your session history saved for 30 days, and the full Prism framework available whenever you return.
              </p>

              <!-- Bonus queries -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid rgba(201,168,76,0.25);background:rgba(201,168,76,0.04);margin:24px 0;">
                <tr>
                  <td style="padding:20px 24px;">
                    <div style="font-family:'Arial',sans-serif;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;color:#c9a84c;margin-bottom:6px;">A GIFT FROM THE PRISM</div>
                    <div style="font-family:'Arial',sans-serif;font-size:17px;color:#e8d5a0;margin-bottom:6px;">3 bonus queries have been deposited into your account.</div>
                    <div style="font-family:'Arial',sans-serif;font-size:13px;color:#7a7890;line-height:1.6;">They are waiting for you. No expiry. Use them whenever you are ready.</div>
                  </td>
                </tr>
              </table>

              <p style="font-family:'Arial',sans-serif;font-size:15px;color:#9090a8;line-height:1.8;margin:0 0 32px;">
                The Prism is a lens, not an authority. It surfaces relational architecture already present in the text — and asks only that you bring an honest question.
              </p>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="https://theprism.io" style="display:inline-block;font-family:'Arial',sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:#0d0d14;background:#c9a84c;padding:14px 36px;text-decoration:none;border:1px solid #c9a84c;">
                      Open the Prism →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;border-top:1px solid rgba(201,168,76,0.1);text-align:center;">
              <div style="font-family:'Arial',sans-serif;font-size:11px;color:#4a4860;line-height:1.8;">
                OPNX LLC · © 2026 All Rights Reserved<br>
                <a href="https://theprism.io" style="color:#4a4860;text-decoration:none;">theprism.io</a> ·
                <a href="mailto:support@theprism.io" style="color:#4a4860;text-decoration:none;">support@theprism.io</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from:    'The Prism <support@theprism.io>',
        to:      [email],
        subject: 'Welcome to The Prism — 3 bonus queries are waiting for you',
        html:    html
      })
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      console.error('Resend error:', err);
      return res.status(200).json({ success: true, email_sent: false, error: err });
    }

    return res.status(200).json({ success: true, email_sent: true });
  } catch(err) {
    console.error('Welcome email error:', err.message);
    return res.status(200).json({ success: true, email_sent: false });
  }
}
