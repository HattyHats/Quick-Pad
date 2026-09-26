const CACHE_NAME = 'quickpad-v32';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache); // Delete old caches
          }
        })
      );
    }).then(() => self.clients.claim()) // Claim control immediately
  );
});

// Network-First Strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network fetch succeeds, clone it and update the cache!
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => {
        // If network fails (offline), fall back to the cache
        return caches.match(event.request, { ignoreSearch: true });
      })
  );
});
