// api/threads.js
// Returns thread list for authenticated subscriber, plus Trust Circle management:
// toggling a thread's visibility, joining a shared thread into your own Archive,
// the silent step-back toggle, and per-thread muting.
//
// Trust Circle model, for reference (see project notes for the full design
// conversation): a thread is Private by default. An owner can flip it to
// Trust Circle, which makes it reachable via direct link only — there is no
// discovery mechanism anywhere. Anyone who reaches it can join, which adds
// them to thread_participants as a LIVE SHARED REFERENCE, not a copy — the
// same thread_id shows up in every participant's Archive. A database trigger
// (ensure_creator_is_participant) makes the original creator symmetrical with
// everyone else the moment a thread becomes Trust Circle, which is what makes
// "delete from my Archive" safe for anyone to do without destroying the
// thread for other participants — see the DELETE handler below.

import { verifySupabaseIdentity } from '../lib/server-auth.js';

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY         = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function sbHeaders(extra) {
  return {
    'apikey':        SUPABASE_SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra
  };
}

function responseFromArtifact(artifactRow, packetRows) {
  const artifact = artifactRow?.artifact;
  if (!artifact) return null;
  const response = {
    response_mode: artifact.responseMode || 'reflective',
    recognition: artifact.orientation || '',
    core_insight: artifact.canonicalResponse || '',
    open_door_question: artifact.openDoorQuestion || '',
    verse_identified: artifact.verseIdentified || '',
    verse_text: artifact.verseText || '',
    key_terms: [],
    _artifactId: artifact.artifactId,
    _artifactRevision: artifact.revision,
  };
  for (const packet of packetRows || []) {
    const content = packet.content || {};
    if (packet.packet_type === 'interpretive_context') {
      response.interpretive_context = content.text || '';
    } else if (packet.packet_type === 'prism_analysis') {
      const framework = content.framework || {};
      response.prism_summary = framework.prismSummary || '';
      response.entanglement = framework.entanglement || '';
      response.coherence_alignment = framework.coherenceAlignment || '';
      response.noise_decoherence = framework.noiseDecoherence || '';
      response.telos_insight = framework.telosInsight || '';
      response.olam_haba = framework.olamHaba || '';
      response.key_terms = (content.keyTerms || []).map(term => ({
        term: term.term || '',
        hebrew: term.original || '',
        prism_meaning: term.meaning || '',
      }));
    }
  }
  return response;
}

