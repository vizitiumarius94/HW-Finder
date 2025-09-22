const CACHE_NAME = "garage-cache-v2";
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

// Install core files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_ASSETS);
    })
  );
});

// Fetch strategy: cache-first for everything
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache new files like images dynamically
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, response.clone());
          return response;
        });
      }).catch(() => {
        // Optional: return a placeholder image if offline and missing
        if (event.request.destination === "image") {
          return caches.match("images/placeholder.png");
        }
      });
    })
  );
});
