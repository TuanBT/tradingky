const CACHE_NAME = "tradingky-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Skip non-GET requests and external API calls (Firebase, etc.)
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }
  // Network-first strategy for same-origin GET requests
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
