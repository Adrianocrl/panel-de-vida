/* Avisos: qué dice Jarvis en cada notificación.
   Lo usan la app (para guardar una copia de tus datos y para "Probar") y sw.js (con la app cerrada).
   Todo se calcula DENTRO del celular con tus datos; el servidor solo manda un "despierta" vacío.
   Aquí no hay nada tuyo: lee tu configuración y tus datos de la copia guardada en el celular. */
(function (raiz) {
  const PV = (raiz.PV = raiz.PV || {});

  // ---------- Dónde está el servidor (público: no tiene nada tuyo) ----------
  PV.AVISOS = {
    servidor: "https://avisos.pv-9abb16ae.workers.dev",
    llavePublica: "BCMjafyd3yU4IjBxzdy7KFhP5XuCRVr1lO-eESGHQ_8ckp44su-iPxikbwKFXY77EcBsWGmhTRg1M6Nd2DXfV9U",
    // Avisos por defecto: hora (de 5 en 5 minutos) y si están encendidos.
    porDefecto: [
      { id: "parte", nombre: "Parte del día e idea para ganar", hora: "06:30", on: true },
      { id: "ganar", nombre: "Plan de hoy para ganar dinero", hora: "15:45", on: true },
      { id: "entreno", nombre: "Entreno", hora: "19:45", on: true },
      { id: "falta", nombre: "Lo que te falta hoy", hora: "21:30", on: true },
      { id: "diario", nombre: "Diario y ánimo", hora: "22:30", on: true },
    ],
  };

  // ---------- Copia de tus datos dentro del celular (IndexedDB) ----------
  // sw.js no puede leer el almacenamiento normal de la página; por eso la app deja aquí una copia.
  function abrir() {
    return new Promise((ok, mal) => {
      const r = indexedDB.open("panel-de-vida", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("estado");
      r.onsuccess = () => ok(r.result);
      r.onerror = () => mal(r.error);
    });
  }
  PV.idb = {
    async guardar(valor) {
      const db = await abrir();
      await new Promise((ok, mal) => { const t = db.transaction("estado", "readwrite"); t.objectStore("estado").put(valor, "actual"); t.oncomplete = ok; t.onerror = () => mal(t.error); });
      db.close();
    },
    async leer() {
      const db = await abrir();
      const v = await new Promise((ok, mal) => { const t = db.transaction("estado").objectStore("estado").get("actual"); t.onsuccess = () => ok(t.result); t.onerror = () => mal(t.error); });
      db.close();
      return v || null;
    },
  };

  // ---------- Fechas y dinero ----------
  const pad = (n) => String(n).padStart(2, "0");
  const clave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const sumar = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const soles = (n) => "S/ " + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const minus = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const lista = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} y ${a[a.length - 1]}`);
  const aMin = (h) => { const [a, b] = h.split(":").map(Number); return a * 60 + b; };
  const hhmm = (m) => `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
  const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

  // ---------- Cálculos con la copia (config + datos) ----------
  function hecho(C, D, h, k) {
    const d = D.dias[k] || {};
    if (h.auto === "agua") return (d.agua || 0) >= C.objetivoAgua;
    if (h.auto === "pasos") return (d.pasos || 0) >= C.objetivoPasos;
    return !!(D.marcas[h.id] && D.marcas[h.id][k]);
  }
  function rachaHastaAyer(C, D, h, hoy) {
    let n = 0, d = sumar(hoy, -1), pasos = 0;
    while (pasos++ < 400 && clave(d) >= (D.inicio || "0")) {
      if (hecho(C, D, h, clave(d))) n++;
      else if (!(D.salud && D.salud[clave(d)])) break;
      d = sumar(d, -1);
    }
    return n;
  }
  function agenda(C, D, hoy) {
    const k = clave(hoy);
    const citas = (D.citas && D.citas[k]) || (C.semanaTipo || []).filter((c) => c.dias.includes(hoy.getDay())).map((c) => ({ hora: c.hora, dur: c.dur, titulo: c.titulo }));
    return citas.slice().sort((a, b) => a.hora.localeCompare(b.hora));
  }
  function dinero(C, D, hoy) {
    const mes = (f) => { const [y, m] = f.split("-").map(Number); return y === hoy.getFullYear() && m === hoy.getMonth() + 1; };
    const gastado = (D.gastos || []).filter((g) => mes(g.fecha)).reduce((s, g) => s + g.importe, 0);
    const ing = (D.ingresos || []).filter((g) => mes(g.fecha));
    const extra = ing.filter((g) => !g.alAhorro).reduce((s, g) => s + g.importe, 0);
    const tienes = C.dinero.presupuesto + extra - gastado;
    const fijos = (C.dinero.fijos || []).map((f) => {
      let d = new Date(hoy.getFullYear(), hoy.getMonth(), f.dia);
      if (f.dia <= hoy.getDate()) d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, f.dia);
      return { ...f, d, dias: Math.round((d - hoy) / 864e5) };
    });
    const reserva = fijos.filter((f) => f.dias <= 30).reduce((s, f) => s + f.importe, 0);
    const ganadoHoy = (D.ingresos || []).filter((g) => g.fecha === clave(hoy)).reduce((s, g) => s + g.importe, 0);
    return { tienes, reserva, faltan: Math.max(0, reserva - tienes), proximos: fijos.filter((f) => f.dias <= 2), ganadoHoy };
  }
  function ideaDeHoy(C, D, hoy) {
    if (!PV.ganar || !PV.ganar.construir) return null;
    const antes = PV.config; PV.config = C;
    try { const est = (D.ganar && D.ganar[clave(hoy)]) || {}; return PV.ganar.construir(hoy, est.salto || 0); }
    catch (e) { return null; } finally { PV.config = antes; }
  }

  // ---------- Qué aviso toca ahora ----------
  PV.avisoQueToca = function (avisos, ahora) {
    const m = ahora.getHours() * 60 + ahora.getMinutes();
    let mejor = null, dist = 999;
    for (const a of avisos || []) {
      if (!a.on) continue;
      const d = Math.abs(aMin(a.hora) - m);
      if (d < dist) { dist = d; mejor = a; }
    }
    return dist <= 20 ? mejor.id : null;
  };

  // ---------- El texto de cada aviso ----------
  // tipo: "parte" | "ganar" | "entreno" | "falta" | "diario". Devuelve { titulo, cuerpo }.
  PV.textoAviso = function (tipo, estado, ahora = new Date()) {
    const C = estado.config, D = estado.datos;
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()), k = clave(hoy);
    const J = C.jarvis || { nombre: "Jarvis", trato: "señor" };
    const t = J.trato || "señor", T = t.charAt(0).toUpperCase() + t.slice(1);
    const firma = `🤵 ${J.nombre || "Jarvis"}`;
    const h = ahora.getHours();
    const saludo = h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
    const pendientes = (C.habitos || []).filter((x) => x.auto !== "pasos" && !hecho(C, D, x, k)).map((x) => minus(x.nombre));
    const plan = (C.entrenos || {})[hoy.getDay()];
    const entrenado = !!(D.dias[k] || {}).entreno;
    const din = dinero(C, D, hoy);
    const meta = (C.ganar && C.ganar.meta) || 10;

    // Día de salud: solo ánimo y descanso.
    if (D.salud && D.salud[k]) {
      const frases = {
        parte: [`${saludo}, ${t}`, "Hoy es día de recuperación: descanse, beba agua y no se preocupe por los hábitos. Sus rachas están a salvo."],
        ganar: ["Hoy, a descansar", `${T}, el plan para ganar dinero vuelve mañana. Lo importante hoy es que se recupere.`],
        entreno: ["Sin entreno hoy", `Hoy no se entrena, ${t}. El cuerpo se recupera descansando.`],
        falta: ["¿Cómo se encuentra?", `${T}, hoy no le falta nada: solo descansar. Si no mejora, avise a alguien de su casa o vaya al médico.`],
        diario: [`Buenas noches, ${t}`, "Que descanse y mañana amanezca mejor. Si quiere, apunte en el diario cómo se sintió."],
      }[tipo] || ["Que se mejore", `Descanse, ${t}.`];
      return { titulo: `${firma} · ${frases[0]}`, cuerpo: frases[1] };
    }

    if (tipo === "parte") {
      const ag = agenda(C, D, hoy).filter((c) => aMin(c.hora) >= h * 60).slice(0, 3).map((c) => `${c.hora} ${minus(c.titulo)}`);
      const partes = [ag.length ? `Hoy: ${lista(ag)}.` : "Hoy no tiene nada en la agenda."];
      const idea = ideaDeHoy(C, D, hoy);
      if (idea) partes.push(`Para ganar ${soles(meta)}: ${minus(idea.titulo)}.`);
      for (const f of din.proximos) partes.push(`${f.dias === 0 ? "Hoy" : f.dias === 1 ? "Mañana" : `El ${f.d.getDate()} ${MESES[f.d.getMonth()]}`} se cobra ${f.concepto.replace(/\s*\(.*\)$/, "")} (${soles(f.importe)})${din.faltan > 0 ? `: le faltan ${soles(din.faltan)}` : ": está cubierto"}.`);
      return { titulo: `${firma} · ${saludo}, ${t}`, cuerpo: partes.join(" ") };
    }
    if (tipo === "ganar") {
      const idea = ideaDeHoy(C, D, hoy);
      if (din.ganadoHoy >= meta) return { titulo: `${firma} · Objetivo cumplido`, cuerpo: `Hoy ya ha ganado ${soles(din.ganadoHoy)}, ${t}. Bien hecho.` };
      return { titulo: `${firma} · Plan de hoy: ${soles(meta)}`, cuerpo: `${T}, hoy lleva ${soles(din.ganadoHoy)} de ${soles(meta)}.${idea ? ` Le propongo: ${minus(idea.titulo)}.` : ""} Aún hay tiempo.` };
    }
    if (tipo === "entreno") {
      if (!plan) return { titulo: `${firma} · Día de descanso`, cuerpo: `Hoy no toca entreno, ${t}. Aproveche para estirar y dormir bien.` };
      if (entrenado) return { titulo: `${firma} · Entreno hecho`, cuerpo: `Entreno de hoy completado. Impecable, ${t}.` };
      const cita = agenda(C, D, hoy).find((c) => /ejercicio|entreno|gimnasio/i.test(c.titulo));
      return { titulo: `${firma} · Toca entrenar`, cuerpo: `${T}, ${cita ? `a las ${cita.hora} ` : "hoy "}toca ${minus(plan)}. Esta noche no admite excusas.` };
    }
    if (tipo === "falta") {
      const tres = ((D.tres && D.tres[k]) || []).filter((z) => z.texto && !z.hecho).map((z) => `«${z.texto}»`);
      const falta = pendientes.slice();
      if (plan && !entrenado) falta.push("el entreno");
      if (!falta.length && !tres.length) return { titulo: `${firma} · Día completo`, cuerpo: `Ha cumplido todo lo de hoy, ${t}. Impecable.` };
      const partes = [];
      if (falta.length) partes.push(`Le falta: ${lista(falta)}.`);
      if (tres.length) partes.push(`De sus 3 de hoy: ${lista(tres)}.`);
      const enRiesgo = (C.habitos || []).filter((x) => !hecho(C, D, x, k)).map((x) => ({ x, r: rachaHastaAyer(C, D, x, hoy) })).filter((y) => y.r >= 2).sort((a, b) => b.r - a.r)[0];
      if (enRiesgo) partes.push(`No pierda su racha de ${enRiesgo.r} días con «${minus(enRiesgo.x.nombre)}».`);
      return { titulo: `${firma} · ${T}, el día se acaba`, cuerpo: partes.join(" ") };
    }
    if (tipo === "diario") {
      const diario = (D.diario || []).some((e) => e.fecha === k);
      const animo = !!(D.animo && D.animo[k]);
      if (diario && animo) return { titulo: `${firma} · Buenas noches, ${t}`, cuerpo: "Diario y ánimo apuntados. Que descanse; mañana le espero con el parte del día." };
      const que = !diario && !animo ? "escrito en su diario ni ha marcado su ánimo" : !diario ? "escrito en su diario" : "marcado su ánimo";
      return { titulo: `${firma} · Antes de dormir`, cuerpo: `${T}, aún no ha ${que}. Dos minutos y listo: ¿qué fue bien hoy?` };
    }
    return { titulo: firma, cuerpo: `${T}, eche un vistazo a su panel.` };
  };
})(typeof self !== "undefined" ? self : window);
