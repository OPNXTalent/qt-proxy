// api/share.js
// Drop this file into C:\Users\khogg\qt-proxy\api\

const SUPABASE_URL     = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const RESEND_API_KEY   = process.env.RESEND_API_KEY;

function generateToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 10; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

async function saveShare(token, senderEmail, recipientEmail, snapshot) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shares`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({
      token,
      sender_email: senderEmail,
      recipient_email: recipientEmail,
      snapshot
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase insert failed: ${text}`);
  }
}

async function sendShareEmail(recipientEmail, senderEmail, token, snapshot) {
  const shareUrl = `https://quantumtheology.app/share.html?t=${token}`;
  const gatewayUrl = `https://quantumtheology.app/qt-gateway.html?email=${encodeURIComponent(recipientEmail)}&ref=${token}`;

  const subjectPreview = snapshot.recognition
    ? snapshot.recognition.slice(0, 80) + (snapshot.recognition.length > 80 ? '…' : '')
    : 'A Quantum Theology interpretation';

  const html = `
    <div style="background:#ffffff; color:#1a1a2e; font-family:Georgia,serif; max-width:600px; margin:0 auto; padding:48px 40px; border:1px solid #e0dce8;">
      <div style="text-align:center; margin-bottom:32px;">
        <div style="font-family:Georgia,serif; font-size:26px; color:#1a1a2e; letter-spacing:0.08em;">Quantum Theology</div>
        <div style="font-size:12px; color:#7a6230; letter-spacing:0.2em; text-transform:uppercase; margin-top:6px;">Echad b'Emet</div>
      </div>
      <div style="border-top:1px solid #e0dce8; margin-bottom:32px;"></div>

      <p style="font-size:16px; color:#4a4860; line-height:1.8; margin-bottom:24px;">
        Someone shared a QT Prism interpretation with you.
      </p>

      <div style="border-left:3px solid #c9a84c; padding:16px 24px; background:#faf8f2; margin-bottom:32px;">
        <div style="font-size:11px; letter-spacing:0.16em; text-transform:uppercase; color:#7a6230; margin-bottom:10px; font-family:monospace;">From the interpretation</div>
        <p style="font-size:18px; color:#2a2840; font-style:italic; line-height:1.7; margin:0;">${subjectPreview}</p>
      </div>

      <div style="text-align:center; margin:36px 0;">
        <a href="${shareUrl}" style="font-family:monospace; font-size:12px; letter-spacing:0.18em; text-transform:uppercase; color:#ffffff; text-decoration:none; background:#2a2840; padding:14px 32px; display:inline-block;">
          Read the Interpretation →
        </a>
      </div>

      <div style="border-top:1px solid #e0dce8; margin:32px 0;"></div>

      <p style="font-size:14px; color:#7a7890; line-height:1.8; text-align:center; font-style:italic;">
        The Prism applies Hebraic relational ontology and the conceptual language of quantum mechanics to Scripture — not as metaphor, but as structural confirmation.
      </p>

      <div style="text-align:center; margin:28px 0 0;">
        <a href="${gatewayUrl}" style="font-family:monospace; font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#7a6230; text-decoration:none;">
          Experience it yourself →
        </a>
      </div>

      <div style="border-top:1px solid #e0dce8; margin-top:32px; padding-top:24px;">
        <p style="font-size:12px; color:#b0aac0; text-align:center;">
          Questions? <a href="mailto:support@quantumtheology.app" style="color:#7a6230;">support@quantumtheology.app</a>
        </p>
      </div>
    </div>
  `;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'noreply@quantumtheology.app',
      to: recipientEmail,
      subject: `A QT Prism interpretation has been shared with you`,
      html
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${text}`);
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', 'https://quantumtheology.app');
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

  const { senderEmail, recipientEmail, snapshot } = body || {};

  if (!senderEmail || !recipientEmail || !snapshot) {
    return res.status(400).json({ error: 'Missing required fields: senderEmail, recipientEmail, snapshot' });
  }

  // Basic email validation
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(recipientEmail)) {
    return res.status(400).json({ error: 'Invalid recipient email' });
  }

  // Generate unique token (retry once on collision, extremely unlikely)
  let token = generateToken();

  try {
    await saveShare(token, senderEmail, recipientEmail, snapshot);
  } catch (err) {
    // If duplicate token, try once more
    if (err.message.includes('duplicate') || err.message.includes('unique')) {
      token = generateToken();
      try {
        await saveShare(token, senderEmail, recipientEmail, snapshot);
      } catch (retryErr) {
        console.error('Share save retry failed:', retryErr.message);
        return res.status(500).json({ error: 'Could not save share' });
      }
    } else {
      console.error('Share save failed:', err.message);
      return res.status(500).json({ error: 'Could not save share' });
    }
  }

  try {
    await sendShareEmail(recipientEmail, senderEmail, token, snapshot);
  } catch (err) {
    console.error('Share email failed:', err.message);
    // Don't fail the whole request — share was saved, link still works
    // Recipient can still access via direct link
  }

  return res.status(200).json({
    success: true,
    token,
    shareUrl: `https://quantumtheology.app/share.html?t=${token}`
  });
}