async function getSubscriberProfile(userEmail) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscribers?email=eq.${encodeURIComponent(userEmail)}&select=id,tier,display_name&limit=1`,
    { headers: sbHeaders() }
  );
  const subs = await res.json();
  return subs?.[0] || null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const auth = await verifySupabaseIdentity({
    authorizationHeader: req.headers.authorization,
    supabaseUrl: SUPABASE_URL,
    supabaseAnonKey: SUPABASE_ANON_KEY
  });
  if (auth.provided && !auth.identity) {
    return res.status(auth.unavailable ? 503 : 401).json({ error: auth.unavailable ? 'Identity provider unavailable' : 'Unauthorized' });
  }
  const userEmail = auth.identity?.email || null;
  const verifiedUserId = auth.identity?.userId || null;

  if (!userEmail) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ── GET — fetch thread list (owned + Trust Circle threads joined) ─────────
  if (req.method === 'GET') {
    try {
      const subscriber = await getSubscriberProfile(userEmail);
      const userId = verifiedUserId;
      const tier = subscriber?.tier || 'free';
      const display_name = subscriber?.display_name || null;

      // Threads this person owns — unchanged query, now also pulling visibility.
      const ownedRes = await fetch(
        `${SUPABASE_URL}/rest/v1/threads?user_id=eq.${userId}&order=created_at.desc&limit=100&select=*`,
        { headers: sbHeaders() }
      );
      const owned = await ownedRes.json();
      if (!Array.isArray(owned)) return res.status(500).json({ error: 'Failed to fetch threads' });

      // Threads this person has joined as a participant (their own or someone
      // else's Trust Circle thread). Owned Trust Circle threads will ALSO
      // appear here, via the trigger-created participant row — deduped below.
      const participantRes = await fetch(
        `${SUPABASE_URL}/rest/v1/thread_participants?user_id=eq.${userId}&select=thread_id,active,last_seen_at,threads(*)`,
        { headers: sbHeaders() }
      );
      const participantRows = await participantRes.json();
      const participantList = Array.isArray(participantRows) ? participantRows : [];

      // Merge, deduping by thread id. Owned threads take priority for the
      // base record; participant rows layer in participation-specific fields.
      const byId = new Map();
      for (const t of owned) {
        byId.set(t.id, { thread: t, isOwner: true, active: true, lastSeenAt: null });
      }
      for (const row of participantList) {
        if (!row.threads) continue; // thread may have been hard-deleted already
        const existing = byId.get(row.thread_id);
        if (existing) {
          existing.active = row.active;
          existing.lastSeenAt = row.last_seen_at;
        } else {
          byId.set(row.thread_id, {
            thread: row.threads,
            isOwner: row.threads.user_id === userId,
            active: row.active,
            lastSeenAt: row.last_seen_at
          });
        }
      }

      // Restore completed root artifacts and enrichments from the server.
      const threadIds = [...byId.keys()];
      const artifactByThread = new Map();
      const packetsByArtifact = new Map();
      if (threadIds.length) {
        try {
          const idsFilter = threadIds.map(id => `"${id}"`).join(',');
          const artifactRes = await fetch(
            `${SUPABASE_URL}/rest/v1/interpretation_artifacts?thread_id=in.(${idsFilter})&artifact_revision=eq.1&select=thread_id,artifact_id,artifact_revision,artifact`,
            { headers: sbHeaders() },
          );
          const artifacts = artifactRes.ok ? await artifactRes.json() : [];
          for (const artifact of Array.isArray(artifacts) ? artifacts : []) {
            artifactByThread.set(artifact.thread_id, artifact);
          }
          const artifactIds = [...new Set((Array.isArray(artifacts) ? artifacts : [])
            .map(row => row.artifact_id))];
          if (artifactIds.length) {
            const artifactFilter = artifactIds.map(id => `"${id}"`).join(',');
            const packetRes = await fetch(
              `${SUPABASE_URL}/rest/v1/interpretation_packets?artifact_id=in.(${artifactFilter})&artifact_revision=eq.1&status=eq.complete&order=sequence.asc&select=artifact_id,packet_type,sequence,content`,
              { headers: sbHeaders() },
            );
            const packets = packetRes.ok ? await packetRes.json() : [];
            for (const packet of Array.isArray(packets) ? packets : []) {
              const list = packetsByArtifact.get(packet.artifact_id) || [];
              list.push(packet);
              packetsByArtifact.set(packet.artifact_id, list);
            }
          }
        } catch (artifactRestoreError) {
          // A rollout where the artifact schema is not yet present must not
          // make the legacy Archive unavailable.
          console.warn('artifact restoration unavailable:', artifactRestoreError.message);
        }
      }

      // For each Trust Circle thread, count contributions made by OTHERS
      // since this person's last_seen_at — the passive "3 new" indicator for
      // someone who has stepped back or just hasn't opened it in a while.
      // Only worth querying for threads that actually have participants.
      const trustCircleIds = [...byId.values()]
        .filter(v => v.thread.visibility === 'trust_circle')
        .map(v => v.thread.id);

      const unseenCounts = {};
      if (trustCircleIds.length > 0) {
        const idsFilter = trustCircleIds.map(id => `"${id}"`).join(',');
        const fuRes = await fetch(
          `${SUPABASE_URL}/rest/v1/follow_ups?thread_id=in.(${idsFilter})&select=id,thread_id,user_id,created_at`,
          { headers: sbHeaders() }
        );
        const allFu = await fuRes.json();
        if (Array.isArray(allFu)) {
          for (const tcId of trustCircleIds) {
            const entry = byId.get(tcId);
            const since = entry.lastSeenAt ? new Date(entry.lastSeenAt).getTime() : 0;
            unseenCounts[tcId] = allFu.filter(f =>
              f.thread_id === tcId &&
              f.user_id !== userId &&
              new Date(f.created_at).getTime() > since
            ).length;
          }
        }
      }

      const now = Date.now();
      const mapped = [...byId.values()].map(({ thread: t, isOwner, active, lastSeenAt }) => {
        const expiresAt   = new Date(t.expires_at).getTime();
        const graceEndsAt = new Date(t.grace_ends_at).getTime();
        const msLeft      = expiresAt - now;
        const daysLeft    = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        const expired     = now > expiresAt;
        const inGrace      = expired && now < graceEndsAt;

        return {
          id:           t.id,
          supabaseId:   t.id,
          title:        t.title || t.query?.substring(0, 60) || 'Untitled',
          query:        t.query || '',
          response:     artifactByThread.has(t.id)
            ? responseFromArtifact(
              artifactByThread.get(t.id),
              packetsByArtifact.get(artifactByThread.get(t.id).artifact_id),
            )
            : (t.response || null),
          queryType:    t.query_type || 'free_text',
          createdAt:    new Date(t.created_at).getTime(),
          daysLeft,
          expired,
          inGrace,
          isLocked:     t.is_locked || false,
          retentionDays: t.retention_days,
          expiresAt:    t.expires_at,
          graceEndsAt:  t.grace_ends_at,
          visibility:   t.visibility || 'private',
          isOwner,
          participantActive: active,
          unseenCount:  unseenCounts[t.id] || 0
        };
      });

      mapped.sort((a, b) => b.createdAt - a.createdAt);

      return res.status(200).json({ threads: mapped, tier, userId, display_name: display_name || null });
    } catch (err) {
      console.error('threads GET error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── DELETE — remove from my Archive ───────────────────────────────────────
  // For a thread that has never been shared (no thread_participants rows at
  // all), this is a real, permanent delete — nothing else could possibly be
  // affected. For anything that HAS been shared, deletion is symmetrical for
  // everyone including the original owner: it only ever removes YOUR OWN
  // thread_participants row. The thread and every contribution stay fully
  // intact for anyone else still attached to it. The underlying threads row
  // only actually gets deleted once literally no one remains — i.e. this
  // was the last participant standing.
  if (req.method === 'DELETE') {
    try {
      const { threadId } = req.body || {};
      if (!threadId) return res.status(400).json({ error: 'threadId required' });

      const userId = verifiedUserId;

      const participantsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&select=id,user_id`,
        { headers: sbHeaders() }
      );
      const participants = await participantsRes.json();
      const hasEverBeenShared = Array.isArray(participants) && participants.length > 0;

      if (!hasEverBeenShared) {
        // Never shared — safe to hard-delete, exactly as before.
        await fetch(
          `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${userId}`,
          { method: 'DELETE', headers: sbHeaders() }
        );
        return res.status(200).json({ success: true });
      }

      // Has participants — remove only this person's own row.
      const ownRow = participants.find(p => p.user_id === userId);
      if (!ownRow) {
        return res.status(403).json({ error: 'Not a participant on this thread' });
      }

      await fetch(
        `${SUPABASE_URL}/rest/v1/thread_participants?id=eq.${ownRow.id}`,
        { method: 'DELETE', headers: sbHeaders() }
      );

      // If that was the last remaining participant, the thread has no one
      // left attached to it at all — genuinely safe to clean up now.
      const remainingRes = await fetch(
        `${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&select=id&limit=1`,
        { headers: sbHeaders() }
      );
      const remaining = await remainingRes.json();
      if (Array.isArray(remaining) && remaining.length === 0) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}`,
          { method: 'DELETE', headers: sbHeaders() }
        );
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error('threads DELETE error:', err.message);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── PATCH — rename, reset expiry, or Trust Circle actions ──────────────────
  if (req.method === 'PATCH') {
    try {
      const { threadId, title, action, targetUserId } = req.body || {};
      if (!threadId) return res.status(400).json({ error: 'threadId required' });

      const subscriber = await getSubscriberProfile(userEmail);
      const userId = verifiedUserId;
      const tier = subscriber?.tier || 'free';

      // ── Toggle thread-level visibility ──────────────────────────────────
      // No special privileges for the creator here, same as everywhere
      // else — any owner or participant can flip this.
      if (action === 'set_visibility') {
        const { visibility } = req.body || {};
        if (!['private', 'trust_circle'].includes(visibility)) {
          return res.status(400).json({ error: 'visibility must be private or trust_circle' });
        }
        const [threadRes, partRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&select=id,user_id&limit=1`, { headers: sbHeaders() }),
          fetch(`${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&user_id=eq.${userId}&select=id&limit=1`, { headers: sbHeaders() })
        ]);
        const threadRows = await threadRes.json();
        const partRows = await partRes.json();
        const isOwner = threadRows?.[0]?.user_id === userId;
        const isParticipant = Array.isArray(partRows) && partRows.length > 0;
        if (!threadRows?.length || (!isOwner && !isParticipant)) {
          return res.status(403).json({ error: 'Must own or participate in this thread to change its visibility' });
        }

        await fetch(
          `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}`,
          {
            method: 'PATCH',
            headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ visibility })
          }
        );
        return res.status(200).json({ success: true, visibility });
      }

      // ── Join a Trust Circle thread into my own Archive ──────────────────
      if (action === 'join') {
        const threadRes = await fetch(
          `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&visibility=eq.trust_circle&select=id&limit=1`,
          { headers: sbHeaders() }
        );
        const threadRows = await threadRes.json();
        if (!threadRows?.length) return res.status(404).json({ error: 'Thread not found or not shareable' });

        await fetch(`${SUPABASE_URL}/rest/v1/thread_participants`, {
          method: 'POST',
          headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }),
          body: JSON.stringify({ thread_id: threadId, user_id: userId, active: true })
        });
        return res.status(200).json({ success: true });
      }

      // ── Silent step-back toggle — on/off, reversible, no announcement ───
      if (action === 'toggle_active') {
        const { active } = req.body || {};
        const partRes = await fetch(
          `${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&user_id=eq.${userId}&select=id&limit=1`,
          { headers: sbHeaders() }
        );
        const partRows = await partRes.json();
        if (!partRows?.length) return res.status(403).json({ error: 'Not a participant on this thread' });

        await fetch(
          `${SUPABASE_URL}/rest/v1/thread_participants?id=eq.${partRows[0].id}`,
          {
            method: 'PATCH',
            headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ active: !!active })
          }
        );
        return res.status(200).json({ success: true, active: !!active });
      }

      // ── Update last_seen_at — call when the person actually opens the
      //    thread, so the unseen-contribution count resets for them ───────
      if (action === 'mark_seen') {
        await fetch(
          `${SUPABASE_URL}/rest/v1/thread_participants?thread_id=eq.${threadId}&user_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
            body: JSON.stringify({ last_seen_at: new Date().toISOString() })
          }
        );
        return res.status(200).json({ success: true });
      }

      // ── Mute / unmute a participant — purely personal, scoped to this
      //    one thread. No effect on anyone else, no notification sent ────
      if (action === 'mute' || action === 'unmute') {
        if (!targetUserId) return res.status(400).json({ error: 'targetUserId required' });
        if (targetUserId === userId) return res.status(400).json({ error: 'Cannot mute yourself' });

        if (action === 'mute') {
          await fetch(`${SUPABASE_URL}/rest/v1/thread_mutes`, {
            method: 'POST',
            headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' }),
            body: JSON.stringify({ thread_id: threadId, muter_user_id: userId, muted_user_id: targetUserId })
          });
        } else {
          await fetch(
            `${SUPABASE_URL}/rest/v1/thread_mutes?thread_id=eq.${threadId}&muter_user_id=eq.${userId}&muted_user_id=eq.${targetUserId}`,
            { method: 'DELETE', headers: sbHeaders() }
          );
        }
        return res.status(200).json({ success: true });
      }

      // ── Reset expiry clock (costs 1 query) — unchanged from before ──────
      if (action === 'reset_expiry') {
        const drawRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/draw_query`, {
          method: 'POST',
          headers: sbHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ p_user_id: userId, p_cost: 1 })
        });

        if (!drawRes.ok) {
          const err = await drawRes.text();
          if (err.includes('INSUFFICIENT_QUERIES')) {
            return res.status(402).json({ error: 'INSUFFICIENT_QUERIES' });
          }
          return res.status(500).json({ error: 'Failed to draw query' });
        }

        const retentionDays = { scholar: 90, theologian: 180, trial: 30, free: 1 }[tier] || 90;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
        const graceEndsAt = new Date(expiresAt.getTime() + 30 * 24 * 60 * 60 * 1000);

        await fetch(
          `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${userId}`,
          {
            method: 'PATCH',
            headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
            body: JSON.stringify({
              expires_at:    expiresAt.toISOString(),
              grace_ends_at: graceEndsAt.toISOString(),
              retention_days: retentionDays
            })
          }
        );

        return res.status(200).json({ success: true, expiresAt: expiresAt.toISOString(), daysLeft: retentionDays });
      }

      // ── Rename — unchanged from before ──────────────────────────────────
      if (!title) return res.status(400).json({ error: 'title required for rename' });

      await fetch(
        `${SUPABASE_URL}/rest/v1/threads?id=eq.${threadId}&user_id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: sbHeaders({ 'Content-Type': 'application/json', 'Prefer': 'return=minimal' }),
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
