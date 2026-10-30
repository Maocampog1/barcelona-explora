/* Portada: fotos de fondo, reloj y clima de Barcelona, dato curioso, los más buscados y accesos al sitio. */

const ZONA = "Europe/Madrid";
const BCN = { lat: 41.3874, lon: 2.1686 }; // Plaça de Catalunya

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/* ---------- Reloj de Barcelona (analógico + digital) ---------- */
const fmtHora = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, hour: "2-digit", minute: "2-digit" });
const fmtFecha = new Intl.DateTimeFormat("es-ES", { timeZone: ZONA, weekday: "long", day: "numeric", month: "long" });
const fmtPartes = new Intl.DateTimeFormat("en-GB", { timeZone: ZONA, hour: "numeric", minute: "numeric", second: "numeric", hourCycle: "h23" });

document.getElementById("reloj-marcas").innerHTML = Array.from({ length: 12 }, (_, i) =>
  `<line class="reloj__marca" x1="50" y1="${i % 3 ? 9 : 7}" x2="50" y2="${i % 3 ? 12 : 15}" transform="rotate(${i * 30} 50 50)"/>`).join("");

function saludo(h) {
  if (h >= 6 && h < 13) return "Bon dia · buenos días desde Barcelona";
  if (h >= 13 && h < 20) return "Bona tarda · buenas tardes desde Barcelona";
  return "Bona nit · buenas noches desde Barcelona";
}

function tic() {
  const ahora = new Date();
  const p = Object.fromEntries(fmtPartes.formatToParts(ahora).map((x) => [x.type, +x.value]));
  document.getElementById("aguja-h").setAttribute("transform", `rotate(${(p.hour % 12) * 30 + p.minute / 2} 50 50)`);
  document.getElementById("aguja-m").setAttribute("transform", `rotate(${p.minute * 6 + p.second / 10} 50 50)`);
  document.getElementById("aguja-s").setAttribute("transform", `rotate(${p.second * 6} 50 50)`);
  document.getElementById("hora-bcn").textContent = fmtHora.format(ahora);
  const f = fmtFecha.format(ahora);
  document.getElementById("fecha-bcn").textContent = f.charAt(0).toUpperCase() + f.slice(1);
  document.getElementById("saludo").textContent = saludo(p.hour);
}
tic();
setInterval(tic, 1000);

/* ---------- Clima ---------- */
// Códigos WMO que usa Open-Meteo → texto e icono
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

async function cargarClima() {
  const url = "https://api.open-meteo.com/v1/forecast"
    + `?latitude=${BCN.lat}&longitude=${BCN.lon}`
    + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day"
    + "&daily=temperature_2m_max,temperature_2m_min"
    + `&timezone=${encodeURIComponent(ZONA)}&forecast_days=1`;
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    const c = d.current;
    const [estado, icono] = describirClima(c.weather_code);
    document.getElementById("clima-temp").textContent = `${Math.round(c.temperature_2m)}°`;
    document.getElementById("clima-estado").textContent = estado;
    document.getElementById("clima-sensacion").textContent = `Sensación de ${Math.round(c.apparent_temperature)}°`;
    document.getElementById("clima-minmax").textContent =
      `${Math.round(d.daily.temperature_2m_min[0])}° / ${Math.round(d.daily.temperature_2m_max[0])}°`;
    document.getElementById("clima-humedad").textContent = `${c.relative_humidity_2m} %`;
    document.getElementById("clima-viento").textContent = `${Math.round(c.wind_speed_10m)} km/h`;
    document.getElementById("clima-icono").innerHTML = ICONOS_CLIMA[icono](c.is_day === 1);
    document.getElementById("clima-fuente").innerHTML =
      `Clima: <a href="https://open-meteo.com/" target="_blank" rel="noopener">Open-Meteo</a> · medido a las ${c.time.slice(11, 16)} · se actualiza cada 10 min`;
  } catch (e) {
    document.getElementById("clima-estado").textContent = "No se pudo cargar el clima ahora.";
  }
}
cargarClima();
setInterval(cargarClima, 10 * 60 * 1000);

/* ---------- Fotos de fondo (Gaudí) que van cambiando ---------- */
let fondos = [];
let fondoActual = 0;
let temporizador;

function mostrarFondo(i) {
  fondoActual = i;
  document.querySelectorAll("#fondos img").forEach((img, j) => {
    img.classList.toggle("activa", j === i);
  });
  document.querySelectorAll("#puntos button").forEach((b, j) => b.setAttribute("aria-current", j === i));
  const f = fondos[i];
  document.getElementById("credito").innerHTML =
    `<strong>${esc(f.nombre)}</strong> · Foto: <a href="${esc(f.pagina)}" target="_blank" rel="noopener">${esc(f.autor)}</a> (${esc(f.licencia)})`;
}

function iniciarFondos(lista) {
  fondos = lista;
  if (!fondos.length) return;
  document.getElementById("fondos").innerHTML = fondos.map((f, i) =>
    `<img src="${esc(f.archivo)}" alt="" ${i ? 'loading="lazy"' : ""}>`).join("");
  document.getElementById("puntos").innerHTML = fondos.map((f) =>
    `<button type="button" aria-label="Ver foto de ${esc(f.nombre)}"></button>`).join("");
  document.querySelectorAll("#puntos button").forEach((b, i) => b.addEventListener("click", () => {
    mostrarFondo(i);
    clearInterval(temporizador);
    temporizador = setInterval(() => mostrarFondo((fondoActual + 1) % fondos.length), 7000);
  }));
  mostrarFondo(0);
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    temporizador = setInterval(() => mostrarFondo((fondoActual + 1) % fondos.length), 7000);
  }
}

