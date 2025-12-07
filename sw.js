
const CACHE_NAME = 'ims-pos-v5';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  './index.tsx',
  './types.ts',
  './constants.ts',
  './App.tsx',
  './utils/db.ts',
  './utils/crypto.ts',
  './utils/idGenerator.ts',
  './services/SyncService.ts',
  './hooks/usePersistedState.ts',
  './hooks/useGlobalAuth.ts',
  './hooks/useLocalStorage.ts',
  './hooks/useVirtualizer.ts',
  './components/Icons.tsx',
  './components/Dashboard.tsx',
  './components/POS.tsx',
  './components/Inventory.tsx',
  './components/Procurement.tsx',
  './components/Reports.tsx',
  './components/Analysis.tsx',
  './components/Settings.tsx',
  './components/Customers.tsx',
  './components/Users.tsx',
  './components/UserSettings.tsx',
  './components/context/AuthContext.tsx',
  './components/context/AppContext.tsx',
  './components/context/ProductContext.tsx',
  './components/context/SalesContext.tsx',
  './components/context/SettingsContext.tsx',
  './components/context/UIStateContext.tsx',
  './components/context/CustomerContext.tsx',
  './components/context/GlobalAuthContext.tsx',
  './components/auth/UnifiedAuth.tsx',
  './components/auth/WorkspaceSelector.tsx',
  './components/auth/GlobalAuth.tsx',
  './components/layout/MainLayout.tsx',
  './components/common/Card.tsx',
  './components/common/Modal.tsx',
  './components/common/NotificationsPanel.tsx',
  './components/common/Pagination.tsx',
  './components/common/PrintableReceipt.tsx',
  './components/common/ProductVariantSelector.tsx',
  './components/common/ToggleSwitch.tsx',
  './components/common/ToastContainer.tsx',
  './components/common/AccordionSection.tsx',
  './components/common/Dropdown.tsx',
  './components/common/FilterMenu.tsx',
  './components/common/FilterDropdown.tsx',
  './components/inventory/ProductsView.tsx',
  './components/inventory/CategoriesView.tsx',
  './components/inventory/InventoryValuationView.tsx',
  './components/inventory/PurchaseOrdersView.tsx',
  './components/inventory/SuppliersView.tsx',
  './components/settings/DataManagement.tsx',
  './components/settings/ThemeSelector.tsx',
  './components/settings/CurrencyDisplaySelector.tsx',
  './components/settings/CurrencyManager.tsx',
  './components/settings/ZoomSelector.tsx',
  './components/settings/TimezoneSelector.tsx',
  './components/settings/PaddingSelector.tsx'
];

// Install event - cache core assets immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force activation immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.warn('Pre-caching failed for some assets:', err);
      });
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
        // We cache everything that works to ensure "whole app" is available offline
        if (networkResponse && (networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
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
            return caches.match('./index.html');
        }
        
        return null;
      })
  );
});
