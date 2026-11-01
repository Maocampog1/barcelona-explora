/* Alojamiento: lee lago/procesado/alojamiento.json. Hoteles, HUT y Airbnb con precio y zona;
   el anfitrión de Airbnb no se copia a este archivo (ver ingesta/procesar_mapa_y_alojamiento.py). */

const TIPOS = { hotel: "Hotel", hut: "Vivienda turística (HUT)", airbnb: "Airbnb" };
const FILTROS = [
  { tipo: "todos", texto: "Todos" },
  { tipo: "hotel", texto: "Hoteles" },
  { tipo: "hut", texto: "Viviendas turísticas (HUT)" },
  { tipo: "airbnb", texto: "Airbnb" },
];
const COLOR_TIPO = { hotel: "var(--tipo-mirador)", hut: "var(--tipo-mercado)", airbnb: "var(--tipo-icono)" };
const estado = { tipo: "todos", distrito: "", texto: "", orden: "precio-asc" };
let alojamientos = [];
let fuentes = {};
let rentaBarrios = [];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const TRAZOS = {
  hotel: '<path d="M3 21V9l9-6 9 6v12M8 21v-7h8v7"/>',
  hut: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  airbnb: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[k]}</svg>`;

function filtrados() {
  const t = normal(estado.texto);
  const lista = alojamientos.filter((a) =>
    (estado.tipo === "todos" || a.tipo === estado.tipo) &&
    (!estado.distrito || a.distrito === estado.distrito) &&
    (!t || normal(`${a.nombre} ${a.barrio} ${a.distrito}`).includes(t)) &&
    a.precio_noche_usd != null);
  return lista.sort(estado.orden === "precio-desc"
    ? (a, b) => b.precio_noche_usd - a.precio_noche_usd
    : (a, b) => a.precio_noche_usd - b.precio_noche_usd);
}

function pintarResumen(resumen) {
  document.getElementById("resumen").innerHTML = `
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.total.toLocaleString("es-ES")}</strong><span>Alojamientos en el lago</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.precio_mediana_usd.toFixed(0)} USD</strong><span>Precio mediano por noche</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.por_tipo.hotel}</strong><span>Hoteles</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.por_tipo.hut.toLocaleString("es-ES")}</strong><span>Viviendas turísticas (HUT)</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.por_tipo.airbnb.toLocaleString("es-ES")}</strong><span>Airbnb con precio publicado</span></div>`;
}

function pintarChips() {
  const cuenta = (tipo) => tipo === "todos" ? alojamientos.length : alojamientos.filter((a) => a.tipo === tipo).length;
  document.getElementById("chips").innerHTML = FILTROS.map((f) => `
    <button class="chip" type="button" data-tipo="${f.tipo}" aria-pressed="${f.tipo === estado.tipo}">
      ${f.texto} <small>${cuenta(f.tipo)}</small></button>`).join("");
}

function pintar() {
  const lista = filtrados();
  document.getElementById("contador").textContent = `${lista.length.toLocaleString("es-ES")} alojamientos`;
  document.getElementById("alojamientos").innerHTML = lista.length
    ? lista.slice(0, 300).map((a) => `
      <button class="lugar" type="button" data-id="${esc(a.id)}">
        <div class="lugar__foto">
          <div class="lugar__sin-foto"><span style="color:${COLOR_TIPO[a.tipo]}">${svg(a.tipo)}</span></div>
          <span class="etiqueta">${TIPOS[a.tipo]}</span>
          <span class="lugar__rank">${a.precio_noche_usd.toFixed(0)} USD/noche</span>
        </div>
        <div class="lugar__texto">
          <h3>${esc(a.nombre)}</h3>
          <p class="lugar__zona">${svg("pin")} ${esc(a.barrio)} · ${esc(a.distrito)}</p>
          <div class="lugar__pie"><span class="lugar__ver">Ver ficha →</span></div>
        </div>
      </button>`).join("")
    : `<p class="aviso">No hay alojamientos con esos filtros.</p>`;
  if (lista.length > 300) document.getElementById("contador").textContent += " (mostrando los primeros 300)";
}

function abrirFicha(id) {
  const a = alojamientos.find((x) => x.id === id);
  if (!a) return;
  const f = fuentes[a.fuente];
  const datos = [
    `<span class="dato-rapido">${svg("pin")}${esc(a.barrio)} · ${esc(a.distrito)}</span>`,
    a.capacidad ? `<span class="dato-rapido">${a.capacidad} personas</span>` : "",
    a.calificacion ? `<span class="dato-rapido">${svg("estrella")}${a.calificacion.toFixed(1)} (${a.reseñas} reseñas)</span>` : "",
  ].join("");

  let detalle = "";
  if (a.tipo === "airbnb") {
    detalle = `
      <dt>Tipo de propiedad</dt><dd>${esc(a.tipo_propiedad)} · ${esc(a.tipo_habitacion)}</dd>
      <dt>Habitaciones</dt><dd>${a.habitaciones ?? "—"}</dd>
      <dt>Mínimo de noches</dt><dd>${a.min_noches ?? "—"}</dd>
      <dt>Licencia turística</dt><dd>${esc(a.licencia_hutb || "No publicada en el anuncio")}</dd>
      <dt>Anfitrión</dt><dd>No se muestra: es un dato personal. Solo se sabe si administra varios anuncios (${a.anuncios_del_mismo_anfitrion ?? "—"}) y si Airbnb lo marca como "superhost" (${a.superhost_anonimo ? "sí" : "no"}), sin nombre ni identificador.</dd>
      <dt>Fecha de prueba</dt><dd>${esc(a.actualizado_en_fuente || "—")}</dd>`;
  } else if (a.tipo === "hut") {
    detalle = `<dt>Licencia turística (HUTB)</dt><dd>${esc(a.licencia_hutb)}</dd>
      <dt>Plazas</dt><dd>${a.plazas ?? "—"}</dd>
      <dt>Dirección</dt><dd>${esc(a.direccion || "—")}</dd>`;
  } else {
    detalle = `<dt>Categoría</dt><dd>${esc(a.categoria)}</dd>`;
  }

  document.getElementById("ficha-cuerpo").innerHTML = `
    <span class="etiqueta">${TIPOS[a.tipo]}</span>
    <h2>${esc(a.nombre)}</h2>
    <div class="ficha__datos">${datos}</div>
    <p class="ficha__resumen"><strong>${a.precio_noche_usd.toFixed(0)} USD por noche.</strong> Precio publicado en la fuente, en dólares estadounidenses.</p>
    <details open>
      <summary>De dónde salen estos datos</summary>
      <dl>
        ${detalle}
        ${f ? `<dt>Fuente</dt><dd>${esc(f.nombre)} · ${esc(f.publicador)} (${esc(f.licencia)})</dd>
        <dt>Archivo en el lago</dt><dd><a href="${esc(f.archivo)}" target="_blank" rel="noopener">${esc(f.archivo)}</a></dd>` : ""}
        <dt>ID del registro</dt><dd>${esc(a.id)}</dd>
      </dl>
    </details>`;
  const ficha = document.getElementById("ficha");
  if (!ficha.open) ficha.showModal();
  history.replaceState(null, "", `#alojamiento-${encodeURIComponent(a.id)}`);
}

