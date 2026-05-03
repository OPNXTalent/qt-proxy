const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

async function sendEmail(to, subject, html) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@quantumtheology.app',
      to,
      subject,
      html
    })
  });
}

function emailWrapper(content) {
  return `
    <div style="background:#06060a; color:#d8d4e8; font-family:Georgia,serif; max-width:600px; margin:0 auto; padding:48px 40px;">
      <div style="text-align:center; margin-bottom:32px;">
        <div style="font-family:serif; font-size:28px; color:#e8d5a0; letter-spacing:0.08em;">Quantum Theology</div>
        <div style="font-size:14px; color:#7a6230; letter-spacing:0.2em; text-transform:uppercase; margin-top:4px;">Echad b'Emet</div>
      </div>
      <div style="border-top:1px solid #2a2a40; margin-bottom:32px;"></div>
      ${content}
      <div style="border-top:1px solid #2a2a40; margin-top:32px; padding-top:24px;">
        <p style="font-size:13px; color:#3a384a; text-align:center;">Questions? <a href="mailto:support@quantumtheology.app" style="color:#7a6230;">support@quantumtheology.app</a></p>
      </div>
    </div>
  `;
}

export default async function handler(req, res) {
  // Verify this request is from Vercel Cron (or an authorized caller)
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Fetch all inactive subscribers updated in the last 3 days
    // (recently lapsed — still worth a re-engagement nudge)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3);

    const supabaseRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?status=eq.inactive&updated_at=gte.${cutoff.toISOString()}&select=email,tier,updated_at`,
      {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    );

    if (!supabaseRes.ok) {
      const err = await supabaseRes.text();
      console.error('Supabase fetch error:', err);
      return res.status(500).json({ error: 'Supabase error' });
    }

    const subscribers = await supabaseRes.json();

    if (!subscribers.length) {
      return res.status(200).json({ message: 'No inactive subscribers to notify.' });
    }

    const results = [];

    for (const sub of subscribers) {
      if (!sub.email) continue;

      try {
        await sendEmail(
          sub.email,
          'Your QT Prism Access Has Lapsed',
          emailWrapper(`
            <p style="font-size:18px; line-height:1.8; color:#d8d4e8;">Your Prism subscription is no longer active.</p>
            <p style="font-size:16px; line-height:1.8; color:#7a7890;">
              You still have access to 3 free queries every 24 hours. If there was a payment issue, 
              updating your method takes less than a minute — and your access restores immediately.
            </p>
            <div style="text-align:center; margin:40px 0;">
              <a href="https://billing.stripe.com" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#e8d5a0; text-decoration:none; border:1px solid #7a6230; padding:14px 32px;">Update Payment Method</a>
            </div>
            <div style="text-align:center; margin:16px 0 0;">
              <a href="https://quantumtheology.app/index.html#access" style="font-family:monospace; font-size:12px; letter-spacing:0.2em; text-transform:uppercase; color:#7a6230; text-decoration:none;">Or choose a new plan</a>
            </div>
          `)
        );
        results.push({ email: sub.email, status: 'sent' });
      } catch (emailErr) {
        console.error(`Email failed for ${sub.email}:`, emailErr.message);
        results.push({ email: sub.email, status: 'failed', error: emailErr.message });
      }
    }

    return res.status(200).json({ notified: results.length, results });

  } catch (err) {
    console.error('Cron handler error:', err.message);
    return res.status(500).json({ error: 'Handler error' });
  }
}
