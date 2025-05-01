const CACHE_NAME = 'cubic-elearning-cache-v2';
const DYNAMIC_CACHE = 'cubic-elearning-dynamic-v2';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/main.chunk.js',
  '/static/js/0.chunk.js',
  '/static/js/bundle.js',
  '/static/css/main.chunk.css',
  '/manifest.json',
  '/favicon.ico',
  // Add routes that should work offline
  '/courses',
  '/dashboard'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map(name => caches.delete(name))
      );
    })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip API calls that aren't for static assets
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Handle navigation requests (HTML)
  if (event.request.mode === 'navigate' || 
      (event.request.method === 'GET' && 
       event.request.headers.get('accept').includes('text/html'))) {
    
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails, serve the cached index.html
          // This enables offline SPA navigation
          return caches.match('/index.html');
        })
    );
    return;
  }
  
  // Handle media assets (images, videos)
  if (event.request.url.match(/\.(jpg|jpeg|png|gif|mp4|webm|svg|woff|woff2|ttf|eot)$/)) {
    event.respondWith(
      caches.match(event.request).then(response => {
        // Return cached response if found
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network and cache
        return fetch(event.request)
          .then(networkResponse => {
            // Clone the response as it can only be consumed once
            const responseToCache = networkResponse.clone();
            
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseToCache);
            });
            
            return networkResponse;
          })
          .catch(error => {
            console.log('Failed to fetch asset:', error);
            // Return a fallback if possible
            if (event.request.url.match(/\.(jpg|jpeg|png|gif|svg)$/)) {
              return new Response('', {
                status: 200,
                headers: {'Content-Type': 'image/svg+xml'}
              });
            }
            throw error;
          });
      })
    );
    return;
  }
  
  // For JavaScript, CSS and other assets
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Otherwise try to fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Cache the response for future use
            const responseToCache = networkResponse.clone();
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, responseToCache);
            });
            return networkResponse;
          })
          .catch(error => {
            console.log('Failed to fetch resource:', error);
            // For non-HTML requests that fail, just propagate the error
            throw error;
          });
      })
  );
});
