// api/threads.js
// Returns thread list for authenticated subscriber
// Called by qt.html sidebar on load

const SUPABASE_URL            = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const userEmail = req.headers['x-user-email'] || null;

  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── GET — fetch thread list ───────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      // Look up subscriber id by email
      const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id,tier,display_name&limit=1`,
        {
          headers: {
            'apikey':        SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          }
        }
      );

      const subs = await subRes.json();
      if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });

      const { id: userId, tier, display_name } = subs[0];

      // Fetch threads — exclude hard-deleted (past grace_ends_at handled by cron)
      const threadsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/threads?user_id=eq.${userId}&order=created_at.desc&limit=100`,
        {
          headers: {
            'apikey':        SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          }
        }
      );

      const threads = await threadsRes.json();
      if (!Array.isArray(threads)) return res.status(500).json({ error: 'Failed to fetch threads' });

      // Map to the shape qt.html expects
      const now = Date.now();
      const mapped = threads.map(t => {
        const expiresAt  = new Date(t.expires_at).getTime();
        const graceEndsAt = new Date(t.grace_ends_at).getTime();
        const msLeft     = expiresAt - now;
        const daysLeft   = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        const expired    = now > expiresAt;
        const inGrace    = expired && now < graceEndsAt;
        const created    = new Date(t.created_at);
        const lastVisited = created.toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        return {
          id:           t.id,
          supabaseId:   t.id,   // preserve uuid
          title:        t.title || t.query?.substring(0, 60) || 'Untitled',
          query:        t.query || '',
          response:     t.response || null,
          queryType:    t.query_type || 'free_text',
          createdAt:    new Date(t.created_at).getTime(),
          lastVisited,
          daysLeft,
          expired,
          inGrace,
          isLocked:     t.is_locked || false,
          retentionDays: t.retention_days,
          expiresAt:    t.expires_at,
          graceEndsAt:  t.grace_ends_at,
        };
      });

      return res.status(200).json({ threads: mapped, tier, userId, display_name: display_name || null });
    } catch (err) {
      console.error('threads GET error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── DELETE — soft delete a thread ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const { threadId } = req.body || {};
      if (!threadId) return res.status(400).json({ error: 'threadId required' });

      // Verify ownership
      const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id&limit=1`,
        { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
      );
      const subs = await subRes.json();
      if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });

      await fetch(
        `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${subs[0].id}`,
        {
          method: 'DELETE',
          headers: {
            'apikey':        SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          }
        }
      );

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('threads DELETE error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── PATCH — rename or reset expiry ──────────────────────────────────────────
  if (req.method === 'PATCH') {
    try {
      const { threadId, title, action } = req.body || {};
      if (!threadId) return res.status(400).json({ error: 'threadId required' });

      const subRes = await fetch(
        `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id,tier,query_count&limit=1`,
        { headers: { 'apikey': SUPABASE_SERVICE_ROLE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
      );
      const subs = await subRes.json();
      if (!subs?.length) return res.status(404).json({ error: 'Subscriber not found' });
      const { id: userId, tier } = subs[0];

      // ── Reset expiry clock (costs 1 query) ───────────────────────────────
      if (action === 'reset_expiry') {
        // Draw 1 query via RPC
        const drawRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/draw_query`, {
          method: 'POST',
          headers: {
            'apikey':        SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type':  'application/json'
          },
          body: JSON.stringify({ p_user_id: userId, p_cost: 1 })
        });

        if (!drawRes.ok) {
          const err = await drawRes.text();
          if (err.includes('INSUFFICIENT_QUERIES')) {
            return res.status(402).json({ error: 'INSUFFICIENT_QUERIES' });
          }
          return res.status(500).json({ error: 'Failed to draw query' });
        }

        // Calculate new expiry from today
        const retentionDays = { scholar: 90, theologian: 180, trial: 30, free: 1 }[tier] || 90;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
        const graceEndsAt = new Date(expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        await fetch(
          `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: {
              'apikey':        SUPABASE_SERVICE_ROLE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'Content-Type':  'application/json',
              'Prefer':        'return=minimal'
            },
            body: JSON.stringify({
              expires_at:    expiresAt.toISOString(),
              grace_ends_at: graceEndsAt.toISOString(),
              retention_days: retentionDays
            })
          }
        );

        return res.status(200).json({ success: true, expiresAt: expiresAt.toISOString(), daysLeft: retentionDays });
      }

      // ── Rename ───────────────────────────────────────────────────────────
      if (!title) return res.status(400).json({ error: 'title required for rename' });

      await fetch(
        `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey':        SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type':  'application/json',
            'Prefer':        'return=minimal'
          },
          body: JSON.stringify({ title: title.substring(0, 60) })
        }
      );

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('threads PATCH error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
