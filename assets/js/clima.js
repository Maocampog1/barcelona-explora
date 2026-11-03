/* Clima y ambiente:
   - Pronóstico por hora EN VIVO desde Open-Meteo (gratis, sin clave), igual que la portada.
   - Calidad del aire de las estaciones de Barcelona (dato BATCH del lago, con su fecha).
   - Arbolado urbano como contexto agregado (dato BATCH del lago).
   Cada bloque muestra su fuente, licencia y fecha, y las aproximaciones van etiquetadas. */

const ZONA = "Europe/Madrid";
const BCN = { lat: 41.3874, lon: 2.1686 }; // Plaça de Catalunya

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Iconos y texto del clima (mismo criterio que portada.js) ---------- */
function describirClima(codigo) {
  if (codigo === 0) return ["Despejado", "sol"];
  if (codigo <= 2) return ["Parcialmente nublado", "solnube"];
  if (codigo === 3) return ["Nublado", "nube"];
  if (codigo === 45 || codigo === 48) return ["Niebla", "nube"];
  if (codigo >= 51 && codigo <= 57) return ["Llovizna", "lluvia"];
  if (codigo >= 61 && codigo <= 67) return ["Lluvia", "lluvia"];
  if (codigo >= 71 && codigo <= 77) return ["Nieve", "nube"];
  if (codigo >= 80 && codigo <= 82) return ["Chubascos", "lluvia"];
  if (codigo >= 95) return ["Tormenta", "tormenta"];
  return ["—", "nube"];
}

const ICONOS_CLIMA = {
  sol: (dia) => dia
    ? `<circle cx="32" cy="32" r="12" fill="#f4b942"/><g stroke="#f4b942" stroke-width="4" stroke-linecap="round">
       <path d="M32 6v8M32 50v8M6 32h8M50 32h8M13.6 13.6l5.7 5.7M44.7 44.7l5.7 5.7M13.6 50.4l5.7-5.7M44.7 19.3l5.7-5.7"/></g>`
    : `<path d="M40 12a20 20 0 1 0 12 32A16 16 0 0 1 40 12z" fill="#dbe4f0"/>`,
  nube: () => `<path d="M18 46h28a10 10 0 0 0 0-20 14 14 0 0 0-27 3 9 9 0 0 0-1 17z" fill="#e6ecf2"/>`,
  solnube: (dia) => `${dia ? '<circle cx="24" cy="22" r="10" fill="#f4b942"/>' : '<path d="M30 8a14 14 0 1 0 8 22A11 11 0 0 1 30 8z" fill="#dbe4f0"/>'}
       <path d="M20 50h26a9 9 0 0 0 0-18 13 13 0 0 0-25 3 8 8 0 0 0-1 15z" fill="#f1f4f8"/>`,
  lluvia: () => `<path d="M18 38h28a10 10 0 0 0 0-20 14 14 0 0 0-27 3 9 9 0 0 0-1 17z" fill="#d5dde6"/>
       <g stroke="#7cc6f0" stroke-width="3" stroke-linecap="round"><path d="M22 44l-3 8M32 44l-3 8M42 44l-3 8"/></g>`,
  tormenta: () => `<path d="M18 38h28a10 10 0 0 0 0-20 14 14 0 0 0-27 3 9 9 0 0 0-1 17z" fill="#b9c4d0"/>
       <path d="M34 40l-8 12h7l-3 9 10-14h-7l3-7z" fill="#f4b942"/>`,
};

const filaFuente = (f) => f ? `
  ${filasTrazabilidad(f)}
  <dt>Fuente</dt><dd>${esc(f.nombre)} · ${esc(f.publicador)} (${esc(f.licencia)})</dd>
  <dt>Archivo en el lago</dt><dd><a href="${esc(f.archivo)}" target="_blank" rel="noopener">${esc(f.archivo)}</a></dd>` : "";

/* ---------- Pronóstico por hora (en vivo) ---------- */
const fmtHora = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" });
const fmtDia = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, weekday: "short" });

