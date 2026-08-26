const CACHE = "tomuda-v907";
const MEDIA_CACHE = "tomuda-media-v2";
// Keep PRECACHE to boot-critical assets only. Optional templates must not
// block service-worker install via cache.addAll failures.
const PRECACHE = [
  "/",
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

async function matchShell(request) {
  return (
    (await caches.match(request)) ||
    (await caches.match("/")) ||
    (await caches.match("/index.html"))
  );
}

function offlineJs() {
  return new Response("/* tomuda offline */", {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
  });
}

function recoveryHtml() {
  // Never leave users on a dead-end offline page with no retry.
  const html = `<!doctype html>
<html lang="mn"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ТОМУДА</title>
<style>
body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;background:#eef3f5;color:#182032}
.card{width:min(22rem,92vw);padding:1.5rem;background:#fff;border-radius:14px;box-shadow:0 10px 28px rgba(24,32,50,.1);text-align:center}
h1{font-size:1.05rem;margin:0 0 .5rem}
p{margin:.4rem 0;line-height:1.45;color:#5b6578;font-size:.95rem}
button{margin-top:1rem;width:100%;padding:.8rem 1rem;border:0;border-radius:10px;background:#16899a;color:#fff;font-weight:700;font-size:1rem}
</style>
<body><div class="card">
<h1>Холболт тасарсан</h1>
<p>Сервертэй холбогдож чадсангүй. Хэдхэн секундэд дахин оролдоно.</p>
<button type="button" id="retry">Дахин оролдох</button>
</div>
<script>
function hardReload(){
  var done=function(){
    var u=new URL(location.href);
    u.searchParams.set("_reload",String(Date.now()));
    location.replace(u.toString());
  };
  if(!("serviceWorker" in navigator)){done();return;}
  navigator.serviceWorker.getRegistrations()
    .then(function(regs){return Promise.all(regs.map(function(r){return r.unregister();}));})
    .catch(function(){})
    .then(function(){
      if(!("caches" in window)) return;
      return caches.keys().then(function(keys){
        return Promise.all(keys.map(function(k){return caches.delete(k);}));
      });
    })
    .catch(function(){})
    .then(done);
}
document.getElementById("retry").onclick=hardReload;
setTimeout(function(){ location.reload(); }, 2800);
</script>
</body></html>`;
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Always hit network for the worker script itself — never HTML fallback.
  if (url.pathname === "/sw.js") {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate" || url.pathname === "/") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const forRequest = res.clone();
            const forRoot = url.pathname === "/" ? res.clone() : null;
            caches.open(CACHE).then((cache) => {
              cache.put(request, forRequest);
              if (forRoot) cache.put("/", forRoot);
            });
          }
          return res;
        })
        .catch(async () => (await matchShell(request)) || recoveryHtml()),
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
