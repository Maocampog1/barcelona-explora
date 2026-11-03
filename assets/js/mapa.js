/* Explora el mapa: MapLibre + OpenFreeMap, capas de turismo/restaurantes/Bicing/alojamiento,
   filtro por distrito y distancia en línea recta entre dos puntos. */

const BCN_CENTRO = [2.1734, 41.3851];
const var_ = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Capas del mapa: id interno, texto del chip, color (reusa variables del CSS) y si se agrupan en clústers.
const CAPAS = [
  { id: "turismo", texto: "Turismo", color: "--terracota", cluster: false },
  { id: "restaurantes", texto: "Restaurantes y bares", color: "--oliva", cluster: true },
  { id: "bicing", texto: "Bicing", color: "--turquesa", cluster: false },
  { id: "alojamiento", texto: "Alojamiento", color: "--mar", cluster: true },
];

const TIPOS_TURISMO = { icono: "Ícono", mirador: "Mirador", museo: "Museo", mercado: "Mercado" };
const TIPOS_ALOJAMIENTO = { hotel: "Hotel", hut: "Vivienda turística (HUT)", airbnb: "Airbnb" };

const estado = { capas: new Set(CAPAS.map((c) => c.id)), distrito: "", midiendo: false, puntosMedida: [] };
let mapaDatos = null;
let map = null;

function distanciaM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((lon2 - lon1) * Math.PI) / 180 / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/* ---------- Construir GeoJSON de cada capa a partir de mapa.json ---------- */
function featureCollection(lista, propiedades) {
  return {
    type: "FeatureCollection",
    features: lista.map((item) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.lon, item.lat] },
      properties: propiedades(item),
    })),
  };
}

function datosCapa(id) {
  const c = mapaDatos.capas;
  if (id === "turismo") return featureCollection(c.turismo, (l) => ({ ...l }));
  if (id === "restaurantes") return featureCollection(c.restaurantes, (r) => ({ ...r }));
  if (id === "bicing") return featureCollection(c.bicing.estaciones, (b) => ({
    ...b, snapshot_tomado: c.bicing.snapshot_tomado, nota_proxy: c.bicing.nota,
  }));
  if (id === "alojamiento") return featureCollection(c.alojamiento, (a) => ({ ...a }));
  return { type: "FeatureCollection", features: [] };
}

function filtrarPorDistrito(fc) {
  if (!estado.distrito) return fc;
  return { ...fc, features: fc.features.filter((f) => f.properties.distrito === estado.distrito) };
}

/* ---------- Capas en el mapa (con o sin clúster) ---------- */
function agregarCapa(capa) {
  const color = var_(capa.color);
  const datos = filtrarPorDistrito(datosCapa(capa.id));
  map.addSource(capa.id, {
    type: "geojson",
    data: datos,
    cluster: capa.cluster,
    clusterRadius: 44,
    clusterMaxZoom: 15,
  });

  if (capa.cluster) {
    map.addLayer({
      id: `${capa.id}-cluster`, type: "circle", source: capa.id, filter: ["has", "point_count"],
      paint: {
        "circle-color": color, "circle-opacity": .85,
        "circle-radius": ["step", ["get", "point_count"], 14, 25, 18, 100, 24],
        "circle-stroke-width": 2, "circle-stroke-color": "#fff",
      },
    });
    map.addLayer({
      id: `${capa.id}-cluster-num`, type: "symbol", source: capa.id, filter: ["has", "point_count"],
      layout: { "text-field": "{point_count_abbreviated}", "text-size": 12, "text-font": ["Noto Sans Bold"] },
      paint: { "text-color": "#fff" },
    });
  }

  map.addLayer({
    id: `${capa.id}-punto`, type: "circle", source: capa.id,
    ...(capa.cluster ? { filter: ["!", ["has", "point_count"]] } : {}),
    paint: {
      "circle-color": color, "circle-radius": capa.id === "bicing"
        ? ["interpolate", ["linear"], ["get", "bicis_disponibles"], 0, 4, 20, 10]
        : 7,
      "circle-stroke-width": 1.5, "circle-stroke-color": "#fff", "circle-opacity": .92,
    },
  });

  const idsClic = capa.cluster ? [`${capa.id}-cluster`, `${capa.id}-punto`] : [`${capa.id}-punto`];
  idsClic.forEach((id) => {
    map.on("click", id, (e) => {
      if (estado.midiendo) return;
      const f = e.features[0];
      if (f.properties.cluster_id !== undefined) {
        map.getSource(capa.id).getClusterExpansionZoom(f.properties.cluster_id).then((zoom) => {
          map.easeTo({ center: f.geometry.coordinates, zoom });
        });
      } else {
        abrirFicha(capa.id, f.properties);
      }
    });
    map.on("mouseenter", id, () => { if (!estado.midiendo) map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = estado.midiendo ? "crosshair" : ""; });
  });
}

