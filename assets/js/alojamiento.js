/* Alojamiento: lee lago/procesado/alojamiento.json. Hoteles, HUT y Airbnb con precio, foto y zona;
   el anfitrión de Airbnb no se copia a este archivo (ver ingesta/procesar_mapa_y_alojamiento.py). */

const TIPOS = { hotel: "Hotel", hut: "Vivienda turística (HUT)", airbnb: "Airbnb" };
const FILTROS = [
  { tipo: "todos", texto: "Todos", cumple: () => true },
  { tipo: "hotel", texto: "Hoteles", cumple: (a) => a.tipo === "hotel" },
  { tipo: "hut", texto: "Viviendas turísticas (HUT)", cumple: (a) => a.tipo === "hut" },
  { tipo: "airbnb", texto: "Airbnb", cumple: (a) => a.estancia === "corta" },
  { tipo: "airbnb-larga", texto: "Airbnb de estancia larga", cumple: (a) => a.estancia === "larga" },
];
const COLOR_TIPO = { hotel: "var(--tipo-mirador)", hut: "var(--tipo-mercado)", airbnb: "var(--tipo-icono)" };
const BCN_CENTRO = [2.1700, 41.3870];
const estado = { tipo: "todos", distrito: "", texto: "", orden: "destacados" };
let alojamientos = [];
let fuentes = {};
let fotosBarrios = {};
let rentaBarrios = [];
let mapa = null;
let mapaListo = false;
let mapaFicha = null;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const normal = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const var_ = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
const euros = (n) => `${Math.round(n).toLocaleString("es-ES")} €`;

