// Service worker de Mis Cuentas: guarda la app para que abra sin internet.
// Al cambiar cualquier archivo de la app, sube VERSION para que los celulares bajen la nueva.
const VERSION = "v12-1";
const CACHE = "mis-cuentas-" + VERSION;
const FONTS = "mis-cuentas-fuentes";
const ESTADO = "mis-cuentas-estado"; // lo que la página deja para el recordatorio diario
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
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== FONTS && k !== ESTADO).map(k => caches.delete(k))))
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

// Recordatorio diario: Chrome en Android despierta al service worker de vez en cuando (sincronización periódica,
// solo con la app instalada). Si ya pasó la hora y hoy no se ha anotado nada, avisa una vez al día.
self.addEventListener("periodicsync", e => {
  if (e.tag === "recordatorio") e.waitUntil(recordar());
});

async function recordar() {
  const cache = await caches.open(ESTADO);
  const res = await cache.match("estado.json");
  if (!res) return;
  const st = await res.json();
  if (!st.on || !/^\d{2}:\d{2}$/.test(st.hora || "")) return;
  const d = new Date(), pad = n => String(n).padStart(2, "0");
  const hoy = d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const [h, m] = st.hora.split(":").map(Number);
  if (d.getHours() * 60 + d.getMinutes() < h * 60 + m || st.ultimo === hoy || st.avisado === hoy) return;
  const abiertas = await self.clients.matchAll({ type: "window" });
  if (abiertas.some(c => c.visibilityState === "visible")) return;
  await self.registration.showNotification("¿Anotaste tus gastos de hoy?", {
    body: "Cuéntame qué gastaste y lo anoto en Mis Cuentas.",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    tag: "recordatorio"
  });
  await cache.put("estado.json", new Response(JSON.stringify({ ...st, avisado: hoy }), { headers: { "Content-Type": "application/json" } }));
}

// tocar la notificación abre la app (o la trae al frente si ya está abierta)
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(l => {
      const c = l.find(x => "focus" in x);
      return c ? c.focus() : self.clients.openWindow("./");
    })
  );
});