function actualizarVisibilidad() {
  CAPAS.forEach((capa) => {
    const visible = estado.capas.has(capa.id) ? "visible" : "none";
    [`${capa.id}-cluster`, `${capa.id}-cluster-num`, `${capa.id}-punto`].forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible);
    });
  });
}

function actualizarDatos() {
  CAPAS.forEach((capa) => {
    const src = map.getSource(capa.id);
    if (src) src.setData(filtrarPorDistrito(datosCapa(capa.id)));
  });
  actualizarContador();
}

function actualizarContador() {
  const total = CAPAS.filter((c) => estado.capas.has(c.id))
    .reduce((n, c) => n + filtrarPorDistrito(datosCapa(c.id)).features.length, 0);
  document.getElementById("contador").textContent = `${total.toLocaleString("es-ES")} puntos visibles`;
}

/* ---------- Leyenda y chips ---------- */
function pintarLeyenda() {
  document.getElementById("leyenda").innerHTML = CAPAS.map((c) => `
    <span class="leyenda__item"><span class="leyenda__punto" style="background:${var_(c.color)}"></span>${c.texto}</span>`).join("")
    + `<span class="leyenda__item" style="color:var(--tinta-suave);font-size:.75rem">Agrupados = varios puntos cercanos</span>`;
}

