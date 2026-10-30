/* Lugares imperdibles: lee lago/procesado/lugares_imperdibles.json, filtra y abre la ficha del lugar. */

const TIPOS = { icono: "Ícono", museo: "Museo", mercado: "Mercado", mirador: "Mirador" };
const FILTROS = [
  { tipo: "top", texto: "Top turísticos", icono: "llama" },
  { tipo: "todos", texto: "Todos" },
  { tipo: "icono", texto: "Íconos y Gaudí", icono: "icono" },
  { tipo: "museo", texto: "Museos", icono: "museo" },
  { tipo: "mercado", texto: "Mercados", icono: "mercado" },
  { tipo: "mirador", texto: "Miradores", icono: "mirador" },
];
const estado = { tipo: "top", distrito: "", texto: "", orden: "popular" };
let lugares = [];
let fuentes = {};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/* ---------- Iconos ---------- */
const TRAZOS = {
  llama: '<path d="M12 22c4 0 7-2.7 7-7 0-3.5-2.2-5.6-3.6-7.6-.4 1.8-1.4 3-2.6 3.4.4-3.3-.8-6.6-3.8-8.8.2 3.4-1.6 5.6-3.2 7.5C4.6 11.1 5 12.6 5 15c0 4.3 3 7 7 7z" fill="currentColor" stroke="none"/>',
  icono: '<path d="M4 21h16M6 21V10l6-6 6 6v11"/><path d="M10 21v-5a2 2 0 0 1 4 0v5"/><path d="M12 4V2"/>',
  museo: '<path d="M3 9.5L12 4l9 5.5M4 21h16M6 10v8M10 10v8M14 10v8M18 10v8M4 18h16"/>',
  mercado: '<path d="M3.5 10h17l-2.2 9.5H5.7z"/><path d="M8 10l4-6 4 6"/>',
  mirador: '<path d="M2 20l7-10 4 6 3-4 6 8z"/><circle cx="17" cy="6" r="2.2"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  ruta: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H15a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h6.5"/>',
  estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/>',
  libro: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21a2 2 0 0 1 2-2h13"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  tel: '<path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[k]}</svg>`;
const COLOR_TIPO = { icono: "var(--tipo-icono)", museo: "var(--tipo-museo)", mercado: "var(--tipo-mercado)", mirador: "var(--tipo-mirador)" };

/* ---------- Popularidad: de 1 a 5 llamas según el puesto en el ranking ---------- */
let totalRanking = 1;
function nivel(l) {
  if (!l.ranking) return 0;
  const p = l.ranking / totalRanking;
  return p <= .1 ? 5 : p <= .25 ? 4 : p <= .5 ? 3 : p <= .75 ? 2 : 1;
}
const ETIQUETA_NIVEL = ["Poco conocido", "Joya escondida", "Conocido", "Popular", "Muy popular", "Imprescindible"];
function llamas(l) {
  const n = nivel(l);
  return `<span class="llamas" title="${ETIQUETA_NIVEL[n]}" aria-label="${ETIQUETA_NIVEL[n]}">${
    Array.from({ length: 5 }, (_, i) => `<span class="${i < n ? "" : "apagada"}">${svg("llama")}</span>`).join("")}</span>`;
}

/* ---------- Lista ---------- */
function filtrados() {
  const t = normal(estado.texto);
  const lista = lugares.filter((l) =>
    (estado.tipo === "todos" || (estado.tipo === "top" ? l.top : l.tipo === estado.tipo)) &&
    (!estado.distrito || l.distrito === estado.distrito) &&
    (!t || normal(`${l.nombre} ${l.nombre_fuente} ${l.barrio} ${l.distrito} ${l.descripcion} ${l.resumen}`).includes(t)));
  return lista.sort(estado.orden === "nombre"
    ? (a, b) => a.nombre.localeCompare(b.nombre, "es")
    : (a, b) => (a.ranking ?? 1e9) - (b.ranking ?? 1e9) || a.nombre.localeCompare(b.nombre, "es"));
}

function fotoTarjeta(l) {
  return l.foto
    ? `<img src="${esc(l.foto.url)}" alt="" loading="lazy">`
    : `<div class="lugar__sin-foto"><span style="color:${COLOR_TIPO[l.tipo]}">${svg(l.tipo)}</span></div>`;
}

function pintar() {
  const lista = filtrados();
  document.getElementById("contador").textContent = `${lista.length} lugares`;
  document.getElementById("lugares").innerHTML = lista.length
    ? lista.map((l) => `
      <button class="lugar" type="button" data-id="${esc(l.id)}">
        <div class="lugar__foto">
          ${fotoTarjeta(l)}
          <span class="etiqueta etiqueta--${l.tipo}">${TIPOS[l.tipo]}</span>
          ${l.top ? `<span class="lugar__rank">${svg("llama")} Top ${l.ranking}</span>` : ""}
        </div>
        <div class="lugar__texto">
          <h3>${esc(l.nombre)}</h3>
          <p class="lugar__zona">${svg("pin")} ${esc(l.barrio)}</p>
          ${l.descripcion ? `<p class="lugar__desc">${esc(l.descripcion.charAt(0).toUpperCase() + l.descripcion.slice(1))}</p>` : ""}
          <div class="lugar__pie">${llamas(l)}<span class="lugar__ver">Ver más →</span></div>
        </div>
      </button>`).join("")
    : `<p class="aviso">No hay lugares con esos filtros. Prueba con «Todos» o borra la búsqueda.</p>`;
}

function pintarChips() {
  const cuenta = (tipo) => tipo === "todos" ? lugares.length
    : lugares.filter((l) => tipo === "top" ? l.top : l.tipo === tipo).length;
  document.getElementById("chips").innerHTML = FILTROS.map((f) => `
    <button class="chip${f.tipo === "top" ? " chip--top" : ""}" type="button" data-tipo="${f.tipo}" aria-pressed="${f.tipo === estado.tipo}">
      ${f.icono ? svg(f.icono) : ""}${f.texto} <small>${cuenta(f.tipo)}</small>
    </button>`).join("");
}

/* ---------- Ficha ---------- */
const enlaceMapa = (l) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.nombre_fuente || l.nombre}, Barcelona`)}`;
const enlaceRuta = (l) => `https://www.google.com/maps/dir/?api=1&destination=${l.lat},${l.lon}`;

