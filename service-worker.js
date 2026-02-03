const CACHE_NAME = 'qref-ops-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './data/rules.md' // Add any other data files you create here
];

// 1. INSTALL: Store the basic files immediately
self.addEventListener('install', event => {
  // skipWaiting forces the waiting service worker to become the active service worker
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[Service Worker] Caching all: app shell and content');
      return cache.addAll(ASSETS);
    })
  );
});

// 2. ACTIVATE: Clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
  // claim() makes the service worker take control of the page immediately
  return self.clients.claim(); 
});

// 3. FETCH: Stale-While-Revalidate Strategy
self.addEventListener('fetch', event => {
  // Skip non-GET requests (like POST)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        
        // A. Network Request (Background Update)
        // We always try to fetch the latest version to update the cache
        const fetchPromise = fetch(event.request)
          .then(networkResponse => {
            // Only cache valid responses
            if (networkResponse && networkResponse.status === 200) {
              //const responseClone = networkResponse.clone();
              cache.put(event.request, networkResponse.clone());

              if (event.request.url.includes('rules.md')) {
                // 3. NOTIFY: Tell the main page "We have new data!"
                self.clients.matchAll().then(clients => {
                    clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
                });
              }     
            }
            return networkResponse;
          })
          .catch(err => {
            // Network failed. That's okay, we hopefully have a cache.
            // console.log('[Service Worker] Network fail (offline/lie-fi)');
          });

        // B. Return Strategy
        // 1. If we have it in cache, return that INSTANTLY.
        // 2. If we don't (first visit), return the network promise.
        return cachedResponse || fetchPromise;
      });
    })
  );
});