/* Almacén: guarda en ESTE navegador (localStorage) todo lo que marcas o escribes en el panel.
   Los datos de ejemplo se regeneran cada día; lo tuyo vive aparte, en "mios", y se pone encima.
   Nada sale de tu computadora. */
(function () {
  const PV = window.PV;
  // Tus datos y los de ejemplo se guardan por separado: nunca se mezclan.
  const LLAVE = PV.modoEjemplo ? "panelDeVida.ejemplo" : "panelDeVida.v1";
  const LLAVE_PREFS = "panelDeVida.prefs";

  const vacio = () => ({ dias: {}, marcas: {}, animo: {}, gastos: [], borrados: [], citas: {}, diario: [], tres: {}, objetivos: {}, libroPagina: null, libro: null, inicio: null });

  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(LLAVE_PREFS) || "{}") || {}; } catch (e) {}
  const guardarPrefs = () => { try { localStorage.setItem(LLAVE_PREFS, JSON.stringify(prefs)); } catch (e) {} };

  function leer() {
    try {
      const txt = localStorage.getItem(LLAVE);
      if (!txt) return vacio();
      return Object.assign(vacio(), JSON.parse(txt));
    } catch (e) {
      return vacio();
    }
  }

  let mios = leer();
  // El día que empiezas a usarlo: lo de antes no cuenta como fallo.
  if (!mios.inicio) { mios.inicio = PV.fecha.clave(new Date()); try { localStorage.setItem(LLAVE, JSON.stringify(mios)); } catch (e) {} }

  function guardar() {
    try { localStorage.setItem(LLAVE, JSON.stringify(mios)); } catch (e) { /* sin almacenamiento: el panel sigue funcionando */ }
  }

  // Junta los datos de ejemplo de hoy con lo tuyo.
  function combinar() {
    const base = PV.modoEjemplo ? PV.generarEjemplo(new Date()) : PV.datosVacios(new Date());
    const dias = { ...base.dias };
    for (const k in mios.dias) dias[k] = { ...(dias[k] || {}), ...mios.dias[k] };
    const marcas = {};
    for (const h of PV.config.habitos) marcas[h.id] = { ...(base.marcas[h.id] || {}), ...(mios.marcas[h.id] || {}) };
    const borrados = new Set(mios.borrados);
    const gastos = base.gastos.filter((g) => !borrados.has(g.id)).concat(mios.gastos.filter((g) => !borrados.has(g.id)));
    const fechasMias = new Set(mios.diario.map((e) => e.fecha));
    const diario = mios.diario.concat(base.diario.filter((e) => !fechasMias.has(e.fecha))).sort((a, b) => b.fecha.localeCompare(a.fecha));
    return {
      dias, marcas, gastos, diario,
      animo: { ...base.animo, ...mios.animo },
      citas: { ...base.citas, ...mios.citas },
      tres: { ...base.tres, ...mios.tres },
      objetivos: { ...base.objetivos, ...mios.objetivos },
      libroPagina: mios.libroPagina ?? base.libroPagina,
      libro: mios.libro,
      inicio: PV.modoEjemplo ? "2000-01-01" : mios.inicio,
    };
  }

  PV.almacen = {
    get mios() { return mios; },
    datos: combinar,
    guardar,
    pref(nombre, valor) {
      if (valor === undefined) return prefs[nombre];
      prefs[nombre] = valor; guardarPrefs();
    },
    cambiar(fn) { fn(mios); guardar(); },
    restablecer() {
      mios = vacio(); mios.inicio = PV.fecha.clave(new Date()); guardar();
    },
    exportar() {
      let config = null;
      try { config = JSON.parse(localStorage.getItem(PV.LLAVE_CONFIG) || "null"); } catch (e) {}
      const copia = { app: "panel-de-vida", version: 1, exportado: new Date().toISOString(), datos: mios, prefs };
      if (config && !PV.modoEjemplo) copia.config = config;
      const blob = new Blob([JSON.stringify(copia, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `panel-de-vida-copia-${PV.fecha.clave(new Date())}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    // Una copia puede traer tus datos, tu configuración o las dos cosas.
    // Si solo trae configuración (privado/mi-configuracion.json), lo que ya marcaste se queda como está.
    // Devuelve qué se importó, para saber si hay que recargar la página.
    importar(texto) {
      let obj;
      try { obj = JSON.parse(texto); } catch (e) { throw new Error("Ese archivo no es una copia del panel."); }
      if (!obj || obj.app !== "panel-de-vida" || (!obj.datos && !obj.config)) throw new Error("Ese archivo no es una copia del panel.");
      if (obj.config && PV.modoEjemplo) throw new Error("Vuelve a tus datos antes de importar tu configuración.");
      if (obj.config) {
        try { localStorage.setItem(PV.LLAVE_CONFIG, JSON.stringify(obj.config)); } catch (e) { throw new Error("No se pudo guardar la configuración en este navegador."); }
      }
      if (obj.datos) { mios = Object.assign(vacio(), obj.datos); guardar(); }
      if (obj.prefs) { prefs = Object.assign(prefs, obj.prefs, { ejemplo: prefs.ejemplo }); guardarPrefs(); }
      return { config: !!obj.config, datos: !!obj.datos };
    },
  };
})();
