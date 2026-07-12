// realtime.js
// Supabase Realtime subscription for The Prism — qt.html
// Loaded with defer to execute after main script and avoid
// conflicts with browser security extensions (MetaMask SES lockdown etc.)
// Depends on: window.supabase, window.API_BASE, window.userEmail(),
//             window.renderFUWithSource(), window.escHtml()
//
// IMPORTANT: this file must NOT live under /api — Vercel treats every file
// in that folder as a serverless function and will try to execute it on
// the server (where `window`/`document` don't exist), producing a 500
// error instead of serving it as a plain script to the browser. Keep this
// at the project root (or /public) and reference it as /realtime.js.

(function() {
  'use strict';

  var SUPA_URL  = 'https://fgngixbhpilefmyyeldr.supabase.co';
  var SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnbmdpeGJocGlsZWZteXllbGRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NDg0MTgsImV4cCI6MjA5MzEyNDQxOH0.pnmRHKa3H3kjlA_8e1wpEzwP09A28MRHgQrEsPFBZS8';

  // ── State ──────────────────────────────────────────────────────────────────
  window._supabaseClient    = null;
  window._renderedFuIds     = window._renderedFuIds || new Set();
  window._qtPollInterval    = null;
  window._qtRealtimeChannel = null;

  // ── Supabase client ────────────────────────────────────────────────────────
  function getSupabaseClient() {
    if (window._supabaseClient) return window._supabaseClient;
    if (!window.supabase) return null;
    window._supabaseClient = window.supabase.createClient(SUPA_URL, SUPA_ANON);
    return window._supabaseClient;
  }

  // ── Polling fallback ───────────────────────────────────────────────────────
  function startFollowUpPolling(threadId) {
    if (window._qtPollInterval) clearInterval(window._qtPollInterval);
    window._qtPollInterval = setInterval(function() {
      var base  = window.API_BASE || '';
      var email = typeof window.userEmail === 'function' ? window.userEmail() : null;
      if (!email) return;
      fetch(base + '/api/followups?threadId=' + encodeURIComponent(threadId), {
        headers: { 'x-user-email': email }
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.followUps && data.followUps.length > 0) {
          window.renderFUWithSource(data.followUps);
        }
      })
      .catch(function() {});
    }, 8000);
  }

  // ── Realtime subscription ──────────────────────────────────────────────────
  function startFollowUpRealtime(threadId) {
    // Clean up existing channel
    if (window._qtRealtimeChannel) {
      try { window._qtRealtimeChannel.unsubscribe(); } catch(e) {}
      window._qtRealtimeChannel = null;
    }

    var client = getSupabaseClient();
    if (!client) {
      console.warn('[Realtime] supabase not available — using polling fallback');
      startFollowUpPolling(threadId);
      return;
    }

    try {
      window._qtRealtimeChannel = client
        .channel('follow_ups_' + threadId)
        .on('postgres_changes', {
          event:  'INSERT',
          schema: 'public',
          table:  'follow_ups',
          filter: 'thread_id=eq.' + threadId
        }, function(payload) {
          if (!payload.new) return;
          // Only render recipient contributions —
          // owner's own follow-ups are rendered locally
          if (payload.new.source === 'recipient') {
            if (typeof window.renderFUWithSource === 'function') {
              window.renderFUWithSource([payload.new]);
            }
          }
        })
        .subscribe(function(status) {
          console.log('[Realtime] status:', status, 'thread:', threadId);
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('[Realtime] subscription failed — falling back to polling');
            startFollowUpPolling(threadId);
          }
        });
    } catch(err) {
      console.warn('[Realtime] failed to subscribe:', err.message);
      startFollowUpPolling(threadId);
    }
  }

  // ── renderFUWithSource — intentionally removed from this file ────────────
  // qt.html defines its own, more complete version inline: R1/R2/R3 labeling
  // via assignNodeLabel(), a data-label attribute the CSS renders from,
  // per-node click-to-focus, node controls, and dedup against both id AND
  // already-streamed query text. This file's old copy had none of that.
  //
  // Because this file loads with `defer`, it always executes after every
  // inline script in qt.html has already run — deferred scripts only run
  // once parsing finishes, which is after any inline <script> block by
  // definition. That meant this file's window.renderFUWithSource
  // assignment ran last and silently overwrote qt.html's correct version
  // with this older, label-less one, on every page load. That's the exact
  // cause of R1/R2/R3 not appearing.
  //
  // startFollowUpPolling() and the realtime subscription callback above
  // both already call window.renderFUWithSource(...) rather than a local
  // reference, so removing the definition here doesn't require touching
  // either call site — they now resolve to qt.html's version automatically.

  // ── Expose to global scope ────────────────────────────────────────────────
  window.startFollowUpRealtime = startFollowUpRealtime;
  window.startFollowUpPolling  = startFollowUpPolling;
  window.getSupabaseClient     = getSupabaseClient;

  console.log('[Realtime] realtime.js loaded');

})();

// ── Chat Realtime ───────────────────────────────────────────────────────────
// startChatRealtime/stopChatRealtime intentionally removed from this file —
// qt.html defines its own, more complete version (with per-message ID
// dedup via _renderedChatIds and node_id filtering) inline. Having both
// meant whichever assignment ran last silently won, and this file's
// version — lacking any dedup at all — was rendering every single incoming
// message unconditionally, on top of the optimistic render sendChatMessage()
// already does on send. That's what was causing every message to appear
// twice. One implementation now, not two competing ones.
