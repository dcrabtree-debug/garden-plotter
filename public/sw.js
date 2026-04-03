const CACHE_NAME = 'garden-plotter-v2';
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
  // Network-first for HTML, cache-first for assets
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/garden-plotter/index.html'))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
  }
});
