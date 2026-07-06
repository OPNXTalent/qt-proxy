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

  // ── renderFUWithSource ────────────────────────────────────────────────────
  // shouldScroll defaults to true, matching the original behavior for a
  // genuine live single-item arrival (someone's comment appearing in real
  // time while you're watching). Bulk restores (opening a thread fresh from
  // Archive) explicitly pass false — without this, the last item in a
  // multi-item restore would always drag the view back down to the bottom,
  // undoing the scroll-to-top that selectThread() already tries to do.
  function renderFUWithSource(list, shouldScroll) {
    if (!list || !list.length) return;
    if (shouldScroll === undefined) shouldScroll = true;

    var fuSec = document.getElementById('followUpSection');
    if (fuSec) fuSec.style.display = 'block';

    var container = document.getElementById('resultContent') || fuSec;
    if (!container) return;

    var esc = typeof window.escHtml === 'function' ? window.escHtml : function(s) { return s || ''; };

    list.forEach(function(fu) {
      var fuId = fu.id || (fu.query + '_' + fu.created_at);
      if (window._renderedFuIds.has(fuId)) return;
      window._renderedFuIds.add(fuId);

      var isRecipient = fu.source === 'recipient';
      var response    = fu.response || {};
      var bodyText    = '';

      if (typeof response === 'string') {
        bodyText = response;
      } else if (response.text) {
        bodyText = response.text;
      } else if (response.recognition) {
        bodyText = [response.recognition, response.core_insight, response.kingdom_implication]
          .filter(Boolean).join('\n\n');
      }

      var paras = bodyText.split(/\n\n/).filter(Boolean).map(function(p) {
        return '<p>' + esc(p.replace(/\n/g, ' ')) + '</p>';
      }).join('');

      var el = document.createElement('div');
      el.className = 'fu-block' + (isRecipient ? ' from-recipient' : '');
      el.innerHTML =
        (isRecipient ? '<div class="fu-label-recipient">From the person you shared with</div>' : '') +
        '<div class="fu-question">' + esc(fu.query || '') + '</div>' +
        '<div class="fu-body">' + (paras || '<p>' + esc(bodyText) + '</p>') + '</div>';

      container.appendChild(el);
      if (shouldScroll) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  // ── Expose to global scope ────────────────────────────────────────────────
  window.startFollowUpRealtime = startFollowUpRealtime;
  window.startFollowUpPolling  = startFollowUpPolling;
  window.renderFUWithSource    = renderFUWithSource;
  window.getSupabaseClient     = getSupabaseClient;

  console.log('[Realtime] realtime.js loaded');

})();

// ── Chat Realtime subscription ─────────────────────────────────────────────
var _chatRealtimeChannel = null;

function startChatRealtime(shareId) {
  if (_chatRealtimeChannel) {
    try { _chatRealtimeChannel.unsubscribe(); } catch(e) {}
    _chatRealtimeChannel = null;
  }

  var client = getSupabaseClient();
  if (!client) return;

  try {
    _chatRealtimeChannel = client
      .channel('share_chat_' + shareId)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'share_chat_messages',
        filter: 'share_id=eq.' + shareId
      }, function(payload) {
        if (!payload.new) return;
        var msg = payload.new;
        var senderName = typeof window.getChatParticipantName === 'function'
          ? window.getChatParticipantName() : 'You';
        var isMine = msg.message_type === 'sender' &&
          msg.display_name === senderName;
        if (typeof window.renderChatMessage === 'function') {
          window.renderChatMessage({
            id:   msg.id,
            name: msg.display_name || (isMine ? senderName : 'Participant'),
            text: msg.content,
            mine: isMine
          });
        }
        if (typeof window.updateChatBarUI === 'function') {
          window.updateChatBarUI();
        }
      })
      .subscribe(function(status) {
        console.log('[Realtime] chat status:', status, 'share:', shareId);
      });
  } catch(err) {
    console.warn('[Realtime] chat subscribe failed:', err.message);
  }
}

function stopChatRealtime() {
  if (_chatRealtimeChannel) {
    try { _chatRealtimeChannel.unsubscribe(); } catch(e) {}
    _chatRealtimeChannel = null;
  }
}

window.startChatRealtime = startChatRealtime;
window.stopChatRealtime  = stopChatRealtime;
