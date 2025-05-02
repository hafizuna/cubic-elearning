const CACHE_NAME = 'cubic-elearning-cache-v3';
const DYNAMIC_CACHE = 'cubic-elearning-dynamic-v3';

// Version number to force update when code changes
const VERSION = '1.0.2';

// Function to check if we're online
function isOnline() {
  return self.navigator && self.navigator.onLine;
}

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

// Install event - cache static assets and skip waiting
self.addEventListener('install', event => {
  console.log('Service Worker installing with version:', VERSION);
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME)
        .then(cache => {
          console.log('Caching static assets');
          return cache.addAll(STATIC_ASSETS);
        }),
      // Force the waiting service worker to become active
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches and claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
            .map(name => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim()
    ])
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
      // Always try network first for HTML requests
      fetch(event.request)
        .catch(() => {
          console.log('Network request failed, falling back to cache for:', event.request.url);
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
  
  // For JavaScript, CSS and other assets - Network First Strategy
  event.respondWith(
    // Check if we're online
    fetch(event.request)
      .then(networkResponse => {
        // We're online! Cache the response for offline use
        const responseToCache = networkResponse.clone();
        caches.open(DYNAMIC_CACHE).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      })
      .catch(error => {
        console.log('Network request failed, falling back to cache for:', event.request.url);
        // We're offline, try the cache
        return caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            console.log('No cache entry found for:', event.request.url);
            throw error;
          });
      })
  );
});
