const CACHE_NAME = 'qref-ops-v8';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  // FIX 1: Chain clients.claim() inside waitUntil so the new SW
  // takes control before any fetch events fire.
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Shared captive-portal check — returns true if the response looks like
// a portal redirect (an HTML page when we expected data/assets).
function looksLikePortal(response) {
  const ct = response.headers.get('content-type') || '';
  return ct.includes('text/html');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── VERSION CHECK ──────────────────────────────────────────────────────────
  // FIX 2: Match and store using the ORIGINAL URL (no cache-busting param
  // in the cache key). We only add the param on the outgoing network request
  // so the browser doesn't serve a stale disk-cache copy.
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cachedResponse = await cache.match(event.request); // original URL

        // Build a fresh network URL with cache-buster (network only, not stored)
        const networkUrl = new URL(event.request.url);
        networkUrl.searchParams.set('cb', Date.now());

        const networkPromise = fetch(networkUrl.toString()).then(async networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;

          // FIX 3: Captive-portal guard — if we got HTML, bail out silently.
          if (looksLikePortal(networkResponse)) {
            console.warn('[SW] Captive portal detected on version check. Skipping.');
            return cachedResponse || networkResponse;
          }

          const forCache    = networkResponse.clone();
          const forCompare  = networkResponse.clone();

          if (cachedResponse) {
            try {
              const oldData = await cachedResponse.clone().json();
              const newData = await forCompare.json();
              if (oldData.version !== newData.version) {
                const clients = await self.clients.matchAll();
                clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
              }
            } catch (e) {
              console.warn('[SW] Version compare failed:', e);
            }
          }

          // Store under the ORIGINAL request URL so future cache.match() finds it.
          await cache.put(event.request, forCache);
          return networkResponse;
        }).catch(() => {
          console.log('[SW] Offline — skipping version check.');
          return cachedResponse;
        });

        // Always serve from cache immediately if we have it;
        // the network check happens in the background.
        return cachedResponse || networkPromise;
      })
    );
    return;
  }

  // ── ALL OTHER REQUESTS: Stale-While-Revalidate ─────────────────────────────
  // FIX 4: Apply the captive-portal guard here too. This is the critical fix
  // that stops a portal login page from being cached as rules.md.
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cachedResponse = await cache.match(event.request);

      const networkPromise = fetch(event.request).then(async networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;

        // If we got HTML back for a non-HTML asset, it's a portal — don't cache it.
        const isHtmlAsset = url.pathname.endsWith('.html') || url.pathname === '/';
        if (!isHtmlAsset && looksLikePortal(networkResponse)) {
          console.warn('[SW] Captive portal detected on:', event.request.url, '— not caching.');
          return cachedResponse || networkResponse;
        }

        await cache.put(event.request, networkResponse.clone());
        return networkResponse;
      }).catch(() => null);

      event.waitUntil(networkPromise);
      return cachedResponse || networkPromise;
    })
  );
});
