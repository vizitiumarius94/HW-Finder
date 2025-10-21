const CACHE_NAME = "garage-cache-v31"; // bump version
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

// ========== INSTALL ==========
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// ========== ACTIVATE ==========
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

// Helper: timeout promise
function timeout(ms) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout")), ms)
  );
}

// ========== FETCH ==========
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // ---- Network-first for HTML ----
  if (url.match(/\.html$/)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || !response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, clone)
          );
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ---- Network-first for .js and .css (with timeout + cache update) ----
  if (url.match(/\.(js|css)$/)) {
    event.respondWith(
      Promise.race([
        fetch(event.request).then((response) => {
          if (!response || !response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(event.request, clone)
          );
          return response;
        }),
        timeout(10000),
      ]).catch(() => caches.match(event.request))
    );
    return;
  }

  // ---- Cache-first for images (fallback to placeholder) ----
  if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return Promise.race([
          fetch(event.request).then((response) => {
            if (!response || !response.ok) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(event.request, clone)
            );
            return response;
          }),
          timeout(10000),
        ]).catch(() => caches.match("images/images-coming-soon.png"));
      })
    );
    return;
  }

  // ---- Default: try network with timeout, fallback to cache ----
  event.respondWith(
    Promise.race([fetch(event.request), timeout(10000)]).catch(() =>
      caches.match(event.request)
    )
  );
});

// ========== MESSAGE LISTENER ==========
self.addEventListener("message", (event) => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
  }
});
