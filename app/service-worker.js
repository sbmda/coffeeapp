const cacheName = "CoffeeJournal-v1";
const assetsToCache = [
    "/index.html",
    "/style.css",
    "/app.js",
    "/img/icon-192x192.png",
    "/img/icon-512x512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(cacheName)
            .then(cache => cache.addAll(assetsToCache))
    );
});

self.addEventListener("fetch", event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
