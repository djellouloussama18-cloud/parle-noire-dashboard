const CACHE_NAME = 'parle-noire-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/icons/pwa-192x192.png',
  '/icons/pwa-512x512.png'
];

// 1. Install - Cache App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 2. Activate - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Fetch - Cache First for static, Network First for Supabase
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Supabase requests (Network First)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful GET responses
          if (request.method === 'GET' && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache for failed network requests
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            // Fallback for API failures if not in cache
            return new Response(JSON.stringify({ error: 'offline' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // Static Assets (Cache First)
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request).then((response) => {
        // Cache new assets on the fly
        if (response.status === 200 && (url.origin === self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(() => {
        // Fallback for index.html if network fails
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return caches.match('/offline.html');
      });
    })
  );
});