const TRAZOS = {
  hotel: '<path d="M3 21V9l9-6 9 6v12M8 21v-7h8v7"/>',
  hut: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  airbnb: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  pin: '<path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  estrella: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor" stroke="none"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TRAZOS[k]}</svg>`;

/* "Hotels 4 estr." en la fuente -> "4 estrellas" */
const estrellas = (a) => {
  const n = /(\d)/.exec(a.categoria || "");
  return n ? Number(n[1]) : 0;
};

/* La foto propia del hotel o, si no hay, la de su barrio (la web la rotula como foto de la zona) */
const textoEstrellas = (a) => `${estrellas(a)} ${estrellas(a) === 1 ? "estrella" : "estrellas"}`;
const fotoDe = (a) => a.foto ? { ...a.foto, propia: true } : fotosBarrios[a.barrio] ? { ...fotosBarrios[a.barrio], propia: false } : null;

function etiquetaPrecio(a) {
  if (a.precio_noche_eur != null) return `${euros(a.precio_noche_eur)}/noche`;
  if (a.precio_mes_eur != null) return `${euros(a.precio_mes_eur)}/mes`;
  return "Consultar precio";
}

/* Noche, luego estancia larga, luego lo que no tiene precio publicado */
function clavePrecio(a, signo) {
  if (a.precio_noche_eur != null) return [0, signo * a.precio_noche_eur];
  if (a.precio_mes_eur != null) return [1, signo * a.precio_mes_eur];
  return [2, 0];
}

/* Hoteles (primero los que tienen foto propia y más estrellas), Airbnb con más reseñas, HUT, estancias largas */
function claveDestacados(a) {
  if (a.tipo === "hotel") return [0, (a.foto ? 0 : 10) - estrellas(a)];
  if (a.estancia === "corta") return [1, -(a.reseñas || 0)];
  if (a.tipo === "hut") return [2, 0];
  return [3, -(a.reseñas || 0)];
}

function filtrados() {
  const t = normal(estado.texto);
  const filtro = FILTROS.find((f) => f.tipo === estado.tipo);
  const lista = alojamientos.filter((a) =>
    filtro.cumple(a) &&
    (!estado.distrito || a.distrito === estado.distrito) &&
    (!t || normal(`${a.nombre} ${a.barrio} ${a.distrito}`).includes(t)));
  const clave = estado.orden === "destacados" ? claveDestacados
    : (a) => clavePrecio(a, estado.orden === "precio-desc" ? -1 : 1);
  return lista
    .map((a) => [clave(a), a])
    .sort(([x], [y]) => x[0] - y[0] || x[1] - y[1])
    .map(([, a]) => a);
}

function pintarResumen(resumen) {
  document.getElementById("resumen").innerHTML = `
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.total.toLocaleString("es-ES")}</strong><span>Alojamientos en el lago</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${euros(resumen.precio_mediana_eur)}</strong><span>Precio mediano por noche en Airbnb</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.por_tipo.hotel}</strong><span>Hoteles</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.por_tipo.hut.toLocaleString("es-ES")}</strong><span>Viviendas turísticas (HUT)</span></div>
    <div class="tarjeta resumen-aloj__item"><strong>${resumen.por_tipo.airbnb.toLocaleString("es-ES")}</strong><span>Airbnb con precio publicado</span></div>`;
  document.getElementById("nota-precios").textContent =
    `El precio por noche solo se muestra en anuncios de Airbnb cotizados para 7 noches o menos (${resumen.airbnb_estancia_corta.toLocaleString("es-ES")}). ` +
    `Los ${resumen.airbnb_estancia_larga.toLocaleString("es-ES")} anuncios de estancia larga tienen descuento, así que se muestran por mes. ` +
    `Se descartaron ${resumen.airbnb_descartados} anuncios con precios imposibles. Hoteles y HUT no publican precios en datos abiertos.`;
}

function pintarChips() {
  document.getElementById("chips").innerHTML = FILTROS.map((f) => `
    <button class="chip" type="button" data-tipo="${f.tipo}" aria-pressed="${f.tipo === estado.tipo}">
      ${f.texto} <small>${alojamientos.filter(f.cumple).length.toLocaleString("es-ES")}</small></button>`).join("");
}

function pintarFoto(a) {
  const foto = fotoDe(a);
  if (!foto) return `<div class="lugar__sin-foto"><span style="color:${COLOR_TIPO[a.tipo]}">${svg(a.tipo)}</span></div>`;
  return `<img src="${esc(foto.archivo_local)}" alt="${esc(foto.propia ? a.nombre : `Vista de la zona: ${a.barrio}`)}" loading="lazy">
    ${foto.propia ? "" : `<span class="lugar__nota-foto">Foto de la zona: ${esc(a.barrio)}</span>`}`;
}

function pintar() {
  const lista = filtrados();
  document.getElementById("contador").textContent = `${lista.length.toLocaleString("es-ES")} alojamientos`;
  document.getElementById("alojamientos").innerHTML = lista.length
    ? lista.slice(0, 300).map((a) => `
      <button class="lugar" type="button" data-id="${esc(a.id)}">
        <div class="lugar__foto">
          ${pintarFoto(a)}
          <span class="etiqueta">${TIPOS[a.tipo]}</span>
          <span class="lugar__rank${a.precio_noche_eur == null && a.precio_mes_eur == null ? " lugar__rank--consultar" : ""}">${etiquetaPrecio(a)}</span>
        </div>
        <div class="lugar__texto">
          <h3>${esc(a.nombre)}</h3>
          <p class="lugar__zona">${svg("pin")} ${esc(a.barrio)} · ${esc(a.distrito)}</p>
          ${estrellas(a) ? `<p class="lugar__desc">${textoEstrellas(a)}</p>` : ""}
          <div class="lugar__pie"><span class="lugar__ver">Ver ficha →</span></div>
        </div>
      </button>`).join("")
    : `<p class="aviso">No hay alojamientos con esos filtros.</p>`;
  if (lista.length > 300) document.getElementById("contador").textContent += " (mostrando los primeros 300)";
  pintarMapa(lista);
}

function textoPrecio(a) {
  if (a.precio_noche_eur != null) {
    return `<strong>${euros(a.precio_noche_eur)} por noche.</strong> Precio cotizado por Airbnb para una estancia corta el ${esc(a.actualizado_en_fuente || "día de la descarga")}. Cambia según las fechas.`;
  }
  if (a.precio_mes_eur != null) {
    return `<strong>Unos ${euros(a.precio_mes_eur)} al mes.</strong> Airbnb cotizó este anuncio para una estancia de ${a.noches_cotizadas} noches, así que su precio por noche lleva descuento y no sirve para una estadía corta. Se calculó multiplicándolo por 30.`;
  }
  return `<strong>Precio no publicado.</strong> ${a.tipo === "hotel" ? "Open Data BCN no incluye precios de hoteles" : "El registro oficial de viviendas turísticas no incluye precios"} y aquí no se inventan: consúltalo según tus fechas.`;
}

function accionesExternas(a) {
  // Google Maps URLs: enlaces oficiales que no piden clave ni tarjeta
  const destino = `${a.lat},${a.lon}`;
  const consulta = a.tipo === "hotel" ? `${a.nombre}, Barcelona` : destino;
  const buscar = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(consulta)}`;
  const llegar = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`;
  return `
    <a class="boton" href="${esc(buscar)}" target="_blank" rel="noopener">${a.tipo === "hotel" ? "Ver precios en Google Maps" : "Ver en Google Maps"}</a>
    <a class="boton boton--secundario" href="${esc(llegar)}" target="_blank" rel="noopener">Cómo llegar</a>`;
}

