const CACHE_NAME = 'qref-ops-v7'; // Bumped to v6
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  // REMOVED rules.md from here. We will cache it dynamically.
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
      
      // 1. Prepare the Network Request
      // If it's rules.md, add a random number to FORCE a real network call
      let networkRequest = event.request;
      if (event.request.url.includes('rules.md')) {
         const newUrl = new URL(event.request.url);
         newUrl.searchParams.set('cb', Date.now()); // Cache Buster
         networkRequest = new Request(newUrl);
      }

      // 2. Fetch Logic
      const fetchPromise = fetch(networkRequest)
        .then(async (networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            
            // IMPORTANT: We must store it using the ORIGINAL request (clean URL)
            // or the app won't find it later.
            const responseToCache = networkResponse.clone();
            const responseToCompare = networkResponse.clone();

            if (event.request.url.includes('rules.md')) {
              let shouldNotify = false;
              
              if (cachedResponse) {
                const oldText = await cachedResponse.clone().text();
                const newText = await responseToCompare.text();
                if (oldText !== newText) {
                  shouldNotify = true;
                }
              } else {
                // First load ever? Don't notify, just show.
                shouldNotify = false;
              }

              // Save to cache using the CLEAN event.request (no timestamp)
              await cache.put(event.request, responseToCache);

              if (shouldNotify) {
                self.clients.matchAll().then(clients => {
                  clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
                });
              }
            } else {
              // Normal caching for other files
              cache.put(event.request, responseToCache);
            }
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
        });

      return cachedResponse || fetchPromise;
    })
  );
});