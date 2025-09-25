const CACHE_NAME = "garage-cache-v26";
const DATA_CACHE = "dynamic-data"; // dedicated cache for data.json
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

// Fetch
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // 🔥 Special rule for data.json (always fresh, replace old cache)
  if (url.endsWith("data.json")) {
    // Append timestamp to force network fetch
    const fetchUrl = new URL(event.request.url);
    fetchUrl.searchParams.set("_ts", Date.now());

    event.respondWith(
      fetch(fetchUrl.toString())
        .then((response) => {
          if (response && response.ok) {
            // Save latest version in cache
            const clone = response.clone();
            caches.open(DATA_CACHE).then(async (cache) => {
              // Clear previous cached entries
              const keys = await cache.keys();
              await Promise.all(keys.map((key) => cache.delete(key)));
              await cache.put(event.request, clone);
            });
          }
          return response;
        })
        .catch(() => caches.match(event.request)) // fallback to last cached version
    );
    return;
  }

  // Network-first for .js, .css
  if (url.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (!response || !response.ok) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for HTML + images
  if (url.match(/\.(html|png|jpg|jpeg|gif|webp|svg)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request)
          .then((response) => {
            if (!response || !response.ok) return response;
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            if (event.request.destination === "image") {
              return caches.match("images/images-coming-soon.png");
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
