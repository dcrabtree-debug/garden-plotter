const CACHE_NAME = 'garden-plotter-v6';
const ASSETS_TO_CACHE = [
  '/garden-plotter/',
  '/garden-plotter/index.html',
  '/garden-plotter/data/plants.json',
  '/garden-plotter/data/plants-us.json',
  '/garden-plotter/data/companions.json',
  '/garden-plotter/data/seed-links-greenstalk.json',
  '/garden-plotter/data/seed-links-inground.json',
  '/garden-plotter/data/seed-links-greenstalk-us.json',
  '/garden-plotter/data/seed-links-inground-us.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network-first for EVERYTHING — fall back to cache only when offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for offline use
        if (response.ok && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) =>
        cached || (event.request.mode === 'navigate' ? caches.match('/garden-plotter/index.html') : undefined)
      ))
  );
});
