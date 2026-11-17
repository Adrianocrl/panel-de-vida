/* Apartado "🔔 Notificaciones": activar, elegir horas, probar y desactivar.
   El servidor solo recibe la dirección anónima del celular y las horas. */
(function () {
  const PV = window.PV;
  const $ = (s) => document.querySelector(s);
  const ui = { estado: "cargando", mensaje: "", ocupado: false, sub: null };

  const soportado = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window &&
    (location.protocol === "https:" || location.hostname === "localhost");

  function avisos() {
    const guardados = PV.almacen.pref("avisos");
    const base = PV.AVISOS.porDefecto;
    if (!Array.isArray(guardados)) return base.map((a) => ({ ...a }));
    return base.map((a) => ({ ...a, ...(guardados.find((g) => g.id === a.id) || {}) }));
  }
  const redondear = (h) => { const [a, b] = h.split(":").map(Number); const m = Math.round((a * 60 + b) / 5) * 5 % 1440; return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
  function llave() {
    const b64 = PV.AVISOS.llavePublica.replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
  }
  async function servidor(ruta, cuerpo) {
    const r = await fetch(PV.AVISOS.servidor + ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error || `el servidor respondió ${r.status}`);
    return j;
  }

  async function revisar() {
    if (!soportado()) { ui.estado = "no"; return pintar(); }
    if (Notification.permission === "denied") { ui.estado = "bloqueado"; return pintar(); }
    try {
      const reg = await navigator.serviceWorker.ready;
      ui.sub = await reg.pushManager.getSubscription();
      ui.estado = ui.sub ? "activo" : "inactivo";
    } catch (e) { ui.estado = "inactivo"; }
    pintar();
  }

  async function activar() {
    ui.ocupado = true; ui.mensaje = ""; pintar();
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { ui.estado = permiso === "denied" ? "bloqueado" : "inactivo"; ui.mensaje = "Sin permiso no puedo avisarte."; return; }
      const reg = await navigator.serviceWorker.ready;
      ui.sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: llave() }));
      await servidor("/suscribir", { endpoint: ui.sub.endpoint, horas: avisos().filter((a) => a.on).map((a) => a.hora) });
      PV.almacen.espejo();
      ui.estado = "activo"; ui.mensaje = "✅ Listo. Pulsa «Probar ahora» para ver cómo llegan.";
    } catch (e) { ui.mensaje = `No se pudo activar: ${e.message}. Revisa tu internet y vuelve a intentarlo.`; }
    finally { ui.ocupado = false; pintar(); }
  }

  async function guardarHoras() {
    const lista = avisos().map((a) => {
      const on = $(`#av-on-${a.id}`), hora = $(`#av-hora-${a.id}`);
      return { id: a.id, on: on ? on.checked : a.on, hora: hora && hora.value ? redondear(hora.value) : a.hora };
    });
    PV.almacen.pref("avisos", lista);
    if (ui.estado !== "activo" || !ui.sub) { pintar(); return; }
    ui.ocupado = true; pintar();
    try { await servidor("/suscribir", { endpoint: ui.sub.endpoint, horas: lista.filter((a) => a.on).map((a) => a.hora) }); ui.mensaje = "✅ Horas guardadas."; }
    catch (e) { ui.mensaje = `No se pudieron guardar en el servidor: ${e.message}.`; }
    finally { ui.ocupado = false; pintar(); }
  }

  async function probar() {
    ui.ocupado = true; ui.mensaje = ""; pintar();
    try { await servidor("/probar", { endpoint: ui.sub.endpoint }); ui.mensaje = "📨 Enviado. En unos segundos te llegará una notificación de Jarvis."; }
    catch (e) { ui.mensaje = `No llegó: ${e.message}.`; }
    finally { ui.ocupado = false; pintar(); }
  }

  async function desactivar() {
    ui.ocupado = true; pintar();
    try {
      if (ui.sub) { await servidor("/baja", { endpoint: ui.sub.endpoint }).catch(() => {}); await ui.sub.unsubscribe(); }
      ui.sub = null; ui.estado = "inactivo"; ui.mensaje = "Notificaciones desactivadas. El servidor ya no guarda nada de este celular.";
    } catch (e) { ui.mensaje = `No se pudo desactivar: ${e.message}.`; }
    finally { ui.ocupado = false; pintar(); }
  }

  function pintar() {
    const caja = $("#avisos");
    if (!caja || !PV.calc) return;
    const esc = PV.calc.esc;
    const lista = avisos();
    const estado = { config: PV.config, datos: Object.assign({}, PV.almacen.mios) };
    // Vista previa: lo que diría Jarvis HOY a la hora de ese aviso.
    const vista = (id, hora) => { try { const d = new Date(); const [h, m] = hora.split(":").map(Number); d.setHours(h, m, 0, 0); const t = PV.textoAviso(id, estado, d); return `${t.titulo} — ${t.cuerpo}`; } catch (e) { return ""; } };
    const pastilla = { activo: ["verde", "Activadas"], inactivo: ["gris", "Apagadas"], bloqueado: ["rojo", "Bloqueadas"], no: ["gris", "Solo en la app"], cargando: ["gris", "…"] }[ui.estado];
    const dis = ui.ocupado ? "disabled" : "";
    let arriba = "";
    if (ui.estado === "no") arriba = `<p class="vacio">Las notificaciones funcionan en la <b>app instalada en tu celular</b> (o en la página publicada). Ábrela allí para activarlas.</p>`;
    else if (ui.estado === "bloqueado") arriba = `<p class="aviso-fijos rojo-f">🔕 <span>Chrome tiene bloqueadas las notificaciones de esta app. Para permitirlas: mantén pulsado el icono de la app → <b>Información de la app</b> → <b>Notificaciones</b> → actívalas. Luego vuelve aquí.</span></p>`;
    else if (ui.estado === "inactivo") arriba = `<div class="av-activar"><p>Jarvis te avisará a las horas de abajo, <b>aunque la app esté cerrada</b>. Tus datos no salen del celular: el servidor solo le dice "despierta" a la hora que elijas.</p><button type="button" class="btn lleno" data-av="activar" ${dis}>🔔 Activar notificaciones</button></div>`;
    else if (ui.estado === "activo") arriba = `<div class="av-acciones"><button type="button" class="btn lleno" data-av="probar" ${dis}>📨 Probar ahora</button><button type="button" class="btn" data-av="desactivar" ${dis}>Desactivar</button></div>`;

    caja.innerHTML = `<div class="t-cab"><h2 class="t-tit"><span aria-hidden="true">🔔</span>Notificaciones de Jarvis</h2><span class="pastilla ${pastilla[0]}">${pastilla[1]}</span></div>
      ${arriba}
      ${ui.mensaje ? `<p class="av-mensaje" role="status">${esc(ui.mensaje)}</p>` : ""}
      <ul class="av-lista">${lista.map((a) => `<li>
          <label class="av-on"><input type="checkbox" id="av-on-${a.id}" ${a.on ? "checked" : ""} aria-label="Encender ${esc(a.nombre)}"></label>
          <div class="av-texto"><b>${esc(a.nombre)}</b><small class="suave">${esc(vista(a.id, a.hora))}</small></div>
          <input class="campo av-hora" type="time" step="300" id="av-hora-${a.id}" value="${a.hora}" aria-label="Hora de ${esc(a.nombre)}">
        </li>`).join("")}</ul>
      <div class="av-pie"><button type="button" class="btn" data-av="guardar" ${dis}>Guardar horas</button><small class="suave">Las horas van de 5 en 5 minutos. Lo que ves en gris es lo que te diría Jarvis hoy a esa hora. Los pagos fijos te los recuerda en el parte de la mañana, 2 días antes.</small></div>`;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-av]");
    if (!b || ui.ocupado) return;
    ({ activar, probar, desactivar, guardar: guardarHoras })[b.dataset.av]();
  });

  PV.avisosUI = { pintar, revisar };
  if (document.readyState !== "loading") setTimeout(revisar, 0); else document.addEventListener("DOMContentLoaded", revisar);
})();
