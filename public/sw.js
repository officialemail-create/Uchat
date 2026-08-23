// Simple offline shell
const CACHE_NAME = 'uchat-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS_TO_CACHE))
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

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
      .catch(() => {
        // Fallback to index.html for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }

        return Response.error();
      })
  );
});