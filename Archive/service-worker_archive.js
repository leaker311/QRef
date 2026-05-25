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

      // --- VERSION CHECKING LOGIC ---
      if (event.request.url.includes('version.json')) {
         const newUrl = new URL(event.request.url);
         newUrl.searchParams.set('cb', Date.now()); // Bypass cache for version check
         const networkRequest = new Request(newUrl);

         const fetchPromise = fetch(networkRequest).then(async (networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
               
               // Captive Portal Defense
               const contentType = networkResponse.headers.get('content-type') || '';
               if (contentType.includes('text/html')) {
                  console.warn('Captive portal detected. Skipping version check.');
                  return networkResponse;
               }

               const responseToCache = networkResponse.clone();
               const responseToCompare = networkResponse.clone();

               if (cachedResponse) {
                 // Compare the JSON versions
                 const oldData = await cachedResponse.clone().json();
                 const newData = await responseToCompare.json();
                 
                 if (oldData.version !== newData.version) {
                   // A new version exists! Tell the app to show the UI banner.
                   self.clients.matchAll().then(clients => {
                     clients.forEach(client => client.postMessage({ type: 'UPDATE_AVAILABLE' }));
                   });
                 }
               }
               
               await cache.put(event.request, responseToCache);
            }
            return networkResponse;
         }).catch(() => { /* Offline, do nothing */ });

         event.waitUntil(fetchPromise);
         return cachedResponse || fetchPromise;
      }

      // --- NORMAL FILE CACHING (Images, HTML, JS, Markdown) ---
      // If it's not the version file, use standard Stale-While-Revalidate
      const fetchPromise = fetch(event.request).then(async (networkResponse) => {
         if (networkResponse && networkResponse.status === 200) {
            await cache.put(event.request, networkResponse.clone());
         }
         return networkResponse;
      }).catch(() => { /* Offline fallback */ });

      event.waitUntil(fetchPromise);
      return cachedResponse || fetchPromise;
    })
  );
});