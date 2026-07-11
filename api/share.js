// api/share.js
// Handles all share operations for The Prism
// POST   /api/share  — create a new share, returns { shareId, shareUrl }
// PATCH  /api/share  — toggle collaboration_open or status
// GET    /api/share?t=TOKEN — fetch share record for share.html

const SUPABASE_URL          = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ANON_KEY     = process.env.SUPABASE_ANON_KEY;
const BASE_URL              = 'https://theprism.io';

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(length = 12) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

function sbHeaders(useServiceKey = false) {
  const key = useServiceKey ? SUPABASE_SERVICE_KEY : SUPABASE_ANON_KEY;
  return {
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json'
  };
}

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, options);
  return res;
}

// ── CORS ─────────────────────────────────────────────────────────────────────

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://theprism.io');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-email');
}

// ── POST — Create share ───────────────────────────────────────────────────────

async function handlePost(req, res) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { snapshot, subject, senderEmail, threadId, collaborationOpen } = body || {};

  if (!snapshot) {
    return res.status(400).json({ error: 'snapshot is required' });
  }

  // Generate unique token — retry once on collision
  let token = generateToken();

  const record = {
    token,
    sender_email:       senderEmail || null,
    recipient_email:    null,           // no longer required — link-based sharing
    snapshot:           snapshot,
    subject:            subject || null,
    thread_id:          threadId || null,
    status:             'active',
    collaboration_open: collaborationOpen === true
  };

  // Insert share record
  let insertRes = await sbFetch('/shares', {
    method: 'POST',
    headers: { ...sbHeaders(true), 'Prefer': 'return=representation' },
    body: JSON.stringify(record)
  });

  // Handle token collision — try once more
  if (insertRes.status === 409) {
    token = generateToken();
    record.token = token;
    insertRes = await sbFetch('/shares', {
      method: 'POST',
      headers: { ...sbHeaders(true), 'Prefer': 'return=representation' },
      body: JSON.stringify(record)
    });
  }

  if (!insertRes.ok) {
    const text = await insertRes.text();
    console.error('Share insert failed:', text);
    return res.status(500).json({ error: 'Could not create share' });
  }

  const rows = await insertRes.json();
  const shareId = rows?.[0]?.id || null;
  const shareUrl = `${BASE_URL}/share.html?t=${token}`;

  // If collaboration is being opened immediately, create a room channel
  // anchored to this share so room_messages can be scoped to it
  if (collaborationOpen && shareId && senderEmail) {
    await openCollabChannel(shareId, senderEmail);
  }

  // Log referral if sender email present
  if (senderEmail) {
    await sbFetch('/referrals', {
      method: 'POST',
      headers: { ...sbHeaders(true), 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        share_token:     token,
        sender_email:    senderEmail,
        recipient_email: 'link'         // link-based — no specific recipient
      })
    }).catch(() => {});                 // non-fatal
  }

  return res.status(200).json({ shareId, shareUrl, token });
}

// ── PATCH — Toggle collaboration or status ───────────────────────────────────

async function handlePatch(req, res) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { shareId, token, collaborationOpen, status } = body || {};

  if (!shareId && !token) {
    return res.status(400).json({ error: 'shareId or token required' });
  }

  // Build update payload — only include fields explicitly provided
  const updates = {};
  if (typeof collaborationOpen === 'boolean') updates.collaboration_open = collaborationOpen;
  if (status === 'active' || status === 'inactive') updates.status = status;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' });
  }

  const filter = shareId
    ? `/shares?id=eq.${encodeURIComponent(shareId)}`
    : `/shares?token=eq.${encodeURIComponent(token)}`;

  const patchRes = await sbFetch(filter, {
    method: 'PATCH',
    headers: { ...sbHeaders(true), 'Prefer': 'return=representation' },
    body: JSON.stringify(updates)
  });

  if (!patchRes.ok) {
    const text = await patchRes.text();
    console.error('Share patch failed:', text);
    return res.status(500).json({ error: 'Could not update share' });
  }

  const rows = await patchRes.json();
  const updated = rows?.[0];

  // If collaboration just opened, ensure a room channel exists and return its id
  let channelId = null;
  if (collaborationOpen === true && updated?.id) {
    const senderEmail = req.headers['x-user-email'] || updated.sender_email;
    channelId = await openCollabChannel(updated.id, senderEmail);
  }

  return res.status(200).json({ success: true, share: updated, channelId });
}

// ── GET — Fetch share by token ────────────────────────────────────────────────

