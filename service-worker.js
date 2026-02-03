const CACHE_NAME = 'qref-ops-v3'; // Bumped to v3 to force clean install
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './data/rules.md'
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cachedResponse = await cache.match(event.request);
      
      // Network Fetch with "Diff Check" logic
      const fetchPromise = fetch(event.request)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            
            // 1. Clone the new response so we can read it
            const responseToCache = networkResponse.clone();
            const responseToCompare = networkResponse.clone();
            
            // 2. If this is the rules file, COMPARE it with cache before notifying
            if (event.request.url.includes('rules.md')) {
              let shouldNotify = false;
              
              if (cachedResponse) {
                const oldText = await cachedResponse.clone().text();
                const newText = await responseToCompare.text();
                if (oldText !== newText) {
                  shouldNotify = true;
                }
              } else {
                // If no cache exists yet, we don't notify, we just show it.
                shouldNotify = false; 
              }

              // 3. Update the cache
              await cache.put(event.request, responseToCache);

              // 4. ONLY notify if content actually changed
              if (shouldNotify) {
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
                });
              }
            } else {
              // Standard caching for other files (css, js)
              cache.put(event.request, responseToCache);
            }
          }
          return networkResponse;
        })
        .catch(() => {
          // console.log('Offline');
        });

      // Return cached response immediately, or wait for network if cache is empty
      return cachedResponse || fetchPromise;
    })
  );
});