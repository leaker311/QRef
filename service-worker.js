const CACHE_NAME = 'qref-ops-v5'; // bump version when core files change

const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './data/rules.md'
];

// ----------------------------
// INSTALL
// ----------------------------
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// ----------------------------
// ACTIVATE
// ----------------------------
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ----------------------------
// FETCH
// ----------------------------
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 🔁 SPECIAL HANDLING FOR rules.md (network-first + diff + notify)
  if (url.includes('data/rules.md')) {
    event.respondWith(
      fetch(event.request)
        .then(async networkResponse => {
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(event.request);

          const newText = await networkResponse.clone().text();
          let shouldNotify = false;

          if (cachedResponse) {
            const oldText = await cachedResponse.clone().text();
            if (oldText !== newText) {
              shouldNotify = true;
            }
          }

          // Always update cache
          await cache.put(event.request, networkResponse.clone());

          // Notify UI only if content changed
          if (shouldNotify) {
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
              client.postMessage({ type: 'UPDATE_AVAILABLE' });
            });
          }

          // ✅ IMPORTANT: return NETWORK version
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          return cached;
        })
    );
    return;
  }

  // 📦 STANDARD ASSETS (cache-first)
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request);
    })
  );
});