async function cargarPronostico() {
  const caja = document.getElementById("pron-horas");
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${BCN.lat}&longitude=${BCN.lon}`
    + "&hourly=temperature_2m,precipitation,weather_code,is_day"
    + `&timezone=${encodeURIComponent(ZONA)}&forecast_days=2`;
  try {
    const d = await (await fetch(url)).json();
    const h = d.hourly;
    const ahora = Date.now();
    // Empezamos en la hora actual y mostramos las próximas 24 horas.
    let inicio = h.time.findIndex((t) => new Date(t).getTime() >= ahora - 3600e3);
    if (inicio < 0) inicio = 0;
    const horas = [];
    for (let i = inicio; i < Math.min(inicio + 24, h.time.length); i++) {
      const [estado, icono] = describirClima(h.weather_code[i]);
      const fecha = new Date(h.time[i]);
      horas.push({
        hora: fmtHora.format(fecha),
        dia: fmtDia.format(fecha),
        temp: Math.round(h.temperature_2m[i]),
        lluvia: h.precipitation[i],
        estado, icono,
        dia_noche: h.is_day[i] === 1,
      });
    }
    caja.innerHTML = horas.map((x, i) => `
      <div class="pron-hora">
        <span class="pron-hora__hora">${i === 0 ? "Ahora" : esc(x.hora)}</span>
        <svg class="pron-hora__icono" viewBox="0 0 64 64" aria-label="${esc(x.estado)}">${ICONOS_CLIMA[x.icono](x.dia_noche)}</svg>
        <span class="pron-hora__temp">${x.temp}°</span>
        <span class="pron-hora__lluvia ${x.lluvia > 0 ? "activa" : ""}">${x.lluvia > 0 ? `${x.lluvia.toFixed(1)} mm` : "—"}</span>
      </div>`).join("");

    document.getElementById("pron-fuente").innerHTML = `
      ${filasTrazabilidad({ id: "F21", vigencia: "Pronóstico por horas · Actualización: tiempo real", fecha_prueba: "2026-10-01" })}
      <dt>Fuente</dt><dd><a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · API de pronóstico (gratis, sin clave)</dd>
      <dt>En vivo</dt><dd>Sí: se pide al abrir la página. Es un pronóstico, no una medición.</dd>
      <dt>Punto</dt><dd>Centro de Barcelona (${BCN.lat}, ${BCN.lon})</dd>`;
  } catch (e) {
    caja.innerHTML = `<p class="aviso">No se pudo cargar el pronóstico ahora. Revisa tu conexión.</p>`;
    document.getElementById("pron-vivo").textContent = "Sin conexión";
  }
}

/* ---------- Calidad del aire (batch, del lago) ---------- */
// Color de referencia muy simple según el valor (solo visual, no es el índice oficial).
function tonoAire(contaminante, valor) {
  const umbral = { NO2: [40, 90], O3: [80, 160], PM10: [20, 40], "PM2.5": [10, 25], SO2: [100, 200], CO: [4, 10] };
  const u = umbral[contaminante];
  if (!u) return "var(--oliva)";
  if (valor <= u[0]) return "var(--oliva)";
  if (valor <= u[1]) return "var(--sol)";
  return "var(--terracota)";
}

function pintarAire(aire, fuente) {
  document.getElementById("aire-fecha").textContent = aire.fecha ? `Lectura del ${aire.fecha}` : "Sin fecha";
  const grid = document.getElementById("aire-grid");
  if (!aire.estaciones.length) {
    grid.innerHTML = `<p class="aviso">No hay estaciones de aire en Barcelona en el último registro.</p>`;
  } else {
    grid.innerHTML = aire.estaciones.map((e) => `
      <article class="aire-card">
        <header class="aire-card__cab">
          <h3>${esc(e.nombre.replace(/^Barcelona \(|\)$/g, ""))}</h3>
          <span class="aire-card__tipo">${esc(e.tipo_estacion || "")}</span>
        </header>
        <div class="aire-card__medidas">
          ${e.mediciones.map((m) => `
            <div class="aire-medida" title="${esc(m.descripcion)} · ${esc(m.hora || "")}">
              <span class="aire-medida__punto" style="background:${tonoAire(m.contaminante, m.valor)}"></span>
              <span class="aire-medida__nombre">${esc(m.contaminante)}</span>
              <span class="aire-medida__valor">${m.valor} <small>${esc(m.unidad || "")}</small></span>
            </div>`).join("")}
        </div>
      </article>`).join("");
  }
  document.getElementById("aire-fuente").innerHTML = `
    ${filaFuente(fuente)}
    <dt>Tipo de dato</dt><dd>Batch (último registro disponible), no una lectura en tiempo real.</dd>
    <dt>Fecha de la lectura</dt><dd>${esc(aire.fecha || "—")}</dd>
    <dt>Nota</dt><dd>Los colores son una guía visual simple, no el índice de calidad del aire oficial.</dd>`;
}

/* ---------- Arbolado (contexto) ---------- */
function pintarArbolado(arb, fuente) {
  document.getElementById("arbol-total").textContent = `${arb.total.toLocaleString("es-ES")} árboles (muestra)`;
  const topEspecie = arb.top_especies[0];
  const distritoTop = arb.por_distrito[0];
  document.getElementById("arbol-resumen").innerHTML = `
    <div class="arbol-dato"><strong>${arb.total.toLocaleString("es-ES")}</strong><span>árboles en la muestra</span></div>
    <div class="arbol-dato"><strong>${esc(topEspecie ? topEspecie.especie : "—")}</strong><span>especie más común</span></div>
    <div class="arbol-dato"><strong>${esc(distritoTop ? distritoTop.distrito : "—")}</strong><span>distrito con más árboles</span></div>`;

  document.getElementById("arbol-detalle").innerHTML = `
    <div class="arbol-cols">
      <div>
        <h4>Especies más comunes</h4>
        <ul class="arbol-lista">${arb.top_especies.map((e) =>
          `<li><span>${esc(e.especie)}</span><span>${e.cantidad.toLocaleString("es-ES")}</span></li>`).join("")}</ul>
      </div>
      <div>
        <h4>Por distrito</h4>
        <ul class="arbol-lista">${arb.por_distrito.map((d) =>
          `<li><span>${esc(d.distrito)}</span><span>${d.cantidad.toLocaleString("es-ES")}</span></li>`).join("")}</ul>
      </div>
    </div>`;

  document.getElementById("arbol-fuente").innerHTML = `
    ${filaFuente(fuente)}
    <dt>Tipo de dato</dt><dd>Batch, agregado como contexto. ${esc(arb.nota || "")}</dd>`;
}

/* ---------- Arranque ---------- */
async function iniciar() {
  cargarPronostico(); // en vivo, independiente del lago

  // Crédito de la foto del banner
  try {
    const lug = await fetch("lago/procesado/lugares_imperdibles.json").then((r) => r.json());
    const fondo = (lug.fondos || []).find((f) => f.archivo.endsWith("park-guell.jpg"));
    if (fondo) {
      document.getElementById("banner-credito").innerHTML =
        `Foto: <a href="${esc(fondo.pagina)}" target="_blank" rel="noopener">${esc(fondo.autor)}</a> · ${esc(fondo.licencia)}`;
    }
  } catch (e) { /* opcional */ }

  try {
    const d = await fetch("lago/procesado/clima_ambiente.json").then((r) => r.json());
    pintarAire(d.aire, d.fuentes.aire);
    pintarArbolado(d.arbolado, d.fuentes.arbolado);
  } catch (e) {
    document.getElementById("aire-grid").innerHTML =
      `<p class="aviso">No se pudo cargar la calidad del aire. Revisa que el sitio corra con un servidor local (python -m http.server).</p>`;
    document.getElementById("arbol-resumen").innerHTML =
      `<p class="aviso">No se pudo cargar el arbolado.</p>`;
  }
}
iniciar();
