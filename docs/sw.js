// Service worker de Mis Cuentas: guarda la app para que abra sin internet.
// Al cambiar cualquier archivo de la app, sube VERSION para que los celulares bajen la nueva.
const VERSION = "v11-1";
const CACHE = "mis-cuentas-" + VERSION;
const FONTS = "mis-cuentas-fuentes";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "icons/icon.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// responde con lo guardado y de paso trae la versión nueva para la próxima vez
function staleWhileRevalidate(req, cacheName, key) {
  return caches.open(cacheName).then(cache =>
    cache.match(key || req, { ignoreSearch: !!key }).then(hit => {
      const net = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) cache.put(key || req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // abrir la app (también desde el acceso directo ?abrir=resumen) siempre sirve la misma página
  if (req.mode === "navigate" && url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req, CACHE, "index.html"));
    return;
  }
  if (url.origin === location.origin) {
    e.respondWith(staleWhileRevalidate(req, CACHE));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(staleWhileRevalidate(req, FONTS));
  }
});
