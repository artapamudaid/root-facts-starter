const CACHE_NAME = 'root-facts-cache-v6';
const LOCAL_ASSETS_TO_CACHE = [
  './',
  './index.html',
  './sw.js',
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

const REMOTE_MODEL_ASSETS_TO_CACHE = [
  'https://huggingface.co/Xenova/LaMini-Flan-T5-77M/resolve/main/tokenizer.json',
  'https://huggingface.co/Xenova/LaMini-Flan-T5-77M/resolve/main/tokenizer_config.json',
  'https://huggingface.co/Xenova/LaMini-Flan-T5-77M/resolve/main/config.json'
];

const CACHE_FIRST_PATHS = [
  '/model/',
  '/assets/',
  '/manifest.json',
  '/index.html',
  '/sw.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return Promise.all([
          cache.addAll(LOCAL_ASSETS_TO_CACHE),
          Promise.allSettled(
            REMOTE_MODEL_ASSETS_TO_CACHE.map((asset) => cache.add(asset))
          )
        ]);
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const isCacheableResponse = (response) => {
  return response && (response.status === 200 || response.type === 'opaque');
};

const isRemoteModelAsset = (url) => {
  return url.hostname === 'huggingface.co'
    && url.pathname.includes('/Xenova/LaMini-Flan-T5-77M/')
    && (
      url.pathname.endsWith('/tokenizer.json')
      || url.pathname.endsWith('/tokenizer_config.json')
      || url.pathname.endsWith('/config.json')
    );
};

const isStaticLocalAsset = (url) => {
  if (url.origin !== self.location.origin) return false;

  return CACHE_FIRST_PATHS.some((path) => {
    return url.pathname.endsWith(path) || url.pathname.includes(path);
  });
};

const cacheFirst = async (request) => {
  const cachedResponse = await caches.match(request, { ignoreSearch: true });
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(request);
  if (isCacheableResponse(networkResponse)) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, networkResponse.clone());
  }

  return networkResponse;
};

const staleWhileRevalidate = async (request) => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request, { ignoreSearch: true });

  const networkResponsePromise = fetch(request)
    .then((networkResponse) => {
      if (isCacheableResponse(networkResponse)) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    });

  if (cachedResponse) {
    networkResponsePromise.catch(() => undefined);
    return cachedResponse;
  }

  return networkResponsePromise;
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    (async () => {
      const requestUrl = new URL(event.request.url);

      if (isStaticLocalAsset(requestUrl) || isRemoteModelAsset(requestUrl)) {
        return cacheFirst(event.request);
      }

      if (requestUrl.origin !== self.location.origin) {
        return staleWhileRevalidate(event.request);
      }

      try {
        return await fetch(event.request);
      } catch (error) {
        const cachedResponse = await caches.match(event.request, { ignoreSearch: true });
        return cachedResponse || caches.match('./index.html');
      }
    })()
  );
});
