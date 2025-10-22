const CACHE_NAME = "garage-cache-v37"; // bump version
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

// ========== FETCH (UPDATED to include data.json cache-first-then-network) ==========
self.addEventListener("fetch", (event) => {
  const url = event.request.url;
  const path = new URL(url).pathname;

  // ---- Cache-first-then-network for data.json ----
  if (path.endsWith('/data.json')) {
      event.respondWith(
          caches.open(DATA_CACHE).then(cache => {
              return cache.match(event.request).then(cachedResponse => {
                  const networkFetch = fetch(event.request).then(response => {
                      // Cache the fresh copy regardless of whether we served a cached one
                      if (response.ok) {
                          cache.put(event.request, response.clone());
                      }
                      return response;
                  }).catch(() => {
                      // If both network and cache fail, we fall back to the cached response if available
                      return cachedResponse || new Response('{"error": "data not available"}', { status: 503, headers: { 'Content-Type': 'application/json' } });
                  });

                  // If we have a cached response, return it immediately, otherwise wait for network
                  return cachedResponse || networkFetch;
              });
          })
      );
      return;
  }

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

// ========== MESSAGE LISTENER (UPDATED FOR FULL HARD REFRESH) ==========
self.addEventListener("message", (event) => {
  if (event.data.action === "skipWaiting") {
    self.skipWaiting();
    return;
  }

  // --- MANUAL HARD REFRESH ALL CACHES ---
  if (event.data.action === 'manualHardRefreshAll') {
      console.log("[SW] Hard refresh requested. Re-fetching all core and data assets.");
      
      const allAssets = [
          ...CORE_ASSETS, 
          'data.json' // Include the data file
      ].map(asset => {
          // *** FIX: Remove leading slash if present, to ensure correct relative pathing on GitHub Pages sub-directory ***
          return asset.startsWith('/') ? asset.substring(1) : asset; 
      });

      const refreshPromises = allAssets.map(assetUrl => {
          // Determine which cache to use
          const cacheToUse = assetUrl.endsWith('data.json') ? DATA_CACHE : CACHE_NAME;
          // Use the raw, non-rooted URL for fetching (e.g., 'style.css' instead of '/style.css')
          const request = assetUrl; 

          // Force network fetch, bypassing all caches
          return fetch(request, { cache: 'no-store' })
              .then(response => {
                  if (!response.ok) {
                      throw new Error(`Failed to fetch ${assetUrl} (Status: ${response.status})`);
                  }
                  // Cache the fresh response
                  return caches.open(cacheToUse)
                      .then(cache => cache.put(assetUrl, response.clone())); 
              })
              .catch(error => {
                  console.error(`[SW Hard Refresh] Failed to refresh ${assetUrl}:`, error);
                  // Log the error but continue with other assets
              });
      });
      
      // Wait for all fetches and cache updates to complete
      event.waitUntil(
          Promise.allSettled(refreshPromises)
              .then(() => {
                  console.log("[SW] All core and data assets refresh attempts completed.");
                  // Send a success message back to the client
                  if (event.ports && event.ports[0]) {
                      event.ports[0].postMessage({ action: 'cacheHardRefreshed' });
                  }
              })
      );
      return;
  }
});
