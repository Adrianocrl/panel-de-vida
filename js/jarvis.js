/* Jarvis: el mayordomo del panel.
   - El parte del día y las preguntas rápidas se calculan aquí, con tus datos, sin internet.
   - "Hablar con Jarvis en Claude" solo prepara un mensaje para que TÚ lo copies y lo pegues en Claude.
     El panel no envía nada por su cuenta. */
(function () {
  const PV = (window.PV = window.PV || {});

  // Frases en inglés: una distinta cada día.
  const FRASES_INGLES = [
    ["Discipline beats motivation.", "La disciplina gana a la motivación."],
    ["Small steps every day.", "Pequeños pasos cada día."],
    ["Done is better than perfect.", "Hecho es mejor que perfecto."],
    ["Stay hungry, stay humble.", "Mantente con hambre, mantente humilde."],
    ["Consistency is the key.", "La constancia es la clave."],
    ["Your future self will thank you.", "Tu yo del futuro te lo agradecerá."],
    ["Don't wish for it, work for it.", "No lo desees: trabaja por ello."],
    ["Progress, not perfection.", "Progreso, no perfección."],
    ["One more rep.", "Una repetición más."],
    ["Practice makes progress.", "La práctica trae progreso."],
    ["Save first, spend later.", "Primero ahorra, después gasta."],
    ["Create before you consume.", "Crea antes de consumir."],
    ["Keep going, sir.", "Siga adelante, señor."],
    ["Every expert was once a beginner.", "Todo experto fue alguna vez principiante."],
    ["Make it happen.", "Haz que pase."],
    ["Sleep is a superpower.", "Dormir es un superpoder."],
    ["Learn something new today.", "Aprende algo nuevo hoy."],
    ["The best time to start is now.", "El mejor momento para empezar es ahora."],
    ["Focus on what you can control.", "Concéntrate en lo que puedes controlar."],
    ["Hard work pays off.", "El trabajo duro tiene recompensa."],
    ["No excuses, just results.", "Sin excusas, solo resultados."],
    ["Read a little every day.", "Lee un poco cada día."],
    ["Believe in the process.", "Confía en el proceso."],
    ["Stay curious.", "Mantén la curiosidad."],
    ["Great things take time.", "Las grandes cosas llevan tiempo."],
    ["You are what you repeat.", "Eres lo que repites."],
    ["Push yourself, no one else will.", "Exígete: nadie más lo hará por ti."],
    ["Mistakes help you learn.", "Los errores te ayudan a aprender."],
    ["Dream big, start small.", "Sueña en grande, empieza en pequeño."],
    ["Be better than yesterday.", "Sé mejor que ayer."],
    ["Your only limit is you.", "Tu único límite eres tú."],
  ];

  const PREGUNTAS = [
    ["falta", "¿Qué me falta hoy?"],
    ["dinero", "¿Cómo va mi dinero?"],
    ["objetivos", "¿Cómo voy con mis objetivos?"],
    ["salud", "¿Cómo duermo y entreno?"],
    ["lectura", "¿Cómo va mi lectura?"],
  ];

  const estado = { pregunta: null, claude: false };
  const $ = (s) => document.querySelector(s);

  // ---------- Ayudas ----------
  const J = () => PV.config.jarvis || { nombre: "Jarvis", trato: "señor", icono: "🤵" };
  const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
  const lista = (a) => (a.length <= 1 ? a.join("") : `${a.slice(0, -1).join(", ")} y ${a[a.length - 1]}`);
  const minus = (s) => s.charAt(0).toLowerCase() + s.slice(1);
  const diasEntre = (a, b) => Math.round((b - a) / 864e5);

  function ctx() {
    const c = PV.calc;
    return { c, C: PV.config, D: c.datos(), F: PV.fecha, fmt: PV.fmt, esc: c.esc, hoy: c.hoy(), kHoy: c.kHoy() };
  }

  // Cantidades de un objetivo: S/ 50.00, "120 km", "1.5 libros". Sin unidad para "3 de 12 libros".
  function fmtObj(x, o, n, conUnidad = true) {
    if (o.tipo === "dinero") return x.fmt.dinero(n);
    const v = Math.abs(n) >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
    return conUnidad ? `${x.fmt.num(v)} ${o.unidad}` : x.fmt.num(v);
  }
  const deMeta = (x, o, v) => `${fmtObj(x, o, v, false)} de ${fmtObj(x, o, o.meta)}`;

  // Lo que queda por hacer hoy (hábitos, agua, entreno).
  function pendientesHoy(x) {
    const { c, C, D, kHoy, hoy } = x;
    const p = [];
    const agua = (D.dias[kHoy] || {}).agua || 0;
    for (const h of C.habitos) {
      if (c.habitoHecho(h, kHoy)) continue;
      if (h.auto === "agua") p.push(`${minus(h.nombre)} (lleva ${agua} de ${C.objetivoAgua})`);
      else if (h.auto === "pasos") continue;
      else p.push(minus(h.nombre));
    }
    const plan = c.entrenoDe(hoy);
    if (plan && !(D.dias[kHoy] || {}).entreno) p.push(`el entreno (${minus(plan)})`);
    return p;
  }

  // Entrenos seguidos que tocaban y no se hicieron (antes de hoy, desde que empezaste).
  function entrenosFallados(x) {
    const { c, D, F, hoy } = x;
    let n = 0;
    for (let i = 1; i <= 21; i++) {
      const d = F.sumarDias(hoy, -i), k = F.clave(d);
      if (k < D.inicio) break;
      if (!c.entrenoDe(d)) continue;
      if ((D.dias[k] || {}).entreno) break;
      n++;
    }
    return n;
  }

  function objetivosAtrasados(x) {
    const { c, C, D } = x;
    const out = [];
    for (const o of C.objetivos) {
      if (o.tipo === "si-no") continue;
      if (!o.desdeLibros && D.objetivos[o.id] === undefined) continue;
      const v = c.valorObjetivo(o), debido = c.debidoObjetivo(o), dif = debido - v;
      if (v >= o.meta) continue;
      if (dif > o.meta * 0.015 && dif >= 1) out.push({ o, v, debido, dif });
    }
    return out;
  }

  function dineroLibre(x) {
    const { c, C, hoy } = x;
    const r = c.resumenDinero("este");
    const fijosPend = C.dinero.fijos.filter((f) => f.dia > hoy.getDate()).reduce((s, f) => s + f.importe, 0);
    const pasadas = C.dinero.categorias
      .map((cat) => ({ cat, g: r.porCat[cat.id] || 0 }))
      .filter((y) => y.g > y.cat.limite);
    return { r, fijosPend, libre: r.presupuesto - r.total - fijosPend, pasadas };
  }

  // ---------- El parte del día ----------
  function parte(x) {
    const { c, C, D, F, fmt, esc, hoy, kHoy } = x;
    const t = J().trato;
    const h = new Date().getHours();
    const saludo = `${h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"}, ${t}.`;
    const items = [];

    // Agenda
    const m = c.ahoraMin();
    const citas = c.citasHoy();
    const actual = citas.find((ci) => m >= c.aMin(ci.hora) && m < c.aMin(ci.hora) + Number(ci.dur));
    const prox = citas.find((ci) => c.aMin(ci.hora) > m);
    let ag = "";
    if (actual) ag = `Ahora le corresponde <b>${esc(minus(actual.titulo))}</b>, hasta las ${hhmm(c.aMin(actual.hora) + Number(actual.dur))}.`;
    if (prox) ag += `${ag ? " Después, a" : "A"} las ${prox.hora} le espera <b>${esc(minus(prox.titulo))}</b>.`;
    if (!ag) ag = citas.length ? "Su agenda de hoy está despachada." : "Hoy no tiene nada en la agenda.";
    items.push(["🗓️", ag]);

    // Pendientes de hoy
    const pend = pendientesHoy(x);
    const tres = (D.tres[kHoy] || []).filter((z) => z.texto && !z.hecho).length;
    if (!pend.length && !tres) items.push(["✅", `Ha cumplido todo lo de hoy. Impecable, ${t}.`]);
    else if (!pend.length) items.push(["📝", `Solo le ${tres === 1 ? "queda 1" : `quedan ${tres}`} de sus 3 de hoy.`]);
    else items.push(["📝", h >= 19 ? `${cap(t)}, el día se acaba y aún tiene pendiente: <b>${esc(lista(pend))}</b>. Hágalo antes de dormir.` : `Hoy le queda: <b>${esc(lista(pend))}</b>.`]);

    // Fallos (directo)
    const fall = entrenosFallados(x);
    if (fall >= 2) items.push(["⚠️", `Lleva <b>${fall} entrenos seguidos sin hacer</b>. Esta noche no admite excusas.`]);
    else if (fall === 1) items.push(["⚠️", `El último entreno que le tocaba no lo hizo. Hoy no se repite.`]);
    const ayer = F.sumarDias(hoy, -1), kAyer = F.clave(ayer);
    if (kAyer >= D.inicio) {
      const sinHacer = C.habitos.filter((hb) => !hb.auto && !c.habitoHecho(hb, kAyer)).map((hb) => minus(hb.nombre));
      if (sinHacer.length) items.push(["❌", `Ayer se le quedó sin hacer: <b>${esc(lista(sinHacer))}</b>.`]);
    }

    // Dinero
    const din = dineroLibre(x);
    if (din.r.total > din.r.presupuesto) items.push(["💸", `Se ha pasado del presupuesto: lleva <b>${fmt.dinero(din.r.total)}</b> de ${fmt.dinero(din.r.presupuesto)}. Ni un sol más este mes.`]);
    else {
      for (const p of din.pasadas) items.push(["💸", `Se ha pasado en <b>${esc(minus(p.cat.nombre))}</b>: ${fmt.dinero(p.g)} de ${fmt.dinero(p.cat.limite)}. Modere ese gasto.`]);
      items.push(["💰", `Le quedan <b>${fmt.dinero(Math.max(0, din.libre))}</b> libres este mes${din.fijosPend ? ", contando los cobros fijos que vienen" : ""}.`]);
    }
    const ing = c.ingresosDelMes("este");
    if (ing.total > 0) {
      const bal = ing.total - din.r.total;
      items.push(["💵", `Este mes ha ingresado <b>${fmt.dinero(ing.total)}</b>. Su balance es ${bal >= 0 ? `positivo: <b>+${fmt.dinero(bal)}</b>. Bien hecho` : `negativo: <b>−${fmt.dinero(-bal)}</b>. Gasta más de lo que gana`}, ${t}.`]);
    }

    // Objetivos
    const atr = objetivosAtrasados(x);
    if (atr.length) {
      const a = atr[0];
      items.push(["🎯", `Va por detrás en <b>${esc(minus(a.o.nombre))}</b>: debería llevar ${fmtObj(x, a.o, a.debido)} y lleva ${fmtObj(x, a.o, a.v)}.`]);
    } else if (C.objetivos.length) items.push(["🎯", "Sus objetivos van al día."]);

    // Logro
    const mejor = C.habitos.map((hb) => ({ hb, r: c.racha(hb) })).sort((a, b) => b.r - a.r)[0];
    if (mejor && mejor.r >= 3) items.push(["🔥", `Lleva <b>${mejor.r} días seguidos</b> con «${esc(minus(mejor.hb.nombre))}». Siga así.`]);

    return { saludo, items };
  }
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  function fraseIngles(x) {
    const i = (x.F.diaDelAno(x.hoy) + x.hoy.getFullYear()) % FRASES_INGLES.length;
    return FRASES_INGLES[i];
  }

  // ---------- Respuestas a las preguntas rápidas ----------
  function responder(id, x) {
    const { c, C, D, F, fmt, esc, hoy, kHoy } = x;
    const t = J().trato;
    if (id === "falta") {
      const pend = pendientesHoy(x);
      const tres = (D.tres[kHoy] || []).filter((z) => z.texto && !z.hecho).map((z) => `«${z.texto}»`);
      const m = c.ahoraMin();
      const quedan = c.citasHoy().filter((ci) => c.aMin(ci.hora) + Number(ci.dur) > m).map((ci) => `${ci.hora} ${minus(ci.titulo)}`);
      const l = [];
      l.push(pend.length ? `Hábitos y entreno: <b>${esc(lista(pend))}</b>.` : "Hábitos y entreno: todo hecho.");
      if (tres.length) l.push(`De sus 3 de hoy: <b>${esc(lista(tres))}</b>.`);
      else if (!(D.tres[kHoy] || []).some((z) => z.texto)) l.push("No ha escrito sus 3 de hoy. Le sugiero hacerlo ahora.");
      l.push(quedan.length ? `En la agenda le queda: ${esc(lista(quedan))}.` : "En la agenda no le queda nada.");
      const { hechas, total } = c.tuDia();
      l.push(`Lleva <b>${hechas} de ${total}</b> cosas hechas hoy.`);
      return l;
    }
    if (id === "dinero") {
      const din = dineroLibre(x), r = din.r;
      const l = [`Este mes lleva gastado <b>${fmt.dinero(r.total)}</b> de ${fmt.dinero(r.presupuesto)}.`];
      const ing = c.ingresosDelMes("este");
      if (ing.lista.length) {
        const bal = ing.total - r.total;
        l.push(`Ha ingresado <b>${fmt.dinero(ing.total)}</b> (${ing.lista.length} ingreso${ing.lista.length === 1 ? "" : "s"}). Balance del mes: <b class="${bal < 0 ? "rojo" : "verde"}">${bal < 0 ? "−" : "+"}${fmt.dinero(Math.abs(bal))}</b>.`);
      } else l.push("Este mes aún no ha apuntado ingresos.");
      l.push(C.dinero.categorias.map((cat) => `${esc(cat.nombre)}: ${fmt.dinero(r.porCat[cat.id] || 0)} de ${fmt.dinero(cat.limite)}`).join(" · "));
      const prox = C.dinero.fijos.filter((f) => f.dia > hoy.getDate()).map((f) => `${esc(f.concepto)}, el día ${f.dia}, ${fmt.dinero(f.importe)}`);
      if (prox.length) l.push(`Próximos cobros este mes: ${lista(prox)}.`);
      l.push(`Le quedan <b>${fmt.dinero(Math.max(0, din.libre))}</b> libres.${din.libre > 0 ? ` Son unos ${fmt.dinero(din.libre / r.quedanDias)} al día hasta fin de mes.` : ""}`);
      if (r.lista.length) l.push(`Si sigue a este ritmo, cerrará el mes en ${fmt.dinero(r.prevision)}.`);
      return l;
    }
    if (id === "objetivos") {
      return C.objetivos.map((o) => {
        if (o.tipo === "si-no") return `<b>${esc(o.nombre)}</b>: ${D.objetivos[o.id] === true ? "conseguido" : "pendiente"}.`;
        const v = c.valorObjetivo(o), debido = c.debidoObjetivo(o);
        const fin = o.hasta ? F.desdeClave(o.hasta) : new Date(hoy.getFullYear(), 11, 31);
        const dias = Math.max(1, diasEntre(hoy, fin));
        if (v >= o.meta) return `<b>${esc(o.nombre)}</b>: conseguido. Enhorabuena, ${t}.`;
        const falta = o.meta - v;
        const porSemana = (falta / dias) * 7;
        return `<b>${esc(o.nombre)}</b>: lleva ${deMeta(x, o, v)}; hoy debería llevar ${fmtObj(x, o, debido)}. Quedan ${dias} días: necesita unos <b>${fmtObj(x, o, porSemana)} por semana</b>.`;
      });
    }
    if (id === "salud") {
      const l = [];
      const anoche = (D.dias[kHoy] || {}).sueno;
      l.push(anoche ? `Anoche durmió <b>${fmt.horas(anoche)}</b> (su objetivo: ${fmt.horas(C.objetivoSueno)}).` : "Hoy no ha apuntado cuánto durmió.");
      const ult = [];
      for (let i = 0; i < 7; i++) { const s = (D.dias[F.clave(F.sumarDias(hoy, -i))] || {}).sueno; if (s) ult.push(s); }
      if (ult.length >= 2) l.push(`Media de los últimos días: ${fmt.horas(ult.reduce((a, b) => a + b, 0) / ult.length)}.`);
      const lunes = c.lunesDe(hoy);
      let plan = 0, hechos = 0;
      for (let i = 0; i < 7; i++) { const d = F.sumarDias(lunes, i); if (c.entrenoDe(d)) plan++; if ((D.dias[F.clave(d)] || {}).entreno) hechos++; }
      l.push(`Esta semana lleva <b>${hechos} de ${plan}</b> entrenos.`);
      const hoyPlan = c.entrenoDe(hoy);
      if (hoyPlan) l.push((D.dias[kHoy] || {}).entreno ? "El de hoy ya está hecho." : `Hoy toca: ${esc(minus(hoyPlan))}.`);
      else l.push("Hoy es día de descanso.");
      return l;
    }
    if (id === "lectura") {
      const L = c.libroActual();
      const l = [];
      if (L) {
        const pag = Math.min(L.paginas, Number(D.libroPagina) || 0);
        l.push(`Va por la página <b>${pag} de ${L.paginas}</b> de «${esc(L.titulo)}».`);
        const quedan = L.paginas - pag;
        if (quedan > 0) l.push(`A ${L.ritmo} páginas al día, lo termina en ${Math.ceil(quedan / L.ritmo)} días.`);
      } else l.push("No tiene ningún libro empezado.");
      const meta = C.objetivos.find((o) => o.desdeLibros);
      if (meta) {
        const hechos = C.librosLeidos.length;
        const fin = meta.hasta ? F.desdeClave(meta.hasta) : new Date(hoy.getFullYear(), 11, 31);
        const dias = Math.max(1, diasEntre(hoy, fin));
        const faltan = meta.meta - hechos;
        l.push(`Libros terminados: <b>${hechos} de ${meta.meta}</b>.`);
        if (faltan > 0) l.push(`Para llegar a tiempo necesita terminar uno cada <b>${Math.max(1, Math.floor(dias / faltan))} días</b>${L ? `: unas ${Math.ceil(L.paginas / Math.max(1, Math.floor(dias / faltan)))} páginas al día con libros como este` : ""}.`);
      }
      return l;
    }
    return [];
  }

  // ---------- El mensaje para Claude ----------
  function mensajeClaude(x) {
    const { c, C, D, F, fmt, hoy, kHoy } = x;
    const j = J();
    const nombre = (PV.almacen.pref("nombre") || C.nombre || "").trim();
    const L = [];
    const dl = (s) => L.push(s);
    const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

    dl(`Eres ${j.nombre}, mi mayordomo personal. A partir de ahora, en toda esta conversación:`);
    dl(`- Me hablas de usted, con un tono formal y elegante, como un mayordomo, y me llamas "${j.trato}".`);
    dl(`- Eres directo: si fallo en algo (hábitos, entreno, dinero, objetivos), me lo dices claro y sin rodeos, con educación, y me dices qué hacer.`);
    dl(`- De vez en cuando incluyes una frase corta en inglés con su traducción, para que practique.`);
    dl(`- Me ayudas con: ${j.ayuda || "mis hábitos, mis objetivos y mi dinero"}.`);
    dl(`- Vivo en Perú: el dinero en soles (S/) y las fechas como en Perú. Respuestas breves, salvo que te pida más.`);
    dl(`- Para empezar: salúdame, dame tu parte del día en 3 o 4 frases con los datos de abajo y pregúntame en qué me puedes ayudar.`);
    dl("");
    dl(`MIS DATOS (sacados de mi panel de vida, hoy ${fmt.fechaLarga(hoy).toLowerCase()} de ${hoy.getFullYear()}, a las ${hhmm(c.ahoraMin())})`);
    if (nombre && nombre !== "Tú") dl(`Me llamo ${nombre}.`);
    dl(`Empecé a usar el panel el ${F.desdeClave(D.inicio).toLocaleDateString(C.locale, { day: "numeric", month: "long" })}.`);
    dl("");

    dl("AGENDA DE HOY");
    const citas = c.citasHoy();
    if (citas.length) citas.forEach((ci) => dl(`- ${ci.hora} a ${hhmm(c.aMin(ci.hora) + Number(ci.dur))}: ${ci.titulo}`));
    else dl("- Nada.");
    dl("Semana tipo:");
    C.semanaTipo.forEach((s) => dl(`- ${s.dias.map((d) => DIAS[d]).join(", ")}: ${s.hora} a ${hhmm(c.aMin(s.hora) + s.dur)}, ${s.titulo}`));
    const tres = (D.tres[kHoy] || []).filter((z) => z.texto);
    dl(`Mis 3 de hoy: ${tres.length ? tres.map((z) => `${z.texto} (${z.hecho ? "hecho" : "pendiente"})`).join("; ") : "no las he escrito."}`);
    dl("");

    dl("HÁBITOS");
    for (const h of C.habitos) {
      let hechos = 0, dias = 0;
      for (let i = 0; i < 7; i++) { const k = F.clave(F.sumarDias(hoy, -i)); if (k < D.inicio) break; dias++; if (c.habitoHecho(h, k)) hechos++; }
      dl(`- ${h.nombre}: hoy ${c.habitoHecho(h, kHoy) ? "hecho" : "sin hacer"}; racha ${c.racha(h)} días; ${hechos} de los últimos ${dias} días.`);
    }
    dl(`Agua hoy: ${(D.dias[kHoy] || {}).agua || 0} de ${C.objetivoAgua} vasos.`);
    dl("");

    dl("OBJETIVOS");
    for (const o of C.objetivos) {
      if (o.tipo === "si-no") { dl(`- ${o.nombre}: ${D.objetivos[o.id] === true ? "conseguido" : "pendiente"}.`); continue; }
      const plazo = o.hasta ? `, plazo hasta el ${F.desdeClave(o.hasta).toLocaleDateString(C.locale, { day: "numeric", month: "long", year: "numeric" })}` : "";
      dl(`- ${o.nombre}: llevo ${deMeta(x, o, c.valorObjetivo(o))}${plazo}. Hoy debería llevar ${fmtObj(x, o, c.debidoObjetivo(o))}.`);
    }
    dl("");

    dl("DINERO (este mes)");
    const din = dineroLibre(x), r = din.r;
    dl(`Presupuesto: ${fmt.dinero(r.presupuesto)}. Gastado: ${fmt.dinero(r.total)}. Libre (contando cobros fijos pendientes): ${fmt.dinero(din.libre)}.`);
    C.dinero.categorias.forEach((cat) => dl(`- ${cat.nombre}: ${fmt.dinero(r.porCat[cat.id] || 0)} de ${fmt.dinero(cat.limite)}`));
    if (C.dinero.fijos.length) dl(`Gastos fijos: ${C.dinero.fijos.map((f) => `${f.concepto}, día ${f.dia}, ${fmt.dinero(f.importe)}`).join("; ")}.`);
    const ultimos = r.lista.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 10);
    if (ultimos.length) { dl("Últimos gastos:"); ultimos.forEach((g) => dl(`- ${g.fecha}: ${g.concepto}, ${fmt.dinero(g.importe)}`)); }
    const ing = c.ingresosDelMes("este");
    dl(`Ingresos del mes: ${fmt.dinero(ing.total)}. Balance (ingresos menos gastos): ${fmt.dinero(ing.total - r.total)}. Lo que ingreso (salvo lo que guardo en el ahorro) se suma a mi presupuesto del mes: ${fmt.dinero(r.presupuestoBase)} + ${fmt.dinero(r.extra)} = ${fmt.dinero(r.presupuesto)}.`);
    ing.lista.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 10)
      .forEach((g) => dl(`- ${g.fecha}: ${g.concepto} (${c.nomFuente(g.fuente).replace(/^\S+\s/, "")}), +${fmt.dinero(g.importe)}${g.alAhorro ? ", guardado en mi ahorro" : ""}`));
    dl("");

    dl("SUEÑO, ENTRENO Y ÁNIMO (últimos 7 días)");
    dl(`Objetivo de sueño: ${fmt.horas(C.objetivoSueno)}. Entreno: ${Object.keys(C.entrenos).map((d) => `${DIAS[d]} (${C.entrenos[d]})`).join(", ") || "sin plan"}.`);
    const CARAS = ["fatal", "regular", "normal", "bien", "genial"];
    for (let i = 6; i >= 0; i--) {
      const d = F.sumarDias(hoy, -i), k = F.clave(d);
      if (k < D.inicio) continue;
      const x2 = D.dias[k] || {};
      const partes = [];
      partes.push(x2.sueno ? `dormí ${fmt.horas(x2.sueno)}` : "sueño sin apuntar");
      if (c.entrenoDe(d)) partes.push(x2.entreno ? "entrené" : i === 0 ? "hoy toca entreno (aún no lo he hecho)" : "tocaba entreno y no lo hice");
      else if (x2.entreno) partes.push("entrené (extra)");
      if (D.animo[k]) partes.push(`ánimo ${CARAS[D.animo[k] - 1]}`);
      dl(`- ${DIAS[d.getDay()]} ${d.getDate()}: ${partes.join(", ")}`);
    }
    dl("");

    dl("LECTURA");
    const Lb = c.libroActual();
    if (Lb) dl(`Leyendo: «${Lb.titulo}», de ${Lb.autor}. Página ${Math.min(Lb.paginas, Number(D.libroPagina) || 0)} de ${Lb.paginas}. Ritmo: ${Lb.ritmo} páginas al día.`);
    dl(`Libros terminados: ${C.librosLeidos.length ? C.librosLeidos.map((b) => b.titulo).join(", ") : "ninguno todavía"}.`);
    dl("");

    dl("DIARIO (mis últimas entradas)");
    const entradas = D.diario.slice(0, 5);
    if (entradas.length) entradas.forEach((e) => dl(`- ${e.fecha}: ${e.texto}`));
    else dl("- Sin entradas todavía.");

    return L.join("\n");
  }

  // ---------- Pintar ----------
  function pintar() {
    const caja = $("#jarvis");
    if (!caja || !PV.calc) return;
    const x = ctx();
    const { esc } = x;
    const j = J();
    const p = parte(x);
    const [en, es] = fraseIngles(x);
    const resp = estado.pregunta ? responder(estado.pregunta, x) : null;

    caja.innerHTML = `
      <div class="jv-cab">
        <span class="jv-avatar" aria-hidden="true">${j.icono}</span>
        <div><h2 class="jv-nombre">${esc(j.nombre)}</h2><small class="suave">Su mayordomo personal</small></div>
      </div>
      <div class="jv-cuerpo">
        <div class="jv-parte">
          <p class="jv-saludo">${esc(p.saludo)}</p>
          <ul class="jv-lista">${p.items.map(([i, t]) => `<li><span aria-hidden="true">${i}</span><span>${t}</span></li>`).join("")}</ul>
        </div>
        <div class="jv-lado">
          <div class="jv-ingles"><small>🗣️ La frase de hoy en inglés</small><p lang="en">«${esc(en)}»</p><small>${esc(es)}</small></div>
          <div class="jv-preguntas" role="group" aria-label="Preguntas rápidas a ${esc(j.nombre)}">
            ${PREGUNTAS.map(([id, txt]) => `<button type="button" class="jv-chip${estado.pregunta === id ? " on" : ""}" data-jv="pregunta" data-id="${id}" aria-pressed="${estado.pregunta === id}">${txt}</button>`).join("")}
          </div>
        </div>
      </div>
      ${resp ? `<div class="jv-respuesta" role="status"><span class="jv-mini" aria-hidden="true">${j.icono}</span><div>${resp.map((r) => `<p>${r}</p>`).join("")}</div></div>` : ""}
      <div class="jv-pie">
        <button type="button" class="btn lleno" data-jv="claude" aria-expanded="${estado.claude}">💬 Hablar con ${esc(j.nombre)} en Claude</button>
        <small class="suave">Prepara un mensaje con su personalidad y sus datos para pegarlo en Claude.</small>
      </div>
      ${estado.claude ? `<div class="jv-claude">
        <ol class="jv-pasos"><li>Pulse <b>Copiar mensaje</b>.</li><li>Pulse <b>Abrir Claude</b>.</li><li>Pegue el mensaje (Ctrl + V) y envíelo.</li></ol>
        <textarea class="campo jv-texto" id="jv-texto" readonly aria-label="Mensaje para Claude">${esc(mensajeClaude(x))}</textarea>
        <div class="jv-acciones">
          <button type="button" class="btn lleno" data-jv="copiar">📋 Copiar mensaje</button>
          <a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Abrir Claude ↗</a>
          <button type="button" class="btn" data-jv="cerrar">Cerrar</button>
        </div>
        <small class="suave">🔒 El panel no envía nada. Solo llega a Claude lo que usted pegue. Incluye su diario: léalo antes si lo desea.</small>
      </div>` : ""}`;
  }

  async function copiar() {
    const ta = $("#jv-texto");
    if (!ta) return;
    let ok = false;
    try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) {
      try { ta.focus(); ta.select(); ok = document.execCommand("copy"); } catch (e2) {}
    }
    const b = document.querySelector('[data-jv="copiar"]');
    if (b) b.textContent = ok ? "✓ Copiado" : "Selecciónelo y cópielo a mano";
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-jv]");
    if (!b) return;
    const acc = b.dataset.jv;
    if (acc === "pregunta") { estado.pregunta = estado.pregunta === b.dataset.id ? null : b.dataset.id; pintar(); }
    else if (acc === "claude") { estado.claude = !estado.claude; pintar(); }
    else if (acc === "cerrar") { estado.claude = false; pintar(); }
    else if (acc === "copiar") copiar();
  });

  PV.jarvis = { pintar, get abierto() { return estado.claude; } };
})();
