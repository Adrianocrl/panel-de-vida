/* Lo que hace que el panel funcione como app:
   - Con internet: pide siempre la versión más nueva (así se actualiza solo) y guarda una copia.
   - Sin internet: usa la última copia guardada.
   Solo guarda los archivos del panel. Tus datos no pasan por aquí: viven en el navegador del celular. */
const CACHE = "panel-de-vida";
const ARCHIVOS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/estilos.css",
  "js/datos.js",
  "js/almacen.js",
  "js/graficos.js",
  "js/jarvis.js",
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