async function handleGet(req, res) {
  const token = req.query?.t || new URL(req.url, BASE_URL).searchParams.get('t');

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  const fetchRes = await sbFetch(
    `/shares?token=eq.${encodeURIComponent(token)}&select=id,token,snapshot,subject,status,collaboration_open,sender_email,thread_id,created_at`,
    { headers: sbHeaders(false) }
  );

  if (!fetchRes.ok) {
    return res.status(500).json({ error: 'Could not fetch share' });
  }

  const rows = await fetchRes.json();

  if (!rows || rows.length === 0) {
    return res.status(404).json({ error: 'Share not found or expired' });
  }

  const share = rows[0];

  // Inactive shares return a clear signal so share.html can show an appropriate message
  if (share.status === 'inactive') {
    return res.status(410).json({ error: 'This share has been closed by the sender.' });
  }

  // Look up the sender's display name — a bare email address isn't a warm
  // "so-and-so shared this with you" moment, and showing someone's raw
  // email to a stranger who clicked a link isn't great either. Falls back
  // to null if no display name is set; share.html handles that gracefully
  // with a generic "Someone shared this with you" instead.
  let senderDisplayName = null;
  if (share.sender_email) {
    try {
      const senderRes = await sbFetch(
        `/subscribers?email=eq.${encodeURIComponent(share.sender_email)}&select=display_name&limit=1`,
        { headers: sbHeaders(true) }
      );
      if (senderRes.ok) {
        const senderRows = await senderRes.json();
        senderDisplayName = senderRows?.[0]?.display_name || null;
      }
    } catch (e) {
      // Non-fatal — share still loads, just without a name to show
    }
  }
  share.sender_display_name = senderDisplayName;

  // If collaboration is open, fetch the channel id for this share
  let channelId = null;
  if (share.collaboration_open) {
    channelId = await getCollabChannelId(share.id);
  }

  return res.status(200).json({ share, channelId });
}

// ── Collaboration channel helpers ─────────────────────────────────────────────

// openCollabChannel — now simply returns the shareId itself as the channel identifier
// Messages are stored in share_chat_messages keyed by share_id directly
async function openCollabChannel(shareId, senderEmail) {
  return shareId;
}

async function getCollabChannelId(shareId) {
  return shareId;
}

// ── Sender engagement notification ────────────────────────────────────────
// Triggered only by genuine Trust Circle activity — never by private
// notes, which are never visible to the sender and shouldn't silently
// inform them that something private happened, even without revealing
// content. Trust Circle is explicitly open, SMS-like exchange between
// session members, so notifying the sender that someone responded there
// carries none of that tension.
//
// Throttled per share: an active back-and-forth shouldn't produce an
// email per message. If a notification already went out recently for
// this share, this just quietly updates nothing and returns — the next
// genuinely new burst of activity, after the window passes, triggers
// the next one.
const ENGAGEMENT_NOTIFY_THROTTLE_MINUTES = 15;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

async function handleNotifyEngagement(req, res) {
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { shareId } = body || {};
  if (!shareId) return res.status(400).json({ error: 'shareId required' });

  const shareRes = await sbFetch(
    `/shares?id=eq.${encodeURIComponent(shareId)}&select=id,token,sender_email,subject,last_engagement_notified_at`,
    { headers: sbHeaders(true) }
  );
  if (!shareRes.ok) return res.status(200).json({ success: true, sent: false });

  const rows = await shareRes.json();
  const share = rows?.[0];
  if (!share || !share.sender_email) return res.status(200).json({ success: true, sent: false });

  // Throttle check
  if (share.last_engagement_notified_at) {
    const last = new Date(share.last_engagement_notified_at).getTime();
    const minutesSince = (Date.now() - last) / 60000;
    if (minutesSince < ENGAGEMENT_NOTIFY_THROTTLE_MINUTES) {
      return res.status(200).json({ success: true, sent: false, throttled: true });
    }
  }

  // Mark the throttle window immediately, before sending — avoids a
  // burst of near-simultaneous messages all triggering their own send
  // while the email itself is still in flight.
  await sbFetch(`/shares?id=eq.${encodeURIComponent(shareId)}`, {
    method: 'PATCH',
    headers: { ...sbHeaders(true), 'Prefer': 'return=minimal' },
    body: JSON.stringify({ last_engagement_notified_at: new Date().toISOString() })
  });

  if (!RESEND_API_KEY) {
    console.error('RESEND_API_KEY not configured — engagement email not sent');
    return res.status(200).json({ success: true, sent: false });
  }

  const subjectLine = share.subject
    ? `Someone responded to "${share.subject}"`
    : 'Someone responded to what you shared on The Prism';

  const icebreaker = share.subject
    ? `Hi [name], I shared this reflection on "${share.subject}" and thought you might find it interesting too. If you have any questions or comments, let me know.`
    : `Hi [name], I shared something on The Prism and thought you might find it interesting too. If you have any questions or comments, let me know.`;

  const emailHtml = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; color: #1a1a1a; line-height: 1.6;">
      <p style="font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase; color: #7a6230;">The Prism</p>
      <h2 style="font-weight: 500; margin-bottom: 4px;">Someone responded to what you shared</h2>
      <p>Someone you shared a reflection with left a response in the discussion. Worth a look — and if you want to keep the conversation going, here's something ready to send them directly:</p>
      <div style="background: #f7f5f0; border-left: 3px solid #c9a84c; padding: 16px 20px; margin: 20px 0; font-style: italic;">
        ${icebreaker}
      </div>
      <p><a href="${BASE_URL}/share.html?t=${encodeURIComponent(share.token)}" style="color: #7a6230;">View the discussion →</a></p>
    </div>
  `;

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'The Prism <noreply@theprism.io>',
        to: share.sender_email,
        subject: subjectLine,
        html: emailHtml
      })
    });
  } catch (e) {
    console.error('Engagement email send failed:', e);
    return res.status(200).json({ success: true, sent: false });
  }

  return res.status(200).json({ success: true, sent: true });
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST' && req.query?.action === 'notify-engagement') {
    return handleNotifyEngagement(req, res);
  }

  switch (req.method) {
    case 'POST':  return handlePost(req, res);
    case 'PATCH': return handlePatch(req, res);
    case 'GET':   return handleGet(req, res);
    default:      return res.status(405).json({ error: 'Method not allowed' });
  }
}
