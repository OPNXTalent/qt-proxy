// api/followups.js
// Save and retrieve follow-up queries for a thread.
//
// Contexts this handles:
//   1. Owner (x-user-email) — full access to their own thread
//   2. Share page (x-share-id) — anonymous read/write on a shared thread,
//      unrelated to Trust Circle — this is the original, free, no-account
//      commentary feature and is untouched by anything below
//   3. Trust Circle participant (x-user-email) — an authenticated person who
//      has joined a Trust Circle thread via thread_participants, contributing
//      real interpretive follow-ups billed to their own account
//
// Per-contribution visibility (see follow_ups.visibility): controlled by
// whoever authored that specific contribution, independent of the thread's
// own visibility setting. 'private' means only the author sees it in their
// own view of the thread. Existing rows default to 'private' — nothing that
// existed before this feature suddenly becomes visible to anyone new.
//
// Deletion: only the author of a contribution can ever delete it. Not the
// thread owner, not any other participant, no exceptions — a contribution
// belongs to whoever wrote it.
//
// Muting: purely personal, scoped to (thread, muter, muted). Filtering here
// only ever affects what the MUTER sees — never removes anything for anyone
// else, never notifies the muted person.

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra) {
  return {
    'apikey':        SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra
  };
}

async function getSubscriberId(userEmail) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id&limit=1`,
    { headers: sbHeaders() }
  );
  const subs = await res.json();
  return subs?.[0]?.id || null;
}

async function getMutedUserIds(threadId, viewerUserId) {
  if (!viewerUserId) return [];
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/thread_mutes?thread_id=eq.${threadId}&muter_user_id=eq.${viewerUserId}&select=muted_user_id`,
    { headers: sbHeaders() }
  );
  const rows = await res.json();
  return Array.isArray(rows) ? rows.map(r => r.muted_user_id) : [];
}

