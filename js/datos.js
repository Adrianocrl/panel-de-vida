/* Datos del panel.
   De momento son DE EJEMPLO: se generan a partir de la fecha de hoy con una semilla fija,
   así el panel siempre parece al día y cada vez que lo abres salen los mismos números.
   Cuando pongas tus datos de verdad, se cambian aquí (la configuración) y en privado/ (los movimientos). */
(function () {
  const PV = (window.PV = window.PV || {});

  // ---------- Utilidades de fecha ----------
  const pad = (n) => String(n).padStart(2, "0");
  const clave = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const desdeClave = (k) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };
  const sumarDias = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  PV.fecha = { pad, clave, desdeClave, sumarDias };

  // ---------- Aleatorio con semilla (siempre los mismos números para el mismo día) ----------
  const SEMILLA = 2026;
  function hash(str) {
    let h = 2166136261 ^ SEMILLA;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function azar(...partes) {
    let t = hash(partes.join("|")) + 0x6d2b79f5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  const entre = (min, max, ...p) => min + azar(...p) * (max - min);
  const entero = (min, max, ...p) => Math.floor(entre(min, max + 1, ...p));

  // ---------- ¿Tus datos o los de ejemplo? ----------
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem("panelDeVida.prefs") || "{}") || {}; } catch (e) {}
  PV.modoEjemplo = prefs.ejemplo === true;

  // ---------- Configuración ----------
  // Aquí solo hay una PLANTILLA: el código se publica en internet y no lleva nada tuyo.
  // Tu configuración (agenda, hábitos, objetivos, dinero…) vive solo en tu aparato:
  // se carga con "Importar copia" (archivo privado/mi-configuracion.json) y se guarda en el navegador.
  const config = {
    nombre: "Tú",
    foco: "",
    pais: "PE",
    locale: "es-PE",
    moneda: "PEN",
    objetivoSueno: 450,      // minutos (7 h 30 min)
    objetivoPasos: 8000,     // 0 = no contar pasos (se esconde la barra)
    objetivoAgua: 8,         // vasos
    entrenos: {},            // 0 = domingo … 6 = sábado, p. ej. { 1: "Gimnasio" }
    semanaTipo: [],          // { dias: [1,2,3,4,5], hora: "09:00", dur: 60, titulo: "…", tipo: "trabajo" }
    habitos: [
      { id: "agua", nombre: "8 vasos de agua", icono: "💧", color: "azul", auto: "agua" },
      { id: "leer", nombre: "Leer 20 páginas", icono: "📖", color: "ambar" },
      { id: "meditar", nombre: "Meditar 10 min", icono: "🧘", color: "violeta" },
    ],
    // desde / hasta: el plazo del objetivo. inicio: lo que llevabas el día que empezaste.
    objetivos: [
      { id: "libros", nombre: "Leer 12 libros", icono: "📚", color: "azul", meta: 12, unidad: "libros", tipo: "numero", desdeLibros: true },
      { id: "ahorro", nombre: "Ahorrar S/ 1,000", icono: "🐷", color: "ambar", meta: 1000, unidad: "soles", tipo: "dinero" },
    ],
    dinero: {
      presupuesto: 1000,
      categorias: [
        { id: "comida", nombre: "Comida", limite: 400, color: "verde" },
        { id: "transporte", nombre: "Transporte", limite: 200, color: "azul" },
        { id: "ocio", nombre: "Ocio", limite: 200, color: "rosa" },
        { id: "otros", nombre: "Otros", limite: 200, color: "violeta" },
      ],
      fijos: [],              // { concepto: "Internet", dia: 5, importe: 99, cat: "otros" }
    },
    libroActual: null,        // { titulo, autor, paginas, pagina, color, ritmo }
    librosLeidos: [],         // { titulo: "…", mes: 12, nota: 4, color: "azul" }
    // Jarvis, el mayordomo (js/jarvis.js)
    jarvis: { nombre: "Jarvis", trato: "señor", icono: "🤵" },
    citas: [
      { texto: "No cuentes los días, haz que los días cuenten.", autor: "Muhammad Ali" },
      { texto: "Lo que se mide, mejora.", autor: "Peter Drucker" },
      { texto: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", autor: "Robert Collier" },
      { texto: "Hecho es mejor que perfecto.", autor: "Sheryl Sandberg" },
      { texto: "Empieza donde estás. Usa lo que tienes. Haz lo que puedas.", autor: "Arthur Ashe" },
      { texto: "La motivación te pone en marcha; el hábito te mantiene.", autor: "Jim Ryun" },
    ],
  };

  // ---------- Configuración de EJEMPLO (solo con "Ver datos de ejemplo") ----------
  const ejemplo = {
    nombre: "Tú",
    foco: "Cerrar 5 ventas nuevas y no saltarme el gimnasio",
    pais: "PE",
    locale: "es-PE",
    moneda: "PEN",
    objetivoSueno: 450,      // minutos (7 h 30 min)
    objetivoPasos: 8000,
    objetivoAgua: 8,         // vasos
    // Entreno: 0 = domingo … 6 = sábado
    entrenos: { 1: "Gimnasio · fuerza", 3: "Gimnasio · piernas", 5: "Gimnasio · torso", 6: "Correr 8 km" },
    // Semana tipo para la agenda. dias: 0 = domingo … 6 = sábado
    semanaTipo: [
      { dias: [1, 3, 5], hora: "06:30", dur: 60, titulo: "Gimnasio", tipo: "salud" },
      { dias: [1, 2, 3, 4, 5], hora: "09:00", dur: 120, titulo: "Llamadas a clientes", tipo: "trabajo" },
      { dias: [2, 4], hora: "11:30", dur: 45, titulo: "Reunión del equipo de ventas", tipo: "trabajo" },
      { dias: [1, 2, 3, 4, 5], hora: "13:00", dur: 60, titulo: "Almuerzo", tipo: "personal" },
      { dias: [1, 2, 3, 4, 5], hora: "14:30", dur: 180, titulo: "Visitas a clientes", tipo: "trabajo" },
      { dias: [2, 4], hora: "19:00", dur: 90, titulo: "Clase de inglés", tipo: "aprender" },
      { dias: [1, 3, 5], hora: "20:30", dur: 60, titulo: "Proyecto personal", tipo: "aprender" },
      { dias: [0, 1, 2, 3, 4, 5, 6], hora: "22:00", dur: 30, titulo: "Leer antes de dormir", tipo: "personal" },
      { dias: [6], hora: "07:30", dur: 60, titulo: "Correr", tipo: "salud" },
      { dias: [6], hora: "11:00", dur: 120, titulo: "Mercado y casa", tipo: "personal" },
      { dias: [0], hora: "13:00", dur: 150, titulo: "Almuerzo familiar", tipo: "personal" },
      { dias: [0], hora: "18:00", dur: 45, titulo: "Planear la semana", tipo: "aprender" },
    ],
    habitos: [
      { id: "meditar", nombre: "Meditar 10 min", icono: "🧘", color: "violeta", prob: 0.72, record: 41 },
      { id: "leer", nombre: "Leer 20 páginas", icono: "📖", color: "azul", prob: 0.8, record: 63 },
      { id: "agua", nombre: "8 vasos de agua", icono: "💧", color: "azul", prob: 0.65, record: 22, auto: "agua" },
      { id: "pasos", nombre: "8,000 pasos", icono: "👟", color: "verde", prob: 0.7, record: 29, auto: "pasos" },
      { id: "pantallas", nombre: "Sin pantallas desde las 23:00", icono: "🌙", color: "ambar", prob: 0.55, record: 14 },
      { id: "ingles", nombre: "Practicar inglés", icono: "🗣️", color: "rosa", prob: 0.6, record: 18 },
    ],
    objetivos: [
      { id: "libros", nombre: "Leer 20 libros", icono: "📚", color: "azul", meta: 20, unidad: "libros", tipo: "numero", desdeLibros: true },
      { id: "km", nombre: "Correr 400 km", icono: "🏃", color: "verde", meta: 400, unidad: "km", tipo: "numero", ritmo: 1.06 },
      { id: "ahorro", nombre: "Ahorrar S/ 6,000", icono: "🐷", color: "ambar", meta: 6000, unidad: "soles", tipo: "dinero", ritmo: 0.93 },
      { id: "ventas", nombre: "Cerrar 120 ventas", icono: "🤝", color: "terracota", meta: 120, unidad: "ventas", tipo: "numero", ritmo: 0.98 },
      { id: "media", nombre: "Correr una media maratón", icono: "🏅", color: "rosa", tipo: "si-no", hecho: false },
    ],
    dinero: {
      presupuesto: 2800,
      categorias: [
        { id: "super", nombre: "Mercado y súper", limite: 800, color: "verde" },
        { id: "comer", nombre: "Comer fuera y café", limite: 350, color: "terracota" },
        { id: "transporte", nombre: "Transporte", limite: 320, color: "azul" },
        { id: "casa", nombre: "Casa y servicios", limite: 450, color: "ambar" },
        { id: "ocio", nombre: "Ocio", limite: 250, color: "rosa" },
        { id: "compras", nombre: "Compras", limite: 300, color: "violeta" },
        { id: "salud", nombre: "Salud y gimnasio", limite: 230, color: "verde" },
        { id: "suscripciones", nombre: "Suscripciones", limite: 100, color: "azul" },
      ],
      fijos: [
        { concepto: "Gimnasio", dia: 1, importe: 129, cat: "salud" },
        { concepto: "Internet hogar", dia: 5, importe: 99, cat: "casa" },
        { concepto: "Luz del Sur", dia: 12, importe: 86.4, cat: "casa" },
        { concepto: "Plan del celular", dia: 18, importe: 59.9, cat: "casa" },
        { concepto: "Netflix", dia: 20, importe: 44.9, cat: "suscripciones" },
        { concepto: "Spotify", dia: 23, importe: 21.9, cat: "suscripciones" },
        { concepto: "Agua (Sedapal)", dia: 26, importe: 48.5, cat: "casa" },
      ],
    },
    libroActual: { titulo: "Los secretos de la mente millonaria", autor: "T. Harv Eker", paginas: 256, pagina: 142, color: "terracota", ritmo: 24 },
    librosLeidos: [
      { titulo: "Hábitos atómicos", mes: 1, nota: 5, color: "ambar" },
      { titulo: "El alquimista", mes: 1, nota: 4, color: "azul" },
      { titulo: "Padre rico, padre pobre", mes: 2, nota: 4, color: "violeta" },
      { titulo: "La ciudad y los perros", mes: 3, nota: 5, color: "rosa" },
      { titulo: "Cómo ganar amigos", mes: 3, nota: 5, color: "verde" },
      { titulo: "Los cuatro acuerdos", mes: 4, nota: 3, color: "terracota" },
      { titulo: "Sapiens", mes: 5, nota: 5, color: "azul" },
      { titulo: "El poder del ahora", mes: 6, nota: 3, color: "ambar" },
      { titulo: "Pedro Páramo", mes: 6, nota: 4, color: "violeta" },
      { titulo: "La culpa es de la vaca", mes: 7, nota: 4, color: "verde" },
      { titulo: "Piense y hágase rico", mes: 8, nota: 3, color: "rosa" },
      { titulo: "Cien años de soledad", mes: 9, nota: 5, color: "terracota" },
      { titulo: "El vendedor más grande del mundo", mes: 10, nota: 4, color: "azul" },
      { titulo: "Deep Work", mes: 10, nota: 4, color: "ambar" },
    ],
    citas: [
      { texto: "No cuentes los días, haz que los días cuenten.", autor: "Muhammad Ali" },
      { texto: "La disciplina es elegir entre lo que quieres ahora y lo que más quieres.", autor: "Abraham Lincoln (atribuida)" },
      { texto: "Lo que se mide, mejora.", autor: "Peter Drucker" },
      { texto: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", autor: "Robert Collier" },
      { texto: "Hecho es mejor que perfecto.", autor: "Sheryl Sandberg" },
      { texto: "Empieza donde estás. Usa lo que tienes. Haz lo que puedas.", autor: "Arthur Ashe" },
      { texto: "La motivación te pone en marcha; el hábito te mantiene.", autor: "Jim Ryun" },
    ],
  };
  // Tu configuración guardada en este aparato (si la importaste) va encima de la plantilla.
  const LLAVE_CONFIG = "panelDeVida.config";
  PV.LLAVE_CONFIG = LLAVE_CONFIG;
  let propia = null;
  try { propia = JSON.parse(localStorage.getItem(LLAVE_CONFIG) || "null"); } catch (e) {}
  PV.configPropia = !!(propia && typeof propia === "object");
  if (PV.modoEjemplo) Object.assign(config, ejemplo);
  else if (PV.configPropia) Object.assign(config, propia);
  PV.config = config;

  // Tus datos: empiezan vacíos.
  PV.datosVacios = function (hoy = new Date()) {
    // Lo que llevabas al empezar cada objetivo, hasta que lo actualices en el panel.
    const objetivos = {};
    for (const o of config.objetivos) if (o.inicio !== undefined && !o.desdeLibros && o.tipo !== "si-no") objetivos[o.id] = o.inicio;
    const libroPagina = config.libroActual ? config.libroActual.pagina : null;
    return { generado: PV.fecha.clave(hoy), dias: {}, marcas: {}, animo: {}, gastos: [], citas: {}, diario: [], tres: {}, objetivos, libroPagina };
  };

  // ---------- Generador de datos de ejemplo ----------
  const PLANTILLAS_GASTO = {
    super: [["Plaza Vea", 35, 160], ["Tottus", 30, 140], ["Mercado de Surquillo", 15, 60], ["Bodega de la esquina", 4, 22], ["Metro", 25, 110]],
    comer: [["Café de la esquina", 7, 14], ["Menú del día", 12, 18], ["Pollería", 35, 70], ["Rappi · cena", 28, 55], ["Chifa", 25, 60]],
    transporte: [["Uber", 9, 28], ["Recarga Metropolitano", 10, 20], ["Grifo · gasolina", 60, 120], ["Taxi", 8, 20]],
    casa: [["Ferretería", 15, 60], ["Artículos de limpieza", 20, 45]],
    ocio: [["Cine", 18, 40], ["Salida con amigos", 40, 110], ["Juego en Steam", 20, 60]],
    compras: [["Saga Falabella", 50, 180], ["Mercado Libre", 25, 120], ["Ropa · Gamarra", 30, 90]],
    salud: [["Farmacia Inkafarma", 12, 60], ["Proteína", 90, 140]],
    suscripciones: [],
  };
  const PESOS_CAT = [["super", 0.27], ["comer", 0.3], ["transporte", 0.2], ["casa", 0.04], ["ocio", 0.07], ["compras", 0.06], ["salud", 0.06]];

  function elegirCat(k, i) {
    let r = azar("cat", k, i), acc = 0;
    for (const [c, p] of PESOS_CAT) { acc += p; if (r <= acc) return c; }
    return "super";
  }

  function gastosDelDia(fecha) {
    const k = clave(fecha);
    const lista = [];
    const n = entero(0, 3, "ngastos", k);
    for (let i = 0; i < n; i++) {
      const cat = elegirCat(k, i);
      const opciones = PLANTILLAS_GASTO[cat];
      if (!opciones.length) continue;
      const [concepto, min, max] = opciones[entero(0, opciones.length - 1, "op", k, i)];
      const importe = Math.round(entre(min, max, "imp", k, i) * 10) / 10;
      lista.push({ id: `ej-${k}-${i}`, fecha: k, importe, concepto, cat });
    }
    for (const f of config.dinero.fijos) {
      if (fecha.getDate() === f.dia) lista.push({ id: `fijo-${k}-${f.concepto}`, fecha: k, importe: f.importe, concepto: f.concepto, cat: f.cat, fijo: true });
    }
    return lista;
  }

  PV.generarEjemplo = function (hoy = new Date()) {
    hoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const kHoy = clave(hoy);
    const dias = {};      // sueño, pasos, agua, entreno
    const marcas = {};    // hábitos: { id: { fecha: true } }
    const animo = {};
    config.habitos.forEach((h) => (marcas[h.id] = {}));

    for (let i = 160; i >= 1; i--) {
      const d = sumarDias(hoy, -i);
      const k = clave(d);
      const tocaEntreno = !!config.entrenos[d.getDay()];
      const entreno = tocaEntreno && azar("entreno", k) < 0.82;
      const sueno = Math.round(entre(370, 470, "sueno", k) + (entreno ? 22 : 0));
      const pasos = Math.round(entre(4200, 11800, "pasos", k) + (entreno ? 1500 : 0));
      const agua = entero(4, 10, "agua", k);
      dias[k] = { sueno, pasos, agua, entreno };
      let base = 2.6 + (entreno ? 0.7 : 0) + (sueno > 430 ? 0.5 : 0) + azar("animo", k) * 1.6;
      animo[k] = Math.max(1, Math.min(5, Math.round(base)));
      for (const h of config.habitos) {
        let hecho;
        if (h.auto === "agua") hecho = agua >= config.objetivoAgua;
        else if (h.auto === "pasos") hecho = pasos >= config.objetivoPasos;
        else hecho = azar("hab", h.id, k) < h.prob + (i < 6 ? 0.25 : 0);
        if (hecho) marcas[h.id][k] = true;
      }
    }
    // Hoy, a medias: dormiste, llevas algunos pasos y 3 vasos.
    dias[kHoy] = { sueno: Math.round(entre(400, 470, "sueno", kHoy)), pasos: entero(2500, 4200, "pasos", kHoy), agua: 3, entreno: false };

    // Dinero: mes pasado completo y este mes hasta hoy.
    const gastos = [];
    const inicioMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    for (let d = new Date(inicioMesPasado); d <= hoy; d = sumarDias(d, 1)) gastos.push(...gastosDelDia(d));

    // Agenda de hoy desde la semana tipo.
    const citas = {};
    citas[kHoy] = agendaDeSemanaTipo(hoy);

    const diario = [
      { fecha: clave(sumarDias(hoy, -1)), texto: "Bien: cerré la venta con la ferretería y fui al gimnasio. Mañana: llamar primero a los clientes difíciles, antes del café." },
      { fecha: clave(sumarDias(hoy, -2)), texto: "Bien: la clase de inglés, entendí todo el audio. Cambiaría: dormirme antes, me quedé viendo videos." },
      { fecha: clave(sumarDias(hoy, -4)), texto: "Día raro. Bien: almuerzo con mi familia. Mañana quiero planear la semana con calma." },
    ];

    const progresoObjetivos = {};
    const fraccion = diaDelAno(hoy) / diasDelAno(hoy);
    for (const o of config.objetivos) {
      if (o.tipo === "si-no" || o.desdeLibros) continue;
      progresoObjetivos[o.id] = Math.round(o.meta * fraccion * o.ritmo);
    }

    return {
      generado: kHoy,
      dias, marcas, animo, gastos, citas, diario,
      tres: { [kHoy]: [
        { texto: "Llamar a los 3 clientes que dijeron «lo pienso»", hecho: false },
        { texto: "Mandar la cotización a la tienda de Miraflores", hecho: false },
        { texto: "30 min de inglés", hecho: false },
      ] },
      objetivos: progresoObjetivos,
      libroPagina: config.libroActual.pagina,
    };
  };

  function agendaDeSemanaTipo(fecha) {
    const k = clave(fecha);
    return config.semanaTipo
      .filter((c) => c.dias.includes(fecha.getDay()))
      .map((c, i) => ({ id: `st-${k}-${i}`, hora: c.hora, dur: c.dur, titulo: c.titulo, tipo: c.tipo }))
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }
  PV.agendaDeSemanaTipo = agendaDeSemanaTipo;

  function diaDelAno(d) { return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(d.getFullYear(), 0, 0)) / 864e5); }
  function diasDelAno(d) { const y = d.getFullYear(); return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365; }
  PV.fecha.diaDelAno = diaDelAno;
  PV.fecha.diasDelAno = diasDelAno;
})();
