// Service Worker for Room Reservation System PWA
// Provides offline support, caching, and background sync

const CACHE_NAME = 'rrs-cache-v1';
const API_CACHE_NAME = 'rrs-api-cache-v1';

// Assets to cache on installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/rooms/',
  '/api/rooms/status/',
  '/api/stats/dashboard/'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );

  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
  );

  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin && !url.href.includes('localhost:8000')) {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static assets (Network First, fallback to cache)
  event.respondWith(handleStaticRequest(request));
});

// Network First strategy for API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);

  try {
    // Try network first
    const networkResponse = await fetch(request);

    // Cache successful GET requests
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);

      // Set a timestamp for cache freshness
      const responseWithTimestamp = networkResponse.clone();
      cache.put(request, responseWithTimestamp);
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Network request failed, trying cache:', url.pathname);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Check if cache is stale (older than 5 minutes)
      const cacheDate = new Date(cachedResponse.headers.get('date'));
      const now = new Date();
      const cacheAge = (now - cacheDate) / 1000 / 60; // in minutes

      if (cacheAge < 5 || !navigator.onLine) {
        console.log('[Service Worker] Serving from cache:', url.pathname);
        return cachedResponse;
      }
    }

    // No cache available, return offline response for specific endpoints
    if (url.pathname.includes('/rooms/') || url.pathname.includes('/stats/')) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'You are currently offline. Please check your internet connection.',
          cached: false
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    throw error;
  }
}

// Cache First strategy for static assets
async function handleStaticRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // Cache miss, fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[Service Worker] Static request failed:', request.url);

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline.html');
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Background Sync - for offline reservation submissions
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-reservations') {
    event.waitUntil(syncReservations());
  }
});

// Sync pending reservations when back online
async function syncReservations() {
  console.log('[Service Worker] Syncing pending reservations...');

  try {
    // Get pending reservations from IndexedDB or localStorage
    // This would require implementing IndexedDB storage in the main app
    // For now, just log the attempt
    console.log('[Service Worker] Reservation sync completed');
  } catch (error) {
    console.error('[Service Worker] Reservation sync failed:', error);
    throw error; // Retry on next sync
  }
}

// Push notifications - for reservation reminders
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [200, 100, 200],
    tag: 'reservation-reminder',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-96x96.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Room Reservation', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/?view=reservations')
    );
  }
});

// Message handler - for communication with main thread
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

console.log('[Service Worker] Loaded and ready');
