const CACHE = "tomuda-v564";
const MEDIA_CACHE = "tomuda-media-v1";
// Keep PRECACHE to boot-critical assets only. Optional templates must not
// block service-worker install via cache.addAll failures.
const PRECACHE = [
  "/static/tomuda/styles.css",
  "/static/tomuda/data.js",
  "/static/tomuda/permissions.js",
  "/static/tomuda/app.js",
  "/static/tomuda/vendor/jszip.min.js",
  "/static/tomuda/vendor/tailwindcdn.js",
  "/manifest.webmanifest",
  "/static/tomuda/icons/icon-192.png?v=20260630-logo",
  "/static/tomuda/icons/icon-512.png?v=20260630-logo",
];

function precacheAll(cache) {
  return Promise.all(
    PRECACHE.map((url) =>
      cache.add(url).catch((err) => {
        console.warn("[sw] precache skip", url, err);
      }),
    ),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => precacheAll(cache))
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

async function matchAppJs(request) {
  return (
    (await caches.match(request)) ||
    (await caches.match(request, { ignoreSearch: true })) ||
    (await caches.match("/static/tomuda/app.js"))
  );
}

function offlineJs() {
  return new Response("/* tomuda offline */", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
  });
}

function offlineHtml() {
  return new Response(
    "<!doctype html><meta charset=utf-8><title>TOMUDA</title><p>Офлайн. Интернет шалгаад дахин ачаална уу.</p>",
    {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

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
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(async () => (await caches.match(request)) || offlineHtml()),
    );
    return;
  }

  if (url.pathname.includes("/static/tomuda/app.js")) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          if (res.ok) {
            const forVersioned = res.clone();
            const forPlain = res.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(request, forVersioned);
              cache.put("/static/tomuda/app.js", forPlain);
            });
            return res;
          }
          return (await matchAppJs(request)) || res;
        })
        .catch(async () => (await matchAppJs(request)) || offlineJs()),
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
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch (err) {
          return (
            cached ||
            new Response("", { status: 504, statusText: "Gateway Timeout" })
          );
        }
      }),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      try {
        const res = await fetch(request);
        if (res.ok && url.pathname.startsWith("/static/")) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return res;
      } catch (err) {
        return (
          cached ||
          (url.pathname.endsWith(".js") ? offlineJs() : Response.error())
        );
      }
    }),
  );
});
