# Mis Cuentas

Libreta de finanzas personales que funciona como un chat: escribes lo que gastas o recibes
("gasté 25 mil en almuerzo") y lleva las cuentas en pesos colombianos.

- **App web:** https://claude.ai/artifact/WQT5SqKHZk7WcJop8XBcjG
- **App instalable (PWA):** [`docs/`](docs/), publicada con GitHub Pages en https://eoviedo13.github.io/miscuentas/
- **Bot de WhatsApp:** [`whatsapp-bot/`](whatsapp-bot/README.md), un Cloudflare Worker con WhatsApp Cloud API y Claude.

## App instalable (PWA)

`docs/` es la misma app de Claude empaquetada para instalarse en el celular: `index.html`,
`manifest.webmanifest`, `sw.js` (service worker para abrir sin internet) e `icons/`.

- Los datos quedan en el dispositivo (`localStorage` "mis-cuentas" y "mis-cuentas-ajustes"),
  aparte de los de la versión en Claude.
- Sin las capacidades del artifact, los mensajes los entiende el parser local
  (`localParse`/`localAnswer`) y no aparece el botón de foto de facturas.
- **Publicar:** Settings → Pages → Build and deployment → *Deploy from a branch* →
  rama `main`, carpeta `/docs`.
- **Actualizar:** cambia `docs/index.html` y sube `VERSION` en `docs/sw.js`; los celulares
  toman la versión nueva la siguiente vez que abren la app.
