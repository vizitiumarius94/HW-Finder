const CACHE_NAME = "garage-cache-v11";
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
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  // Do NOT call skipWaiting here – we want the new SW to enter "waiting"
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  return self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
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

// Listen for skipWaiting from the page
self.addEventListener("message", (event) => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});