/* ---------- ¿Sabías que…? ---------- */
const ICONOS_DATO = {
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  mirador: '<path d="M2 20l7-10 4 6 3-4 6 8z"/><circle cx="17" cy="6" r="2.2"/>',
  mercado: '<path d="M3.5 10h17l-2.2 9.5H5.7z"/><path d="M8 10l4-6 4 6M9 13.5v3M12 13.5v3M15 13.5v3"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/>',
  arbol: '<path d="M12 21v-7"/><path d="M12 3a6 6 0 0 0-5.3 8.8A4 4 0 0 0 9 18h6a4 4 0 0 0 2.3-6.2A6 6 0 0 0 12 3z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  bano: '<rect x="3" y="5" width="18" height="14" rx="3"/><text x="12" y="15.2" text-anchor="middle" font-size="7.5" font-weight="700" font-family="DM Sans, sans-serif" fill="currentColor" stroke="none">WC</text>',
  cama: '<path d="M3 19V7M3 15h18v4M21 15v-2.5A3.5 3.5 0 0 0 17.5 9H11v6"/><circle cx="7" cy="11.5" r="2"/>',
};
const icono = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONOS_DATO[k] || ICONOS_DATO.foto}</svg>`;

let datos = [];
let fuentes = {};
let indice = 0;

function mostrarDato(paso = 0) {
  const caja = document.getElementById("sabias");
  caja.classList.add("sabias--cambiando");
  setTimeout(() => {
    indice = (indice + paso + datos.length) % datos.length;
    const d = datos[indice];
    const f = fuentes[d.fuente];
    document.getElementById("dato-icono").innerHTML = icono(d.icono);
    document.getElementById("dato-titulo").textContent = d.titulo;
    document.getElementById("dato-texto").textContent = d.dato;
    document.getElementById("dato-fuente").textContent = `Dato: ${f.publicador}`;
    document.getElementById("dato-contador").textContent = `${indice + 1} / ${datos.length}`;
    caja.classList.remove("sabias--cambiando");
  }, paso ? 220 : 0);
}

async function cargarDatos() {
  try {
    const j = await (await fetch("lago/procesado/datos_curiosos.json")).json();
    datos = j.datos;
    fuentes = j.fuentes;
    indice = Math.floor(Date.now() / 86400000) % datos.length; // un dato distinto cada día
    mostrarDato();
  } catch (e) {
    document.getElementById("dato-texto").textContent = "No se pudo cargar el dato de hoy.";
  }
}
document.getElementById("dato-otro").addEventListener("click", () => datos.length && mostrarDato(1));
document.getElementById("dato-anterior").addEventListener("click", () => datos.length && mostrarDato(-1));
cargarDatos();

/* ---------- Los más buscados + accesos (usan lugares_imperdibles.json) ---------- */
const TIPOS = { icono: "Ícono", mirador: "Mirador", museo: "Museo", mercado: "Mercado" };

// Foto de cada página del sitio: sale de un lugar de lugares_imperdibles.json
const FOTO_PAGINA = {
  "lugares.html": "Sagrada Família",
  "mapa.html": "Búnkers del Carmel",
  "alojamiento.html": "Barrio Gótico",
  "moverte.html": "La Rambla",
  "clima.html": "Playa de la Barceloneta",
  "proyecto.html": "Park Güell",
};

function pintarPaginas(lugares) {
  const foto = (archivo) => lugares.find((l) => l.nombre === FOTO_PAGINA[archivo])?.foto?.url;
  document.getElementById("paginas").innerHTML = PAGINAS.filter((p) => p.archivo !== "index.html").map((p) => {
    const img = foto(p.archivo) ? `<img src="${esc(foto(p.archivo))}" alt="" loading="lazy">` : "";
    const contenido = `${img}
      ${p.lista ? "" : '<span class="etiqueta etiqueta--pronto">Próximamente</span>'}
      <span class="pagina-card__num">${p.num}</span>
      <h3>${p.titulo}</h3><p>${p.descripcion}</p>
      ${p.lista ? '<span class="pagina-card__ir">Entrar →</span>' : ""}`;
    return p.lista
      ? `<a class="pagina-card" href="${p.archivo}">${contenido}</a>`
      : `<div class="pagina-card pagina-card--pendiente" aria-disabled="true">${contenido}</div>`;
  }).join("");
}

function pintarTop(lugares) {
  const top = lugares.filter((l) => l.top && l.foto).sort((a, b) => a.ranking - b.ranking).slice(0, 10);
  document.getElementById("top").innerHTML = top.map((l, i) => `
    <a class="postal" href="lugares.html#lugar-${encodeURIComponent(l.id)}">
      <img src="${esc(l.foto.url)}" alt="${esc(l.nombre)}" loading="lazy">
      <span class="postal__num">${String(i + 1).padStart(2, "0")}</span>
      <div class="postal__info">
        <span class="etiqueta etiqueta--${l.tipo}">${TIPOS[l.tipo]}</span>
        <h3>${esc(l.nombre)}</h3>
        <p>${esc(l.barrio)}</p>
      </div>
    </a>`).join("");
}

async function cargarLugares() {
  try {
    const j = await (await fetch("lago/procesado/lugares_imperdibles.json")).json();
    iniciarFondos(j.fondos || []);
    pintarTop(j.lugares);
    pintarPaginas(j.lugares);
  } catch (e) {
    pintarPaginas([]);
  }
}
cargarLugares();
