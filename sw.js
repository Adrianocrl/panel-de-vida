/* Lo que hace que el panel funcione como app:
   - Con internet: pide siempre la versión más nueva (así se actualiza solo) y guarda una copia.
   - Sin internet: usa la última copia guardada.
   Solo guarda los archivos del panel. Tus datos no pasan por aquí: viven en el navegador del celular. */
const CACHE = "panel-de-vida";

// Para escribir las notificaciones con la app cerrada (ver js/avisos-calculo.js).
self.window = self;
importScripts("js/ganar.js", "js/avisos-calculo.js");

const ARCHIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/estilos.css",
  "js/datos.js",
  "js/almacen.js",
  "js/graficos.js",
  "js/jarvis.js",
  "js/ganar.js",
  "js/avisos-calculo.js",
  "js/avisos.js",
  "js/app.js",
  "iconos/icono-192.png",
  "iconos/icono-512.png",
  "iconos/icono-maskable-512.png",
  "iconos/icono-180.png",
  "fuentes/fraunces-latin-400-normal.woff2",
  "fuentes/fraunces-latin-500-normal.woff2",
  "fuentes/fraunces-latin-600-normal.woff2",
  "fuentes/fraunces-latin-500-italic.woff2",
  "fuentes/inter-latin-400-normal.woff2",
  "fuentes/inter-latin-500-normal.woff2",
  "fuentes/inter-latin-600-normal.woff2",
  "fuentes/inter-latin-700-normal.woff2",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARCHIVOS.map((a) => new Request(a, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return; // lo de fuera (Claude) no se toca
  e.respondWith(
    fetch(req, { cache: "no-cache" })
      .then((res) => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then((c) => c.put(req, copia)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});

// ---------- Notificaciones ----------
// El servidor manda un "despierta" vacío. Aquí, dentro del celular, se mira qué aviso toca y qué decir.
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let titulo = "🤵 Jarvis", cuerpo = "Eche un vistazo a su panel, señor.";
    try {
      const estado = await self.PV.idb.leer();
      if (estado && estado.config && estado.datos) {
        const avisos = estado.avisos || self.PV.AVISOS.porDefecto;
        const tipo = self.PV.avisoQueToca(avisos, new Date()) || "falta";
        ({ titulo, cuerpo } = self.PV.textoAviso(tipo, estado, new Date()));
      }
    } catch (err) { /* si algo falla, se muestra el aviso genérico */ }
    await self.registration.showNotification(titulo, {
      body: cuerpo, icon: "iconos/icono-192.png", badge: "iconos/icono-192.png", tag: "jarvis", renotify: true, data: { url: "./" },
    });
  })());
});

// Al tocar la notificación: abre la app (o la trae al frente si ya está abierta).
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const v of ventanas) { if ("focus" in v) return v.focus(); }
    return self.clients.openWindow("./");
  })());
});

// Si Chrome renueva la dirección anónima del celular, se la decimos al servidor.
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil((async () => {
    const estado = await self.PV.idb.leer().catch(() => null);
    const avisos = (estado && estado.avisos) || self.PV.AVISOS.porDefecto;
    const b64 = self.PV.AVISOS.llavePublica.replace(/-/g, "+").replace(/_/g, "/");
    const llave = Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
    const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llave });
    await fetch(self.PV.AVISOS.servidor + "/suscribir", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: sub.endpoint, horas: avisos.filter((a) => a.on).map((a) => a.hora) }) });
  })());
});
