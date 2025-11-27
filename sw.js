const CACHE_NAME = 'ims-pos-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // We attempt to cache core files, but don't fail if one fails (optional)
      return cache.addAll(URLS_TO_CACHE).catch(err => console.warn('Failed to cache some assets during install', err));
    })
  );
});

// Fetch event - Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip sync API calls from caching to ensure data freshness logic is handled by SyncService
  if (url.pathname.includes('/sync/')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            // If it's an external CDN (cors/opaque), we still might want to cache it
            if (networkResponse && (networkResponse.type === 'cors' || networkResponse.type === 'opaque')) {
                 // Proceed to cache
            } else {
                return networkResponse;
            }
        }

        // Clone response to cache
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request);
      })
  );
});

// Activate - clean old caches
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
});