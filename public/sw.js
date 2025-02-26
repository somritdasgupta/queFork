const CACHE_NAME = "que-fork-offline-v2";
const STATIC_CACHE = "que-fork-static-v2";
const API_CACHE = "que-fork-api-v2";

// Assets that need to be available offline
const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/logo.png",
  "/favicon.ico",
  "/offline",
  "/_next/static/",
];

// API routes to cache
const API_ROUTES = ["/api/health/route.ts", "/api/proxy/route.ts"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE),
    ])
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (![STATIC_CACHE, API_CACHE].includes(key)) {
              return caches.delete(key);
            }
          })
        );
      }),
      self.clients.claim(),
    ])
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request));
  } else if (url.pathname.startsWith("/api/")) {
    // API requests
    event.respondWith(handleApiRequest(request));
  } else if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "image" ||
    STATIC_ASSETS.some((asset) => url.pathname.includes(asset))
  ) {
    // Static assets
    event.respondWith(handleStaticRequest(request));
  }
});

async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    return cachedResponse || caches.match("/offline");
  }
}

async function handleApiRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok && request.method === "GET") {
      const cache = await caches.open(API_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(request);
  }
}

async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    // Update cache in background
    fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, response);
      }
    });
    return cachedResponse;
  }

  // If not in cache, try network
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return default offline asset if available
    if (request.destination === "image") {
      return caches.match("/logo.png");
    }
    return new Response("Not available offline");
  }
}
