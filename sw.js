
const CACHE_NAME = 'ims-pos-v10';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js'
];

// Install event - cache core assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We use map to add items individually so one failure doesn't break the rest,
      // but for PWA install, we really want them all.
      return Promise.all(
        URLS_TO_CACHE.map(url => {
          return cache.add(url).catch(err => {
            console.warn(`SW: Failed to cache ${url}:`, err);
          });
        })
      );
    })
  );
});

// Activate - clean old caches and claim clients
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
    }).then(() => self.clients.claim()) // Control pages immediately
  );
});

// Fetch event - Network First, Fallback to Cache, with Navigation Fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests and Sync API calls
  if (event.request.method !== 'GET' || url.pathname.includes('/sync/')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Cache valid responses (basic) and opaque responses (CDNs/CORS)
        // Note: Opaque responses (type 'opaque') cannot be verified for success (status 0),
        // but we cache them anyway for fonts/scripts.
        if (networkResponse && (networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                try {
                    cache.put(event.request, responseToCache);
                } catch (e) {
                    console.warn('SW: Cache put failed', e);
                }
            });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Network failed, try cache
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;

        // CRITICAL: If navigation request (e.g. reload /pos), return index.html
        if (event.request.mode === 'navigate') {
            return caches.match('/index.html') || caches.match('/');
        }
        
        return null;
      })
  );
});