function abrirFicha(id) {
  const l = lugares.find((x) => x.id === id);
  if (!l) return;
  const f = fuentes[l.fuente];
  const w = fuentes.wikipedia;
  const desc = l.descripcion ? l.descripcion.charAt(0).toUpperCase() + l.descripcion.slice(1) : `${TIPOS[l.tipo]} en ${l.barrio}`;

  const datos = [
    `<span class="dato-rapido">${svg("pin")}${esc(l.barrio)} · ${esc(l.distrito)}</span>`,
    l.ranking ? `<span class="dato-rapido">${svg("llama")}${ETIQUETA_NIVEL[nivel(l)]} · puesto ${l.ranking} de ${totalRanking}</span>` : "",
    l.horario.length ? `<span class="dato-rapido">${svg("reloj")}Tiene horario publicado</span>` : "",
    l.telefono ? `<span class="dato-rapido">${svg("tel")}${esc(l.telefono)}</span>` : "",
  ].join("");

  const resumen = l.resumen
    ? `<p class="ficha__resumen">${esc(l.resumen)}</p>`
    : `<p class="ficha__resumen">Uno de los ${l.tipo === "mirador" ? "miradores oficiales" : "lugares"} de Barcelona en ${esc(l.barrio)}. Mira las fotos y opiniones de otros viajeros en Google Maps.</p>`;

  const horario = l.horario.length ? `
    <details>
      <summary>Horario y precios</summary>
      <ul class="ficha__horario">${l.horario.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>
      <span class="fuente-dato">Texto original de la fuente (en catalán). Confírmalo antes de ir.</span>
    </details>` : "";

  const credito = l.foto
    ? `<span class="ficha__credito">Foto: <a href="${esc(l.foto.pagina)}" target="_blank" rel="noopener">${esc(l.foto.autor)}</a> · ${esc(l.foto.licencia)}</span>` : "";

  document.getElementById("ficha-cuerpo").innerHTML = `
    <div class="ficha__portada">
      ${l.foto ? `<img src="${esc(l.foto.url)}" alt="${esc(l.nombre)}">` : ""}
      <div class="ficha__titulo">
        <span class="etiqueta etiqueta--${l.tipo}">${TIPOS[l.tipo]}</span>
        <h2>${esc(l.nombre)}</h2>
        <p>${esc(desc)}</p>
      </div>
      ${credito}
    </div>
    <div class="ficha__cuerpo">
      <div class="ficha__datos">${datos}</div>
      ${resumen}
      <div class="ficha__acciones">
        <a class="boton" href="${enlaceRuta(l)}" target="_blank" rel="noopener">${svg("ruta")}Cómo llegar</a>
        <a class="boton boton--secundario" href="${enlaceMapa(l)}" target="_blank" rel="noopener">${svg("estrella")}Opiniones en Google Maps</a>
        ${l.wikipedia ? `<a class="boton boton--secundario" href="${esc(l.wikipedia)}" target="_blank" rel="noopener">${svg("libro")}Leer más</a>` : ""}
      </div>
      ${horario}
      <details>
        <summary>De dónde salen estos datos</summary>
        <dl>
          ${f.id ? `<dt>ID de fuente</dt><dd>${esc(f.id)}</dd>` : ""}
          <dt>Fuente del lugar</dt><dd>${esc(f.nombre)} · ${esc(f.publicador)} (${esc(f.licencia)})</dd>
          <dt>Nombre en la fuente</dt><dd>${esc(l.nombre_fuente)}</dd>
          <dt>ID del registro</dt><dd>${esc(l.id)}</dd>
          ${l.direccion ? `<dt>Dirección</dt><dd>${esc(l.direccion)}</dd>` : ""}
          <dt>Coordenadas</dt><dd>${l.lat}, ${l.lon}</dd>
          <dt>Actualizado</dt><dd>${esc(l.actualizado_en_fuente || "—")}</dd>
          <dt>Archivo en el lago</dt><dd><a href="${esc(f.archivo)}" target="_blank" rel="noopener">${esc(f.archivo)}</a></dd>
          ${l.fuente !== "wikipedia" && (l.foto || l.resumen) ? `<dt>Foto, resumen y popularidad</dt><dd>${esc(w.nombre)} (${esc(w.licencia)}) · <a href="${esc(w.archivo)}" target="_blank" rel="noopener">${esc(w.archivo)}</a></dd>` : ""}
          ${l.ranking ? `<dt>¿Cómo se mide la popularidad?</dt><dd>Visitas a su artículo de Wikipedia (español + inglés) en los últimos 12 meses: ${l.popularidad.toLocaleString("es-ES")}.</dd>` : ""}
        </dl>
      </details>
    </div>`;
  const ficha = document.getElementById("ficha");
  if (!ficha.open) ficha.showModal();
  ficha.scrollTop = 0;
  history.replaceState(null, "", `#lugar-${encodeURIComponent(l.id)}`);
}

