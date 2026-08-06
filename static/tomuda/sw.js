const CACHE = "tomuda-v459";
const MEDIA_CACHE = "tomuda-media-v1";
const PRECACHE = [
  "/static/tomuda/styles.css",
  "/static/tomuda/data.js",
  "/static/tomuda/vendor/jszip.min.js",
  "/static/tomuda/vendor/tailwindcdn.js",
  "/static/tomuda/templates/warehouse-prepare-template.xls",
  "/static/tomuda/templates/receipt-template.xls",
  "/static/tomuda/templates/zarlaga-receipt-jishee.xls",
  "/manifest.webmanifest",
  "/static/tomuda/icons/icon-192.png?v=20260630-logo",
  "/static/tomuda/icons/icon-512.png?v=20260630-logo",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE && k !== MEDIA_CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (
    request.mode === "navigate" ||
    url.pathname === "/" ||
    url.pathname === "/sw.js"
  ) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

  if (url.pathname.includes("/static/tomuda/app.js")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(request));
    return;
  }

  // Product/profile images: cache-first with background refresh.
  if (url.pathname.startsWith("/media/")) {
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => cached);
        return cached || network;
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok && url.pathname.startsWith("/static/")) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
