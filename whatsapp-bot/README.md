# Mis Cuentas por WhatsApp

Bot que recibe tus mensajes de WhatsApp ("gasté 25 mil en almuerzo", "¿cómo voy este mes?"),
los entiende con Claude y guarda los movimientos. Corre gratis en Cloudflare Workers.

## Lo que necesitas
1. Cuenta en Cloudflare (gratis) y Node instalado.
2. App en Meta for Developers con el producto WhatsApp (te da un número de prueba gratis).
3. Clave de la API de Claude (console.anthropic.com).

## Pasos
1. `npm i -g wrangler && wrangler login`
2. `wrangler d1 create mis-cuentas` y copia el `database_id` en `wrangler.toml`.
3. `wrangler d1 execute mis-cuentas --remote --file=schema.sql`
4. Carga los secretos (uno por uno): `wrangler secret put WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`,
   `VERIFY_TOKEN`, `APP_SECRET`, `ANTHROPIC_API_KEY`, `ALLOWED_NUMBERS` (tu número, ej. 573001234567).
5. `wrangler deploy` y copia la URL que te da.
6. En Meta > WhatsApp > Configuración: Webhook = esa URL, token de verificación = tu `VERIFY_TOKEN`,
   y suscríbete al campo `messages`.
7. Escríbele al número del bot desde tu WhatsApp.

## Notas
- Solo responde a los números de `ALLOWED_NUMBERS`.
- Los movimientos del bot se guardan en D1, aparte de los de la app web.
