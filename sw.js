const CACHE_NAME = 'ims-pos-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/recharts@^3.4.1',
  'https://aistudiocdn.com/react-dom@^19.2.0',
  'https://aistudiocdn.com/@google/genai@^1.29.1'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache for pre-caching');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(error => {
        console.error('Failed to pre-cache resources:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (networkResponse) => {
            if (!networkResponse || networkResponse.status !== 200 && networkResponse.type !== 'opaque') {
              return networkResponse;
            }

            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        ).catch(error => {
            console.error('Fetch failed; returning offline fallback (if any).', error);
        });
      })
  );
});