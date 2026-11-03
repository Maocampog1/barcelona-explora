/* Cómo moverte: MapLibre + OpenFreeMap con tres capas —
   Bicing (en vivo desde el feed GBFS oficial, con respaldo al snapshot del lago),
   paradas de bus y estaciones de metro/FGC (sin tiempo real, marcadas como pendiente).
   Filtro por distrito, leyenda, chips y ficha por punto con fuente/licencia/fecha. */

const BCN_CENTRO = [2.1734, 41.3851];
const var_ = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Feed GBFS oficial de Bicing (sin token ni tarjeta). Mismo formato que el snapshot del lago.
const GBFS = {
  informacion: "https://barcelona.publicbikesystem.net/customer/ube/gbfs/v1/en/station_information",
  estado: "https://barcelona.publicbikesystem.net/customer/ube/gbfs/v1/en/station_status",
};

// Capas del mapa: id interno, texto del chip, color (reusa variables del CSS) y si se agrupan.
const CAPAS = [
  { id: "bicing", texto: "Bicing", color: "--turquesa", cluster: false },
  { id: "bus", texto: "Paradas de bus", color: "--oliva", cluster: true },
  { id: "metro", texto: "Metro y FGC", color: "--mar", cluster: true },
];

// Servicio de ruteo en bici: OSRM público (abierto, sin token ni tarjeta, datos de OpenStreetMap).
const OSRM = "https://router.project-osrm.org/route/v1/bike/";

const estado = {
  capas: new Set(CAPAS.map((c) => c.id)),
  distrito: "",
  ruteando: false,            // ¿está activo el modo "trazar ruta"?
  puntosRuta: [],             // [{lng, lat}, {lng, lat}] origen y destino
};
let datos = { bicing: [], bus: [], metro: [] };   // puntos ya normalizados por capa
let fuentes = {};                                  // bloque "fuentes" de moverte.json
let bicingEnVivo = false;                           // ¿se logró leer el feed en vivo?
let bicingSello = "";                               // fecha del dato Bicing mostrado
let map = null;

/* ---------- GeoJSON de cada capa ---------- */
function featureCollection(lista) {
  return {
    type: "FeatureCollection",
    features: lista.map((item) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [item.lon, item.lat] },
      properties: { ...item },
    })),
  };
}

function filtrarPorDistrito(fc) {
  if (!estado.distrito) return fc;
  return { ...fc, features: fc.features.filter((f) => f.properties.distrito === estado.distrito) };
}

function datosCapa(id) {
  return filtrarPorDistrito(featureCollection(datos[id] || []));
}

/* ---------- Bicing en vivo (GBFS) con respaldo al snapshot del lago ---------- */
async function cargarBicingEnVivo() {
  const [info, status] = await Promise.all([
    fetch(GBFS.informacion).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
    fetch(GBFS.estado).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
  ]);
  const porId = {};
  for (const e of status.data.stations) porId[e.station_id] = e;
  const estaciones = [];
  for (const u of info.data.stations) {
    const e = porId[u.station_id];
    if (!e) continue;
    const nombre = (Array.isArray(u.name) ? (u.name.find((n) => n.language === "es")?.text || u.name[0]?.text) : u.name) || u.address;
    estaciones.push({
      id: u.station_id,
      nombre: (nombre || "").trim(),
      direccion: (u.address || "").trim(),
      distrito: distritoDeCrossStreet(u.cross_street),
      lat: u.lat, lon: u.lon,
      capacidad: u.capacity,
      bicis_disponibles: e.num_vehicles_available,
      anclajes_libres: e.num_docks_available,
      en_servicio: !!(e.is_renting && e.is_returning),
    });
  }
  return { estaciones, sello: selloISO(status.last_updated) };
}

// El feed en vivo trae last_updated como epoch en segundos (número) y el snapshot como ISO.
// Dejamos siempre una cadena ISO corta, que es lo que muestra la interfaz.
function selloISO(sello) {
  if (sello == null) return "";
  if (typeof sello === "number") return new Date(sello * 1000).toISOString();
  if (/^\d+$/.test(String(sello))) return new Date(Number(sello) * 1000).toISOString();
  return String(sello);
}

