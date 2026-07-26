const CACHE_NAME = 'root-facts-cache-v5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/js/core/app.js',
  './assets/js/core/config.js',
  './assets/js/core/utils.js',
  './assets/js/ui/ui.handler.js',
  './assets/js/services/camera.service.js',
  './assets/js/services/detection.service.js',
  './assets/js/services/facts.service.js',
  './model/model.json',
  './model/weights.bin',
  './model/metadata.json',
  './assets/icons/favicon.ico',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Hanya proses request http dan https
  if (!event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Clone the request for fetch
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          (response) => {
            // Check if we received a valid response
            if (!response || (response.status !== 200 && response.type !== 'opaque')) {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache dynamic assets for offline support (CDN, fonts, dll)
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          }
        ).catch(() => {
            // Offline fallback if needed
        });
      })
  );
});
