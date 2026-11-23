/* sw.js — Service Worker: работа карты без интернета (только просмотр)
   Если меняете файлы приложения — ничего делать не нужно: онлайн всегда грузится свежая версия.
   Если меняете структуру кеша — увеличьте VERSION. */

const VERSION = "v1";
const SHELL = `tm-shell-${VERSION}`;   // файлы приложения (html/js/css)
const IMG   = "tm-img";                // картинки карт и меток (общий кеш со страницей)
const CDN   = `tm-cdn-${VERSION}`;     // внешние библиотеки и шрифты

const SHELL_FILES = [
  "./", "index.html", "style.css", "menu.css", "profile.css",
  "main.js", "state.js", "ui.js", "auth.js", "config.js", "constants.js",
  "map.js", "markers.js", "modal.js", "links.js", "videos.js", "houses.js", "offline.js",
  "menu.js", "hover.js",
  "favicon.ico", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png"
];

const CDN_PRECACHE = [
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js",
  "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js",
  "https://unpkg.com/@panzoom/panzoom@4.5.1/dist/panzoom.min.js",
  "https://cdn.quilljs.com/1.3.7/quill.min.js",
  "https://cdn.quilljs.com/1.3.7/quill.snow.css",
  "https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js",
  "https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap"
];

const CDN_HOSTS = [
  "www.gstatic.com", "unpkg.com", "cdn.quilljs.com", "cdn.jsdelivr.net",
  "fonts.googleapis.com", "fonts.gstatic.com"
];

const abs = f => new URL(f, self.registration.scope).href;

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const shell = await caches.open(SHELL);
    await Promise.allSettled(SHELL_FILES.map(f => shell.add(abs(f))));
    const cdn = await caches.open(CDN);
    await Promise.allSettled(CDN_PRECACHE.map(u => cdn.add(new Request(u, { mode: "cors" }))));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keep = [SHELL, IMG, CDN];
    for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

const isImagePath = p => /\.(png|jpe?g|webp|avif|svg|gif)$/i.test(p);

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (isImagePath(url.pathname) && !url.pathname.includes("/icons/")) {
      e.respondWith(staleWhileRevalidate(req, IMG));     // карты и фото: из кеша, обновление в фоне
    } else {
      e.respondWith(networkFirst(req));                  // код: онлайн — свежий, офлайн — из кеша
    }
  } else if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(req, CDN));
  } else if (req.destination === "image") {
    e.respondWith(cachedImageOnly(req));                 // внешние картинки — только если уже сохранены
  }
});

function withTimeout(p, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); }, err => { clearTimeout(t); reject(err); });
  });
}

async function networkFirst(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await withTimeout(fetch(req, { cache: "no-cache" }), 4000);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true })
      || (req.mode === "navigate"
          ? (await cache.match(abs("index.html"))) || (await cache.match(abs("./")))
          : undefined);
    return hit || Response.error();
  }
}

async function staleWhileRevalidate(req, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(req) || await caches.match(req);
  const update = fetch(req, { cache: "no-cache" }).then(res => {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => undefined);
  if (cached) { update.catch(() => {}); return cached; }
  return (await update) || Response.error();
}

async function cachedImageOnly(req) {
  const hit = await caches.match(req, { ignoreVary: true });
  if (hit) return hit;
  try { return await fetch(req); } catch { return Response.error(); }
}
