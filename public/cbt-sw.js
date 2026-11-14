/**
 * Great-Favour Montessori School (GFMS)
 * CBT Examination Terminal - Progressive Web App Service Worker
 * Version: 1.0.0
 */

const CACHE_NAME = 'gfms-cbt-cache-v3';

// Critical static assets to pre-cache on service worker installation
const PRECACHE_ASSETS = [
  '/cbt-manifest.webmanifest',
  '/cbt-offline.html',
  '/assets/images/gfms-logo.svg',
  '/assets/images/school-logo.jpg',
  '/logo.jpg',
  '/icon.jpg',
  '/favicon.ico',
];

// Install Event - Pre-cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[GFMS CBT SW] Pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Dynamic routing and caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Never cache non-GET requests (Server Actions, login, exam submissions)
  if (request.method !== 'GET') {
    return;
  }

  // 2. Never cache admin or staff API endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin') || url.pathname.startsWith('/staff')) {
    return;
  }

  // 3. Static Next.js chunks, CSS, fonts, and assets (Network-First with Cache Fallback)
  // Using Network-First guarantees fresh CSS/JS bundles after every build while keeping offline fallback
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|woff2|woff|ttf|ico|css|js)$/i)
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache)).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cachedResponse) => {
            return (
              cachedResponse ||
              new Response('', {
                status: 404,
                statusText: 'Offline asset unavailable',
              })
            );
          });
        })
    );
    return;
  }

  // 4. HTML Page Navigation (Network-First with Offline Fallback)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        })
        .catch(async () => {
          // Attempt to retrieve cached version of the page
          const cachedPage = await caches.match(request);
          if (cachedPage) {
            return cachedPage;
          }
          // If offline and page not cached, return the offline fallback screen
          const offlineFallback = await caches.match('/cbt-offline.html');
          return offlineFallback || new Response('GFMS CBT Terminal is currently offline.', {
            headers: { 'Content-Type': 'text/plain' },
            status: 503,
          });
        })
    );
    return;
  }
});
