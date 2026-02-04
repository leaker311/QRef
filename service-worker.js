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
  )