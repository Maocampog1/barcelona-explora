/* =========================================================================
   Navegación compartida de Barcelona Explora.

   PARA CONECTAR TU PÁGINA:
   1. Crea tu archivo .html en la raíz del repo con el nombre de "archivo".
   2. Copia el <head>, el <header id="navbar"> y los <script> de lugares.html.
   3. Cambia "lista: false" por "lista: true" en tu página aquí abajo.
   Con eso aparece activa en la navbar y en las tarjetas de la Portada.
   ========================================================================= */

const PAGINAS = [
  { num: "01", titulo: "Portada", archivo: "index.html", lista: true,
    descripcion: "Dato curioso de Barcelona, clima de ahora y accesos a todo el sitio." },
  { num: "02", titulo: "Lugares imperdibles", archivo: "lugares.html", lista: true,
    descripcion: "Gaudí, museos, mercados y miradores: los más buscados, con fotos y cómo llegar." },
  { num: "03", titulo: "Explora el mapa", archivo: "mapa.html", lista: false,
    descripcion: "Mapa con capas de turismo, restaurantes, Bicing y alojamiento, filtros y distancia entre puntos." },
  { num: "04", titulo: "Alojamiento", archivo: "alojamiento.html", lista: false,
    descripcion: "Precios por zona y anfitriones anonimizados." },
  { num: "05", titulo: "Cómo moverte", archivo: "moverte.html", lista: false,
    descripcion: "Bicing en vivo, paradas de bus y metro, ruta entre dos puntos." },
  { num: "06", titulo: "Clima y ambiente", archivo: "clima.html", lista: false,
    descripcion: "Pronóstico por hora, calidad del aire y arbolado urbano." },
  { num: "07", titulo: "Sobre el proyecto", archivo: "proyecto.html", lista: false,
    descripcion: "Metodología, fuentes, preguntas respondidas y equipo." },
];

function paginaActual() {
  const ruta = location.pathname.split("/").pop() || "index.html";
  const limpia = ruta.endsWith(".html") ? ruta : ruta + ".html"; // Vercel puede quitar el .html
  return limpia;
}

function pintarNavbar() {
  const header = document.getElementById("navbar");
  if (!header) return;
  const actual = paginaActual();

  const items = PAGINAS.map((p) => {
    if (!p.lista) {
      return `<li><span class="navbar__enlace navbar__enlace--pendiente" title="Próximamente">${p.titulo}</span></li>`;
    }
    const activa = p.archivo === actual ? ' aria-current="page"' : "";
    return `<li><a class="navbar__enlace" href="${p.archivo}"${activa}>${p.titulo}</a></li>`;
  }).join("");

  header.className = "navbar";
  header.innerHTML = `
    <nav class="contenedor navbar__fila" aria-label="Principal">
      <a class="navbar__marca" href="index.html">Barcelona <span>Explora</span></a>
      <button class="navbar__menu" type="button" aria-expanded="false" aria-controls="menu-principal">Menú</button>
      <ul class="navbar__lista" id="menu-principal">${items}</ul>
    </nav>`;

  const boton = header.querySelector(".navbar__menu");
  const lista = header.querySelector(".navbar__lista");
  boton.addEventListener("click", () => {
    const abierta = lista.classList.toggle("abierta");
    boton.setAttribute("aria-expanded", abierta);
    header.classList.toggle("navbar--solida", abierta || scrollY > 40);
  });

  // En páginas con foto de portada (<body class="con-hero">) la barra es transparente
  // hasta que se baja un poco.
  if (document.body.classList.contains("con-hero")) {
    const actualizar = () => header.classList.toggle("navbar--solida", scrollY > 40 || lista.classList.contains("abierta"));
    addEventListener("scroll", actualizar, { passive: true });
    actualizar();
  }
}

function pintarPie() {
  const pie = document.getElementById("pie");
  if (!pie) return;
  pie.className = "pie";
  pie.innerHTML = `<div class="contenedor">
    Barcelona Explora · Taller de Datos, Universidad EAFIT · Datos abiertos de Open Data BCN (CC BY 4.0), Open-Meteo, Bicing e Inside Airbnb.
    <br>Camilo Salazar · Luis Ángel Nerio · César Montoya · Maria Alejandra Ocampo Giraldo
  </div>`;
}

pintarNavbar();
pintarPie();
