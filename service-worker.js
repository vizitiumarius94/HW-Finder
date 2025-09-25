const CACHE_NAME = "garage-cache-v22" ;
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
  "images/images-coming-soon.png" // fallback image
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Network-first for .js, .css, .json
  if (url.match(/\.(js|css|json)$/)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // update cache
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request)) // fallback to cache
    );
    return;
  }

  // Cache-first for HTML + images
  if (url.match(/\.(html|png|jpg|jpeg|gif|webp|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request)
          .then(response => {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
            return response;
          })
          .catch(() => {
            if (event.request.destination === "image") {
              return caches.match("images/placeholder.png");
            }
          });
      })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

// Listen for skipWaiting from the page
self.addEventListener("message", (event) => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});