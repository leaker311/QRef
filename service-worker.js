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
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function looksLikePortal(response) {
  const ct = response.headers.get('content-type') || '';
  return ct.includes('text/html');
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // ── VERSION CHECK ──────────────────────────────────────────────────────────
  if (url.pathname.endsWith('version.json')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async cache => {
        const cachedResponse = await cache.match(event.request);

        const networkPromise = fetch(event.request.url, {
          // KEY FIX: bypass the browser's own HTTP cache entirely.
          // GitHub Pages sets max-age=600, so without this the browser
          // returns a stale copy and the SW never sees the new file.
          cache: 'no-store'
        }).then(async networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) return cachedResponse;

          if (looksLikePortal(networkResponse)) {
            console.warn('[SW] Captive portal on version check — skipping.');
            return cachedResponse || networkResponse;
          }

          const forCache   = networkResponse.clone();
          const forCompare = networkResponse.clone();

          if (cachedResponse) {
            try {
              const oldData = await cachedResponse.clone().json();
              const newData = await forCompare.json();
              if (oldData.version !== newData.version) {
                console.log('[SW] New version detected:', oldData.version, '->', newData.version);
                const clients = await self.clients.matchAll();
                clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
              }
            } catch (e) {
              console.warn('[SW] Version compare failed:', e);
            }
          } else {
            console.log('[SW] No cached version yet — storing baseline.');
          }

          // Always store under the original URL (no cache-buster in key)
          await cache.put(event.request, forCache);
          return networkResponse;

        }).catch(err => {
          console.log('[SW] Offline or fetch failed — skipping version check.', err);
          return cachedResponse;
        });

        // Serve cache immediately; version check is fire-and-forget
        return cachedResponse || networkPromise;
      })
    );
    return;
  }

  // ── ALL OTHER REQUESTS: cache-first, revalidate in background ─────────────
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cachedResponse = await cache.match(event.request);

      const networkPromise = fetch(event.request).then(async networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) return networkResponse;

        const isHtmlAsset = url.pathname.endsWith('.html') || url.pathname === '/';
        if (!isHtmlAsset && looksLikePortal(networkResponse)) {
          console.warn('[SW] Captive portal on:', event.request.url, '— not caching.');
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