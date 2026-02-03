self.addEventListener('install', event => {
event.waitUntil(
caches.open('ops-cache').then(cache => {
return cache.addAll([
'./',
'./index.html',
'./style.css',
'./app.js',
'./data/rules.md'
]);
})
);
});

self.addEventListener('fetch', event => {
event.respondWith(
caches.match(event.request).then(response => {
return response || fetch(event.request);
})
);
});