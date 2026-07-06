// sw.js — The Prism PWA service worker
//
// Scope: this only caches the static app shell (HTML/JS/images) so the app
// installs cleanly and launches instantly. It deliberately does NOT cache
// anything under /api/ or any Supabase request — those must always hit the
// network live, since this is a dynamic AI interpretation app, not a
// content site. There is no meaningful "offline mode" for the interpreter
// itself; this service worker exists to satisfy installability and speed
// up shell loading, not to provide offline AI responses.

const CACHE_NAME = 'prism-shell-v1';

// Keep this list small and static-only. Do not add qt.html here as a
// blanket precache target beyond what's needed for install — it changes
// too often during active development, and stale cached HTML would be a
// worse experience than a fresh network fetch.
const APP_SHELL = [
  '/realtime.js',
  '/ThePrism.png',
  '/prism-logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('[SW] precache skipped some assets:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Never intercept API calls or Supabase traffic — always live, no cache
  if (url.pathname.startsWith('/api/') || url.hostname.indexOf('supabase.co') !== -1) {
    return;
  }

  // Only handle same-origin GET requests
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // Stale-while-revalidate: serve from cache instantly if available, and
  // quietly refresh the cache in the background for next time.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