function pintarChips() {
  document.getElementById("chips-capas").innerHTML = CAPAS.map((c) => `
    <button class="chip" type="button" data-capa="${c.id}" aria-pressed="${estado.capas.has(c.id)}"
      style="${estado.capas.has(c.id) ? `background:${var_(c.color)};border-color:${var_(c.color)};color:#fff` : ""}">
      ${c.texto}</button>`).join("");
  document.getElementById("chips-capas").querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.capa;
      estado.capas.has(id) ? estado.capas.delete(id) : estado.capas.add(id);
      pintarChips();
      actualizarVisibilidad();
      actualizarContador();
    });
  });
}

/* ---------- Medir distancia en línea recta ---------- */
function alternarMedir() {
  estado.midiendo = !estado.midiendo;
  estado.puntosMedida = [];
  if (map.getSource("medida")) map.getSource("medida").setData({ type: "FeatureCollection", features: [] });
  document.getElementById("btn-medir").setAttribute("aria-pressed", estado.midiendo);
  document.getElementById("panel-medir").hidden = true;
  map.getCanvas().style.cursor = estado.midiendo ? "crosshair" : "";
}

function pintarMedida() {
  const [a, b] = estado.puntosMedida;
  const panel = document.getElementById("panel-medir");
  if (!a) { panel.hidden = true; return; }
  if (a && !b) {
    panel.hidden = false;
    panel.innerHTML = `<div class="mapa-medir__panel">Primer punto marcado.<br>Toca un segundo punto en el mapa.</div>`;
    return;
  }
  const metros = distanciaM(a.lat, a.lng, b.lat, b.lng);
  const texto = metros >= 1000 ? `${(metros / 1000).toFixed(2)} km` : `${Math.round(metros)} m`;
  panel.hidden = false;
  panel.innerHTML = `<div class="mapa-medir__panel">
    <strong>${texto}</strong>
    Línea recta entre los dos puntos: es una referencia de distancia, no una ruta caminable.
    <br><button class="chip" type="button" id="btn-borrar-medida" style="margin-top:8px">Borrar</button>
  </div>`;
  document.getElementById("btn-borrar-medida").addEventListener("click", () => {
    estado.puntosMedida = [];
    map.getSource("medida").setData({ type: "FeatureCollection", features: [] });
    panel.hidden = true;
  });
  map.getSource("medida").setData({
    type: "FeatureCollection",
    features: [{ type: "Feature", geometry: { type: "LineString", coordinates: [[a.lng, a.lat], [b.lng, b.lat]] }, properties: {} }],
  });
}

/* ---------- Ficha del punto (fuente, licencia, fecha de prueba) ---------- */
function filaFuente(f) {
  return `<dt>Fuente</dt><dd>${esc(f.nombre)} · ${esc(f.publicador)} (${esc(f.licencia)})</dd>
    <dt>Archivo en el lago</dt><dd>${f.archivo_publico === false
      ? `${esc(f.archivo)}. No se publica: el archivo original trae datos de los anfitriones.`
      : `<a href="${esc(f.archivo)}" target="_blank" rel="noopener">${esc(f.archivo)}</a>`}</dd>`;
}

function abrirFicha(capaId, p) {
  const f = mapaDatos.fuentes[p.fuente];
  let titulo = p.nombre, etiqueta = "", cuerpo = "", extra = "";

  if (capaId === "turismo") {
    etiqueta = TIPOS_TURISMO[p.tipo] || "Lugar";
    cuerpo = `<dt>Barrio</dt><dd>${esc(p.barrio)} · ${esc(p.distrito)}</dd>`;
    extra = `<div class="ficha__acciones"><a class="boton" href="lugares.html#lugar-${encodeURIComponent(p.id)}">Ver ficha completa →</a></div>`;
  } else if (capaId === "restaurantes") {
    etiqueta = p.subtipo;
    cuerpo = `
      <dt>Dirección</dt><dd>${esc(p.direccion || "—")}</dd>
      <dt>Barrio</dt><dd>${esc(p.barrio)} · ${esc(p.distrito)}</dd>
      <dt>Ocio nocturno</dt><dd>${p.nocturno ? "Sí" : "No"}</dd>
      <dt>Fecha de prueba (revisión en la fuente)</dt><dd>${esc(p.actualizado_en_fuente || "—")}</dd>
      <dt>ID del registro</dt><dd>${esc(p.id)}</dd>`;
  } else if (capaId === "bicing") {
    etiqueta = "Estación Bicing";
    cuerpo = `
      <dt>Dirección</dt><dd>${esc(p.direccion)}</dd>
      <dt>Bicis disponibles</dt><dd>${p.bicis_disponibles} de ${p.capacidad} anclajes</dd>
      <dt>Anclajes libres</dt><dd>${p.anclajes_libres}</dd>
      <dt>En servicio</dt><dd>${p.en_servicio ? "Sí" : "No"}</dd>
      <dt>Dato PROXY</dt><dd>${esc(p.nota_proxy)}</dd>
      <dt>Fecha de prueba (snapshot)</dt><dd>${esc((p.snapshot_tomado || "").slice(0, 16).replace("T", " "))}</dd>`;
  } else if (capaId === "alojamiento") {
    etiqueta = TIPOS_ALOJAMIENTO[p.tipo] || "Alojamiento";
    cuerpo = `
      <dt>Barrio</dt><dd>${esc(p.barrio)} · ${esc(p.distrito)}</dd>
      <dt>Precio</dt><dd>${p.precio_noche_eur != null ? `${p.precio_noche_eur.toFixed(0)} € por noche`
        : p.precio_mes_eur != null ? `${p.precio_mes_eur.toLocaleString("es-ES")} € al mes (estancia larga)` : "No publicado en la fuente"}</dd>`;
    extra = `<div class="ficha__acciones"><a class="boton" href="alojamiento.html#alojamiento-${encodeURIComponent(p.id)}">Ver en Alojamiento →</a></div>`;
  }

  document.getElementById("ficha-cuerpo").innerHTML = `
    <span class="etiqueta">${esc(etiqueta)}</span>
    <h2>${esc(titulo)}</h2>
    ${extra}
    <details open>
      <summary>De dónde salen estos datos</summary>
      <dl>${cuerpo}${f ? filaFuente(f) : ""}</dl>
    </details>`;
  document.getElementById("ficha").showModal();
}

function avisoMapa(mensaje) {
  document.getElementById("mapa").innerHTML =
    `<p class="aviso" style="margin:16px">${esc(mensaje)}</p>`;
}

/* ---------- Arranque ---------- */
async function iniciar() {
  let zonas, mapaJson, lugaresJson;
  try {
    [zonas, mapaJson, lugaresJson] = await Promise.all([
      fetch("lago/procesado/zonas.json").then((r) => r.json()),
      fetch("lago/procesado/mapa.json").then((r) => r.json()),
      fetch("lago/procesado/lugares_imperdibles.json").then((r) => r.json()).catch(() => null),
    ]);
  } catch (err) {
    console.error("No se pudieron cargar los datos del mapa:", err);
    avisoMapa("No se pudieron cargar los datos del mapa. Revisa que el sitio corra con un servidor local (python -m http.server), no abriendo el .html directamente.");
    return;
  }
  mapaDatos = mapaJson;

  const fondo = (lugaresJson?.fondos || []).find((f) => f.archivo.endsWith("casa-batllo.jpg"));
  if (fondo) {
    document.getElementById("banner-credito").innerHTML =
      `Foto: <a href="${esc(fondo.pagina)}" target="_blank" rel="noopener">${esc(fondo.autor)}</a> · ${esc(fondo.licencia)}`;
  }

  const distritos = [...new Set(zonas.distritos.features.map((f) => f.properties.nombre))].sort((a, b) => a.localeCompare(b, "es"));
  document.getElementById("filtro-distrito").insertAdjacentHTML("beforeend",
    distritos.map((d) => `<option>${esc(d)}</option>`).join(""));

  // Chips, leyenda y filtros se pintan ya mismo: así se ven aunque el mapa falle al cargar.
  pintarLeyenda();
  pintarChips();
  document.getElementById("filtro-distrito").addEventListener("change", (e) => {
    estado.distrito = e.target.value;
    if (map) actualizarDatos();
  });
  document.getElementById("btn-medir").addEventListener("click", alternarMedir);
  const ficha = document.getElementById("ficha");
  ficha.querySelector(".ficha__cerrar").addEventListener("click", () => ficha.close());
  ficha.addEventListener("click", (e) => { if (e.target === ficha) ficha.close(); });

  if (typeof maplibregl === "undefined") {
    console.error("maplibregl no está definido: no cargó assets/vendor/maplibre-gl/maplibre-gl.js");
    avisoMapa("No se pudo cargar la librería del mapa (MapLibre). Revisa la consola del navegador (F12) para ver el error exacto.");
    return;
  }

  try {
    map = new maplibregl.Map({
      container: "mapa", style: "https://tiles.openfreemap.org/styles/liberty",
      center: BCN_CENTRO, zoom: 12.3, attributionControl: true,
    });
  } catch (err) {
    console.error("Error creando el mapa:", err);
    avisoMapa("No se pudo iniciar el mapa. Revisa la consola del navegador (F12) para ver el error exacto.");
    return;
  }
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.on("error", (e) => console.error("Error de MapLibre:", e.error || e));

  map.on("load", () => {
    map.addSource("distritos", { type: "geojson", data: zonas.distritos });
    map.addLayer({ id: "distritos-relleno", type: "fill", source: "distritos", paint: { "fill-color": var_("--mar"), "fill-opacity": .035 } });
    map.addLayer({ id: "distritos-borde", type: "line", source: "distritos", paint: { "line-color": var_("--mar"), "line-width": 1, "line-opacity": .4 } });

    map.addSource("medida", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({ id: "medida-linea", type: "line", source: "medida", paint: { "line-color": var_("--terracota"), "line-width": 3, "line-dasharray": [2, 1.5] } });

    CAPAS.forEach(agregarCapa);
    actualizarContador();

    map.on("click", (e) => {
      if (!estado.midiendo) return;
      estado.puntosMedida.push(e.lngLat);
      if (estado.puntosMedida.length > 2) estado.puntosMedida = [estado.puntosMedida[1], e.lngLat];
      pintarMedida();
    });
  });

}
iniciar();
