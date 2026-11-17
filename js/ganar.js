/* "Tu plan de hoy": una idea distinta cada día para ganar un poco de dinero usando internet,
   de forma segura. Ideas reales con lo que sabes hacer: nada de "dinero fácil".
   Las ideas de aquí son GENERALES (el código se publica). Las tuyas van en tu configuración
   (privado/mi-configuracion.json → ganar.ideas) y sustituyen a estas. */
(function () {
  const PV = (window.PV = window.PV || {});
  const $ = (s) => document.querySelector(s);

  const IDEAS_BASE = [
    { id: "video-negocio", icono: "🎬", titulo: "Edita un video corto para un negocio de tu barrio", tiempo: "1–2 h", ganancia: "S/ 10–20",
      pasos: ["Elige un negocio que conozcas (bodega, restaurante, salón) y graba 3 o 4 tomas de sus productos, con permiso.", "Edita 15 segundos con música y texto en un editor de video.", "Mándales por WhatsApp una muestra con tu nombre encima y ofrécelo por S/ 10–15.", "Cobra antes de enviar el video final sin marca."] },
    { id: "menu-canva", icono: "🖼️", titulo: "Diseña un menú o cartel para un negocio", tiempo: "1 h", ganancia: "S/ 10–20",
      pasos: ["Fíjate en un negocio con el cartel feo o escrito a mano.", "Haz una versión bonita con una plantilla de diseño gratis.", "Enséñasela por WhatsApp como muestra y ofrécela por S/ 10–15.", "Cobra y entrega la imagen en buena calidad."] },
    { id: "subtitulos", icono: "🔤", titulo: "Pon subtítulos a los videos de un negocio o creador", tiempo: "1 h", ganancia: "S/ 10",
      pasos: ["Busca un negocio de tu zona que suba videos sin subtítulos.", "Haz uno de muestra con subtítulos automáticos y corrígelos.", "Ofrece 3 videos por S/ 10.", "Cobra antes de mandar los videos terminados."] },
    { id: "textos-ia", icono: "🤖", titulo: "Escribe con IA las publicaciones de una semana para un negocio", tiempo: "45 min", ganancia: "S/ 10–15",
      pasos: ["Pídele a una IA 5 publicaciones para un negocio concreto (ofertas, horario, novedades).", "Revísalas y ponlas en tus palabras.", "Ofrécelas al dueño por WhatsApp por S/ 10.", "Cobra y envíalas listas para copiar."] },
    { id: "saludo", icono: "🎂", titulo: "Haz un video de saludo o cumpleaños por encargo", tiempo: "1 h", ganancia: "S/ 10–15",
      pasos: ["Publica en tus estados: \"Hago videos de cumpleaños con fotos y música\".", "Pide las fotos y los nombres por WhatsApp.", "Edítalo con música y textos.", "Cobra antes de mandar el video final."] },
    { id: "cv", icono: "📝", titulo: "Haz un CV bonito para alguien que busca trabajo", tiempo: "1 h", ganancia: "S/ 10–15",
      pasos: ["Pregunta a familiares o conocidos si alguien busca trabajo.", "Pide sus datos y mejora el texto con ayuda de una IA.", "Ponlo en una plantilla de CV bonita.", "Cobra y envíalo en PDF."] },
    { id: "logo", icono: "✨", titulo: "Diseña un logo sencillo para un emprendimiento", tiempo: "1–2 h", ganancia: "S/ 15–25",
      pasos: ["Piensa en alguien que venda algo sin logo (postres, ropa, uñas…).", "Haz 2 opciones sencillas con una herramienta de diseño.", "Enséñaselas con tu nombre encima y ofrece la final por S/ 15.", "Cobra y entrega el logo en buena calidad."] },
  ];

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
  ];

  const ideas = () => {
    const g = PV.config.ganar;
    return g && Array.isArray(g.ideas) && g.ideas.length ? g.ideas : IDEAS_BASE;
  };
  const meta = () => (PV.config.ganar && PV.config.ganar.meta) || 10;
  const cobro = () => (PV.config.ganar && PV.config.ganar.cobro) || "";

  // La idea de hoy: cambia cada día (y con "Otra idea" pasas a la siguiente).
  function deHoy() {
    const c = PV.calc, D = c.datos(), hoy = c.hoy(), k = c.kHoy();
    const est = (D.ganar && D.ganar[k]) || {};
    const lista = ideas();
    const base = PV.fecha.diaDelAno(hoy) + hoy.getFullYear() * 7;
    const i = (((base + (est.salto || 0)) % lista.length) + lista.length) % lista.length;
    const consejo = CONSEJOS[(PV.fecha.diaDelAno(hoy) + (est.salto || 0)) % CONSEJOS.length];
    const ganadoHoy = D.ingresos.filter((g) => g.fecha === k).reduce((s, g) => s + g.importe, 0);
    return { idea: lista[i], est, consejo, ganadoHoy, meta: meta() };
  }

  function pintar() {
    const caja = $("#ganar");
    if (!caja || !PV.calc) return;
    const c = PV.calc, esc = c.esc, fmt = PV.fmt;
    const { idea, est, consejo, ganadoHoy, meta: m } = deHoy();
    const hechos = est.pasos || [];
    const pct = Math.min(100, Math.round((ganadoHoy / m) * 100));
    const logrado = ganadoHoy >= m;
    caja.innerHTML = `
      <div class="t-cab"><h2 class="t-tit"><span aria-hidden="true">💸</span>Tu plan de hoy: ${fmt.dineroCorto(m)}</h2>
        <span class="pastilla ${logrado ? "verde" : "gris"}">${logrado ? "¡Conseguido! " : ""}Hoy: ${fmt.dinero(ganadoHoy)} de ${fmt.dineroCorto(m)}</span></div>
      <div class="barra"><i style="width:${pct}%;background:var(--verde)"></i></div>
      <div class="gn-cuerpo">
        <div class="gn-idea">
          <div class="gn-tit"><span class="gn-ico" aria-hidden="true">${idea.icono || "💡"}</span>
            <div><h3>${esc(idea.titulo)}</h3>
            <small class="suave">⏱️ ${esc(idea.tiempo || "")} · 💰 posible ${esc(idea.ganancia || "")}${cobro() ? ` · 📲 cobra por ${esc(cobro())}` : ""}</small></div></div>
          <ol class="gn-pasos">${(idea.pasos || []).map((p, i) => `<li><label><input type="checkbox" data-gn="paso" data-i="${i}" ${hechos[i] ? "checked" : ""}> <span>${esc(p)}</span></label></li>`).join("")}</ol>
        </div>
        <div class="gn-lado">
          <div class="gn-seguro"><small>🛡️ Seguridad de hoy</small><p>${esc(consejo)}</p></div>
          <div class="gn-acciones">
            <button type="button" class="btn verde-btn gn-lleno" data-gn="logrado">✅ ¡Lo conseguí! Apuntar ingreso</button>
            <button type="button" class="btn" data-gn="otra">🔄 Otra idea</button>
          </div>
          <small class="suave">Ninguna idea garantiza el dinero: depende de que alguien diga que sí. Si hoy no sale, mañana hay otra.</small>
        </div>
      </div>`;
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-gn]");
    if (!b || !PV.almacen) return;
    const k = PV.calc.kHoy();
    if (b.dataset.gn === "otra") {
      PV.almacen.cambiar((m) => { m.ganar = m.ganar || {}; const est = (m.ganar[k] = m.ganar[k] || {}); est.salto = (est.salto || 0) + 1; est.pasos = []; });
      PV.repintar();
    } else if (b.dataset.gn === "logrado") {
      PV.abrirIngreso(deHoy().idea.titulo);
    }
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.dataset.gn !== "paso" || !PV.almacen) return;
    const k = PV.calc.kHoy(), i = Number(t.dataset.i);
    PV.almacen.cambiar((m) => { m.ganar = m.ganar || {}; const est = (m.ganar[k] = m.ganar[k] || {}); est.pasos = est.pasos || []; est.pasos[i] = t.checked; });
    PV.repintar();
  });

  PV.ganar = { pintar, deHoy };
})();
