const CACHE_NAME = 'que-fork-offline-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/offline',
        '/favicon.ico',
        // Add other static assets needed for offline page
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match('/offline') || new Response('Offline');
    })
  );
});