// cross_street del feed en vivo: "02-Eixample/05-el Fort Pienc" → distrito "Eixample".
// Se normaliza al nombre oficial que usa zonas.json cuando difiere (p. ej. Ciutat Vella).
const DISTRITO_ALIAS = {
  "CiutatVella": "Ciutat Vella",
  "LesCorts": "Les Corts",
  "NouBarris": "Nou Barris",
  "SantAndreu": "Sant Andreu",
  "SantMartí": "Sant Martí",
  "Sarrià-StGervasi": "Sarrià-Sant Gervasi",
};
function distritoDeCrossStreet(cross) {
  if (!cross) return null;
  const primera = String(cross).split("/")[0];          // "02-Eixample"
  const nombre = primera.replace(/^\d+\s*-\s*/, "").trim();
  return DISTRITO_ALIAS[nombre] || nombre || null;
}

async function prepararBicing(fallback) {
  try {
    const vivo = await cargarBicingEnVivo();
    if (!vivo.estaciones.length) throw new Error("sin estaciones");
    bicingEnVivo = true;
    bicingSello = vivo.sello;
    return vivo.estaciones;
  } catch (e) {
    // CORS, red caída o feed sin datos: usamos el snapshot guardado, bien señalado.
    console.warn("Bicing en vivo no disponible, uso el snapshot del lago:", e.message || e);
    bicingEnVivo = false;
    bicingSello = fallback?.snapshot_tomado || "";
    return (fallback?.estaciones || []);
  }
}

function pintarEstadoBicing() {
  const caja = document.getElementById("estado-bicing");
  if (!caja) return;
  const fecha = (bicingSello || "").slice(0, 16).replace("T", " ");
  if (bicingEnVivo) {
    caja.className = "mapa-estado mapa-estado--vivo";
    caja.innerHTML = `<span class="punto-vivo"></span> Bicing en vivo · leído ${esc(fecha)} UTC`;
  } else {
    caja.className = "mapa-estado mapa-estado--proxy";
    caja.innerHTML = `⚠ Bicing: sin conexión al feed en vivo. Mostrando snapshot de respaldo${fecha ? ` del ${esc(fecha)}` : ""}.`;
  }
  caja.hidden = false;
}

/* ---------- Capas en el mapa ---------- */
function radioBicing() {
  return ["interpolate", ["linear"], ["coalesce", ["get", "bicis_disponibles"], 0], 0, 4, 20, 11];
}

function agregarCapa(capa) {
  const color = var_(capa.color);
  map.addSource(capa.id, {
    type: "geojson",
    data: datosCapa(capa.id),
    cluster: capa.cluster,
    clusterRadius: 46,
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
      "circle-color": color,
      "circle-radius": capa.id === "bicing" ? radioBicing() : 6,
      "circle-stroke-width": 1.5, "circle-stroke-color": "#fff", "circle-opacity": .92,
    },
  });

  const idsClic = capa.cluster ? [`${capa.id}-cluster`, `${capa.id}-punto`] : [`${capa.id}-punto`];
  idsClic.forEach((id) => {
    map.on("click", id, (e) => {
      if (estado.ruteando) return;   // en modo ruta, el clic marca puntos, no abre fichas
      const f = e.features[0];
      if (f.properties.cluster_id !== undefined) {
        map.getSource(capa.id).getClusterExpansionZoom(f.properties.cluster_id).then((zoom) => {
          map.easeTo({ center: f.geometry.coordinates, zoom });
        });
      } else {
        abrirFicha(capa.id, f.properties);
      }
    });
    map.on("mouseenter", id, () => { if (!estado.ruteando) map.getCanvas().style.cursor = "pointer"; });
    map.on("mouseleave", id, () => { map.getCanvas().style.cursor = estado.ruteando ? "crosshair" : ""; });
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
    if (src) src.setData(datosCapa(capa.id));
  });
  actualizarContador();
}

function actualizarContador() {
  const total = CAPAS.filter((c) => estado.capas.has(c.id))
    .reduce((n, c) => n + datosCapa(c.id).features.length, 0);
  document.getElementById("contador").textContent = `${total.toLocaleString("es-ES")} puntos visibles`;
}

/* ---------- Leyenda y chips ---------- */
function pintarLeyenda() {
  document.getElementById("leyenda").innerHTML = CAPAS.map((c) => `
    <span class="leyenda__item"><span class="leyenda__punto" style="background:${var_(c.color)}"></span>${c.texto}${
      c.id === "metro" ? ' <small style="color:var(--tinta-suave)">(sin tiempo real)</small>' : ""}</span>`).join("")
    + `<span class="leyenda__item" style="color:var(--tinta-suave);font-size:.75rem">Agrupados = varios puntos cercanos</span>`;
}