function pintarMapaFicha(a) {
  if (mapaFicha) { mapaFicha.remove(); mapaFicha = null; }
  if (typeof maplibregl === "undefined") return;
  try {
    mapaFicha = new maplibregl.Map({
      container: "ficha-mapa", style: "https://tiles.openfreemap.org/styles/liberty",
      center: [a.lon, a.lat], zoom: 15, attributionControl: { compact: true },
    });
    mapaFicha.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    new maplibregl.Marker({ color: var_("--terracota") }).setLngLat([a.lon, a.lat]).addTo(mapaFicha);
  } catch (err) {
    console.error("Error creando el mapa de la ficha:", err);
    document.getElementById("ficha-mapa").hidden = true;
  }
}

function abrirFicha(id) {
  const a = alojamientos.find((x) => x.id === id);
  if (!a) return;
  const f = fuentes[a.fuente];
  const foto = fotoDe(a);
  const datos = [
    `<span class="dato-rapido">${svg("pin")}${esc(a.barrio)} · ${esc(a.distrito)}</span>`,
    estrellas(a) ? `<span class="dato-rapido">${svg("estrella")}${textoEstrellas(a)}</span>` : "",
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
      <dt>Ubicación</dt><dd>Aproximada: Airbnb no publica la dirección exacta.</dd>
      <dt>Anfitrión</dt><dd>No se muestra: es un dato personal. Solo se sabe si administra varios anuncios (${a.anuncios_del_mismo_anfitrion ?? "—"}) y si Airbnb lo marca como "superhost" (${a.superhost_anonimo ? "sí" : "no"}), sin nombre ni identificador.</dd>
      <dt>Fecha de prueba</dt><dd>${esc(a.actualizado_en_fuente || "—")}</dd>`;
  } else if (a.tipo === "hut") {
    detalle = `<dt>Licencia turística (HUTB)</dt><dd>${esc(a.licencia_hutb)}</dd>
      <dt>Plazas</dt><dd>${a.plazas ?? "—"}</dd>
      <dt>Dirección</dt><dd>${esc(a.direccion || "—")}</dd>`;
  } else {
    detalle = `<dt>Categoría</dt><dd>${estrellas(a) ? textoEstrellas(a) : esc(a.categoria)}</dd>`;
  }

  const creditoFoto = foto ? `<dt>Foto</dt><dd>${foto.propia ? "" : `De la zona (${esc(a.barrio)}), no del alojamiento. `}<a href="${esc(foto.pagina)}" target="_blank" rel="noopener">${esc(foto.autor)}</a> · ${esc(foto.licencia)} · Wikimedia Commons</dd>` : "";

  document.getElementById("ficha-cuerpo").innerHTML = `
    <div class="ficha__portada">
      ${foto ? `<img src="${esc(foto.archivo_local)}" alt="${esc(foto.propia ? a.nombre : `Vista de la zona: ${a.barrio}`)}">` : ""}
      <div class="ficha__titulo">
        <span class="etiqueta">${TIPOS[a.tipo]}</span>
        <h2>${esc(a.nombre)}</h2>
        ${foto && !foto.propia ? `<p>Foto de la zona: ${esc(a.barrio)}</p>` : ""}
      </div>
    </div>
    <div class="ficha__cuerpo">
      <div class="ficha__datos">${datos}</div>
      <p class="ficha__resumen">${textoPrecio(a)}</p>
      <div class="ficha__acciones">${accionesExternas(a)}</div>
      <div class="ficha__mapa" id="ficha-mapa" role="application" aria-label="Ubicación de ${esc(a.nombre)}"></div>
      <details open>
        <summary>De dónde salen estos datos</summary>
        <dl>
          ${detalle}
          ${creditoFoto}
          ${f ? `<dt>Fuente</dt><dd>${esc(f.nombre)} · ${esc(f.publicador)} (${esc(f.licencia)})</dd>
          <dt>Archivo en el lago</dt><dd>${f.archivo_publico === false
            ? `${esc(f.archivo)}. No se publica: el archivo original trae datos de los anfitriones.`
            : `<a href="${esc(f.archivo)}" target="_blank" rel="noopener">${esc(f.archivo)}</a>`}</dd>` : ""}
          <dt>ID del registro</dt><dd>${esc(a.id)}</dd>
        </dl>
      </details>
    </div>`;
  const ficha = document.getElementById("ficha");
  if (!ficha.open) ficha.showModal();
  pintarMapaFicha(a);
  history.replaceState(null, "", `#alojamiento-${encodeURIComponent(a.id)}`);
}

function abrirDesdeEnlace() {
  if (location.hash.startsWith("#alojamiento-")) abrirFicha(decodeURIComponent(location.hash.slice(13)));
}

function puntosMapa(lista) {
  return {
    type: "FeatureCollection",
    features: lista.map((a) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [a.lon, a.lat] },
      properties: { id: a.id, tipo: a.tipo },
    })),
  };
}

