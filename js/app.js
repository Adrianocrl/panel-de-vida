/* Pinta cada tarjeta y responde a los clics. */
(function () {
  const PV = window.PV;
  const C = PV.config;
  const A = PV.almacen;
  const F = PV.fecha;
  const G = PV.graficos;
  const $ = (s, el = document) => el.querySelector(s);

  // ---------- Formatos (Perú) ----------
  const nfDinero = new Intl.NumberFormat(C.locale, { style: "currency", currency: C.moneda, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfDineroCorto = new Intl.NumberFormat(C.locale, { style: "currency", currency: C.moneda, minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const nfNum = new Intl.NumberFormat(C.locale, { maximumFractionDigits: 1 });
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  PV.fmt = {
    dinero: (n) => nfDinero.format(n),
    dineroCorto: (n) => nfDineroCorto.format(n),
    num: (n) => nfNum.format(n),
    horas: (min) => { min = Math.round(min); const h = Math.floor(min / 60), m = min % 60; return !h ? `${m} min` : m ? `${h} h ${m} min` : `${h} h`; },
    fechaLarga: (d) => cap(d.toLocaleDateString(C.locale, { weekday: "long", day: "numeric", month: "long" })),
    fechaCorta: (d) => d.toLocaleDateString(C.locale, { weekday: "short", day: "numeric", month: "short" }).replace(/\./g, ""),
    diaSemana: (d) => d.toLocaleDateString(C.locale, { weekday: "long" }),
  };
  const fmt = PV.fmt;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- Estado de la pantalla ----------
  const ui = { pestanaDinero: "este", formGasto: false, formIngreso: false, formCita: null, editObjetivo: null, editNombre: false, editFoco: false };
  const EJ = PV.modoEjemplo;
  let D; // datos combinados (ejemplo + lo tuyo)
  let hoy, kHoy;

  function refrescarFecha() { const n = new Date(); hoy = new Date(n.getFullYear(), n.getMonth(), n.getDate()); kHoy = F.clave(hoy); }
  const ahoraMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
  const aMin = (hhmm) => { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; };
  const lunesDe = (d) => F.sumarDias(d, -((d.getDay() + 6) % 7));
  const semanaISO = (d) => { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 864e5 + 1) / 7); };
  const LETRAS = ["D", "L", "M", "M", "J", "V", "S"];
  const ICO_TIPO = { trabajo: "var(--azul)", personal: "var(--ambar)", salud: "var(--verde)", aprender: "var(--violeta)" };

  function cab(icono, titulo, pastilla = "", clasePastilla = "") {
    return `<div class="t-cab"><h2 class="t-tit"><span aria-hidden="true">${icono}</span>${titulo}</h2>${pastilla ? `<span class="pastilla ${clasePastilla}">${pastilla}</span>` : ""}</div>`;
  }
  function avisar(txt) {
    const a = document.createElement("div"); a.className = "aviso"; a.setAttribute("role", "status"); a.textContent = txt;
    document.body.appendChild(a); setTimeout(() => a.remove(), 2600);
  }

  // ---------- Cálculos ----------
  const libroActual = () => D.libro || C.libroActual;
  const desdeInicio = (d) => F.clave(d) >= D.inicio;
  const diaHoy = () => D.dias[kHoy] || { sueno: 0, pasos: 0, agua: 0, entreno: false };
  const entrenoDe = (d) => C.entrenos[d.getDay()] || null;

  function habitoHecho(h, k) {
    if (h.auto) {
      const d = D.dias[k];
      if (!d) return false;
      if (h.auto === "agua") return d.agua >= C.objetivoAgua;
      if (h.auto === "pasos") return d.pasos >= C.objetivoPasos;
    }
    return !!(D.marcas[h.id] && D.marcas[h.id][k]);
  }
  function racha(h) {
    let n = 0, d = new Date(hoy);
    if (!habitoHecho(h, kHoy)) d = F.sumarDias(d, -1);
    while (habitoHecho(h, F.clave(d)) && n < 400) { n++; d = F.sumarDias(d, -1); }
    return n;
  }
  function rachaMasLarga(h) {
    let mejor = 0, act = 0;
    for (let i = 160; i >= 0; i--) { if (habitoHecho(h, F.clave(F.sumarDias(hoy, -i)))) { act++; mejor = Math.max(mejor, act); } else act = 0; }
    return Math.max(mejor, h.record || 0);
  }
  function tuDia() {
    const tres = D.tres[kHoy] || [];
    let total = 3, hechas = tres.filter((t) => t.hecho).length;
    for (const h of C.habitos) { total++; if (habitoHecho(h, kHoy)) hechas++; }
    if (C.habitos.every((h) => h.auto !== "agua")) { total++; if (diaHoy().agua >= C.objetivoAgua) hechas++; }
    if (entrenoDe(hoy)) { total++; if (diaHoy().entreno) hechas++; }
    return { hechas, total };
  }

  function gastosDelMes(anio, mes) {
    return D.gastos.filter((g) => { const d = F.desdeClave(g.fecha); return d.getFullYear() === anio && d.getMonth() === mes; });
  }
  function resumenDinero(cual) {
    const ref = cual === "este" ? hoy : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const anio = ref.getFullYear(), mes = ref.getMonth();
    const diasMes = new Date(anio, mes + 1, 0).getDate();
    const mesCompleto = cual !== "este";
    const hoyDia = mesCompleto ? diasMes : hoy.getDate();
    const lista = gastosDelMes(anio, mes).filter((g) => F.desdeClave(g.fecha).getDate() <= hoyDia);
    const total = lista.reduce((s, g) => s + g.importe, 0);
    const porDia = new Array(diasMes).fill(0);
    lista.forEach((g) => (porDia[F.desdeClave(g.fecha).getDate() - 1] += g.importe));
    const acumulado = []; let s = 0;
    for (let i = 0; i < hoyDia; i++) { s += porDia[i]; acumulado.push(s); }
    const variable = lista.filter((g) => !g.fijo).reduce((s, g) => s + g.importe, 0);
    const fijosPend = mesCompleto ? 0 : C.dinero.fijos.filter((f) => f.dia > hoyDia).reduce((s, f) => s + f.importe, 0);
    const prevision = mesCompleto ? total : total + (variable / hoyDia) * (diasMes - hoyDia) + fijosPend;
    const porCat = {};
    lista.forEach((g) => (porCat[g.cat] = (porCat[g.cat] || 0) + g.importe));
    // Lo que ganas ese mes se suma a lo que puedes gastar (menos lo que guardaste en el ahorro).
    const extra = ingresosDelMes(cual).lista.filter((g) => !g.alAhorro).reduce((s, g) => s + g.importe, 0);
    return { anio, mes, diasMes, hoyDia, lista, total, acumulado, prevision, porCat, mesCompleto, presupuesto: C.dinero.presupuesto + extra, presupuestoBase: C.dinero.presupuesto, extra, quedanDias: diasMes - hoyDia + 1 };
  }

  // Ingresos: de dónde viene el dinero. Tu lista va en tu configuración (dinero.fuentes); si no, esta.
  const FUENTES = () => (C.dinero.fuentes && C.dinero.fuentes.length ? C.dinero.fuentes : [
    { id: "trabajo", nombre: "Trabajo", icono: "💼" },
    { id: "regalo", nombre: "Regalo o propina", icono: "🎁" },
    { id: "otro", nombre: "Otro", icono: "➕" },
  ]);
  const nomFuente = (id) => { const f = FUENTES().find((x) => x.id === id); return f ? `${f.icono} ${f.nombre}` : "➕ Otro"; };
  const objetivoAhorro = () => C.objetivos.find((o) => o.tipo === "dinero");

  // Pagos fijos de los próximos 30 días: lo mínimo que debes tener guardado para pagarlos.
  function reservaFijos() {
    const lista = C.dinero.fijos.map((f) => {
      let d = new Date(hoy.getFullYear(), hoy.getMonth(), f.dia);
      if (f.dia <= hoy.getDate()) d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, f.dia);
      return { ...f, d };
    }).filter((f) => (f.d - hoy) / 864e5 <= 30).sort((a, b) => a.d - b.d);
    const total = lista.reduce((s, f) => s + f.importe, 0);
    const r = resumenDinero("este");
    const tienes = r.presupuesto - r.total;
    return { lista, total, tienes, faltan: Math.max(0, total - tienes), libre: tienes - total };
  }
  function ingresosDelMes(cual) {
    const ref = cual === "este" ? hoy : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    const lista = D.ingresos.filter((g) => { const d = F.desdeClave(g.fecha); return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth(); });
    return { lista, total: lista.reduce((s, g) => s + g.importe, 0) };
  }

  // ---------- Barra lateral ----------
  function pintarLateral() {
    const dA = F.diaDelAno(hoy), tot = F.diasDelAno(hoy), pct = Math.round((dA / tot) * 100);
    $("#progreso-ano").innerHTML = `<small>Tu ${hoy.getFullYear()}</small><b>${pct} %</b> <span class="suave" style="font-size:13px">· Día ${dA}</span>
      <div class="barra" style="margin:8px 0 6px"><i style="width:${pct}%"></i></div><small>Quedan ${tot - dA} días</small>`;
    const nombre = A.pref("nombre") || C.nombre;
    const oscuro = document.documentElement.dataset.tema === "oscuro";
    $("#yo").innerHTML = ui.editNombre
      ? `<input class="campo" id="input-nombre" value="${esc(nombre === "Tú" ? "" : nombre)}" placeholder="Tu nombre" aria-label="Tu nombre" maxlength="30">`
      : `<button type="button" class="nombre" data-acc="editar-nombre" title="Cambiar tu nombre">${esc(nombre)} ✎</button>`;
    $("#yo").insertAdjacentHTML("beforeend", `<button type="button" class="tema" data-acc="tema" aria-label="${oscuro ? "Pasar a modo claro" : "Pasar a modo oscuro"}" title="${oscuro ? "Modo claro" : "Modo oscuro"}">${oscuro ? "☀️" : "🌙"}</button>`);
    if (ui.editNombre) { const i = $("#input-nombre"); i.focus(); i.select(); }
  }

  // ---------- Cabecera ----------
  function pintarCabecera() {
    const h = new Date().getHours();
    const saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
    const nombre = A.pref("nombre") || C.nombre;
    const foco = EJ ? C.foco : (A.pref("foco") || "");
    const { hechas, total } = tuDia();
    const pct = total ? hechas / total : 0;
    const frase = hechas === 0 ? "Empieza por una" : pct >= 1 ? "Día redondo" : pct >= 0.7 ? "Casi lo tienes" : pct >= 0.35 ? "Vas bien" : "Buen comienzo";
    const r = resumenDinero("este");
    const pasado = r.total > r.presupuesto;
    $("#hoy").innerHTML = `<div>
        <p class="cab-fecha">${fmt.fechaLarga(hoy)} · semana ${semanaISO(hoy)}</p>
        <h1 class="saludo">${saludo}, <em>${esc(nombre)}</em></h1>
        ${ui.editFoco ? `<p class="foco" style="display:flex;gap:8px;align-items:center">Foco de la semana: <input class="campo" id="input-foco" style="max-width:420px" value="${esc(foco)}" placeholder="Lo más importante de esta semana" maxlength="90"></p>`
          : `<p class="foco">Foco de la semana: <button type="button" data-acc="editar-foco" style="border:0;background:none;padding:0;cursor:pointer" title="Cambiar el foco">${foco ? `<b>${esc(foco)}</b> <span class="suave">✎</span>` : `<span class="suave" style="text-decoration:underline">escríbelo aquí ✎</span>`}</button></p>`}
        ${pasado ? `<p class="aviso-dinero">⚠️ Te pasaste ${fmt.dineroCorto(r.total - r.presupuesto)} del presupuesto y quedan ${r.quedanDias} días</p>` : ""}
      </div>
      <div class="tu-dia">${G.anillo(pct, 96)}<div><p class="suave" style="font-size:13px;font-weight:600">TU DÍA</p><h3>${frase}</h3><p class="suave" style="font-size:14px">${hechas} de ${total} cosas hechas</p></div></div>`;
    $("#banner").innerHTML = EJ
      ? `<span aria-hidden="true">🧪</span><span><b>Estás viendo datos de ejemplo.</b> No se mezclan con los tuyos. <button type="button" data-acc="modo" style="border:0;background:none;padding:0;color:var(--acento);font-weight:600;text-decoration:underline">Volver a mis datos</button></span>`
      : PV.configPropia
        ? `<span aria-hidden="true">🌱</span><span><b>Tu panel está listo.</b> Tiene tu agenda, tus hábitos, tus objetivos y tu presupuesto. Se llena con lo que marques cada día.</span>`
        : `<span aria-hidden="true">📥</span><span><b>Este panel aún no tiene tu configuración.</b> Lo que ves es una plantilla. Para cargar la tuya: <button type="button" data-acc="importar" style="border:0;background:none;padding:0;color:var(--acento);font-weight:600;text-decoration:underline">Importar copia</button> y elige tu archivo <b>mi-configuracion.json</b>.</span>`;
    if (ui.editFoco) { const i = $("#input-foco"); if (i) { i.focus(); i.select(); } }
  }

  // ---------- 1. Agenda ----------
  function citasHoy() { return (D.citas[kHoy] || PV.agendaDeSemanaTipo(hoy)).slice().sort((a, b) => a.hora.localeCompare(b.hora)); }
  function pintarAgenda() {
    const citas = citasHoy(), m = ahoraMin();
    let siguienteMarcada = false, pendientes = 0;
    const filas = citas.map((c) => {
      const ini = aMin(c.hora), fin = ini + Number(c.dur);
      let estado = "", etq = "";
      if (m >= fin) estado = "pasada";
      else if (m >= ini) { estado = "ahora"; etq = `<span class="etq">Ahora</span>`; pendientes++; }
      else { pendientes++; if (!siguienteMarcada) { siguienteMarcada = true; const falta = ini - m; etq = `<span class="etq prox">En ${falta >= 60 ? fmt.horas(falta) : falta + " min"}</span>`; } }
      if (estado === "ahora") siguienteMarcada = siguienteMarcada || false;
      return `<li class="cita ${estado}">
        <span class="hora">${esc(c.hora)}</span><span class="raya" style="background:${ICO_TIPO[c.tipo] || "var(--acento)"}"></span>
        <div style="min-width:0"><b>${esc(c.titulo)}${etq}</b><small>${fmt.horas(c.dur)} · ${esc(c.tipo)}</small></div>
        <div class="acciones"><button type="button" data-acc="editar-cita" data-id="${esc(c.id)}" aria-label="Editar ${esc(c.titulo)}">✎</button><button type="button" data-acc="borrar-cita" data-id="${esc(c.id)}" aria-label="Borrar ${esc(c.titulo)}">✕</button></div>
      </li>`;
    }).join("");
    let form = "";
    if (ui.formCita) {
      const c = ui.formCita === "nueva" ? { hora: "", dur: 60, titulo: "", tipo: "trabajo" } : citas.find((x) => x.id === ui.formCita) || {};
      form = `<form class="form-cita" data-form="cita">
        <input class="campo" type="time" name="hora" value="${esc(c.hora)}" required aria-label="Hora">
        <input class="campo" name="titulo" value="${esc(c.titulo)}" placeholder="Qué" required aria-label="Título">
        <input class="campo" type="number" name="dur" value="${esc(c.dur)}" min="5" step="5" aria-label="Duración en minutos" title="Minutos">
        <select class="campo" name="tipo" aria-label="Tipo">${["trabajo", "personal", "salud", "aprender"].map((t) => `<option ${t === c.tipo ? "selected" : ""}>${t}</option>`).join("")}</select>
        <div class="acciones-form"><button type="button" class="btn" data-acc="cancelar-cita">Cancelar</button><button class="btn lleno">${ui.formCita === "nueva" ? "Añadir" : "Guardar"}</button></div>
      </form>`;
    }
    $("#t-agenda").innerHTML = cab("🗓️", "Agenda de hoy", `${pendientes} pendiente${pendientes === 1 ? "" : "s"}`) +
      (citas.length ? `<ul class="agenda">${filas}</ul>` : `<p class="vacio">Hoy no tienes nada apuntado.</p>`) + form +
      (ui.formCita ? "" : `<button type="button" class="btn" data-acc="nueva-cita" style="align-self:flex-start">+ Añadir cita</button>`);
  }

  // ---------- 2. Las 3 de hoy ----------
  function pintarTres() {
    const tres = D.tres[kHoy] || [{ texto: "", hecho: false }, { texto: "", hecho: false }, { texto: "", hecho: false }];
    const hechas = tres.filter((t) => t.hecho).length;
    const cita = C.citas[F.diaDelAno(hoy) % C.citas.length];
    $("#t-tres").innerHTML = cab("⭐", "Las 3 de hoy", `${hechas} de 3`, hechas === 3 ? "verde" : "") +
      `<p class="lema">Si solo haces esto, el día ha valido la pena.</p>
      <ol class="tres">${tres.map((t, i) => `<li class="${t.hecho ? "hecho" : ""}"><span class="n">${i + 1}</span>
        <input data-tres="${i}" value="${esc(t.texto)}" placeholder="Escribe la ${["primera", "segunda", "tercera"][i]}…" aria-label="Tarea ${i + 1}">
        <button type="button" class="marca" data-acc="tachar" data-i="${i}" aria-pressed="${t.hecho}" aria-label="${t.hecho ? "Desmarcar" : "Marcar como hecha"}">✓</button></li>`).join("")}</ol>
      <p class="cita-frase">«${esc(cita.texto)}»<small>— ${esc(cita.autor)}</small></p>`;
  }

  // ---------- 3. Tu día en números ----------
  function pintarNumeros() {
    const d = diaHoy();
    const prev = []; for (let i = 1; i <= 14; i++) { const x = D.dias[F.clave(F.sumarDias(hoy, -i))]; if (x && x.sueno) prev.push(x.sueno); }
    const media = prev.length ? prev.reduce((a, b) => a + b, 0) / prev.length : 0;
    const dif = d.sueno && media ? Math.round(d.sueno - media) : 0;
    const plan = entrenoDe(hoy);
    const conPasos = C.objetivoPasos > 0;
    const pctPasos = conPasos ? Math.min(100, Math.round((d.pasos / C.objetivoPasos) * 100)) : 0;
    const hayPlan = Object.keys(C.entrenos).length > 0;
    $("#t-numeros").innerHTML = cab("📊", "Tu día en números") + `<div class="numeros${conPasos ? "" : " sin-pasos"}">
      <div class="numero"><div class="fila"><span class="et">Sueño de anoche</span></div>
        <span class="val">${d.sueno ? fmt.horas(d.sueno) : "—"}</span>
        <small>${d.sueno && media ? (dif === 0 ? "Igual que tu media" : `${Math.abs(dif)} min ${dif > 0 ? "más" : "menos"} que tu media (${fmt.horas(media)})`) : "Apúntalo al despertar"}</small>
        <div class="apuntar"><input class="campo" id="in-sueno" placeholder="7:20" aria-label="Horas dormidas, por ejemplo 7:20" inputmode="numeric"><button type="button" class="btn" data-acc="apuntar-sueno">Apuntar</button></div></div>
      ${conPasos ? `<div class="numero"><div class="fila"><span class="et">Pasos</span><small>${pctPasos} %</small></div>
        <span class="val">${fmt.num(d.pasos)} <small>/ ${fmt.num(C.objetivoPasos)}</small></span>
        <div class="barra"><i style="width:${pctPasos}%;background:var(--verde)"></i></div>
        <div class="apuntar"><input class="campo" id="in-pasos" type="number" min="0" step="100" placeholder="${d.pasos}" aria-label="Pasos de hoy"><button type="button" class="btn" data-acc="apuntar-pasos">Apuntar</button></div></div>` : ""}
      <div class="numero"><div class="fila"><span class="et">Agua</span><small>${d.agua} de ${C.objetivoAgua} vasos</small></div>
        <div class="control"><button type="button" class="btn-mini" data-acc="agua" data-d="-1" aria-label="Quitar un vaso">−</button>
          <span class="val">${d.agua}</span><button type="button" class="btn-mini" data-acc="agua" data-d="1" aria-label="Sumar un vaso">+</button></div>
        <div class="puntos" aria-hidden="true">${Array.from({ length: C.objetivoAgua }, (_, i) => `<i class="${i < d.agua ? "si" : ""}"></i>`).join("")}</div></div>
      <div class="numero"><span class="et">Entreno de hoy</span>
        <div class="entreno ${d.entreno ? "hecho" : ""}"><b>${plan ? esc(plan) : (EJ || hayPlan ? "Descanso" : "Sin plan de entreno")}</b>
          <button type="button" class="btn ${d.entreno ? "" : plan ? "lleno" : ""}" data-acc="entreno">${d.entreno ? "✓ Hecho" : plan ? "Marcar hecho" : "Entrené hoy"}</button></div></div>
    </div>`;
  }

  // ---------- 4. Hábitos ----------
  function pintarHabitos() {
    const lunes = lunesDe(hoy);
    const semana = Array.from({ length: 7 }, (_, i) => F.sumarDias(lunes, i));
    const hechosHoy = C.habitos.filter((h) => habitoHecho(h, kHoy)).length;
    const filas = C.habitos.map((h) => {
      const casillas = semana.map((d) => {
        const k = F.clave(d), si = habitoHecho(h, k), esHoy = k === kHoy, futuro = d > hoy;
        const estilo = si ? `style="background:var(--${h.color})"` : "";
        const dis = !esHoy || h.auto ? "disabled" : "";
        const tit = h.auto && esHoy ? "Se marca solo al llegar al objetivo" : esHoy ? (si ? "Desmarcar hoy" : "Marcar hoy") : "";
        return `<button type="button" class="casilla ${si ? "si" : ""} ${esHoy ? "hoy" : ""} ${futuro ? "futuro" : ""}" ${estilo} ${dis} data-acc="habito" data-id="${h.id}" aria-pressed="${si}" aria-label="${esc(h.nombre)}, ${fmt.diaSemana(d)}" ${tit ? `title="${tit}"` : ""}>${si ? "✓" : ""}</button>`;
      }).join("");
      const r = racha(h);
      return `<div class="habito"><div class="hab-nom"><span class="hab-ico" style="background:var(--${h.color}-suave)">${h.icono}</span>
        <div style="min-width:0"><b>${esc(h.nombre)}</b><small>${rachaMasLarga(h) ? `Récord: ${rachaMasLarga(h)} días` : "Empieza hoy"}${h.auto ? " · automático" : ""}</small></div></div>
        ${casillas}<span class="racha">${r ? `🔥 ${r}` : `<span class="suave">—</span>`}</span></div>`;
    }).join("");

    // Mapa de calor: 20 semanas, de lunes a domingo.
    const inicio = F.sumarDias(lunes, -19 * 7);
    const celdas = [];
    const porDiaSemana = Array(7).fill(0).map(() => ({ s: 0, n: 0 }));
    for (let i = 0; i < 140; i++) {
      const d = F.sumarDias(inicio, i), k = F.clave(d);
      if (d > hoy) { celdas.push(`<i style="opacity:.3"></i>`); continue; }
      const n = C.habitos.filter((h) => habitoHecho(h, k)).length, f = n / C.habitos.length;
      if (desdeInicio(d)) { porDiaSemana[d.getDay()].s += f; porDiaSemana[d.getDay()].n++; }
      const fondo = n === 0 ? "" : `background:color-mix(in srgb, var(--verde) ${Math.round(18 + f * 82)}%, var(--tarjeta))`;
      celdas.push(`<i style="${fondo}" title="${fmt.fechaCorta(d)}: ${n} de ${C.habitos.length}"></i>`);
    }
    // Cifras del mes
    let posibles = 0, cumplidos = 0, perfectos = 0;
    for (let d = new Date(hoy.getFullYear(), hoy.getMonth(), 1); d <= hoy; d = F.sumarDias(d, 1)) {
      if (!desdeInicio(d)) continue;
      const k = F.clave(d), n = C.habitos.filter((h) => habitoHecho(h, k)).length;
      posibles += C.habitos.length; cumplidos += n; if (n === C.habitos.length) perfectos++;
    }
    const mejor = porDiaSemana.map((x, i) => ({ i, m: x.n ? x.s / x.n : 0 })).sort((a, b) => b.m - a.m)[0];
    const hayHistoria = mejor.m > 0;

    $("#habitos").innerHTML = cab("🔥", "Hábitos", `${hechosHoy} de ${C.habitos.length} hoy`, hechosHoy === C.habitos.length ? "verde" : "") +
      `<div class="habitos"><div class="hab-cab"><span></span>${semana.map((d) => `<span class="${F.clave(d) === kHoy ? "hoy" : ""}">${LETRAS[d.getDay()]}</span>`).join("")}<span style="text-align:right">Racha</span></div>${filas}</div>
      <div class="mapa-zona"><div><p class="sub">Últimas 20 semanas</p><div class="mapa-calor" aria-label="Mapa de hábitos cumplidos de las últimas 20 semanas" role="img">${celdas.join("")}</div>
        <div class="mapa-ley">Menos <i style="background:var(--fondo)"></i><i style="background:color-mix(in srgb, var(--verde) 35%, var(--tarjeta))"></i><i style="background:color-mix(in srgb, var(--verde) 65%, var(--tarjeta))"></i><i style="background:var(--verde)"></i> Más</div></div>
        <div class="cifras"><div class="cifra"><small>Cumplido este mes</small><b>${posibles && cumplidos ? Math.round((cumplidos / posibles) * 100) + " %" : "—"}</b></div>
          <div class="cifra"><small>Días perfectos</small><b>${perfectos}</b></div>
          <div class="cifra"><small>Tu mejor día</small><b>${hayHistoria ? cap(["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][mejor.i]) : "—"}</b></div></div></div>`;
  }

  // ---------- 5. Objetivos ----------
  function valorObjetivo(o) {
    if (o.desdeLibros) return C.librosLeidos.length;
    return Number(D.objetivos[o.id] ?? 0);
  }
  // Lo que deberías llevar hoy: desde el 1 de enero, o desde el día que empezaste el objetivo.
  function debidoObjetivo(o) {
    if (!o.desde) return o.meta * (F.diaDelAno(hoy) / F.diasDelAno(hoy));
    const ini = F.desdeClave(o.desde), fin = o.hasta ? F.desdeClave(o.hasta) : new Date(hoy.getFullYear(), 11, 31);
    const frac = fin > ini ? Math.max(0, Math.min(1, (hoy - ini) / (fin - ini))) : 1;
    const base = o.inicio || 0;
    return base + (o.meta - base) * frac;
  }
  function pintarObjetivos() {
    let alDia = 0, cuenta = 0;
    const filas = C.objetivos.map((o) => {
      const ico = `<span class="obj-ico" style="background:var(--${o.color}-suave)">${o.icono}</span>`;
      if (o.tipo === "si-no") {
        const hecho = D.objetivos[o.id] === true || (D.objetivos[o.id] === undefined && o.hecho);
        return `<div class="objetivo">${ico}<div><div class="fila"><b>${esc(o.nombre)}</b>
          <button type="button" class="pastilla ${hecho ? "verde" : "gris"}" style="border:0" data-acc="objetivo-sino" data-id="${o.id}" aria-pressed="${hecho}">${hecho ? "✓ Hecho" : "Pendiente"}</button></div>
          <small class="suave">Objetivo de sí o no: márcalo cuando lo consigas.</small></div></div>`;
      }
      cuenta++;
      const sinDatos = o.desdeLibros ? C.librosLeidos.length === 0 : D.objetivos[o.id] === undefined;
      const v = valorObjetivo(o), debido = debidoObjetivo(o), dif = v - debido;
      const pct = Math.min(100, (v / o.meta) * 100), pctDebido = Math.min(100, (debido / o.meta) * 100);
      const f = (n) => (o.tipo === "dinero" ? fmt.dineroCorto(n) : `${fmt.num(Math.round(n))} ${o.unidad}`);
      const margen = o.meta * 0.015;
      let frase, color;
      if (sinDatos) { frase = o.desdeLibros ? "Aún no hay libros terminados" : "Sin datos todavía"; color = "var(--tinta-suave)"; }
      else if (v >= o.meta) { frase = "¡Conseguido! 🎉"; color = "var(--verde)"; alDia++; }
      else if (Math.abs(dif) <= margen) { frase = "Vas al día"; color = "var(--verde)"; alDia++; }
      else if (dif > 0) { frase = `Vas por delante: +${f(dif)}`; color = "var(--verde)"; alDia++; }
      else { frase = `Te faltan ${f(-dif)} para ir al día`; color = "var(--ambar)"; }
      const editando = ui.editObjetivo === o.id;
      return `<div class="objetivo">${ico}<div><div class="fila"><b>${esc(o.nombre)}</b><span class="num">${o.tipo === "dinero" ? fmt.dineroCorto(v) : fmt.num(v)} <span class="suave" style="font-size:13px">/ ${o.tipo === "dinero" ? fmt.dineroCorto(o.meta) : fmt.num(o.meta)}</span></span></div>
        <div class="barra"><i style="width:${pct}%;background:var(--${o.color})"></i><span class="ritmo" ${sinDatos ? 'hidden' : ''} style="left:calc(${pctDebido}% - 1px)" title="Dónde deberías ir hoy"></span></div>
        <div class="fila"><span class="frase-obj" style="color:${color}">${frase}</span>
        ${o.desdeLibros ? `<small class="suave">Se cuenta con tu estantería</small>` : editando
          ? `<span class="obj-acc"><input class="campo" type="number" id="in-obj" value="${v}" min="0" aria-label="Progreso de ${esc(o.nombre)}"><button type="button" class="btn lleno" data-acc="guardar-objetivo" data-id="${o.id}">OK</button></span>`
          : `<button type="button" class="btn" data-acc="editar-objetivo" data-id="${o.id}" style="padding:3px 10px;font-size:12.5px">Actualizar</button>`}</div></div></div>`;
    }).join("");
    $("#objetivos").innerHTML = cab("🎯", `Objetivos de ${hoy.getFullYear()}`, `${alDia} de ${cuenta} al día`, alDia === cuenta ? "verde" : "") +
      `<div class="objetivos">${filas}</div><p class="suave" style="font-size:12.5px">La rayita negra marca dónde deberías ir hoy para llegar a tiempo.</p>`;
    if (ui.editObjetivo) { const i = $("#in-obj"); if (i) { i.focus(); i.select(); } }
  }

  // ---------- 6. Dinero ----------
  function pintarDinero() {
    const r = resumenDinero(ui.pestanaDinero);
    const ing = ingresosDelMes(ui.pestanaDinero);
    const balance = ing.total - r.total;
    const queda = r.presupuesto - r.total;
    const pasado = queda < 0;
    const nombreMes = cap(new Date(r.anio, r.mes, 1).toLocaleDateString(C.locale, { month: "long" }));
    let linea;
    if (!r.lista.length) linea = r.mesCompleto ? `Sin gastos apuntados ese mes.` : `Aún no has apuntado gastos. Pulsa <b>+ Gasto</b> para empezar.`;
    else if (r.mesCompleto) linea = pasado ? `<span class="rojo"><b>Te pasaste ${fmt.dinero(-queda)}</b> en ${nombreMes.toLowerCase()}.</span>` : `Cerraste ${nombreMes.toLowerCase()} con <b class="verde">${fmt.dinero(queda)}</b> de sobra.`;
    else linea = pasado ? `<span class="rojo"><b>Te pasaste ${fmt.dinero(-queda)}</b> y quedan ${r.quedanDias} día${r.quedanDias === 1 ? "" : "s"}.</span>`
      : `Te quedan <b>${fmt.dinero(queda)}</b> para ${r.quedanDias} día${r.quedanDias === 1 ? "" : "s"} · unos <b>${fmt.dineroCorto(queda / r.quedanDias)}</b> al día.`;
    const difPrev = r.prevision - r.presupuesto;
    const pastPrev = r.mesCompleto || !r.lista.length ? "" : difPrev > 0
      ? `<span class="pastilla rojo">Previsión: ${fmt.dineroCorto(r.prevision)} · te pasarías ${fmt.dineroCorto(difPrev)}</span>`
      : `<span class="pastilla verde">Previsión: ${fmt.dineroCorto(r.prevision)} · cierras bien</span>`;

    const cats = C.dinero.categorias.map((c) => {
      const g = r.porCat[c.id] || 0, p = Math.min(100, (g / c.limite) * 100), over = g > c.limite;
      return `<div class="cat ${over ? "pasada" : ""}"><div class="fila"><b>${esc(c.nombre)}</b><span>${fmt.dineroCorto(g)} <span class="suave">/ ${fmt.dineroCorto(c.limite)}</span></span></div>
        <div class="barra"><i style="width:${p}%;background:var(--${c.color})"></i></div></div>`;
    }).join("");

    // Próximos cobros
    // Aviso: ¿te llega para los pagos fijos que vienen?
    let avisoFijos = "";
    if (!r.mesCompleto) {
      const rf = reservaFijos();
      if (rf.total > 0) {
        const quienes = rf.lista.map((f) => `${esc(f.concepto.replace(/\s*\(.*\)$/, ""))}, ${fmt.fechaCorta(f.d)}`).join(" · ");
        avisoFijos = rf.faltan > 0
          ? `<p class="aviso-fijos rojo-f">⚠️ <span>Necesitas <b>${fmt.dinero(rf.total)}</b> para tus pagos fijos (${quienes}). Te quedan ${fmt.dinero(Math.max(0, rf.tienes))}: <b>te faltan ${fmt.dinero(rf.faltan)}</b>.</span></p>`
          : `<p class="aviso-fijos verde-f">✅ <span>Tienes cubiertos tus pagos fijos (<b>${fmt.dinero(rf.total)}</b>: ${quienes}). Puedes gastar <b>${fmt.dinero(rf.libre)}</b> sin tocarlos.</span></p>`;
      }
    }

    const prox = C.dinero.fijos.map((f) => {
      let d = new Date(hoy.getFullYear(), hoy.getMonth(), f.dia);
      if (f.dia <= hoy.getDate()) d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, f.dia);
      return { ...f, d };
    }).sort((a, b) => a.d - b.d).slice(0, 5);
    const ultimos = r.lista.map((g) => ({ ...g, tipo: "gasto" })).concat(ing.lista.map((g) => ({ ...g, tipo: "ingreso" })))
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.id > a.id ? 1 : -1)).slice(0, 8);
    const nomCat = (id) => (C.dinero.categorias.find((c) => c.id === id) || { nombre: id }).nombre;

    const form = ui.formGasto ? `<form class="form-gasto" data-form="gasto">
        <input class="campo" name="importe" type="number" min="0.1" step="0.1" placeholder="S/ 0.00" required aria-label="Importe en soles">
        <input class="campo" name="concepto" placeholder="Concepto" required aria-label="Concepto">
        <select class="campo" name="cat" aria-label="Categoría">${C.dinero.categorias.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join("")}</select>
        <input class="campo" name="fecha" type="date" value="${kHoy}" max="${kHoy}" required aria-label="Fecha">
        <div class="acciones-form"><button type="button" class="btn" data-acc="cancelar-gasto">Cancelar</button><button class="btn lleno">Guardar gasto</button></div>
      </form>` : "";
    const oa = objetivoAhorro();
    const formIng = ui.formIngreso ? `<form class="form-gasto form-ingreso" data-form="ingreso">
        <input class="campo" name="importe" type="number" min="0.1" step="0.1" placeholder="S/ 0.00" required aria-label="Importe en soles">
        <input class="campo" name="concepto" placeholder="¿De qué fue?" required aria-label="Concepto">
        <select class="campo" name="fuente" aria-label="De dónde vino">${FUENTES().map((f) => `<option value="${esc(f.id)}">${esc(f.icono + " " + f.nombre)}</option>`).join("")}</select>
        <input class="campo" name="fecha" type="date" value="${kHoy}" max="${kHoy}" required aria-label="Fecha">
        ${oa ? `<label class="casilla-ahorro"><input type="checkbox" name="ahorro"> Guardar en mi ahorro <span class="suave">(${esc(oa.nombre)})</span></label>` : ""}
        <div class="acciones-form"><button type="button" class="btn" data-acc="cancelar-ingreso">Cancelar</button><button class="btn verde-btn">Guardar ingreso</button></div>
      </form>` : "";

    $("#dinero").innerHTML = `<div class="t-cab"><h2 class="t-tit"><span aria-hidden="true">💰</span>Dinero · ${nombreMes}</h2>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <div class="pestanas" role="tablist"><button type="button" role="tab" class="${ui.pestanaDinero === "este" ? "on" : ""}" aria-selected="${ui.pestanaDinero === "este"}" data-acc="pestana" data-p="este">Este mes</button><button type="button" role="tab" class="${ui.pestanaDinero === "pasado" ? "on" : ""}" aria-selected="${ui.pestanaDinero === "pasado"}" data-acc="pestana" data-p="pasado">Mes pasado</button></div>
          <button type="button" class="btn verde-btn" data-acc="nuevo-ingreso">+ Ingreso</button>
          <button type="button" class="btn lleno" data-acc="nuevo-gasto">+ Gasto</button></div></div>
      ${form}${formIng}
      <div class="dinero-top">
        <div style="display:flex;flex-direction:column;gap:10px;min-width:0">
          <p class="gastado ${pasado ? "rojo" : ""}">${fmt.dineroCorto(r.total)} <small>de ${fmt.dineroCorto(r.presupuesto)}</small></p>
          ${r.extra > 0 ? `<p class="suave" style="font-size:13px;margin-top:-4px">Presupuesto ${fmt.dinero(r.presupuestoBase)} <b class="verde">+ ${fmt.dinero(r.extra)}</b> de ingresos</p>` : ""}
          <p>${linea}</p>
          ${avisoFijos}
          <div>${pastPrev}</div>
          <div class="balance">
            <div><small>Ingresos</small><b class="verde">+${fmt.dinero(ing.total)}</b></div>
            <div><small>Gastos</small><b>−${fmt.dinero(r.total)}</b></div>
            <div><small>Balance</small><b class="${balance < 0 ? "rojo" : balance > 0 ? "verde" : ""}">${balance < 0 ? "−" : balance > 0 ? "+" : ""}${fmt.dinero(Math.abs(balance))}</b></div>
          </div>
          ${G.gastoAcumulado(r)}
        </div>
        <div><p class="sub">Por categoría</p><div class="cats">${cats}</div></div>
      </div>
      <div class="dinero-bajo">
        <div><p class="sub">Próximos cobros</p>${prox.length ? "" : `<p class="vacio">Sin gastos fijos todavía (alquiler, luz, internet…).</p>`}<ul class="lista">${prox.map((f) => `<li><div><b>${esc(f.concepto)}</b><small>${fmt.fechaCorta(f.d)} · ${esc(nomCat(f.cat))}</small></div><span class="imp">${fmt.dinero(f.importe)}</span></li>`).join("")}</ul></div>
        <div><p class="sub">Últimos movimientos</p>${ultimos.length ? `<ul class="lista">${ultimos.map((g) => g.tipo === "ingreso"
          ? `<li class="ingreso"><div style="min-width:0"><b>${esc(g.concepto)}</b><small>${fmt.fechaCorta(F.desdeClave(g.fecha))} · ${esc(nomFuente(g.fuente))}${g.alAhorro ? " · 🐷 al ahorro" : ""}</small></div><span class="imp verde">+${fmt.dinero(g.importe)}<button type="button" class="borrar" data-acc="borrar-ingreso" data-id="${esc(g.id)}" aria-label="Borrar ${esc(g.concepto)}">✕</button></span></li>`
          : `<li><div style="min-width:0"><b>${esc(g.concepto)}</b><small>${fmt.fechaCorta(F.desdeClave(g.fecha))} · ${esc(nomCat(g.cat))}</small></div><span class="imp">−${fmt.dinero(g.importe)}<button type="button" class="borrar" data-acc="borrar-gasto" data-id="${esc(g.id)}" aria-label="Borrar ${esc(g.concepto)}">✕</button></span></li>`).join("")}</ul>` : `<p class="vacio">Sin movimientos este mes.</p>`}</div>
      </div>`;
    if (ui.formGasto || ui.formIngreso) { const i = $('#dinero [name="importe"]'); if (i) i.focus(); }
  }

  // ---------- 7. Lo que dicen tus datos ----------
  function pintarDatos() {
    const frases = [];
    const ult = []; for (let i = 1; i <= 30; i++) { const k = F.clave(F.sumarDias(hoy, -i)); if (D.dias[k]) ult.push({ k, ...D.dias[k] }); }
    const con = ult.filter((d) => d.entreno && d.sueno), sin = ult.filter((d) => !d.entreno && d.sueno);
    const media = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length;
    if (con.length >= 3 && sin.length >= 3) {
      const dif = Math.round(media(con, (d) => d.sueno) - media(sin, (d) => d.sueno));
      frases.push(["😴", "var(--azul-suave)", dif >= 0 ? `Los días que entrenas duermes <b>${dif} min más</b> que los que no.` : `Los días que entrenas duermes <b>${-dif} min menos</b>. ¿Entrenas muy tarde?`]);
      const ac = con.filter((d) => D.animo[d.k]), as = sin.filter((d) => D.animo[d.k]);
      if (ac.length >= 3 && as.length >= 3) {
        const a1 = media(as, (d) => D.animo[d.k]), a2 = media(ac, (d) => D.animo[d.k]);
        frases.push(["💪", "var(--verde-suave)", `Tu ánimo pasa de <b>${fmt.num(Math.round(a1 * 10) / 10)}</b> a <b>${fmt.num(Math.round(a2 * 10) / 10)}</b> (de 5) los días que entrenas.`]);
      }
    }
    const rachas = C.habitos.map((h) => ({ h, r: racha(h) })).sort((a, b) => b.r - a.r);
    if (rachas[0] && rachas[0].r > 0) frases.push(["🔥", "var(--ambar-suave)", `Tu racha más larga ahora: <b>${esc(rachas[0].h.nombre.toLowerCase())}, ${rachas[0].r} días</b> seguidos.`]);
    const r = resumenDinero("este");
    const dp = r.prevision - r.presupuesto;
    if (r.lista.length) frases.push(["💰", "var(--terracota-suave)", dp > 0 ? `A este ritmo cierras el mes en <b>${fmt.dineroCorto(r.prevision)}</b>: <b class="rojo">${fmt.dineroCorto(dp)} por encima</b> del presupuesto.` : `A este ritmo cierras el mes en <b>${fmt.dineroCorto(r.prevision)}</b>, <b class="verde">${fmt.dineroCorto(-dp)} por debajo</b> del presupuesto.`]);
    if (frases.length < 4) {
      const top = Object.entries(r.porCat).sort((a, b) => b[1] - a[1])[0];
      if (top) frases.push(["🧾", "var(--violeta-suave)", `Donde más gastas este mes: <b>${esc((C.dinero.categorias.find((c) => c.id === top[0]) || {}).nombre || top[0])}</b>, ${fmt.dineroCorto(top[1])}.`]);
    }
    if (frases.length < 4) {
      const cuenta = {}; r.lista.filter((g) => !g.fijo).forEach((g) => (cuenta[g.concepto] = (cuenta[g.concepto] || 0) + 1));
      const rep = Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0];
      if (rep) frases.push(["☕", "var(--rosa-suave)", `Tu gasto más repetido: <b>${esc(rep[0])}</b>, ${rep[1]} veces este mes.`]);
    }
    if (!frases.length) frases.push(["🌱", "var(--verde-suave)", `Todavía no hay datos suficientes. En unos días, con lo que vayas marcando, aquí verás <b>frases calculadas con tus números</b>: cómo duermes los días que entrenas, tus rachas y a qué ritmo cierras el mes.`]);
    $("#t-datos").innerHTML = cab("💡", "Lo que dicen tus datos") + `<ul class="frases">${frases.slice(0, 4).map(([i, bg, t]) => `<li><i style="background:${bg}">${i}</i><span>${t}</span></li>`).join("")}</ul>`;
  }

  // ---------- 8. Sueño y entreno ----------
  function pintarSueno() {
    const noches = [];
    for (let i = 13; i >= 0; i--) {
      const d = F.sumarDias(hoy, -i), x = D.dias[F.clave(d)] || {};
      noches.push({ min: x.sueno || 0, entreno: !!x.entreno, letra: LETRAS[d.getDay()], etiqueta: fmt.fechaCorta(d) });
    }
    const conSueno = noches.filter((n) => n.min);
    const medio = conSueno.length ? conSueno.reduce((s, n) => s + n.min, 0) / conSueno.length : 0;
    const lunes = lunesDe(hoy);
    let hechos = 0, plan = 0, pasosS = 0, pasosN = 0;
    const dias = Array.from({ length: 7 }, (_, i) => {
      const d = F.sumarDias(lunes, i), k = F.clave(d), x = D.dias[k] || {}, p = entrenoDe(d);
      if (p) plan++;
      if (x.entreno) hechos++;
      if (d <= hoy && x.pasos) { pasosS += x.pasos; pasosN++; }
      let cls = "", txt = p ? p.split(" ")[0] : (EJ ? "Descanso" : "—");
      if (x.entreno) { cls = "hecho"; txt = "✓ " + (p ? p.split(" ")[0] : "Extra"); }
      else if (p && k === kHoy) cls = "toca";
      else if (p && d < hoy) { cls = "falta"; txt = "✕ " + p.split(" ")[0]; }
      else if (!p) cls = "suave";
      return `<div class="${cls}" title="${esc(p || txt)}"><b>${LETRAS[d.getDay()]}</b>${esc(txt)}</div>`;
    }).join("");
    $("#salud").innerHTML = cab("💪", "Sueño y entreno", plan ? `${hechos} de ${plan} entrenos` : `${hechos} entreno${hechos === 1 ? "" : "s"}`, plan && hechos >= plan ? "verde" : "gris") +
      `<div class="tres-cifras${C.objetivoPasos > 0 ? "" : " dos"}"><div><small>Sueño medio (14 noches)</small><b>${medio ? fmt.horas(medio) : "—"}</b></div><div><small>Entrenos esta semana</small><b>${plan ? `${hechos} de ${plan}` : hechos}</b></div>${C.objetivoPasos > 0 ? `<div><small>Pasos al día (semana)</small><b>${pasosN ? fmt.num(Math.round(pasosS / pasosN)) : "—"}</b></div>` : ""}</div>
      ${G.barrasSueno(noches, C.objetivoSueno)}
      <div class="ley"><span><i style="background:var(--verde)"></i>Con entreno</span><span><i style="background:var(--azul-suave-fuerte)"></i>Sin entreno</span><span><i style="background:var(--tinta);height:2px;opacity:.55"></i>Objetivo ${fmt.horas(C.objetivoSueno)}</span></div>
      <div class="semana">${dias}</div>`;
  }

  // ---------- 9. Ánimo ----------
  const CARAS = [["😣", "Fatal"], ["😕", "Regular"], ["😐", "Normal"], ["🙂", "Bien"], ["😄", "Genial"]];
  const COLOR_ANIMO = ["var(--rojo)", "var(--terracota)", "var(--ambar)", "color-mix(in srgb, var(--verde) 55%, var(--tarjeta))", "var(--verde)"];
  function pintarAnimo() {
    const actual = D.animo[kHoy];
    const lunes = lunesDe(hoy), inicio = F.sumarDias(lunes, -28);
    let s = 0, n = 0;
    const celdas = Array.from({ length: 35 }, (_, i) => {
      const d = F.sumarDias(inicio, i), v = D.animo[F.clave(d)];
      if (d > hoy) return `<i style="opacity:.3"></i>`;
      if (v) { s += v; n++; }
      return `<i style="${v ? `background:${COLOR_ANIMO[v - 1]}` : ""}" title="${fmt.fechaCorta(d)}${v ? ": " + CARAS[v - 1][1] : ""}"></i>`;
    }).join("");
    $("#t-animo").innerHTML = cab("🙂", "Ánimo", n ? `Media ${fmt.num(Math.round((s / n) * 10) / 10)} de 5` : "", "gris") +
      `<p style="font-family:var(--f-titulo);font-size:18px">¿Cómo estás hoy?</p>
      <div class="caras">${CARAS.map(([c, t], i) => `<button type="button" class="${actual === i + 1 ? "on" : ""}" data-acc="animo" data-v="${i + 1}" aria-pressed="${actual === i + 1}" aria-label="${t}" title="${t}">${c}</button>`).join("")}</div>
      <p class="sub" style="margin-top:4px">Últimas 5 semanas</p>
      <div class="animo-rejilla" role="img" aria-label="Ánimo de las últimas 5 semanas">${celdas}</div>
      <div class="mapa-ley">Fatal ${COLOR_ANIMO.map((c) => `<i style="background:${c}"></i>`).join("")} Genial</div>`;
  }

  // ---------- 10. Leyendo ahora ----------
  function pintarLibro() {
    const L = libroActual();
    if (!L) {
      $("#lectura").innerHTML = cab("📖", "Leyendo ahora") + `<p class="vacio">¿Qué libro estás leyendo?</p>
        <form class="form-gasto" data-form="libro" style="grid-template-columns:minmax(0,1fr) 90px">
          <input class="campo" name="titulo" placeholder="Título" required aria-label="Título del libro" style="grid-column:1/-1">
          <input class="campo" name="autor" placeholder="Autor" aria-label="Autor">
          <input class="campo" name="paginas" type="number" min="1" placeholder="Págs." required aria-label="Páginas totales">
          <div class="acciones-form"><button class="btn lleno">Empezar a seguirlo</button></div></form>`;
      return;
    }
    const pag = Math.min(L.paginas, Number(D.libroPagina) || 0);
    const pct = Math.round((pag / L.paginas) * 100);
    const quedan = L.paginas - pag;
    let fin;
    if (quedan <= 0) fin = "¡Terminado! 🎉";
    else {
      const dias = Math.ceil(quedan / L.ritmo), d = F.sumarDias(hoy, dias);
      const cuando = dias === 1 ? "mañana" : dias < 7 ? `el ${fmt.diaSemana(d)}` : `el ${d.getDate()} de ${d.toLocaleDateString(C.locale, { month: "long" }).toLowerCase()}`;
      fin = `A tu ritmo (${L.ritmo} páginas al día) lo terminas <b>${cuando}</b>.`;
    }
    $("#lectura").innerHTML = cab("📖", "Leyendo ahora", `${pct} %`) +
      `<div class="libro">${G.portada(L.titulo, L.autor, L.color)}<div style="display:flex;flex-direction:column;gap:8px;min-width:0">
        <h3>${esc(L.titulo)}</h3><p class="suave" style="font-size:14px">${esc(L.autor)}</p>
        <div class="pag">Página <input class="campo" type="number" id="in-pagina" min="0" max="${L.paginas}" value="${pag}" aria-label="Página en la que vas"> de ${L.paginas}</div>
      </div></div>
      <div class="barra"><i style="width:${pct}%;background:var(--${L.color})"></i></div>
      <p style="font-size:14px">${fin}</p>`;
  }

  // ---------- 11. Diario ----------
  function pintarDiario() {
    const deHoy = D.diario.find((e) => e.fecha === kHoy);
    const ant = D.diario.filter((e) => e.fecha !== kHoy).slice(0, 3);
    const texto = deHoy ? deHoy.texto : "";
    $("#diario").innerHTML = cab("✍️", "Diario", deHoy ? "Guardado hoy" : "", deHoy ? "verde" : "") +
      `<p style="font-family:var(--f-titulo);font-size:17px;line-height:1.35">¿Qué ha ido bien hoy? ¿Qué cambiarías mañana?</p>
      <div class="diario" style="display:flex;flex-direction:column;gap:8px"><textarea class="campo" id="in-diario" aria-label="Entrada del diario de hoy" placeholder="Escribe un par de líneas…">${esc(texto)}</textarea>
        <div class="fila"><small class="suave" id="contador">${contar(texto)}</small><button type="button" class="btn lleno" data-acc="guardar-diario">Guardar</button></div></div>
      ${ant.length ? `<ul class="entradas">${ant.map((e) => `<li><small>${fmt.fechaCorta(F.desdeClave(e.fecha))}</small>${esc(e.texto)}</li>`).join("")}</ul>` : ""}`;
  }
  function contar(t) { const n = (t.trim().match(/\S+/g) || []).length; return `${n} palabra${n === 1 ? "" : "s"}`; }

  // ---------- 12. Libros del año ----------
  function pintarEstante() {
    const libros = C.librosLeidos, meta = (C.objetivos.find((o) => o.desdeLibros) || { meta: libros.length }).meta;
    const lomos = libros.map((l, i) => `<div class="lomo" style="height:${118 + ((i * 37) % 40)}px;background:var(--${l.color})" title="${esc(l.titulo)} · ${"★".repeat(l.nota)}">${esc(l.titulo)}</div>`).join("");
    const huecos = Array.from({ length: Math.max(0, meta - libros.length) }, () => `<div class="hueco" aria-hidden="true"></div>`).join("");
    const u = libros[libros.length - 1];
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    $("#t-estante").innerHTML = cab("📚", `Libros de ${hoy.getFullYear()}`, `${libros.length} de ${meta}`) + (libros.length ? "" : `<p class="vacio">Aún no hay libros terminados. Cada hueco es uno que te falta para la meta.</p>`) +
      `<div class="estante" role="img" aria-label="${libros.length} libros leídos de ${meta}">${lomos}${huecos}</div>
      ${u ? `<div class="ultimo"><span>Último terminado: <b>${esc(u.titulo)}</b>${u.mes ? ` <span class="suave">· ${meses[u.mes - 1]}</span>` : ""}</span><span class="estrellas" aria-label="${u.nota} de 5 estrellas">${"★".repeat(u.nota)}<span style="opacity:.25">${"★".repeat(5 - u.nota)}</span></span></div>` : ""}`;
  }

  // ---------- Pintar todo ----------
  function pintarPie() {
    $("#pie-modo").innerHTML = EJ
      ? `<button type="button" data-acc="modo">← Volver a mis datos</button> <button type="button" data-acc="restablecer">Restablecer los datos de ejemplo</button>`
      : `<button type="button" data-acc="modo">Ver datos de ejemplo</button> <button type="button" data-acc="restablecer">Borrar mis datos</button>`;
  }
  function pintar() {
    refrescarFecha();
    D = A.datos();
    pintarPie();
    pintarLateral(); pintarCabecera(); pintarAgenda(); pintarTres(); pintarNumeros(); pintarHabitos();
    pintarObjetivos(); pintarDinero(); pintarDatos(); pintarSueno(); pintarAnimo(); pintarLibro(); pintarDiario(); pintarEstante();
    if (PV.jarvis) PV.jarvis.pintar();
    if (PV.ganar) PV.ganar.pintar();
    if (PV.avisosUI) PV.avisosUI.pintar();
  }

  // Lo que Jarvis necesita para leer tus datos (js/jarvis.js).
  PV.calc = {
    datos: () => D, hoy: () => hoy, kHoy: () => kHoy, esc,
    habitoHecho, racha, tuDia, resumenDinero, citasHoy, valorObjetivo, debidoObjetivo,
    entrenoDe, libroActual, ahoraMin, aMin, lunesDe, ingresosDelMes, nomFuente, reservaFijos,
  };
  // Para otras tarjetas (js/ganar.js): volver a pintar todo, y abrir "+ Ingreso" ya rellenado.
  PV.repintar = () => pintar();
  PV.abrirIngreso = (concepto) => {
    ui.formIngreso = true; ui.formGasto = false; pintarDinero();
    const c = $('#dinero [name="concepto"]'); if (c) c.value = concepto || "";
    $("#dinero").scrollIntoView({ behavior: "smooth", block: "start" });
    const i = $('#dinero [name="importe"]'); if (i) setTimeout(() => i.focus({ preventScroll: true }), 400);
  };
  function primeraVez() {
    document.querySelectorAll(".tarjeta").forEach((t, i) => (t.style.animationDelay = `${Math.min(i, 12) * 45}ms`));
    pintar();
  }

  // ---------- Cambios ----------
  const cambiarDia = (fn) => A.cambiar((m) => { m.dias[kHoy] = { ...(m.dias[kHoy] || {}) }; fn(m.dias[kHoy], diaHoy()); });

  function asegurarCitas(m) { if (!m.citas[kHoy]) m.citas[kHoy] = citasHoy().map((c) => ({ ...c })); return m.citas[kHoy]; }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-acc]");
    if (!b) return;
    const acc = b.dataset.acc, id = b.dataset.id;
    switch (acc) {
      case "tema": {
        const t = document.documentElement.dataset.tema === "oscuro" ? "claro" : "oscuro";
        document.documentElement.dataset.tema = t; A.pref("tema", t); pintarLateral(); return;
      }
      case "editar-nombre": ui.editNombre = true; pintarLateral(); return;
      case "editar-foco": ui.editFoco = true; pintarCabecera(); return;
      case "modo": A.pref("ejemplo", !EJ); location.reload(); return;
      case "nueva-cita": ui.formCita = "nueva"; pintarAgenda(); $('#t-agenda [name="hora"]').focus(); return;
      case "editar-cita": ui.formCita = id; pintarAgenda(); $('#t-agenda [name="titulo"]').focus(); return;
      case "cancelar-cita": ui.formCita = null; pintarAgenda(); return;
      case "borrar-cita": A.cambiar((m) => { m.citas[kHoy] = asegurarCitas(m).filter((c) => c.id !== id); }); break;
      case "tachar": {
        const i = Number(b.dataset.i);
        A.cambiar((m) => { const t = (m.tres[kHoy] = (D.tres[kHoy] || [{}, {}, {}]).map((x) => ({ texto: x.texto || "", hecho: !!x.hecho }))); t[i].hecho = !t[i].hecho; });
        break;
      }
      case "agua": cambiarDia((d, act) => { d.agua = Math.max(0, Math.min(20, (act.agua || 0) + Number(b.dataset.d))); }); break;
      case "entreno": cambiarDia((d, act) => { d.entreno = !act.entreno; }); break;
      case "apuntar-sueno": {
        const v = $("#in-sueno").value.trim(); let min = NaN;
        const m1 = v.match(/^(\d{1,2})[:h.,\s]+(\d{1,2})/); if (m1) min = Number(m1[1]) * 60 + Number(m1[2]); else if (/^\d+([.,]\d+)?$/.test(v)) min = Math.round(parseFloat(v.replace(",", ".")) * 60);
        if (!(min > 0 && min < 1200)) { avisar("Escribe las horas así: 7:20"); return; }
        cambiarDia((d) => { d.sueno = min; }); avisar("Sueño apuntado"); break;
      }
      case "apuntar-pasos": {
        const v = Number($("#in-pasos").value); if (!(v >= 0)) return;
        cambiarDia((d) => { d.pasos = Math.round(v); }); avisar("Pasos apuntados"); break;
      }
      case "habito": {
        const h = C.habitos.find((x) => x.id === id); if (!h || h.auto) return;
        const ahora = habitoHecho(h, kHoy);
        A.cambiar((m) => { m.marcas[id] = m.marcas[id] || {}; m.marcas[id][kHoy] = !ahora; });
        break;
      }
      case "editar-objetivo": ui.editObjetivo = id; pintarObjetivos(); return;
      case "guardar-objetivo": {
        const v = Number($("#in-obj").value); if (v >= 0) A.cambiar((m) => { m.objetivos[id] = v; });
        ui.editObjetivo = null; break;
      }
      case "objetivo-sino": { const o = C.objetivos.find((x) => x.id === id); const act = D.objetivos[id] === true || (D.objetivos[id] === undefined && o.hecho); A.cambiar((m) => { m.objetivos[id] = !act; }); break; }
      case "pestana": ui.pestanaDinero = b.dataset.p; pintarDinero(); return;
      case "nuevo-gasto": ui.formGasto = !ui.formGasto; ui.formIngreso = false; pintarDinero(); return;
      case "nuevo-ingreso": ui.formIngreso = !ui.formIngreso; ui.formGasto = false; pintarDinero(); return;
      case "cancelar-ingreso": ui.formIngreso = false; pintarDinero(); return;
      case "borrar-ingreso": {
        const g = D.ingresos.find((x) => x.id === id);
        const oa = objetivoAhorro();
        A.cambiar((m) => {
          if (m.ingresos.some((x) => x.id === id)) m.ingresos = m.ingresos.filter((x) => x.id !== id); else m.borrados.push(id);
          // Si se había sumado al ahorro, se resta.
          if (g && g.alAhorro && oa) m.objetivos[oa.id] = Math.max(0, Math.round((Number(D.objetivos[oa.id] ?? 0) - g.importe) * 100) / 100);
        });
        avisar(`Borrado: ${g ? g.concepto : "ingreso"}`); break;
      }
      case "cancelar-gasto": ui.formGasto = false; pintarDinero(); return;
      case "borrar-gasto": {
        const g = D.gastos.find((x) => x.id === id);
        A.cambiar((m) => { if (m.gastos.some((x) => x.id === id)) m.gastos = m.gastos.filter((x) => x.id !== id); else m.borrados.push(id); });
        avisar(`Borrado: ${g ? g.concepto : "gasto"}`); break;
      }
      case "animo": { const v = Number(b.dataset.v); A.cambiar((m) => { m.animo[kHoy] = D.animo[kHoy] === v ? undefined : v; if (m.animo[kHoy] === undefined) delete m.animo[kHoy]; }); break; }
      case "guardar-diario": {
        const t = $("#in-diario").value.trim();
        A.cambiar((m) => { m.diario = m.diario.filter((x) => x.fecha !== kHoy); if (t) m.diario.unshift({ fecha: kHoy, texto: t }); });
        avisar(t ? "Diario guardado" : "Entrada borrada"); break;
      }
      case "restablecer":
        if (!document.getElementById("confirmar-reset")) {
          b.insertAdjacentHTML("afterend", ` <span id="confirmar-reset">${EJ ? "¿Seguro? Se borra lo que marcaste en los ejemplos." : "¿Seguro? Se borra todo lo que has apuntado (haz antes una copia)."} <button type="button" data-acc="restablecer-si">Sí, borrar</button></span>`);
        }
        return;
      case "restablecer-si": A.restablecer(); $("#confirmar-reset")?.remove(); avisar(EJ ? "Datos de ejemplo restablecidos" : "Panel en cero"); break;
      case "exportar": A.exportar(); avisar("Copia descargada. Guárdala en tu nube."); return;
      case "importar": $("#archivo-copia").click(); return;
      default: return;
    }
    pintar();
  });

  // Formularios
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-form]"); if (!f) return;
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f));
    if (f.dataset.form === "cita") {
      A.cambiar((m) => {
        const lista = asegurarCitas(m);
        if (ui.formCita === "nueva") lista.push({ id: `c-${Date.now()}`, hora: v.hora, dur: Number(v.dur) || 30, titulo: v.titulo.trim(), tipo: v.tipo });
        else { const c = lista.find((x) => x.id === ui.formCita); if (c) Object.assign(c, { hora: v.hora, dur: Number(v.dur) || 30, titulo: v.titulo.trim(), tipo: v.tipo }); }
      });
      ui.formCita = null;
    }
    if (f.dataset.form === "libro") {
      const paginas = Math.max(1, parseInt(v.paginas, 10) || 0);
      A.cambiar((m) => { m.libro = { titulo: v.titulo.trim(), autor: (v.autor || "").trim(), paginas, color: "terracota", ritmo: 20 }; m.libroPagina = 0; });
    }
    if (f.dataset.form === "ingreso") {
      const importe = Math.round(parseFloat(String(v.importe).replace(",", ".")) * 100) / 100;
      if (!(importe > 0)) return;
      const oa = objetivoAhorro(), alAhorro = !!(v.ahorro && oa);
      A.cambiar((m) => {
        m.ingresos = m.ingresos || [];
        m.ingresos.push({ id: `i-${Date.now()}`, fecha: v.fecha || kHoy, importe, concepto: v.concepto.trim(), fuente: v.fuente, alAhorro });
        if (alAhorro) m.objetivos[oa.id] = Math.round((Number(D.objetivos[oa.id] ?? 0) + importe) * 100) / 100;
      });
      ui.formIngreso = false; avisar(`Ingreso guardado: ${fmt.dinero(importe)}${alAhorro ? " · sumado a tu ahorro" : ""}`);
    }
    if (f.dataset.form === "gasto") {
      const importe = Math.round(parseFloat(String(v.importe).replace(",", ".")) * 100) / 100;
      if (!(importe > 0)) return;
      A.cambiar((m) => m.gastos.push({ id: `g-${Date.now()}`, fecha: v.fecha || kHoy, importe, concepto: v.concepto.trim(), cat: v.cat }));
      ui.formGasto = false; avisar(`Gasto guardado: ${fmt.dinero(importe)}`);
    }
    pintar();
  });

  // Textos que se guardan al salir del campo
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.tres !== undefined) {
      const i = Number(t.dataset.tres);
      A.cambiar((m) => { const l = (m.tres[kHoy] = (D.tres[kHoy] || [{}, {}, {}]).map((x) => ({ texto: x.texto || "", hecho: !!x.hecho }))); l[i].texto = t.value.trim(); });
      D = A.datos(); pintarCabecera();
    }
    if (t.id === "in-pagina") {
      const v = Math.max(0, Math.min(libroActual().paginas, Number(t.value) || 0));
      A.cambiar((m) => { m.libroPagina = v; }); D = A.datos(); pintarLibro();
    }
    if (t.id === "archivo-copia" && t.files[0]) {
      t.files[0].text().then((txt) => {
        try {
          const r = A.importar(txt);
          // La configuración se lee al abrir el panel: hay que recargar para verla.
          if (r.config) { avisar(r.datos ? "Copia y configuración importadas" : "Configuración importada"); setTimeout(() => location.reload(), 900); }
          else { avisar("Copia importada"); pintar(); }
        } catch (err) { avisar(err.message || "No se pudo leer la copia"); }
        t.value = "";
      });
    }
  });
  document.addEventListener("input", (e) => { if (e.target.id === "in-diario") $("#contador").textContent = contar(e.target.value); });
  document.addEventListener("keydown", (e) => {
    if (e.target.id === "input-foco" && e.key === "Enter") e.target.blur();
    if (e.target.id === "input-nombre" && (e.key === "Enter" || e.key === "Escape")) { if (e.key === "Escape") { ui.editNombre = false; pintarLateral(); } else e.target.blur(); }
    if (e.target.dataset.tres !== undefined && e.key === "Enter") e.target.blur();
    if (e.target.id === "in-sueno" && e.key === "Enter") $('[data-acc="apuntar-sueno"]').click();
    if (e.target.id === "in-pasos" && e.key === "Enter") $('[data-acc="apuntar-pasos"]').click();
  });
  document.addEventListener("focusout", (e) => {
    if (e.target.id === "input-foco" && ui.editFoco) { ui.editFoco = false; A.pref("foco", e.target.value.trim()); pintarCabecera(); }
    if (e.target.id === "input-nombre" && ui.editNombre) {
      const v = e.target.value.trim(); ui.editNombre = false;
      A.pref("nombre", v || C.nombre); pintarLateral(); pintarCabecera();
    }
  });

  // Cada minuto: la agenda ("Ahora", "En 20 min") y el saludo. Si cambia el día, todo.
  let ultimoDia = null;
  setInterval(() => {
    const k = F.clave(new Date());
    if (k !== ultimoDia) { ultimoDia = k; pintar(); return; }
    const activo = document.activeElement;
    if (activo && activo.closest && activo.closest("#t-agenda form")) return;
    pintarAgenda(); pintarCabecera();
    if (PV.jarvis && !PV.jarvis.abierto) PV.jarvis.pintar();
  }, 60000);

  primeraVez();
  ultimoDia = kHoy;
})();