// Applies the two viewer-specific filters that apply everywhere follow_ups
// are read: hide other people's private contributions, and hide anything
// from someone this viewer has muted in this thread. viewerUserId is null
// for anonymous share-page viewers, who can never be an "author" of a
// private note and have no mute list of their own.
function filterForViewer(followUps, viewerUserId, mutedIds) {
  return followUps.filter(f => {
    if (f.visibility === 'private' && f.user_id !== viewerUserId) return false;
    if (f.user_id && mutedIds.includes(f.user_id)) return false;
    return true;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-email, x-share-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userEmail = req.headers['x-user-email'] || null;
  const shareId   = req.headers['x-share-id']   || null;

  // ── GET — fetch follow-ups for a thread ──────────────────────────────────
  if (req.method === 'GET') {
    const threadId = req.query?.threadId || null;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    // Share page context — untouched, separate from Trust Circle entirely.
    if (shareId) {
      const shareRes = await fetch(
        `${SUPABASE_URL}/rest/v1/shares?id=eq.${encodeURIComponent(shareId)}&thread_id=eq.${encodeURIComponent(threadId)}&select=id&limit=1`,
        { headers: sbHeaders() }
      );
      const shares = await shareRes.json();
      if (shares?.length) {
        const fuRes = await fetch(
          `${SUPABASE_URL}/rest/v1/follow_ups?thread_id=eq.${encodeURIComponent(threadId)}&order=created_at.asc&select=id,query,response,source,created_at,share_id,visibility,user_id`,
          { headers: sbHeaders() }
        );
        const followUps = await fuRes.json();
        // Anonymous viewer: no identity, so never the author of anything
        // private, and no personal mute list.
        const visible = filterForViewer(Array.isArray(followUps) ? followUps : [], null, []);
        return res.status(200).json({ followUps: visible });
      }
      // Share ID didn't match — fall through to owner/participant check below.
    }

    // Authenticated context — owner or Trust Circle participant.
    if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

    const viewerUserId = await getSubscriberId(userEmail);
    if (!viewerUserId) return res.status(404).json({ error: 'Subscriber not found' });

    // Confirm this person actually has standing to view this thread — either
    // they own it, or they're a participant on it.
    const [threadRes, participantRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&select=id,user_id&limit=1`, { headers: sbHeaders() }),
      fetch(`${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&user_id=eq.${viewerUserId}&select=id&limit=1`, { headers: sbHeaders() })
    ]);
    const threadRows = await threadRes.json();
    const participantRows = await participantRes.json();
    const isOwner = threadRows?.[0]?.user_id === viewerUserId;
    const isParticipant = Array.isArray(participantRows) && participantRows.length > 0;

    if (!isOwner && !isParticipant) {
      return res.status(403).json({ error: 'Not authorized to view this thread' });
    }

    const fuRes = await fetch(
      `${SUPABASE_URL}/rest/v1/follow_ups?thread_id=eq.${encodeURIComponent(threadId)}&order=created_at.asc&select=id,query,response,source,created_at,share_id,visibility,user_id`,
      { headers: sbHeaders() }
    );
    const followUps = await fuRes.json();
    const mutedIds = await getMutedUserIds(threadId, viewerUserId);
    const visible = filterForViewer(Array.isArray(followUps) ? followUps : [], viewerUserId, mutedIds);

    return res.status(200).json({ followUps: visible });
  }

  // ── POST — save a follow-up ───────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { threadId, question, response, source, shareId: bodyShareId, visibility } = body || {};
    if (!threadId || !question) return res.status(400).json({ error: 'threadId and question required' });

    const postSource  = source || 'owner';
    const postShareId = bodyShareId || shareId || null;
    const postVisibility = visibility === 'trust_circle' ? 'trust_circle' : 'private';

    // ── Recipient contribution — untouched, separate from Trust Circle ──────
    if (postSource === 'recipient' && postShareId) {
      const shareRes = await fetch(
        `${SUPABASE_URL}/rest/v1/shares?id=eq.${encodeURIComponent(postShareId)}&thread_id=eq.${encodeURIComponent(threadId)}&status=eq.active&select=id&limit=1`,
        { headers: sbHeaders() }
      );
      const shares = await shareRes.json();
      if (!shares?.length) {
        return res.status(403).json({ error: 'Share not found, inactive, or does not match thread' });
      }

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/follow_ups`, {
        method: 'POST',
        headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
        body: JSON.stringify({
          thread_id:    threadId,
          user_id:      null,
          query:        question,
          response:     typeof response === 'string' ? { text: response } : (response || {}),
          query_cost:   0,
          submitted_in: 'share',
          source:       'recipient',
          share_id:     postShareId,
          visibility:   'trust_circle' // free anonymous comments were always visible to everyone with the link — unchanged behavior
        })
      });

      if (!insertRes.ok) {
        const err = await insertRes.text();
        console.error('recipient follow-up insert failed:', err);
        return res.status(500).json({ error: 'Failed to save follow-up' });
      }

      const saved = await insertRes.json();
      return res.status(200).json({ success: true, id: saved?.[0]?.id });
    }

    // ── Trust Circle participant contribution ────────────────────────────────
    // A real, billed interpretive question added to a shared strand. Billing
    // itself already happened via /api/interpret before this call — this is
    // just persistence. Requires the caller to already be an ACTIVE
    // participant (i.e. they've joined via the "add to my Archive" action);
    // simply knowing a thread's ID is not enough to post into it.
    if (postSource === 'participant') {
      if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });
      const participantUserId = await getSubscriberId(userEmail);
      if (!participantUserId) return res.status(404).json({ error: 'Subscriber not found' });

      const partRes = await fetch(
        `${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&user_id=eq.${participantUserId}&active=eq.true&select=id&limit=1`,
        { headers: sbHeaders() }
      );
      const partRows = await partRes.json();
      if (!partRows?.length) {
        return res.status(403).json({ error: 'Must be an active participant on this thread to contribute' });
      }

      const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/follow_ups`, {
        method: 'POST',
        headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
        body: JSON.stringify({
          thread_id:    threadId,
          user_id:      participantUserId,
          query:        question,
          response:     typeof response === 'string' ? { text: response } : (response || {}),
          query_cost:   1,
          submitted_in: 'participant',
          source:       'participant',
          share_id:     null,
          visibility:   postVisibility
        })
      });

      if (!insertRes.ok) {
        const err = await insertRes.text();
        console.error('participant follow-up insert failed:', err);
        return res.status(500).json({ error: 'Failed to save follow-up' });
      }

      // Contributing counts as having seen the thread up to this point.
      await fetch(
        `${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&user_id=eq.${participantUserId}`,
        {
          method: 'PATCH',
          headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
          body: JSON.stringify({ last_seen_at: new Date().toISOString() })
        }
      );

      const saved = await insertRes.json();
      return res.status(200).json({ success: true, id: saved?.[0]?.id });
    }

    // ── Owner contribution — unchanged, now also carries visibility ─────────
    if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

    const ownerUserId = await getSubscriberId(userEmail);
    if (!ownerUserId) return res.status(404).json({ error: 'Subscriber not found' });

    const threadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${ownerUserId}&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const threads = await threadRes.json();
    if (!threads?.length) return res.status(403).json({ error: 'Thread not found or not owned by user' });

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/follow_ups`, {
      method: 'POST',
      headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=representation' }),
      body: JSON.stringify({
        thread_id:    threadId,
        user_id:      ownerUserId,
        query:        question,
        response:     typeof response === 'string' ? { text: response } : (response || {}),
        query_cost:   1,
        submitted_in: 'solo',
        source:       'owner',
        share_id:     null,
        visibility:   postVisibility
      })
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('owner follow-up insert failed:', err);
      return res.status(500).json({ error: 'Failed to save follow-up' });
    }

    const saved = await insertRes.json();
    return res.status(200).json({ success: true, id: saved?.[0]?.id });
  }

  // ── PATCH — change visibility of my own contribution ────────────────────
  // Only the author can ever change this — matching the same rule as delete.
  if (req.method === 'PATCH') {
    if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const { followUpId, visibility } = body || {};
    if (!followUpId || !['private', 'trust_circle'].includes(visibility)) {
      return res.status(400).json({ error: 'followUpId and a valid visibility are required' });
    }

    const requesterId = await getSubscriberId(userEmail);
    if (!requesterId) return res.status(404).json({ error: 'Subscriber not found' });

    const fuRes = await fetch(
      `${SUPABASE_URL}/rest/v1/follow_ups?id=eq.${followUpId}&user_id=eq.${requesterId}&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const fuRows = await fuRes.json();
    if (!fuRows?.length) return res.status(403).json({ error: 'Only the author can change this contribution\'s visibility' });

    await fetch(
      `${SUPABASE_URL}/rest/v1/follow_ups?id=eq.${followUpId}`,
      {
        method: 'PATCH',
        headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
        body: JSON.stringify({ visibility })
      }
    );
    return res.status(200).json({ success: true, visibility });
  }

  // ── DELETE — remove my own contribution ──────────────────────────────────
  // No one else — not the thread owner, not any other participant — can ever
  // delete someone else's legitimate contribution. This is the one exception
  // to that: you can always remove your own words.
  if (req.method === 'DELETE') {
    if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });
    const { followUpId } = req.body || {};
    if (!followUpId) return res.status(400).json({ error: 'followUpId required' });

    const requesterId = await getSubscriberId(userEmail);
    if (!requesterId) return res.status(404).json({ error: 'Subscriber not found' });

    const fuRes = await fetch(
      `${SUPABASE_URL}/rest/v1/follow_ups?id=eq.${followUpId}&user_id=eq.${requesterId}&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const fuRows = await fuRes.json();
    if (!fuRows?.length) return res.status(403).json({ error: 'Only the author can delete their own contribution' });

    await fetch(
      `${SUPABASE_URL}/rest/v1/follow_ups?id=eq.${followUpId}`,
      { method: 'DELETE', headers: sbHeaders() }
    );
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
