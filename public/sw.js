// Service Worker for Push Notifications and Offline Support

const CACHE_NAME = 'strands-v1';
const urlsToCache = [
  '/',
  '/home',
  '/groups',
  '/friends',
  '/profile',
  '/icon-192x192.png',
  '/icon-512x512.png',
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .catch(function(error) {
        console.error('Service Worker: Cache failed', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache when offline, fallback to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip API requests - always use network for API calls
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Return cached version or fetch from network
        return response || fetch(event.request).then(function(fetchResponse) {
          // Don't cache if not a valid response
          if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
            return fetchResponse;
          }

          // Clone the response
          const responseToCache = fetchResponse.clone();

          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(event.request, responseToCache);
            });

          return fetchResponse;
        });
      })
      .catch(function() {
        // If both cache and network fail, return offline page if available
        if (event.request.destination === 'document') {
          return caches.match('/');
        }
      })
  );
});

// Push notification event
self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Strands';
  
  // Get the origin from registration scope or use a fallback
  const getOrigin = function() {
    if (self.registration && self.registration.scope) {
      try {
        const url = new URL(self.registration.scope);
        return url.origin;
      } catch (e) {
        // Fallback if URL parsing fails
      }
    }
    // Fallback: try to get from self.location if available
    if (self.location && self.location.origin) {
      return self.location.origin;
    }
    // Last resort: use empty string (relative paths should still work)
    return '';
  };
  
  const origin = getOrigin();
  const iconPath = data.icon || '/icon-192x192.png';
  const badgePath = data.badge || '/icon-192x192.png';
  
  const options = {
    body: data.body || 'You have a new notification',
    icon: iconPath.startsWith('http') ? iconPath : (origin + iconPath),
    badge: badgePath.startsWith('http') ? badgePath : (origin + badgePath),
    tag: data.tag || 'strands-notification',
    data: data.data || {},
    requireInteraction: false,
    silent: false,
  };

  event.waitUntil(
    // First ensure the icon is cached, then show notification
    caches.match('/icon-192x192.png')
      .then(function(cachedIcon) {
        if (!cachedIcon) {
          // Cache the icon if not already cached
          return fetch('/icon-192x192.png')
            .then(function(response) {
              if (response.ok) {
                const cache = caches.open(CACHE_NAME);
                return cache.then(function(c) {
                  c.put('/icon-192x192.png', response.clone());
                  return response;
                });
              }
              return response;
            })
            .catch(function() {
              // If fetch fails, continue anyway
              return null;
            });
        }
        return cachedIcon;
      })
      .then(function() {
        // Show notification with absolute URL
        return self.registration.showNotification(title, options);
      })
      .catch(function(error) {
        console.error('Error showing notification:', error);
        // Show notification anyway, even if icon caching failed
        return self.registration.showNotification(title, options);
      })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const data = event.notification.data;
  const urlToOpen = data.url || '/home';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

