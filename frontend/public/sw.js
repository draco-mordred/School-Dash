// App-shell service worker.
// IMPORTANT: keep the cache version in sync with CACHE_NAME so that browser
// installs pick up new deployments. Hashed /assets bundles are immutable and
// safe to serve cache-first; the app shell (/ and /index.html) MUST be
// network-first so users receive new Vercel deployments instead of a stale
// cached bundle (the old cache-first strategy pinned students to old builds
// even after redeploy).
const CACHE_NAME = "school-dash-shell-v3";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Delete every cache from previous versions (including the old
  // school-dash-shell-v1 cache-first shell) so stale bundles are evicted.
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const isApiRequest = requestUrl.pathname.startsWith("/api/");
  if (isApiRequest) {
    return;
  }

  const isImmutableAsset = requestUrl.pathname.startsWith("/assets/");
  const isAppShellRequest =
    requestUrl.pathname === "/" ||
    requestUrl.pathname === "/index.html" ||
    requestUrl.pathname.endsWith(".js") ||
    requestUrl.pathname.endsWith(".css") ||
    isImmutableAsset;
  if (!isAppShellRequest) {
    return;
  }

  // Hashed, immutable build assets: cache-first for speed.
  if (isImmutableAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return networkResponse;
        });
      }),
    );
    return;
  }

  // App shell (/, /index.html, top-level js/css): network-first so new
  // deployments are picked up immediately; cached copy only as offline
  // fallback.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then((cachedResponse) => cachedResponse ?? caches.match("/index.html")),
      ),
  );
});