function pintarMapa(lista) {
  if (mapaListo) mapa.getSource("alojamientos").setData(puntosMapa(lista));
}

function iniciarMapa() {
  const contenedor = document.getElementById("mapa-alojamiento");
  const avisar = (texto) => { contenedor.innerHTML = `<p class="aviso">${texto}</p>`; };
  if (typeof maplibregl === "undefined") {
    avisar("No se pudo cargar el mapa. La lista de abajo sigue funcionando.");
    return;
  }
  try {
    mapa = new maplibregl.Map({
      container: contenedor, style: "https://tiles.openfreemap.org/styles/liberty",
      center: BCN_CENTRO, zoom: 11.6, attributionControl: { compact: true },
    });
  } catch (err) {
    console.error("Error creando el mapa:", err);
    avisar("No se pudo iniciar el mapa. La lista de abajo sigue funcionando.");
    return;
  }
  mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  const colores = { hotel: var_("--tipo-mirador"), hut: var_("--tipo-mercado"), airbnb: var_("--tipo-icono") };
  document.getElementById("leyenda").innerHTML = Object.keys(TIPOS).map((t) =>
    `<div class="leyenda__item"><span class="leyenda__punto" style="background:${colores[t]}"></span>${TIPOS[t]}</div>`).join("");

  mapa.on("load", () => {
    mapa.addSource("alojamientos", { type: "geojson", data: puntosMapa(filtrados()), cluster: true, clusterMaxZoom: 15, clusterRadius: 44 });
    mapa.addLayer({
      id: "grupos", type: "circle", source: "alojamientos", filter: ["has", "point_count"],
      paint: {
        "circle-color": var_("--mar"), "circle-opacity": .85,
        "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 24],
        "circle-stroke-width": 2, "circle-stroke-color": "#fff",
      },
    });
    mapa.addLayer({
      id: "grupos-numero", type: "symbol", source: "alojamientos", filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12, "text-font": ["Noto Sans Bold"] },
      paint: { "text-color": "#fff" },
    });
    mapa.addLayer({
      id: "puntos", type: "circle", source: "alojamientos", filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": ["match", ["get", "tipo"], "hotel", colores.hotel, "hut", colores.hut, colores.airbnb],
        "circle-radius": 7, "circle-stroke-width": 2, "circle-stroke-color": "#fff",
      },
    });
    mapa.on("click", "grupos", (e) => {
      const f = e.features[0];
      mapa.getSource("alojamientos").getClusterExpansionZoom(f.properties.cluster_id)
        .then((zoom) => mapa.easeTo({ center: f.geometry.coordinates, zoom }));
    });
    mapa.on("click", "puntos", (e) => abrirFicha(String(e.features[0].properties.id)));
    for (const capa of ["grupos", "puntos"]) {
      mapa.on("mouseenter", capa, () => { mapa.getCanvas().style.cursor = "pointer"; });
      mapa.on("mouseleave", capa, () => { mapa.getCanvas().style.cursor = ""; });
    }
    mapaListo = true;
  });
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
    fotosBarrios = j.fotos_barrios;
    rentaBarrios = j.renta_barrios;
    if (j.foto_banner) {
      document.getElementById("banner-credito").innerHTML =
        `Foto: <a href="${esc(j.foto_banner.pagina)}" target="_blank" rel="noopener">${esc(j.foto_banner.autor)}</a> · ${esc(j.foto_banner.licencia)}`;
    }
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
  ficha.addEventListener("close", () => {
    if (mapaFicha) { mapaFicha.remove(); mapaFicha = null; }
    history.replaceState(null, "", location.pathname + location.search);
  });
  addEventListener("hashchange", abrirDesdeEnlace);

  iniciarMapa();
  pintar();
  abrirDesdeEnlace();
}
iniciar();
