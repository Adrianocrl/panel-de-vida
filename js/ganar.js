/* "Tu plan de hoy": cada día una idea NUEVA para ganar un poco de dinero usando internet, de forma segura.
   No es una lista fija: la idea se construye mezclando piezas
     QUÉ HACES (servicio) × PARA QUIÉN (tipo de negocio) × EL GANCHO (+ fechas especiales del calendario).
   Con las piezas de aquí salen miles de combinaciones: pasan años sin que se repita ninguna.
   El código solo lleva piezas GENERALES (se publica). Lo tuyo (qué sabes hacer, tus herramientas,
   tus servicios propios) va en tu configuración: privado/mi-configuracion.json → ganar. */
(function () {
  const raiz = typeof window !== "undefined" ? window : self;
  const PV = (raiz.PV = raiz.PV || {});
  const $ = (s) => document.querySelector(s);

  // ---------- Para quién (negocios de barrio) ----------
  const NEGOCIOS = [
    ["una pollería", "la pollería", "el pollo a la brasa"], ["una bodega", "la bodega", "las ofertas de la semana"],
    ["una panadería", "la panadería", "el pan recién salido"], ["una cevichería", "la cevichería", "el ceviche"],
    ["un chifa", "el chifa", "el arroz chaufa"], ["un salón de uñas", "el salón de uñas", "los diseños de uñas"],
    ["una peluquería", "la peluquería", "los tintes y peinados"], ["un taller de motos", "el taller", "las reparaciones"],
    ["una lavandería", "la lavandería", "el lavado al peso"], ["un gimnasio", "el gimnasio", "las clases grupales"],
    ["una librería", "la librería", "los útiles"], ["una veterinaria", "la veterinaria", "los baños para mascotas"],
    ["un emprendimiento de postres", "el emprendimiento de postres", "las tortas"], ["una juguería", "la juguería", "los jugos"],
    ["una cafetería", "la cafetería", "el café"], ["una tienda de ropa", "la tienda de ropa", "las prendas nuevas"],
    ["una zapatería", "la zapatería", "los zapatos"], ["una ferretería", "la ferretería", "las herramientas"],
    ["una florería", "la florería", "los arreglos de flores"], ["una heladería", "la heladería", "los helados"],
    ["una pizzería", "la pizzería", "las pizzas"], ["una hamburguesería", "la hamburguesería", "las hamburguesas"],
    ["una tienda de accesorios de celular", "la tienda de accesorios", "las fundas y cargadores"], ["un local de impresiones", "el local de impresiones", "las impresiones y copias"],
    ["un profesor particular", "el profesor", "sus clases"], ["una academia de baile", "la academia", "las clases de baile"],
    ["un taller de costura", "el taller de costura", "los arreglos de ropa"], ["un vivero", "el vivero", "las plantas"],
    ["un restaurante de menú", "el restaurante", "el menú del día"], ["una tienda de mascotas", "la tienda de mascotas", "los juguetes para mascotas"],
  ].map(([un, el, prod]) => ({ un, el, prod }));

  // ---------- El gancho (de qué trata) ----------
  const GANCHOS = [
    "la oferta de la semana", "{prod}", "un producto o servicio nuevo", "un antes y después", "el combo del día",
    "su horario de atención", "lo más vendido", "cómo se prepara o se hace {prod}", "la historia del dueño", "los comentarios de clientes contentos",
    "un sorteo entre sus seguidores", "los pedidos por WhatsApp", "el precio especial de fin de semana", "una pregunta divertida a sus clientes", "lo que lo hace distinto",
  ];

  // ---------- Qué haces (servicios generales) ----------
  // req: qué hay que saber. eje "negocio" = se combina con NEGOCIOS × GANCHOS; si no, con sus listas x × g.
  const COBRO = "Cobra{cobro} antes de enviar el trabajo final (o la mitad antes y la mitad al final).";
  const SERVICIOS = [
    { id: "video15", req: "video", icono: "🎬", tiempo: "1–2 h", precio: [10, 20], eje: "negocio",
      titulo: "Haz con {video} un video de 15 s sobre {gancho} de {un}",
      pasos: ["Elige {un} de tu zona que conozcas y pide permiso para grabar.", "Graba 3 o 4 tomas de {gancho}.", "Edítalo con {video}: música, textos y tu nombre encima como muestra.", "Ofrécelo por WhatsApp a {el} por S/ {precio}. " + COBRO] },
    { id: "serie", req: "video", icono: "📹", tiempo: "2 h", precio: [20, 30], eje: "negocio",
      titulo: "Ofrece a {un} 3 videos cortos, empezando por {gancho}",
      pasos: ["Piensa 3 ideas de videos para {el}: la primera, sobre {gancho}.", "Graba y edita con {video} el primero como muestra.", "Ofrece los 3 por S/ {precio} (pide la mitad antes).", COBRO] },
    { id: "subtitulos", req: "video", icono: "🔤", tiempo: "1 h", precio: [10, 15], eje: "negocio",
      titulo: "Pon subtítulos al video de {gancho} de {un}",
      pasos: ["Busca {un} que suba videos sin subtítulos (o pídele uno).", "Pon subtítulos automáticos con {video} y corrígelos.", "Envíale la muestra con tu nombre encima y ofrece 3 videos por S/ {precio}.", COBRO] },
    { id: "dia-en", req: "video", icono: "🎥", tiempo: "1–2 h", precio: [15, 25], eje: "negocio",
      titulo: "Haz un video \"un día en {el}\" mostrando {gancho}",
      pasos: ["Pide permiso a {el} para grabar 20 minutos.", "Graba tomas cortas del día a día y de {gancho}.", "Edita 20–30 segundos con {video} y música de moda.", "Ofrécelo por S/ {precio}. " + COBRO] },
    { id: "post", req: "diseno", icono: "🖼️", tiempo: "45 min", precio: [10, 15], eje: "negocio",
      titulo: "Diseña con {diseno} un post sobre {gancho} de {un}",
      pasos: ["Elige {un} cuyas publicaciones se vean poco cuidadas.", "Diseña con {diseno} un post bonito sobre {gancho}.", "Mándaselo con tu nombre encima como muestra y ofrece 3 posts por S/ {precio}.", COBRO] },
    { id: "menu", req: "diseno", icono: "📋", tiempo: "1 h", precio: [10, 20], eje: "negocio",
      titulo: "Renueva con {diseno} la lista de precios de {un}, destacando {gancho}",
      pasos: ["Fíjate en {un} con la lista de precios fea o escrita a mano.", "Haz una versión bonita con {diseno} que destaque {gancho}.", "Enséñasela como muestra y ofrécela por S/ {precio}.", COBRO] },
    { id: "volante", req: "diseno", icono: "📣", tiempo: "45 min", precio: [10, 15], eje: "negocio",
      titulo: "Haz con {diseno} un volante digital para WhatsApp de {un} sobre {gancho}",
      pasos: ["Elige {un} que conozcas.", "Diseña con {diseno} un volante vertical (para estados de WhatsApp) sobre {gancho}.", "Ofrécelo por S/ {precio}, listo para que lo compartan.", COBRO] },
    { id: "logo", req: "diseno", icono: "✨", tiempo: "1–2 h", precio: [15, 25], eje: "negocio",
      titulo: "Diseña con {diseno} un logo para {un} y úsalo en un post sobre {gancho}",
      pasos: ["Busca {un} sin logo o con uno muy simple.", "Haz 2 opciones de logo con {diseno}.", "Enséñaselas con tu nombre encima, dentro de un post sobre {gancho}, y ofrece el logo por S/ {precio}.", COBRO] },
    { id: "portadas", req: "diseno", icono: "📸", tiempo: "1 h", precio: [10, 15], eje: "negocio",
      titulo: "Haz con {diseno} portadas para los videos de {un}, empezando por {gancho}",
      pasos: ["Elige {un} que suba videos con portadas feas.", "Haz 2 portadas de muestra con {diseno}; una, sobre {gancho}.", "Ofrece 5 portadas por S/ {precio}.", COBRO] },
    { id: "textos", req: "ia", icono: "🤖", tiempo: "45 min", precio: [10, 15], eje: "negocio",
      titulo: "Escribe con {ia} 5 publicaciones para {un} sobre {gancho}",
      pasos: ["Pídele a {ia} 5 publicaciones para {un} sobre {gancho}.", "Revísalas y ponlas en tus palabras.", "Ofrécelas a {el} por WhatsApp por S/ {precio}.", COBRO] },
    { id: "whatsapp", req: "ia", icono: "💬", tiempo: "45 min", precio: [10, 15], eje: "negocio",
      titulo: "Prepara con {ia} los mensajes automáticos de WhatsApp de {un}, mencionando {gancho}",
      pasos: ["Ofrece a {el} preparar sus mensajes de bienvenida, horario y precios.", "Escríbelos con {ia}, mencionando {gancho}.", "Ayúdale a ponerlos en su WhatsApp Business (el celular lo maneja el dueño).", "Cobra S/ {precio}{cobro} al terminar."] },
    { id: "google", req: "ia", icono: "📍", tiempo: "1 h", precio: [10, 20], eje: "negocio",
      titulo: "Mejora la ficha de Google Maps de {el} con una descripción y fotos de {gancho}",
      pasos: ["Busca {un} cuya ficha de Google Maps no tenga fotos ni descripción.", "Escribe con {ia} una buena descripción y saca fotos de {gancho}.", "Ofrece dejarla lista por S/ {precio}: el dueño entra con su cuenta, tú no.", "Cobra{cobro} al terminar."] },
    { id: "estados", req: "ia", icono: "🗓️", tiempo: "1 h", precio: [10, 15], eje: "negocio",
      titulo: "Prepara con {ia} 7 estados de WhatsApp para {un}, uno sobre {gancho}",
      pasos: ["Pide a {ia} 7 ideas de estados para {un} (uno por día).", "Haz el primero, sobre {gancho}, como muestra.", "Ofrece los 7 por S/ {precio}.", COBRO] },
    { id: "traduccion", req: "ingles", icono: "🌎", tiempo: "45 min", precio: [10, 20], eje: "negocio",
      titulo: "Traduce al inglés el cartel de {un} sobre {gancho}, para turistas",
      pasos: ["Elige {un} de una zona con turistas.", "Traduce su cartel sobre {gancho} (revísalo con {ia}).", "Ofrece la versión en inglés, ya diseñada, por S/ {precio}.", COBRO] },
    { id: "clases-ingles", req: "ingles", icono: "🗣️", tiempo: "30–45 min", precio: [10, 10],
      x: ["un niño o niña de tu familia", "el hijo o la hija de un vecino", "el hermano menor de un amigo", "un primo o prima más pequeño", "la hija o el hijo de un conocido"],
      g: ["con sus tareas de inglés", "con vocabulario para un examen", "con la pronunciación usando canciones", "a preparar una exposición en inglés", "con los números y la hora en inglés", "a presentarse en inglés", "con los verbos más usados", "a entender una canción en inglés"],
      z: ["esta tarde", "este fin de semana", "antes de su próximo examen", "en una sesión de repaso", "con un juego de preguntas", "con tarjetas de vocabulario hechas con {diseno}", "con un video corto en inglés", "con un mini examen al final"],
      titulo: "Ayuda por videollamada a {x} {g}, {z}",
      pasos: ["Ofrécelo a su mamá o su papá: S/ {precio} la sesión de 30–45 minutos.", "Prepara la sesión con {ia}: ejercicios y un juego corto.", "Haz la videollamada con un adulto de su familia cerca.", "Cobra{cobro} a su mamá o su papá al terminar."] },
  ];

  // ---------- Fechas especiales (Perú) ----------
  function domingo(anio, mes, n) { const d = new Date(anio, mes, 1); const p = (7 - d.getDay()) % 7; return new Date(anio, mes, 1 + p + (n - 1) * 7); }
  function fiestaDe(hoy) {
    const a = hoy.getFullYear(), m = hoy.getMonth() + 1, dia = hoy.getDate(), md = m * 100 + dia;
    const dentro = (desde, hasta) => md >= desde && md <= hasta;
    const madre = domingo(a, 4, 2), padre = domingo(a, 5, 3);
    if (md >= 1226 || md <= 101) return { nombre: "Año Nuevo", gancho: "su promoción de Año Nuevo", icono: "🎆" };
    if (dentro(1201, 1224)) return { nombre: "Navidad", gancho: "su campaña de Navidad", icono: "🎄" };
    if (dentro(1120, 1130)) return { nombre: "Black Friday", gancho: "su oferta de Black Friday", icono: "🛍️" };
    if (dentro(1020, 1031)) return { nombre: "Halloween y la Canción Criolla", gancho: "su promoción de Halloween", icono: "🎃" };
    if (dentro(715, 729)) return { nombre: "Fiestas Patrias", gancho: "su promoción de Fiestas Patrias", icono: "🎉" };
    if (m === 6 && dia <= padre.getDate()) return { nombre: "el Día del Padre", gancho: "su regalo para el Día del Padre", icono: "👔" };
    if (m === 5 && dia <= madre.getDate()) return { nombre: "el Día de la Madre", gancho: "su regalo para el Día de la Madre", icono: "💐" };
    if (dentro(220, 320)) return { nombre: "el regreso a clases", gancho: "su campaña de regreso a clases", icono: "🎒" };
    if (dentro(201, 214)) return { nombre: "San Valentín", gancho: "su promoción de San Valentín", icono: "💘" };
    if (dentro(102, 228)) return { nombre: "el verano", gancho: "su promoción de verano", icono: "☀️" };
    return null;
  }

  const CONSEJOS = [
    "Nunca pagues para poder ganar dinero. Si te piden pagar primero, es estafa.",
    "No compartas tu DNI, tus contraseñas ni los códigos que te llegan por SMS (de apps de pago o de WhatsApp).",
    "Si una oferta paga mucho por casi nada, es una estafa.",
    "Cobra antes de entregar el trabajo final, o la mitad antes y la mitad al final.",
    "Trabaja con conocidos o con negocios reales de tu zona, no con desconocidos que te escriben primero.",
    "Nunca vayas solo a encontrarte con alguien que conociste por internet. Avisa siempre a un adulto.",
    "Desconfía de las \"tareas pagadas\" por WhatsApp o Telegram (dar likes, reseñas…): son estafas.",
    "Manda las muestras con tu nombre o tu marca encima, para que no las usen sin pagarte.",
    "Guarda una captura de cada pago que recibas.",
    "Si alguien te presiona o te pide fotos o datos personales, bloquéalo y cuéntaselo a un adulto de confianza.",
    "Nunca pidas ni guardes las contraseñas de las cuentas de un negocio: que entre el dueño.",
  ];

  // ---------- Configuración ----------
  const cfg = () => PV.config.ganar || {};
  const meta = () => cfg().meta || 10;
  const herr = () => Object.assign({ video: "un editor de video", diseno: "una app de diseño", ia: "una IA" }, cfg().herramientas || {});
  function servicios() {
    const hab = cfg().habilidades;
    const generales = Array.isArray(hab) && hab.length ? SERVICIOS.filter((s) => hab.includes(s.req)) : SERVICIOS;
    const propios = Array.isArray(cfg().servicios) ? cfg().servicios : [];
    // Repartidos: los propios intercalados entre los generales.
    const lista = generales.slice();
    propios.forEach((p, i) => lista.splice(Math.min(lista.length, Math.round(((i + 1) * lista.length) / (propios.length + 1)) + i), 0, p));
    return lista;
  }

  const mcd = (a, b) => (b ? mcd(b, a % b) : a);
  function paso(L) { let a = 7; while (mcd(a, L) !== 1) a++; return a; } // salto que recorre todas las combinaciones sin repetir

  const gramatica = (t) => t.replace(/\bde el\b/g, "del").replace(/\ba el\b/g, "al").replace(/\s+,/g, ",").replace(/\s{2,}/g, " ");
  function rellenar(txt, v) { return String(txt).replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : `{${k}}`)).replace(/\{(\w+)\}/g, (_, k) => (v[k] !== undefined ? v[k] : "")); }

  // La idea de un día. d = días desde el 1-1-2026; salto = veces que pulsaste "Otra idea".
  function construir(hoy, salto) {
    const lista = servicios();
    const S = lista.length;
    const d = Math.round((new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()) - new Date(2026, 0, 1)) / 864e5);
    const iS = (((d + salto * 5) % S) + S) % S, s = lista[iS];
    const k = Math.floor(d / S) + salto * 37;                  // cuántas veces ha salido ya este servicio
    const A = s.eje === "negocio" ? NEGOCIOS : s.x || [""];
    const B = s.eje === "negocio" ? GANCHOS : s.g || [""];
    const Z = s.eje === "negocio" ? [""] : s.z || [""];
    const L = A.length * B.length * Z.length;
    // Recorre todas las combinaciones de este servicio sin repetir; cada servicio empieza en un sitio distinto.
    const p = (((k * paso(L) + iS * 7919) % L) + L) % L;
    const a = A[p % A.length], b = B[Math.floor(p / A.length) % B.length], z = Z[Math.floor(p / (A.length * B.length))];
    const fiesta = fiestaDe(hoy);
    const conFiesta = fiesta && k % 2 === 0;
    const h = herr(), c = cfg().cobro;
    const v = { video: h.video, diseno: h.diseno, ia: h.ia, cobro: c ? ` por ${c}` : "", precio: s.precio ? s.precio[0] : 10 };
    if (s.eje === "negocio") {
      Object.assign(v, a);
      v.gancho = rellenar(b, a);
    } else { v.x = rellenar(a, v); v.g = rellenar(b, v); v.z = rellenar(z, v); }
    let titulo = rellenar(s.titulo, v);
    if (conFiesta) titulo += ` (aprovecha ${fiesta.nombre}${s.eje === "negocio" ? `: ofrece también ${fiesta.gancho}` : ""})`;
    titulo = gramatica(titulo.charAt(0).toUpperCase() + titulo.slice(1));
    const ganancia = s.precio ? (s.precio[0] === s.precio[1] ? `S/ ${s.precio[0]}` : `S/ ${s.precio[0]}–${s.precio[1]}`) : "S/ 10";
    return { id: `${s.id}-${p}`, icono: conFiesta ? fiesta.icono : s.icono, titulo, tiempo: s.tiempo, ganancia, pasos: (s.pasos || []).map((x) => gramatica(rellenar(x, v))), fiesta: conFiesta ? fiesta.nombre : null };
  }

  function deHoy() {
    const c = PV.calc, D = c.datos(), hoy = c.hoy(), k = c.kHoy();
    const est = (D.ganar && D.ganar[k]) || {};
    const consejo = CONSEJOS[(PV.fecha.diaDelAno(hoy) + (est.salto || 0)) % CONSEJOS.length];
    const ganadoHoy = D.ingresos.filter((g) => g.fecha === k).reduce((s, g) => s + g.importe, 0);
    return { idea: construir(hoy, est.salto || 0), est, consejo, ganadoHoy, meta: meta() };
  }

  // ---------- Mensaje para pedir ideas nuevas a Claude ----------
  function mensajeClaude() {
    const c = PV.calc, hoy = c.hoy(), fmt = PV.fmt, g = cfg();
    const fiesta = fiestaDe(hoy);
    const L = [];
    L.push(`Vivo en Perú y quiero ganar al menos ${fmt.dinero(meta())} hoy, ${fmt.fechaLarga(hoy).toLowerCase()}, usando internet de forma SEGURA.`);
    if (g.sabe) L.push(`Lo que sé hacer: ${g.sabe}.`);
    if (g.cobro) L.push(`Cobro por ${g.cobro}.`);
    if (fiesta) L.push(`Estamos cerca de ${fiesta.nombre}: aprovéchalo si encaja.`);
    L.push("");
    L.push("Dame 5 ideas NUEVAS y concretas para hoy. Para cada una: qué hacer, a quién ofrecérselo, cuánto cobrar, 3 pasos y el mensaje exacto para ofrecerlo por WhatsApp.");
    L.push("Reglas: nada de pagar para empezar, ni apps que pagan por ver anuncios o hacer encuestas, ni \"tareas pagadas\", ni inversiones o cripto, ni plataformas que exijan ser mayor de 18 años, ni quedar solo con desconocidos.");
    if (g.evitar) L.push(`Tampoco quiero: ${g.evitar}.`);
    L.push(`La idea que ya me dio mi panel hoy es: "${deHoy().idea.titulo}". No la repitas.`);
    return L.join("\n");
  }

  // ---------- Pintar ----------
  let abiertoClaude = false;
  function pintar() {
    const caja = $("#ganar");
    if (!caja || !PV.calc) return;
    const c = PV.calc, esc = c.esc, fmt = PV.fmt;
    const { idea, est, consejo, ganadoHoy, meta: m } = deHoy();
    const hechos = est.pasos || [];
    const pct = Math.min(100, Math.round((ganadoHoy / m) * 100));
    const logrado = ganadoHoy >= m;
    const cobro = cfg().cobro;
    if (c.enfermo && c.enfermo(c.kHoy())) {
      caja.innerHTML = `<div class="t-cab"><h2 class="t-tit"><span aria-hidden="true">💸</span>Tu plan de hoy</h2><span class="pastilla gris">En pausa</span></div>
        <p class="gn-pausa">🤒 Hoy toca recuperarse: el plan para ganar dinero vuelve mañana. Si igual te llega algún ingreso, apúntalo con <b>+ Ingreso</b>.</p>`;
      return;
    }
    caja.innerHTML = `
      <div class="t-cab"><h2 class="t-tit"><span aria-hidden="true">💸</span>Tu plan de hoy: ${fmt.dineroCorto(m)}</h2>
        <span class="pastilla ${logrado ? "verde" : "gris"}">${logrado ? "¡Conseguido! " : ""}Hoy: ${fmt.dinero(ganadoHoy)} de ${fmt.dineroCorto(m)}</span></div>
      <div class="barra"><i style="width:${pct}%;background:var(--verde)"></i></div>
      <div class="gn-cuerpo">
        <div class="gn-idea">
          <div class="gn-tit"><span class="gn-ico" aria-hidden="true">${idea.icono || "💡"}</span>
            <div><h3>${esc(idea.titulo)}</h3>
            <small class="suave">⏱️ ${esc(idea.tiempo || "")} · 💰 posible ${esc(idea.ganancia || "")}${cobro ? ` · 📲 cobra por ${esc(cobro)}` : ""}${idea.fiesta ? ` · 📅 ${esc(idea.fiesta)}` : ""}</small></div></div>
          <ol class="gn-pasos">${idea.pasos.map((p, i) => `<li><label><input type="checkbox" data-gn="paso" data-i="${i}" ${hechos[i] ? "checked" : ""}> <span>${esc(p)}</span></label></li>`).join("")}</ol>
        </div>
        <div class="gn-lado">
          <div class="gn-seguro"><small>🛡️ Seguridad de hoy</small><p>${esc(consejo)}</p></div>
          <div class="gn-acciones">
            <button type="button" class="btn verde-btn gn-lleno" data-gn="logrado">✅ ¡Lo conseguí! Apuntar ingreso</button>
            <button type="button" class="btn" data-gn="otra">🔄 Otra idea</button>
            <button type="button" class="btn" data-gn="claude" aria-expanded="${abiertoClaude}">💬 Pedir ideas nuevas a Claude</button>
          </div>
          <small class="suave">Ninguna idea garantiza el dinero: depende de que alguien diga que sí. Si hoy no sale, mañana hay otra.</small>
        </div>
      </div>
      ${abiertoClaude ? `<div class="jv-claude">
        <ol class="jv-pasos"><li>Pulsa <b>Copiar mensaje</b>.</li><li>Pulsa <b>Abrir Claude</b>.</li><li>Pégalo (Ctrl + V) y envíalo.</li></ol>
        <textarea class="campo jv-texto" id="gn-texto" readonly aria-label="Mensaje para pedir ideas a Claude" style="height:150px">${esc(mensajeClaude())}</textarea>
        <div class="jv-acciones">
          <button type="button" class="btn lleno" data-gn="copiar">📋 Copiar mensaje</button>
          <a class="btn" href="https://claude.ai/new" target="_blank" rel="noopener noreferrer">Abrir Claude ↗</a>
          <button type="button" class="btn" data-gn="claude">Cerrar</button>
        </div>
        <small class="suave">🔒 El panel no envía nada. Solo llega a Claude lo que tú pegues.</small>
      </div>` : ""}`;
  }

  async function copiar() {
    const ta = $("#gn-texto"); if (!ta) return;
    let ok = false;
    try { await navigator.clipboard.writeText(ta.value); ok = true; } catch (e) { try { ta.focus(); ta.select(); ok = document.execCommand("copy"); } catch (e2) {} }
    const b = document.querySelector('[data-gn="copiar"]'); if (b) b.textContent = ok ? "✓ Copiado" : "Selecciónalo y cópialo a mano";
  }

  if (typeof document !== "undefined") document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gn]");
    if (!b || !PV.almacen) return;
    const k = PV.calc.kHoy(), acc = b.dataset.gn;
    if (acc === "otra") {
      PV.almacen.cambiar((m) => { m.ganar = m.ganar || {}; const est = (m.ganar[k] = m.ganar[k] || {}); est.salto = (est.salto || 0) + 1; est.pasos = []; });
      PV.repintar();
    } else if (acc === "logrado") PV.abrirIngreso(deHoy().idea.titulo);
    else if (acc === "claude") { abiertoClaude = !abiertoClaude; pintar(); }
    else if (acc === "copiar") copiar();
  });
  if (typeof document !== "undefined") document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.gn !== "paso" || !PV.almacen) return;
    const k = PV.calc.kHoy(), i = Number(t.dataset.i);
    PV.almacen.cambiar((m) => { m.ganar = m.ganar || {}; const est = (m.ganar[k] = m.ganar[k] || {}); est.pasos = est.pasos || []; est.pasos[i] = t.checked; });
    PV.repintar();
  });

  PV.ganar = { pintar, deHoy, construir, servicios };
})();
