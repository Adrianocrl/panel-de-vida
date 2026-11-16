/* Gráficos dibujados a mano en SVG, sin librerías. Los colores salen de las variables del CSS. */
(function () {
  const PV = window.PV;
  const r1 = (n) => Math.round(n * 10) / 10;

  // Anillo de progreso "Tu día".
  function anillo(pct, tam = 112) {
    const g = 10, r = (tam - g) / 2, c = 2 * Math.PI * r;
    const lleno = Math.max(0, Math.min(1, pct)) * c;
    return `<svg viewBox="0 0 ${tam} ${tam}" width="${tam}" height="${tam}" role="img" aria-label="${Math.round(pct * 100)} % del día hecho">
      <circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="var(--linea)" stroke-width="${g}"/>
      ${lleno > 0 ? `<circle cx="${tam / 2}" cy="${tam / 2}" r="${r}" fill="none" stroke="var(--acento)" stroke-width="${g}" stroke-linecap="round"
        stroke-dasharray="${r1(lleno)} ${r1(c)}" transform="rotate(-90 ${tam / 2} ${tam / 2})"/>` : ""}
      <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" class="anillo-num">${Math.round(pct * 100)}%</text>
    </svg>`;
  }

  // Gasto acumulado del mes: línea real, presupuesto, punto de hoy y previsión discontinua.
  function gastoAcumulado({ acumulado, diasMes, hoyDia, presupuesto, prevision, mesCompleto }) {
    const W = 560, H = 210, iz = 8, de = 8, ar = 14, ab = 24;
    const maxY = Math.max(presupuesto, prevision || 0, acumulado[acumulado.length - 1] || 0) * 1.08;
    const x = (d) => iz + ((d - 1) / (diasMes - 1)) * (W - iz - de);
    const y = (v) => ar + (1 - v / maxY) * (H - ar - ab);
    const pts = acumulado.map((v, i) => `${r1(x(i + 1))},${r1(y(v))}`).join(" ");
    const area = `${r1(x(1))},${r1(y(0))} ${pts} ${r1(x(acumulado.length))},${r1(y(0))}`;
    const pasado = (acumulado[acumulado.length - 1] || 0) > presupuesto;
    let extra = "";
    if (!mesCompleto) {
      const vh = acumulado[hoyDia - 1] || 0;
      extra += `<line x1="${r1(x(hoyDia))}" y1="${r1(y(vh))}" x2="${r1(x(diasMes))}" y2="${r1(y(prevision))}" stroke="var(--tinta-suave)" stroke-width="2" stroke-dasharray="5 5"/>`;
      extra += `<circle cx="${r1(x(hoyDia))}" cy="${r1(y(vh))}" r="5.5" fill="var(--acento)" stroke="var(--tarjeta)" stroke-width="2.5"/>`;
      const tx = Math.min(Math.max(x(hoyDia), 30), W - 30);
      extra += `<text x="${r1(tx)}" y="${H - 6}" text-anchor="middle" class="eje eje-fuerte">Hoy</text>`;
    }
    const marcas = [1, 10, 20, diasMes].map((d) => `<text x="${r1(x(d))}" y="${H - 6}" text-anchor="${d === 1 ? "start" : d === diasMes ? "end" : "middle"}" class="eje">${d}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" aria-label="Gasto acumulado del mes frente al presupuesto">
      <line x1="${iz}" x2="${W - de}" y1="${r1(y(presupuesto))}" y2="${r1(y(presupuesto))}" stroke="var(--rojo)" stroke-width="1.5" stroke-dasharray="2 4"/>
      <text x="${W - de}" y="${r1(y(presupuesto)) - 6}" text-anchor="end" class="eje">Presupuesto ${PV.fmt.dineroCorto(presupuesto)}</text>
      <polygon points="${area}" fill="${pasado ? "var(--rojo-suave)" : "var(--acento-suave)"}" opacity=".7"/>
      <polyline points="${pts}" fill="none" stroke="${pasado ? "var(--rojo)" : "var(--acento)"}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
      ${extra}${marcas}
    </svg>`;
  }

  // Barras de sueño de las últimas noches, con línea del objetivo.
  function barrasSueno(noches, objetivo) {
    const W = 560, H = 170, ab = 22, ar = 10;
    const n = noches.length, hueco = 6, ancho = (W - hueco * (n - 1)) / n;
    const maxV = Math.max(objetivo, ...noches.map((d) => d.min || 0)) * 1.1;
    const y = (v) => ar + (1 - v / maxV) * (H - ar - ab);
    const barras = noches.map((d, i) => {
      const xx = i * (ancho + hueco);
      if (!d.min) return `<rect x="${r1(xx)}" y="${H - ab - 3}" width="${r1(ancho)}" height="3" rx="1.5" fill="var(--linea)"/>`;
      const yy = y(d.min);
      return `<rect x="${r1(xx)}" y="${r1(yy)}" width="${r1(ancho)}" height="${r1(H - ab - yy)}" rx="4" fill="${d.entreno ? "var(--verde)" : "var(--azul-suave-fuerte)"}"><title>${d.etiqueta}: ${PV.fmt.horas(d.min)}${d.entreno ? " · con entreno" : ""}</title></rect>
        <text x="${r1(xx + ancho / 2)}" y="${H - 6}" text-anchor="middle" class="eje">${d.letra}</text>`;
    }).join("");
    return `<svg viewBox="0 0 ${W} ${H}" class="graf" role="img" aria-label="Horas de sueño de las últimas ${n} noches">
      ${barras}
      <line x1="0" x2="${W}" y1="${r1(y(objetivo))}" y2="${r1(y(objetivo))}" stroke="var(--tinta)" stroke-width="1.5" stroke-dasharray="4 4" opacity=".55"/>
    </svg>`;
  }

  // Portada dibujada del libro.
  function portada(titulo, autor, color) {
    return `<svg viewBox="0 0 90 130" class="portada" role="img" aria-label="Portada de ${titulo}">
      <rect x="0" y="0" width="90" height="130" rx="6" fill="var(--${color})"/>
      <rect x="0" y="0" width="7" height="130" rx="3" fill="#000" opacity=".18"/>
      <circle cx="62" cy="34" r="16" fill="#fff" opacity=".22"/>
      <rect x="16" y="70" width="58" height="3" rx="1.5" fill="#fff" opacity=".7"/>
      <rect x="16" y="78" width="44" height="3" rx="1.5" fill="#fff" opacity=".7"/>
      <rect x="16" y="108" width="34" height="2.5" rx="1.25" fill="#fff" opacity=".55"/>
    </svg>`;
  }

  PV.graficos = { anillo, gastoAcumulado, barrasSueno, portada };
})();