function abrirDesdeEnlace() {
  if (location.hash.startsWith("#alojamiento-")) abrirFicha(decodeURIComponent(location.hash.slice(13)));
}

function pintarRenta() {
  const orden = [...rentaBarrios].sort((a, b) => a.barrio.localeCompare(b.barrio, "es"));
  document.getElementById("renta-tabla-wrap").innerHTML = `
    <table class="renta-tabla">
      <thead><tr><th>Barrio</th><th>Distrito</th><th>Renta media (€/persona/año)</th></tr></thead>
      <tbody>${orden.map((r) => `<tr><td>${esc(r.barrio)}</td><td>${esc(r.distrito)}</td><td>${r.renta_media_euros.toLocaleString("es-ES")}</td></tr>`).join("")}</tbody>
    </table>
    <p class="fuente-dato">${esc(rentaBarrios[0]?.nota || "")}</p>`;
}

async function iniciar() {
  try {
    const j = await (await fetch("lago/procesado/alojamiento.json")).json();
    alojamientos = j.alojamientos;
    fuentes = j.fuentes;
    rentaBarrios = j.renta_barrios;
    pintarResumen(j.resumen);
    pintarRenta();
  } catch (e) {
    document.getElementById("alojamientos").innerHTML = `<p class="aviso">No se pudieron cargar los datos de alojamiento.</p>`;
    return;
  }

  const distritos = [...new Set(alojamientos.map((a) => a.distrito).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  document.getElementById("filtro-distrito").insertAdjacentHTML("beforeend",
    distritos.map((d) => `<option>${esc(d)}</option>`).join(""));

  pintarChips();
  document.getElementById("chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    estado.tipo = chip.dataset.tipo;
    document.querySelectorAll("#chips .chip").forEach((c) => c.setAttribute("aria-pressed", c === chip));
    pintar();
  });
  document.getElementById("filtro-distrito").addEventListener("change", (e) => { estado.distrito = e.target.value; pintar(); });
  document.getElementById("orden").addEventListener("change", (e) => { estado.orden = e.target.value; pintar(); });
  document.getElementById("filtro-texto").addEventListener("input", (e) => { estado.texto = e.target.value; pintar(); });
  document.getElementById("alojamientos").addEventListener("click", (e) => {
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