function abrirDesdeEnlace() {
  if (location.hash.startsWith("#lugar-")) abrirFicha(decodeURIComponent(location.hash.slice(7)));
}

async function iniciar() {
  try {
    const j = await (await fetch("lago/procesado/lugares_imperdibles.json")).json();
    lugares = j.lugares;
    fuentes = j.fuentes;
    totalRanking = Math.max(1, ...lugares.map((l) => l.ranking || 0));
    const fondo = (j.fondos || []).find((f) => f.archivo.endsWith("park-guell.jpg"));
    if (fondo) {
      document.getElementById("banner-credito").innerHTML =
        `Foto: <a href="${esc(fondo.pagina)}" target="_blank" rel="noopener">${esc(fondo.autor)}</a> · ${esc(fondo.licencia)}`;
    }
  } catch (e) {
    document.getElementById("lugares").innerHTML = `<p class="aviso">No se pudieron cargar los lugares.</p>`;
    return;
  }

  const distritos = [...new Set(lugares.map((l) => l.distrito))].sort((a, b) => a.localeCompare(b, "es"));
  document.getElementById("filtro-distrito").insertAdjacentHTML("beforeend",
    distritos.map((d) => `<option>${esc(d)}</option>`).join(""));

  pintarChips();
  document.getElementById("chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    estado.tipo = chip.dataset.tipo;
    document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === chip));
    pintar();
  });
  document.getElementById("filtro-distrito").addEventListener("change", (e) => { estado.distrito = e.target.value; pintar(); });
  document.getElementById("orden").addEventListener("change", (e) => { estado.orden = e.target.value; pintar(); });
  document.getElementById("filtro-texto").addEventListener("input", (e) => {
    estado.texto = e.target.value;
    // Al buscar se busca en todos los lugares, no solo en el filtro elegido
    if (estado.texto && estado.tipo === "top") document.querySelector('.chip[data-tipo="todos"]').click();
    else pintar();
  });
  document.getElementById("lugares").addEventListener("click", (e) => {
    const card = e.target.closest(".lugar");
    if (card) abrirFicha(card.dataset.id);
  });

  const ficha = document.getElementById("ficha");
  ficha.querySelector(".ficha__cerrar").addEventListener("click", () => ficha.close());
  ficha.addEventListener("click", (e) => { if (e.target === ficha) ficha.close(); });
  ficha.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
  addEventListener("hashchange", abrirDesdeEnlace);

  pintar();
  abrirDesdeEnlace();
}
iniciar();
