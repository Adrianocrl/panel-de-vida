/* Servidor de avisos del Panel de vida (Cloudflare Workers, plan gratis).

   Qué hace: cada 5 minutos mira la hora de Lima y, a las horas que elegiste, le manda a tu celular
   un "despierta" VACÍO. Es tu celular quien mira tus datos y escribe la notificación.

   Qué guarda (en KV, clave "subs"): solo la dirección anónima que crea Chrome para tu celular
   y las horas de los avisos. Nada de hábitos, dinero ni diario.

   Secretos (se ponen en Cloudflare, nunca en el código):
     VAPID_PRIVADA  → la llave privada (JSON), está en privado/vapid.json
   Variables:
     VAPID_PUBLICA  → la llave pública
   Almacén KV: AVISOS */

const MAX_SUSCRIPCIONES = 5;
const ORIGEN_APP = "https://adrianocrl.github.io";
// Solo se aceptan direcciones de los servicios de notificaciones de verdad.
const SERVICIOS_PUSH = [/^https:\/\/fcm\.googleapis\.com\//, /^https:\/\/updates\.push\.services\.mozilla\.com\//, /^https:\/\/[a-z0-9.-]+\.notify\.windows\.com\//, /^https:\/\/web\.push\.apple\.com\//];
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const cors = { "Access-Control-Allow-Origin": ORIGEN_APP, "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors } });

async function leerSubs(env) { return (await env.AVISOS.get("subs", "json")) || {}; }
async function guardarSubs(env, subs) { await env.AVISOS.put("subs", JSON.stringify(subs)); }
async function idDe(endpoint) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return [...new Uint8Array(h)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- Enviar un "despierta" vacío (Web Push con VAPID, sin contenido) ----------
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlTexto = (s) => b64url(new TextEncoder().encode(s));
let llaveCache = null;
async function firmar(env, aud) {
  if (!llaveCache) llaveCache = await crypto.subtle.importKey("jwk", JSON.parse(env.VAPID_PRIVADA), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const cab = b64urlTexto(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const cuerpo = b64urlTexto(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: ORIGEN_APP + "/panel-de-vida/" }));
  const firma = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, llaveCache, new TextEncoder().encode(`${cab}.${cuerpo}`));
  return `${cab}.${cuerpo}.${b64url(firma)}`;
}
async function despertar(env, endpoint) {
  const jwt = await firmar(env, new URL(endpoint).origin);
  const r = await fetch(endpoint, { method: "POST", headers: { Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLICA}`, TTL: "1800", Urgency: "high", "Content-Length": "0" } });
  return r.status;
}

// ---------- Hora de Lima (UTC-5, sin horario de verano) ----------
function horaLima(fecha = new Date()) {
  const l = new Date(fecha.getTime() - 5 * 3600 * 1000);
  const min = l.getUTCHours() * 60 + l.getUTCMinutes();
  return min - (min % 5); // tramo de 5 minutos
}
const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (req.method === "GET") return json({ ok: true, servicio: "avisos del Panel de vida" });
    if (req.method !== "POST") return json({ error: "método no permitido" }, 405);
    let datos;
    try { datos = await req.json(); } catch (e) { return json({ error: "datos no válidos" }, 400); }
    const endpoint = String(datos.endpoint || "");
    if (!SERVICIOS_PUSH.some((r) => r.test(endpoint)) || endpoint.length > 1000) return json({ error: "dirección no válida" }, 400);
    const id = await idDe(endpoint);
    const subs = await leerSubs(env);

    if (url.pathname === "/suscribir") {
      const horas = [...new Set((Array.isArray(datos.horas) ? datos.horas : []).filter((h) => HORA.test(h)))].slice(0, 24);
      if (!subs[id] && Object.keys(subs).length >= MAX_SUSCRIPCIONES) return json({ error: "límite de aparatos alcanzado" }, 429);
      subs[id] = { endpoint, horas, desde: subs[id]?.desde || new Date().toISOString().slice(0, 10) };
      await guardarSubs(env, subs);
      return json({ ok: true, horas });
    }
    if (url.pathname === "/baja") {
      delete subs[id];
      await guardarSubs(env, subs);
      return json({ ok: true });
    }
    if (url.pathname === "/probar") {
      if (!subs[id]) return json({ error: "este aparato no está suscrito" }, 404);
      const estado = await despertar(env, endpoint);
      return json({ ok: estado >= 200 && estado < 300, estado });
    }
    return json({ error: "no existe" }, 404);
  },

  // Cada 5 minutos (Cron Trigger "*/5 * * * *").
  async scheduled(evento, env) {
    const ahora = horaLima(new Date(evento.scheduledTime));
    const subs = await leerSubs(env);
    let cambiado = false;
    for (const [id, s] of Object.entries(subs)) {
      if (!s.horas.some((h) => aMin(h) === ahora)) continue;
      const estado = await despertar(env, s.endpoint);
      if (estado === 404 || estado === 410) { delete subs[id]; cambiado = true; } // el aparato ya no existe
    }
    if (cambiado) await guardarSubs(env, subs);
  },
};
