/* Sobre Barcelona: lee lago/procesado/sobre_barcelona.json. Cifras con su fuente, línea de tiempo y festivos.
   El texto de contexto cultural está en sobre-barcelona.html. */

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const textoCifra = (c) => c.valor_publicado || c.valor.toLocaleString("es-ES");

function pintarCifras(cifras) {
  document.getElementById("cifras").innerHTML = cifras.map((c) => `
    <article class="tarjeta cifra-bcn">
      <strong class="cifra-bcn__valor">${esc(textoCifra(c))}${c.unidad === "km²" ? " km²" : ""}</strong>
      <span class="cifra-bcn__etiqueta">${esc(c.etiqueta)}</span>
      ${c.anio_referencia === "Lago" || c.anio_referencia === "Vigente" ? "" : `<span class="cifra-bcn__anio">${esc(c.anio_referencia)}</span>`}
      <details class="cifra-bcn__fuente">
        <summary>Fuente</summary>
        <p>ID de fuente: <strong>${esc(c.id_fuente)}</strong></p>
        <p>Vigencia: ${esc(c.vigencia)}</p>
        ${c.nota ? `<p>${esc(c.nota)}</p>` : ""}
        <p>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.fuente)}</a>` : `${esc(c.fuente)}. <a href="${esc(c.archivo)}" target="_blank" rel="noopener">Archivo en el lago</a>`}${c.fecha_consulta ? `. Consultado el ${esc(c.fecha_consulta)}` : ""}.</p>
      </details>
    </article>`).join("");
}

function pintarLineaTiempo(hitos) {
  document.getElementById("linea-tiempo").innerHTML = hitos.map((h) => `
    <li class="hito" data-era="${esc(h.era)}">
      <span class="hito__punto" aria-hidden="true"></span>
      <article class="hito__tarjeta">
        <span class="hito__anio">${esc(h.anio)}</span>
        <h3>${esc(h.titulo)}</h3>
        <p>${esc(h.texto)}</p>
        <p class="hito__pie">
          ${h.lugar ? `<a class="hito__lugar" href="lugares.html#lugar-${encodeURIComponent(h.lugar.id)}">Ver ${esc(h.lugar.texto)} →</a>` : ""}
          <a class="hito__fuente" href="${esc(h.url)}" target="_blank" rel="noopener">Fuente CTX: ${esc(h.fuente)}</a>
        </p>
      </article>
    </li>`).join("");
}

function pintarEras(eras) {
  const opciones = [{ id: "", texto: "Todas" }, ...eras];
  const caja = document.getElementById("eras");
  caja.innerHTML = opciones.map((e) => `
    <button class="chip" type="button" data-era="${esc(e.id)}" aria-pressed="${e.id === ""}">${esc(e.texto)}</button>`).join("");
  caja.addEventListener("click", (ev) => {
    const chip = ev.target.closest(".chip");
    if (!chip) return;
    caja.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === chip));
    document.querySelectorAll(".hito").forEach((h) => {
      h.hidden = chip.dataset.era !== "" && h.dataset.era !== chip.dataset.era;
    });
  });
}

/* La animación vive en el CSS, dentro de prefers-reduced-motion: no-preference.
   Sin IntersectionObserver los hitos simplemente se ven desde el principio. */
function animarAlDesplazar() {
  const hitos = document.querySelectorAll(".hito");
  if (!("IntersectionObserver" in window)) return;
  const vigia = new IntersectionObserver((entradas) => {
    entradas.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("hito--visible");
        vigia.unobserve(e.target);
      }
    });
  }, { rootMargin: "0px 0px -8% 0px" });
  document.getElementById("linea-tiempo").classList.add("linea-tiempo--animada");
  hitos.forEach((h) => vigia.observe(h));
}

function pintarFestivos(festivos, fuente) {
  // "Hoy" en Barcelona, aunque el visitante esté en otro huso horario
  const hoy = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
  const proximos = festivos.filter((f) => f.fecha >= hoy).slice(0, 6);
  const formato = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  document.getElementById("festivos").innerHTML = proximos.length
    ? proximos.map((f) => `<li><strong>${esc(f.nombre)}</strong><span>${esc(formato.format(new Date(`${f.fecha}T00:00:00Z`)))}</span></li>`).join("")
    : "<li>El calendario del lago ya no tiene fechas futuras.</li>";
  document.getElementById("festivos-fuente").innerHTML =
    `Fuente ${esc(fuente.id)}. Vigencia: ${esc(fuente.vigencia)}. Probada el ${esc(fuente.fecha_prueba)}: ${esc(fuente.nombre)}, ${esc(fuente.publicador)} (${esc(fuente.licencia)}). <a href="${esc(fuente.archivo)}" target="_blank" rel="noopener">Archivo en el lago</a>.`;
}

async function iniciar() {
  try {
    const j = await (await fetch("lago/procesado/sobre_barcelona.json")).json();
    pintarCifras(j.cifras);
    pintarEras(j.eras);
    pintarLineaTiempo(j.linea_de_tiempo);
    pintarFestivos(j.festivos, j.fuentes.festivos);
    animarAlDesplazar();
    if (j.foto_banner) {
      document.getElementById("banner-credito").innerHTML =
        `Foto: <a href="${esc(j.foto_banner.pagina)}" target="_blank" rel="noopener">${esc(j.foto_banner.autor)}</a> · ${esc(j.foto_banner.licencia)}`;
    }
  } catch (e) {
    console.error("Error cargando sobre_barcelona.json:", e);
    document.getElementById("cifras").innerHTML = `<p class="aviso">No se pudieron cargar los datos de esta página.</p>`;
  }
}
iniciar();
