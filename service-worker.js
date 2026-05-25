const CACHE_NAME = 'qref-ops-v16';
const SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './data/rules.md',
];

// ── INSTALL: cache the app shell ─────────────────────────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
  );
});

// ── ACTIVATE: clean up old cache versions ────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── FETCH: cache-first, no background revalidation ───────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});

// ── MESSAGE: handle manual update requests from the page ─────────────────────
self.addEventListener('message', event => {
  if (!event.data || event.data.type !== 'UPDATE_CACHE') return;

  event.waitUntil(updateCache(event.source));
});

async function updateCache(client) {
  try {
    const cache = await caches.open(CACHE_NAME);

    // 1. Refetch the shell. cache:'reload' bypasses the HTTP cache.
    for (const url of SHELL_ASSETS) {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      await cache.put(url, res.clone());
    }

    // 2. Parse the freshly-downloaded rules.md to find PNG references.
    const rulesRes = await cache.match('./data/rules.md');
    const rulesText = await rulesRes.text();
    const imageUrls = extractImageUrls(rulesText);

    // 3. Fetch and cache every referenced image.
    for (const url of imageUrls) {
      const res = await fetch(url, { cache: 'reload' });
      if (!res.ok) throw new Error(`${url} returned ${res.status}`);
      await cache.put(url, res.clone());
    }

    client.postMessage({
      type: 'UPDATE_RESULT',
      ok: true,
      count: SHELL_ASSETS.length + imageUrls.length,
    });
  } catch (err) {
    client.postMessage({
      type: 'UPDATE_RESULT',
      ok: false,
      error: err.message || String(err),
    });
  }
}

function extractImageUrls(markdown) {
  const urls = new Set();
  // Matches src="..." or src='...'
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(markdown)) !== null) {
    urls.add(m[1]);
  }
  return [...urls];
}