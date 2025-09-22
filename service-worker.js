const CACHE_NAME = "garage-cache-v3";
const CORE_ASSETS = [
  "index.html",
  "owned.html",
  "series.html",
  "wanted.html",
  "style.css",
  "script.js",
  "owned.js",
  "series.js",
  "wanted.js",
  "data.json",
  "data.jsonbak",
  "dataBAK.json"
];

// Install
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting(); // install immediately
});

// Activate + cleanup
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim(); // take control of open pages
});

// Fetch strategy
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Network-first for data.json
  if (url.endsWith("data.json")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for others
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => {
        if (event.request.destination === "image") {
          return caches.match("images/placeholder.png");
        }
      });
    })
  );
});

// 🔔 Notify clients when a new SW is ready
self.addEventListener("install", () => {
  self.skipWaiting();
});