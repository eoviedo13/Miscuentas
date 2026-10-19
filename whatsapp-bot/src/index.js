// Bot de WhatsApp para Mis Cuentas: recibe mensajes de WhatsApp Cloud API,
// los interpreta con Claude y guarda los movimientos en D1.
const CATS = {
  g: ["Comida", "Transporte", "Vivienda", "Servicios", "Salud", "Entretenimiento", "Ropa", "Educación", "Otros"],
  i: ["Salario", "Clientes", "Ventas", "Regalo", "Otros"],
};
const MODEL = "claude-haiku-5-5";
const TZ = "America/Bogota";

const fmt = (n) => "$" + Math.round(n).toLocaleString("es-CO");
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: TZ });
const ym = (d) => d.slice(0, 7);
function prevYm(cur) {
  const [y, m] = cur.split("-").map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (req.method === "GET") {
      // Verificación del webhook por parte de Meta
      const ok = url.searchParams.get("hub.mode") === "subscribe" &&
        url.searchParams.get("hub.verify_token") === env.VERIFY_TOKEN;
      return ok ? new Response(url.searchParams.get("hub.challenge")) : new Response("forbidden", { status: 403 });
    }
    if (req.method !== "POST") return new Response("ok");
    const raw = await req.text();
    if (!(await validSignature(raw, req.headers.get("x-hub-signature-256"), env.APP_SECRET)))
      return new Response("bad signature", { status: 401 });
    const body = JSON.parse(raw);
    for (const entry of body.entry || [])
      for (const ch of entry.changes || [])
        for (const msg of ch.value?.messages || [])
          if (msg.type === "text") ctx.waitUntil(handle(env, msg.from, msg.text.body));
    return new Response("ok"); // Meta exige responder rápido; el trabajo sigue en segundo plano
  },
};

async function validSignature(raw, header, secret) {
  if (!header || !secret) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(raw));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return header === "sha256=" + hex;
}

async function handle(env, numero, texto) {
  const allowed = (env.ALLOWED_NUMBERS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (allowed.length && !allowed.includes(numero)) return;
  let respuesta;
  try {
    respuesta = await procesar(env, numero, texto);
  } catch (e) {
    console.error(e);
    respuesta = "Uy, algo falló guardando eso. Inténtalo otra vez en un momento.";
  }
  await sendWhatsApp(env, numero, respuesta);
}

async function monthStats(env, numero, mes) {
  const { results } = await env.DB.prepare(
    "SELECT tipo, cat, SUM(monto) AS total FROM movimientos WHERE numero = ? AND fecha LIKE ? GROUP BY tipo, cat"
  ).bind(numero, mes + "%").all();
  const s = { tin: 0, tout: 0, byCat: {} };
  for (const r of results) {
    if (r.tipo === "i") s.tin += r.total;
    else { s.tout += r.total; s.byCat[r.cat] = r.total; }
  }
  return s;
}

function clean(m) {
  const tipo = m?.tipo === "i" ? "i" : "g";
  const monto = Math.round(Number(m?.monto));
  if (!(monto > 0)) return null;
  return {
    tipo, monto,
    cat: CATS[tipo].includes(m.cat) ? m.cat : "Otros",
    descr: String(m.desc || "").slice(0, 60),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(m.fecha || "") ? m.fecha : today(),
  };
}

async function procesar(env, numero, texto) {
  const hoy = today(), mes = ym(hoy), ant = prevYm(mes);
  const [a, b] = await Promise.all([monthStats(env, numero, mes), monthStats(env, numero, ant)]);
  const { results: ult } = await env.DB.prepare(
    "SELECT tipo, monto, cat, descr, fecha FROM movimientos WHERE numero = ? ORDER BY t DESC LIMIT 15"
  ).bind(numero).all();

  const system = `Eres el asistente de Mis Cuentas, una libreta de finanzas personales que funciona por WhatsApp. Hablas español colombiano, cálido y muy breve (1-2 frases).
Hoy es ${hoy}. Moneda: pesos colombianos (COP). Formatea montos como $25.000.
Jerga: "mil"=1.000, "luca(s)"=1.000, "palo"/"millón"=1.000.000, "medio palo"=500.000.
Categorías de gasto: ${CATS.g.join(", ")}. Categorías de ingreso: ${CATS.i.join(", ")}. Usa exactamente uno de esos nombres.
Datos del usuario:
- Este mes (${mes}): ingresos ${a.tin}, gastos ${a.tout}, gastos por categoría ${JSON.stringify(a.byCat)}
- Mes anterior (${ant}): ingresos ${b.tin}, gastos ${b.tout}, gastos por categoría ${JSON.stringify(b.byCat)}
- Últimos movimientos: ${JSON.stringify(ult)}
Según el mensaje, haz UNA de estas cosas:
1. Si registra gastos o ingresos: ponlos en "movimientos" (tipo "g" gasto o "i" ingreso; fechas relativas a YYYY-MM-DD, si no dice usa hoy; "desc" corta con mayúscula inicial).
2. Si pregunta algo sobre sus cuentas: responde en "respuesta" usando solo los datos de arriba.
3. Si pide borrar o deshacer el último movimiento: "borrarUltimo": true.
4. Si no entiendes: pide en "respuesta" que lo diga de otra forma, con un ejemplo.
Responde SOLO con JSON: {"movimientos":[],"respuesta":"","borrarUltimo":false}`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, max_tokens: 600, system, messages: [{ role: "user", content: texto }] }),
  });
  if (!r.ok) throw new Error("Claude " + r.status + " " + (await r.text()));
  const data = await r.json();
  const out = data.content?.find((c) => c.type === "text")?.text || "{}";
  const parsed = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1) || "{}");

  const movs = (Array.isArray(parsed.movimientos) ? parsed.movimientos : []).map(clean).filter(Boolean);
  if (movs.length) {
    const t = Date.now();
    await env.DB.batch(movs.map((m, k) => env.DB.prepare(
      "INSERT INTO movimientos (numero, tipo, monto, cat, descr, fecha, t, texto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(numero, m.tipo, m.monto, m.cat, m.descr, m.fecha, t + k, k === 0 ? texto : "")));
    return "Anotado ✓\n" + movs.map((m) => `${m.tipo === "i" ? "+" : "−"}${fmt(m.monto)} ${m.descr || m.cat} (${m.cat})`).join("\n");
  }
  if (parsed.borrarUltimo) {
    const last = await env.DB.prepare("SELECT id, descr, cat, monto FROM movimientos WHERE numero = ? ORDER BY t DESC LIMIT 1").bind(numero).first();
    if (!last) return "No tienes movimientos para borrar.";
    await env.DB.prepare("DELETE FROM movimientos WHERE id = ?").bind(last.id).run();
    return `Listo, borré “${last.descr || last.cat}” por ${fmt(last.monto)}.`;
  }
  return parsed.respuesta || "No te entendí bien. Prueba así: “gasté 20 mil en almuerzo”.";
}

async function sendWhatsApp(env, to, text) {
  const r = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_ID}/messages`, {
    method: "POST",
    headers: { authorization: "Bearer " + env.WHATSAPP_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  if (!r.ok) console.error("WhatsApp", r.status, await r.text());
}
