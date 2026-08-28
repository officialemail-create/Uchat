const CACHE_NAME = 'uchat-v3';
const ASSETS_TO_CACHE = [
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/logo.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  // Leave API, socket, and cross-origin requests to the browser.
  if (
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname === '/api' ||
    requestUrl.pathname.startsWith('/api/')
  ) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => response)
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && requestUrl.pathname.startsWith('/assets/')) {
          const responseCopy = response.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || Response.error()))
  );
});