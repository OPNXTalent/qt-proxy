// api/followups.js
// Save and retrieve follow-up queries for a thread.
// Handles three caller contexts:
//   1. Owner (authenticated via x-user-email) — full access to their thread
//   2. Share page (x-share-id header) — read all follow-ups for a shared thread,
//      post recipient contributions without owning the thread
//   3. Recipient anonymous POST — tagged with source='recipient' and share_id

const SUPABASE_URL              = process.env.SUPABASE_URL;
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-email, x-share-id');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userEmail = req.headers['x-user-email'] || null;
  const shareId   = req.headers['x-share-id']   || null;

  // ── GET — fetch follow-ups for a thread ──────────────────────────────────
  if (req.method === 'GET') {
    const threadId = req.query?.threadId || null;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    // Share page context — return ALL follow-ups for the thread (owner + recipient)
    // so both parties see the full live thread
    if (shareId) {
      // Verify the share exists and points to this thread
      const shareRes = await fetch(
        `${SUPABASE_URL}/rest/v1/shares?id=eq.${encodeURIComponent(shareId)}&thread_id=eq.${encodeURIComponent(threadId)}&select=id&limit=1`,
        { headers: sbHeaders() }
      );
      const shares = await shareRes.json();
      if (!shares?.length) {
        // Share ID doesn't match — fall through to owner-only check
      } else {
        const fuRes = await fetch(
          `${SUPABASE_URL}/rest/v1/follow_ups?thread_id=eq.${encodeURIComponent(threadId)}&order=created_at.asc&select=id,query,response,source,created_at,share_id`,
          { headers: sbHeaders() }
        );
        const followUps = await fuRes.json();
        return res.status(200).json({ followUps: followUps || [] });
      }
    }

    // Owner context — require email, return their follow-ups
    if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const subs = await subRes.json();
    if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });
    const userId = subs[0].id;

    // Owner gets ALL follow-ups on their thread (including recipient contributions)
    const fuRes = await fetch(
      `${SUPABASE_URL}/rest/v1/follow_ups?thread_id=eq.${encodeURIComponent(threadId)}&order=created_at.asc&select=id,query,response,source,created_at,share_id`,
      { headers: sbHeaders() }
    );
    const followUps = await fuRes.json();
    return res.status(200).json({ followUps: followUps || [] });
  }

  // ── POST — save a follow-up ───────────────────────────────────────────────
  if (req.method === 'POST') {
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }

    const { threadId, question, response, source, shareId: bodyShareId } = body || {};
    if (!threadId || !question) return res.status(400).json({ error: 'threadId and question required' });

    const postSource  = source || 'owner';
    const postShareId = bodyShareId || shareId || null;

    // ── Recipient contribution (no ownership required) ──────────────────────
    if (postSource === 'recipient' && postShareId) {
      // Verify the share exists and is active and points to this thread
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
        headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
        body: JSON.stringify({
          thread_id:    threadId,
          user_id:      null,
          query:        question,
          response:     typeof response === 'string' ? { text: response } : (response || {}),
          query_cost:   0,
          submitted_in: 'share',
          source:       'recipient',
          share_id:     postShareId
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

    // ── Owner contribution (email required, thread ownership verified) ───────
    if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

    const subRes = await fetch(
      `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const subs = await subRes.json();
    if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });
    const userId = subs[0].id;

    // Verify thread ownership
    const threadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/threads?id=eq.${encodeURIComponent(threadId)}&user_id=eq.${encodeURIComponent(userId)}&select=id&limit=1`,
      { headers: sbHeaders() }
    );
    const threads = await threadRes.json();
    if (!threads?.length) return res.status(403).json({ error: 'Thread not found or not owned by user' });

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/follow_ups`, {
      method: 'POST',
      headers: { ...sbHeaders(), 'Prefer': 'return=representation' },
      body: JSON.stringify({
        thread_id:    threadId,
        user_id:      userId,
        query:        question,
        response:     typeof response === 'string' ? { text: response } : (response || {}),
        query_cost:   1,
        submitted_in: 'solo',
        source:       'owner',
        share_id:     null
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

  return res.status(405).json({ error: 'Method not allowed' });
}
