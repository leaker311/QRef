const CACHE_NAME = 'qref-ops-v11';
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
              return cachedResponse ? cachedResponse.clone() : networkResponse;
            }

            // Read the entire body as text ONCE into a plain string.
            // This completely avoids any clone/body-locked issues.
            const bodyText = await networkResponse.text();

            // Compare versions using the raw text
            if (cachedResponse) {
              try {
                const oldText = await cachedResponse.clone().text();
                const oldData = JSON.parse(oldText);
                const newData = JSON.parse(bodyText);
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

            // Build a brand new Response from the text to put in cache.
            // Never reuse the original networkResponse — its body is consumed.
            const freshResponse = new Response(bodyText, {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
            await cache.put(event.request, freshResponse);

            // Return another fresh Response to the app
            return new Response(bodyText, {
              status: 200,
              headers: { 'Content-Type': 'application/json' }
            });
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

          const isHtmlAsset = url.pathname.endsWith('.html') || url.pathname === '/';
          if (!isHtmlAsset && looksLikePortal(networkResponse)) {
            console.warn('[SW] Captive portal on:', event.request.url, '— not caching.');
            return cachedResponse || networkResponse;
          }

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
