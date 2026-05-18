// api/highlights.js
// Save, retrieve, update, and delete thread highlights with notes

const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userEmail = req.headers['x-user-email'] || null;
  if (!userEmail) return res.status(401).json({ error: 'Unauthorized' });

  // Look up subscriber
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id&limit=1`,
    { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
  );
  const subs = await subRes.json();
  if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });
  const userId = subs[0].id;

  // ── GET — fetch highlights for a thread ──────────────────────────────────
  if (req.method === 'GET') {
    const threadId = req.query?.threadId || null;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    const hlRes = await fetch(
      `${SUPABASE_URL}/rest/v1/thread_highlights?thread_id=eq.${threadId}&user_id=eq.${userId}&order=created_at.asc`,
      { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const highlights = await hlRes.json();
    return res.status(200).json({ highlights: highlights || [] });
  }

  // ── POST — save a new highlight ───────────────────────────────────────────
  if (req.method === 'POST') {
    const { threadId, selectedText, note, sectionKey, startOffset, endOffset, color } = req.body || {};
    if (!threadId || !selectedText || !sectionKey) {
      return res.status(400).json({ error: 'threadId, selectedText, and sectionKey required' });
    }

    // Verify thread ownership
    const threadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${userId}&select=id&limit=1`,
      { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const threads = await threadRes.json();
    if (!threads?.length) return res.status(403).json({ error: 'Thread not found or not owned by user' });

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/thread_highlights`, {
      method: 'POST',
      headers: {
        'apikey':        SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation'
      },
      body: JSON.stringify({
        thread_id:     threadId,
        user_id:       userId,
        selected_text: selectedText,
        note:          note || null,
        section_key:   sectionKey,
        start_offset:  startOffset || 0,
        end_offset:    endOffset || selectedText.length,
        color:         color || 'yellow'
      })
    });

    if (!insertRes.ok) {
      const err = await insertRes.text();
      console.error('highlight insert failed:', err);
      return res.status(500).json({ error: 'Failed to save highlight' });
    }

    const saved = await insertRes.json();
    return res.status(200).json({ success: true, highlight: saved?.[0] });
  }

  // ── PATCH — update highlight note ─────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { highlightId, note } = req.body || {};
    if (!highlightId) return res.status(400).json({ error: 'highlightId required' });

    await fetch(
      `${SUPABASE_URL}/rest/v1/thread_highlights?id=eq.${highlightId}&user_id=eq.${userId}`,
      {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal'
        },
        body: JSON.stringify({ note: note || null })
      }
    );
    return res.status(200).json({ success: true });
  }

  // ── DELETE — remove a highlight ───────────────────────────────────────────
  if (req.method === 'DELETE') {
    const { highlightId } = req.body || {};
    if (!highlightId) return res.status(400).json({ error: 'highlightId required' });

    await fetch(
      `${SUPABASE_URL}/rest/v1/thread_highlights?id=eq.${highlightId}&user_id=eq.${userId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey':        SUPABASE_SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    );
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
