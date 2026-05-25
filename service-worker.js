const CACHE_NAME = 'qref-ops-v9';
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

        const networkPromise = fetch(event.request.url, { cache: 'no-store' })
          .then(async networkResponse => {
            if (!networkResponse || networkResponse.status !== 200) {
              return cachedResponse;
            }
            if (looksLikePortal(networkResponse)) {
              console.warn('[SW] Captive portal on version check — skipping.');
              return cachedResponse || networkResponse;
            }

            // Clone FIRST — one copy for cache, one to compare, original to return
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
                } else {
                  console.log('[SW] Version unchanged:', oldData.version);
                }
              } catch (e) {
                console.warn('[SW] Version compare failed:', e);
              }
            } else {
              console.log('[SW] No cached version yet — storing baseline.');
            }

            await cache.put(event.request, forCache);
            return networkResponse;
          })
          .catch(err => {
            console.log('[SW] Offline — skipping version check.', err.message);
            return cachedResponse;
          });

        return cachedResponse || networkPromise;
      })
    );
    return;
  }

  // ── ALL OTHER REQUESTS: cache-first, revalidate in background ─────────────
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cachedResponse = await cache.match(event.request);

      const networkPromise = fetch(event.request)
        .then(async networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          // Captive portal guard — don't cache HTML disguised as other assets
          const isHtmlAsset = url.pathname.endsWith('.html') || url.pathname === '/';
          if (!isHtmlAsset && looksLikePortal(networkResponse)) {
            console.warn('[SW] Captive portal on:', event.request.url, '— not caching.');
            return cachedResponse || networkResponse;
          }

          // FIX: clone BEFORE cache.put() so the body isn't locked
          // when the response is also consumed by the browser
          const forCache = networkResponse.clone();
          await cache.put(event.request, forCache);
          return networkResponse;
        })
        .catch(() => null);

      event.waitUntil(networkPromise);
      return cachedResponse || networkPromise;
    })
  );
});
