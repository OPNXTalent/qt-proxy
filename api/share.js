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

  // If collaboration just opened, ensure a room channel exists
  if (collaborationOpen === true && updated?.id) {
    const senderEmail = req.headers['x-user-email'] || updated.sender_email;
    await openCollabChannel(updated.id, senderEmail);
  }

  return res.status(200).json({ success: true, share: updated });
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

  // If collaboration is open, fetch the channel id for this share
  let channelId = null;
  if (share.collaboration_open) {
    channelId = await getCollabChannelId(share.id);
  }

  return res.status(200).json({ share, channelId });
}

// ── Collaboration channel helpers ─────────────────────────────────────────────

async function openCollabChannel(shareId, senderEmail) {
  try {
    // Look up sender's user_id from subscribers
    let ownerId = null;
    if (senderEmail) {
      const subRes = await sbFetch(
        `/subscribers?email=eq.${encodeURIComponent(senderEmail)}&select=id&limit=1`,
        { headers: sbHeaders(true) }
      );
      if (subRes.ok) {
        const subs = await subRes.json();
        ownerId = subs?.[0]?.id || null;
      }
    }

    // Check if a channel already exists for this share
    const existing = await getCollabChannelId(shareId);
    if (existing) return existing;

    // Create a new room_channel anchored to this share
    // channel_type 'share' distinguishes from room/direct/small_group
    const createRes = await sbFetch('/room_channels', {
      method: 'POST',
      headers: { ...sbHeaders(true), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        room_id:      shareId,        // repurposing room_id as share anchor
        channel_type: 'share',
        created_by:   ownerId || '00000000-0000-0000-0000-000000000000',
        is_active:    true
      })
    });

    if (!createRes.ok) {
      console.error('Channel create failed:', await createRes.text());
      return null;
    }

    const rows = await createRes.json();
    return rows?.[0]?.id || null;

  } catch (err) {
    console.error('openCollabChannel error:', err.message);
    return null;
  }
}

async function getCollabChannelId(shareId) {
  try {
    const res = await sbFetch(
      `/room_channels?room_id=eq.${encodeURIComponent(shareId)}&channel_type=eq.share&is_active=eq.true&select=id&limit=1`,
      { headers: sbHeaders(true) }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0]?.id || null;
  } catch {
    return null;
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  switch (req.method) {
    case 'POST':  return handlePost(req, res);
    case 'PATCH': return handlePatch(req, res);
    case 'GET':   return handleGet(req, res);
    default:      return res.status(405).json({ error: 'Method not allowed' });
  }
}
