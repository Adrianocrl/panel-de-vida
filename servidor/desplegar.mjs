// Sube el servidor de avisos a Cloudflare usando la llave de privado/cloudflare-token.txt.
// No imprime nunca la llave ni la llave privada de notificaciones.
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
// Se ejecuta desde la carpeta del proyecto: node servidor/desplegar.mjs
process.chdir(fileURLToPath(new URL("..", import.meta.url)));
const T = fs.readFileSync("privado/cloudflare-token.txt", "utf8").trim();
const API = "https://api.cloudflare.com/client/v4";
const NOMBRE = "avisos";
const estadoFile = "privado/cloudflare.json";
const estado = fs.existsSync(estadoFile) ? JSON.parse(fs.readFileSync(estadoFile, "utf8")) : {};
const guardar = () => fs.writeFileSync(estadoFile, JSON.stringify(estado, null, 2));

async function cf(ruta, opt = {}) {
  const r = await fetch(API + ruta, { ...opt, headers: { Authorization: `Bearer ${T}`, ...(opt.headers || {}) } });
  const j = await r.json().catch(() => ({}));
  if (!j.success) throw new Error(`${opt.method || "GET"} ${ruta} → ${r.status} ${JSON.stringify(j.errors || j)}`);
  return j.result;
}

// 1. Cuenta
const cuentas = await cf("/accounts");
estado.cuenta = cuentas[0].id; guardar();
const A = `/accounts/${estado.cuenta}`;
console.log("1. Cuenta encontrada");

// 2. Almacén KV (solo direcciones anónimas y horas)
if (!estado.kv) {
  const lista = await cf(`${A}/storage/kv/namespaces?per_page=100`);
  const ya = lista.find((n) => n.title === "panel-avisos");
  estado.kv = ya ? ya.id : (await cf(`${A}/storage/kv/namespaces`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "panel-avisos" }) })).id;
  guardar();
}
console.log("2. Almacén de horas listo");

// 3. Subir el código con sus llaves
const vapid = JSON.parse(fs.readFileSync("privado/vapid.json", "utf8"));
const meta = {
  main_module: "worker.js",
  compatibility_date: "2025-06-01",
  bindings: [
    { type: "kv_namespace", name: "AVISOS", namespace_id: estado.kv },
    { type: "plain_text", name: "VAPID_PUBLICA", text: vapid.publica },
    { type: "secret_text", name: "VAPID_PRIVADA", text: JSON.stringify(vapid.privada) },
  ],
};
const form = new FormData();
form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
form.append("worker.js", new Blob([fs.readFileSync("servidor/worker.js", "utf8")], { type: "application/javascript+module" }), "worker.js");
await cf(`${A}/workers/scripts/${NOMBRE}`, { method: "PUT", body: form });
console.log("3. Código subido (con la llave privada guardada como secreto en Cloudflare)");

// 4. Dirección web (subdominio workers.dev, sin nada personal)
let sub;
try { sub = (await cf(`${A}/workers/subdomain`)).subdomain; } catch (e) { sub = null; }
if (!sub) {
  const nuevo = "pv-" + crypto.randomBytes(4).toString("hex");
  sub = (await cf(`${A}/workers/subdomain`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subdomain: nuevo }) })).subdomain;
}
await cf(`${A}/workers/scripts/${NOMBRE}/subdomain`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: true }) });
estado.url = `https://${NOMBRE}.${sub}.workers.dev`; guardar();
console.log("4. Dirección:", estado.url);

// 5. Que se despierte cada 5 minutos
await cf(`${A}/workers/scripts/${NOMBRE}/schedules`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify([{ cron: "*/5 * * * *" }]) });
console.log("5. Programado cada 5 minutos");

