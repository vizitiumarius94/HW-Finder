const CACHE_NAME = "garage-cache-v16";
const DATA_CACHE = "dynamic-data"; // dedicated cache for data.json
const CORE_ASSETS = [
  "index.html",
  "owned.html",
  "series.html",
  "wanted.html",
  "style.css",
  "script.js?v=16",
  "owned.js",
  "series.js",
  "wanted.js",
  "images/images-coming-soon.png" // fallback image
];

// Install
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch with timeout
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Function to create a timeout promise
  const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

  // Network-first for .js, .css with timeout
  if (url.match(/\.(js|css)$/)) {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          if (!response || !response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        }),
        timeout(10000) // 10 seconds timeout
      ]).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for HTML + images with timeout
  if (url.match(/\.(html|png|jpg|jpeg|gif|webp|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return Promise.race([
          fetch(event.request).then((response) => {
            if (!response || !response.ok) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          }),
          timeout(10000) // 10 seconds timeout
        ]).catch(() => {
          if (event.request.destination === "image") {
            return caches.match("images/images-coming-soon.png");
          }
        });
      })
    );
    return;
  }

  // Default: try network with timeout, fallback to cache
  event.respondWith(
    Promise.race([
      fetch(event.request),
      timeout(10000) // 10 seconds timeout
    ]).catch(() => caches.match(event.request))
  );
});


// Listen for skipWaiting from the page
self.addEventListener("message", (event) => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