function pintarChips() {
  document.getElementById("chips-capas").innerHTML = CAPAS.map((c) => `
    <button class="chip" type="button" data-capa="${c.id}" aria-pressed="${estado.capas.has(c.id)}"
      style="${estado.capas.has(c.id) ? `background:${var_(c.color)};border-color:${var_(c.color)};color:#fff` : ""}">
      ${esc(c.texto)}${c.id === "metro" ? " · pendiente" : ""}</button>`).join("");
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

/* ---------- Ficha del punto ---------- */
function filaFuente(f) {
  if (!f) return "";
  return `${filasTrazabilidad(f)}<dt>Fuente</dt><dd>${esc(f.nombre)} · ${esc(f.publicador)} (${esc(f.licencia)})</dd>
    <dt>Archivo en el lago</dt><dd><a href="${esc(f.archivo)}" target="_blank" rel="noopener">${esc(f.archivo)}</a></dd>`;
}

function abrirFicha(capaId, p) {
  let etiqueta = "", cuerpo = "", fuente = null, aviso = "";

  if (capaId === "bicing") {
    etiqueta = "Estación Bicing";
    fuente = fuentes.bicing_ubicacion;
    const sello = (bicingSello || "").slice(0, 16).replace("T", " ");
    cuerpo = `
      <dt>Dirección</dt><dd>${esc(p.direccion || "—")}</dd>
      <dt>Bicis disponibles</dt><dd>${p.bicis_disponibles} de ${p.capacidad} anclajes</dd>
      <dt>Anclajes libres</dt><dd>${p.anclajes_libres}</dd>
      <dt>En servicio</dt><dd>${p.en_servicio ? "Sí" : "No"}</dd>
      ${bicingEnVivo
        ? `<dt>Lectura en vivo</dt><dd>Feed GBFS oficial · ${esc(sello)} UTC</dd>`
        : `<dt>Dato PROXY</dt><dd>Snapshot de respaldo (el feed en vivo no respondió)</dd>
           <dt>Fecha del snapshot</dt><dd>${esc(sello)}</dd>`}`;
    aviso = bicingEnVivo
      ? `<span class="etiqueta etiqueta--mercado">En vivo</span>`
      : `<span class="etiqueta etiqueta--pronto" style="background:#fbe6e0;color:var(--tipo-icono)">Snapshot de respaldo</span>`;
  } else if (capaId === "bus") {
    etiqueta = "Parada de bus";
    fuente = fuentes.bus;
    cuerpo = `
      <dt>Líneas / equipamiento</dt><dd>${esc(p.nombre)}</dd>
      <dt>Barrio</dt><dd>${esc(p.barrio || "—")} · ${esc(p.distrito || "—")}</dd>
      ${p.direccion ? `<dt>Dirección</dt><dd>${esc(p.direccion)}</dd>` : ""}`;
  } else if (capaId === "metro") {
    etiqueta = "Estación de metro / FGC";
    fuente = fuentes.metro;
    cuerpo = `
      <dt>Barrio</dt><dd>${esc(p.barrio || "—")} · ${esc(p.distrito || "—")}</dd>
      ${p.direccion ? `<dt>Dirección</dt><dd>${esc(p.direccion)}</dd>` : ""}
      <dt>Tiempo real</dt><dd>${esc(p.nota_pendiente || "Sin tiempo real (pendiente).")}</dd>`;
    aviso = `<span class="etiqueta etiqueta--pronto" style="background:#eef0f3;color:var(--tinta-suave)">Sin tiempo real · pendiente</span>`;
  }

  document.getElementById("ficha-cuerpo").innerHTML = `
    <div style="padding:26px 28px 8px">
      <span class="etiqueta">${esc(etiqueta)}</span> ${aviso}
      <h2 style="margin:12px 0 0">${esc(p.nombre)}</h2>
    </div>
    <div class="ficha__cuerpo">
      <details open>
        <summary>De dónde salen estos datos</summary>
        <dl>${cuerpo}${filaFuente(fuente)}</dl>
      </details>
    </div>`;
  const ficha = document.getElementById("ficha");
  if (!ficha.open) ficha.showModal();
  ficha.scrollTop = 0;
}

function avisoMapa(mensaje) {
  document.getElementById("mapa").innerHTML = `<p class="aviso" style="margin:16px">${esc(mensaje)}</p>`;
}

/* ---------- Ruta en bici entre dos puntos (OSRM, datos de OpenStreetMap) ----------
   El usuario activa el modo y toca dos puntos: origen y destino. Se pide a OSRM una
   ruta ciclable real (sigue las calles) y se dibuja con su distancia y tiempo. Si el
   servicio no responde, se dibuja la línea recta PERO avisando que es una aproximación,
   no una ruta ciclable, para no mezclar un respaldo con el dato real. */

function formatoDistancia(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}
function formatoDuracion(seg) {
  const min = Math.round(seg / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), r = min % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}

function pintarGeometriaRuta(coordenadas) {
  map.getSource("ruta").setData({
    type: "Feature",
    geometry: { type: "LineString", coordinates: coordenadas },
    properties: {},
  });
}
function pintarPuntosRuta() {
  map.getSource("ruta-puntos").setData({
    type: "FeatureCollection",
    features: estado.puntosRuta.map((p, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [p.lng, p.lat] },
      properties: { papel: i === 0 ? "origen" : "destino" },
    })),
  });
}
function limpiarRuta() {
  estado.puntosRuta = [];
  if (map.getSource("ruta")) pintarGeometriaRuta([]);
  if (map.getSource("ruta-puntos")) map.getSource("ruta-puntos").setData({ type: "FeatureCollection", features: [] });
}

function pintarPanelRuta(contenido) {
  const panel = document.getElementById("panel-ruta");
  panel.hidden = false;
  panel.innerHTML = contenido;
  const borrar = panel.querySelector("#btn-borrar-ruta");
  if (borrar) borrar.addEventListener("click", () => { limpiarRuta(); pintarPanelRuta(textoAyudaRuta()); });
}
function textoAyudaRuta() {
  const n = estado.puntosRuta.length;
  if (n === 0) return `<div class="mapa-ruta__panel">Modo ruta en bici activo.<br>Toca el <strong>punto de partida</strong> en el mapa.</div>`;
  if (n === 1) return `<div class="mapa-ruta__panel">Partida marcada.<br>Ahora toca el <strong>destino</strong>.</div>`;
  return "";
}

async function calcularRuta() {
  const [a, b] = estado.puntosRuta;
  const url = `${OSRM}${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  pintarPanelRuta(`<div class="mapa-ruta__panel">Calculando la ruta en bici…</div>`);
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    if (d.code !== "Ok" || !d.routes || !d.routes.length) throw new Error(d.code || "sin ruta");
    const ruta = d.routes[0];
    pintarGeometriaRuta(ruta.geometry.coordinates);
    pintarPanelRuta(`
      <div class="mapa-ruta__panel">
        <strong>${formatoDistancia(ruta.distance)} en bici</strong>
        Tiempo estimado: ${formatoDuracion(ruta.duration)}.
        <span class="mapa-ruta__fuente">Ruta ciclable real · OSRM sobre OpenStreetMap</span>
        <button class="chip" type="button" id="btn-borrar-ruta" style="margin-top:8px">Borrar ruta</button>
      </div>`);
  } catch (e) {
    console.warn("OSRM no disponible, dibujo la línea recta como aproximación:", e.message || e);
    // Respaldo: línea recta entre los dos puntos, claramente marcada como aproximación.
    pintarGeometriaRuta([[a.lng, a.lat], [b.lng, b.lat]]);
    const metros = distanciaRecta(a.lat, a.lng, b.lat, b.lng);
    pintarPanelRuta(`
      <div class="mapa-ruta__panel mapa-ruta__panel--aprox">
        <strong>${formatoDistancia(metros)} en línea recta</strong>
        ⚠ No se pudo calcular la ruta por calles (servicio de ruteo sin respuesta).
        Esto es una <strong>aproximación en línea recta</strong>, no una ruta ciclable.
        <button class="chip" type="button" id="btn-borrar-ruta" style="margin-top:8px">Borrar</button>
      </div>`);
  }
}

function distanciaRecta(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180;
  const a = Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(((lon2 - lon1) * Math.PI) / 180 / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

function alternarRuta() {
  estado.ruteando = !estado.ruteando;
  limpiarRuta();
  document.getElementById("btn-ruta").setAttribute("aria-pressed", estado.ruteando);
  map.getCanvas().style.cursor = estado.ruteando ? "crosshair" : "";
  if (estado.ruteando) {
    pintarPanelRuta(textoAyudaRuta());
  } else {
    document.getElementById("panel-ruta").hidden = true;
  }
}

function clicRuta(e) {
  if (!estado.ruteando) return;
  // Un tercer clic reinicia: empieza una ruta nueva desde ese punto.
  if (estado.puntosRuta.length >= 2) estado.puntosRuta = [];
  estado.puntosRuta.push(e.lngLat);
  pintarPuntosRuta();
  if (estado.puntosRuta.length === 2) calcularRuta();
  else pintarPanelRuta(textoAyudaRuta());
}

/* ---------- Arranque ---------- */
async function iniciar() {
  let zonas, moverte;
  try {
    [zonas, moverte] = await Promise.all([
      fetch("lago/procesado/zonas.json").then((r) => r.json()),
      fetch("lago/procesado/moverte.json").then((r) => r.json()),
    ]);
  } catch (err) {
    console.error("No se pudieron cargar los datos de transporte:", err);
    avisoMapa("No se pudieron cargar los datos. Revisa que el sitio corra con un servidor local (python -m http.server), no abriendo el .html directamente.");
    return;
  }

  fuentes = moverte.fuentes || {};
  datos.bus = moverte.bus || [];
  datos.metro = moverte.metro || [];
  datos.bicing = await prepararBicing(moverte.bicing_fallback);

  // Crédito de la foto del banner (reusa fondos de lugares_imperdibles.json si está).
  try {
    const lug = await fetch("lago/procesado/lugares_imperdibles.json").then((r) => r.json());
    const fondo = (lug.fondos || []).find((f) => f.archivo.endsWith("sagrada-familia.jpg"));
    if (fondo) {
      document.getElementById("banner-credito").innerHTML =
        `Foto: <a href="${esc(fondo.pagina)}" target="_blank" rel="noopener">${esc(fondo.autor)}</a> · ${esc(fondo.licencia)}`;
    }
  } catch (e) { /* la foto de crédito es opcional */ }

  const distritos = [...new Set(zonas.distritos.features.map((f) => f.properties.nombre))].sort((a, b) => a.localeCompare(b, "es"));
  document.getElementById("filtro-distrito").insertAdjacentHTML("beforeend",
    distritos.map((d) => `<option>${esc(d)}</option>`).join(""));

  // Chips, leyenda y aviso de Bicing se pintan ya mismo, aunque el mapa falle al cargar.
  pintarLeyenda();
  pintarChips();
  pintarEstadoBicing();
  document.getElementById("filtro-distrito").addEventListener("change", (e) => {
    estado.distrito = e.target.value;
    if (map) actualizarDatos();
  });
  document.getElementById("btn-ruta").addEventListener("click", () => { if (map) alternarRuta(); });
  const ficha = document.getElementById("ficha");
  ficha.querySelector(".ficha__cerrar").addEventListener("click", () => ficha.close());
  ficha.addEventListener("click", (e) => { if (e.target === ficha) ficha.close(); });

  if (typeof maplibregl === "undefined") {
    console.error("maplibregl no está definido: no cargó assets/vendor/maplibre-gl/maplibre-gl.js");
    avisoMapa("No se pudo cargar la librería del mapa (MapLibre). Revisa la consola del navegador (F12).");
    return;
  }

  try {
    map = new maplibregl.Map({
      container: "mapa", style: "https://tiles.openfreemap.org/styles/liberty",
      center: BCN_CENTRO, zoom: 12.3, attributionControl: true,
    });
  } catch (err) {
    console.error("Error creando el mapa:", err);
    avisoMapa("No se pudo iniciar el mapa. Revisa la consola del navegador (F12).");
    return;
  }
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.on("error", (e) => console.error("Error de MapLibre:", e.error || e));

  map.on("load", () => {
    map.addSource("distritos", { type: "geojson", data: zonas.distritos });
    map.addLayer({ id: "distritos-relleno", type: "fill", source: "distritos", paint: { "fill-color": var_("--mar"), "fill-opacity": .035 } });
    map.addLayer({ id: "distritos-borde", type: "line", source: "distritos", paint: { "line-color": var_("--mar"), "line-width": 1, "line-opacity": .4 } });

    // Ruta a pie: la línea va debajo de los puntos de las capas; los marcadores origen/destino, encima.
    map.addSource("ruta", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "ruta-linea", type: "line", source: "ruta",
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-color": var_("--terracota"), "line-width": 5, "line-opacity": .9 },
    });

    CAPAS.forEach(agregarCapa);

    map.addSource("ruta-puntos", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "ruta-puntos-circulo", type: "circle", source: "ruta-puntos",
      paint: {
        "circle-radius": 8,
        "circle-color": ["match", ["get", "papel"], "origen", var_("--oliva"), var_("--terracota")],
        "circle-stroke-width": 3, "circle-stroke-color": "#fff",
      },
    });

    map.on("click", clicRuta);

    actualizarContador();
  });
}
iniciar();
