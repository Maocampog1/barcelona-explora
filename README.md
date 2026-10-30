# barcelona-explora

Gemelo digital de Barcelona pensado para el turista: datos abiertos de movilidad, alojamiento, gastronomía, lugares de interés y ambiente, con una capa en tiempo real.

Taller de Datos  · Replica, con enfoque propio, el ejemplo de Lima que puso el profesor.

## Enfoque

El proyecto arrancó mucho más amplio de lo que es hoy: empezamos replicando el ejemplo de Lima casi literalmente, con 16 categorías y más de 140 fuentes posibles (gobernanza, seguridad, economía, ambiente, etc.), sin un público objetivo claro. Era más un inventario de conocimiento general sobre Barcelona que un sistema con un propósito.

Decidimos enfocarlo en **un turista que visita Barcelona** y quiere moverse, dormir, comer y planear su día sin depender de apps de pago. Eso filtró casi todo el catálogo original: lo que quedó responde preguntas concretas como:

- ¿Hay bicis disponibles cerca de donde estoy ahora mismo?
- ¿Qué tiempo va a hacer hoy y mañana?
- ¿Cómo me muevo en transporte público por la ciudad?
- ¿Dónde se alojan más los turistas, y qué precios manejan los anuncios de Airbnb?
- ¿Qué sitios visitar, qué servicios (wifi, baños) tengo cerca?

Quedaron fuera a propósito categorías que sí tenía el ejemplo de Lima, como seguridad (delitos) o gobernanza (presupuestos municipales): no por falta de datos, sino porque no le sirven a este público.

## Estructura del lago

```
lago/
└── raw/                      ← datos en su forma cruda, tal como llegan de la fuente
    ├── geo/                  ← distritos y barrios (la llave que une todo lo demás)
    ├── transporte/           ← metro, bus, taxi, Bicing (en vivo)
    ├── turismo/               ← alojamiento, gastronomía, cultura, festivos
    ├── economia_vivienda/    ← renta por sección censal
    ├── ambiente_satelite/    ← arbolado, tiempo, calidad del aire
    ├── municipio/            ← hospitales y atención primaria
    ├── edificios/            ← Catastro / ICGC, para el gemelo 3D
    └── servicios_turista/    ← wifi, baños, duchas, refugios climáticos

lago/procesado/               ← datos ya limpios que lee el sitio web (salen de ingesta/)
ingesta/                      ← scripts que descargan, limpian y actualizan cada fuente
```

## Sitio web

El sitio es HTML, CSS y JavaScript sin frameworks: Vercel lo publica tal cual desde la raíz del repo, y así el lago también queda en línea (cualquier archivo se puede abrir en `/lago/...`).

```
index.html                    ← 01 Portada: fotos de Gaudí de fondo, reloj y clima en vivo, dato curioso, los más buscados
lugares.html                  ← 02 Lugares imperdibles: íconos, museos, mercados y miradores con foto, filtro "Top turísticos" y ficha
assets/css/estilos.css        ← estándar visual (colores, tipografía, navbar, tarjetas, mosaico trencadís). Todas las páginas lo usan
assets/js/navegacion.js       ← navbar y pie compartidos + lista de páginas (PAGINAS)
assets/js/portada.js
assets/js/lugares.js
assets/img/portada/           ← fotos grandes de fondo (bajadas de Wikimedia Commons, con autor y licencia)
```

El sitio está pensado para el turista: la información técnica (fuente, licencia, archivo en el lago) sigue en cada ficha, pero dentro de un desplegable "De dónde salen estos datos", para no estorbar.

**Fotos, resúmenes y "Top turísticos":** salen de Wikipedia y Wikimedia Commons (`ingesta/descargar_wikipedia.py` → `lago/raw/wikipedia/`). La popularidad es el número de visitas al artículo de cada lugar en Wikipedia (español + inglés) en los últimos 12 meses; los 16 primeros forman el filtro "Top turísticos". No usamos las estrellas de Google porque la API de Google Places pide tarjeta de crédito; en su lugar cada ficha trae un botón "Opiniones en Google Maps" que abre el lugar en Google Maps (enlace normal, sin API ni clave). Cada foto muestra su autor y licencia.

**Para agregar una página:** crea `tu-pagina.html` en la raíz copiando la estructura de `lugares.html` (el `<head>`, `<header id="navbar">`, `<footer id="pie">` y los scripts), y en `assets/js/navegacion.js` cambia `lista: false` por `lista: true` en tu página. Los nombres de archivo acordados son `mapa.html`, `alojamiento.html`, `moverte.html`, `clima.html` y `proyecto.html`.

**Para probarlo en local:** `python -m http.server` en la raíz y abrir `http://localhost:8000` (abriendo el .html con doble clic no carga los datos).

**Para regenerar los datos de la Portada y de Lugares:** `python ingesta/procesar_portada_y_lugares.py` (requiere pandas). Si hay que refrescar fotos y visitas de Wikipedia, antes corre `python ingesta/descargar_wikipedia.py` (requiere requests; tarda unos minutos porque Wikimedia limita las consultas, y reutiliza lo ya descargado: para bajar todo de nuevo borra `lago/raw/wikipedia/wikipedia_lugares.json`).

El clima de la Portada se pide en vivo a la API de Open-Meteo desde el navegador (gratis, sin clave).

Cada carpeta corresponde a un tema del diccionario de datos (ver el Excel `Diccionario_de_datos`), donde cada fuente queda identificada con un ID (F01, F02...), su licencia, y la pregunta del sistema que responde.

## Fuentes de datos

La mayoría de las fuentes salen de **Open Data BCN**, el portal de datos abiertos del Ajuntament de Barcelona, licencia Creative Commons Attribution 4.0. Algunas excepciones:

- **Bicing (en vivo):** feed oficial GBFS del operador, no de Open Data BCN — el de Open Data BCN pedía token y fallaba de forma persistente.
- **Open-Meteo:** API de pronóstico del tiempo, gratis para uso no comercial.
- **Calidad del aire:** Xarxa de Vigilància i Previsió de la Contaminació Atmosfèrica (XVPCA), de la Generalitat de Catalunya — el equivalente catalán a un sistema como SIATA.
- **Inside Airbnb:** proyecto independiente (no es de Airbnb) que publica listados y precios de anuncios, actualizado cada trimestre, licencia CC BY 4.0.
- **Catastro / ICGC:** para los edificios del gemelo 3D.

### Batch vs. streaming

Casi todas las fuentes son **batch**: se descargan una vez y se actualizan por trimestre o año. Dos fuentes sí son **streaming** de verdad, porque cambian minuto a hora:

- Bicing — estado de las estaciones (cada minuto)
- Open-Meteo — pronóstico del tiempo (cada hora)

Por ahora, lo que hay en el repositorio son *snapshots* de prueba de esas dos APIs (archivos JSON de un momento dado). El siguiente paso es automatizar su actualización con un script de ingesta programado, para que de verdad funcionen en vivo.

## Pendiente por replantear

**Importante:** en algún momento del proyecto pensamos usar APIs directas de **Google Maps** y de la **NASA** para enriquecer el gemelo (mapas interactivos, imágenes satelitales). Decidimos no vincularlas todavía:

- **Google Maps Platform** exige asociar una tarjeta de crédito para funcionar sin límites, y el taller pide explícitamente ejercicios que corran sin tarjeta.
- Las imágenes satelitales de la **NASA** no tienen la resolución necesaria para ver algo a nivel de calle o edificio — sirven más para fenómenos a escala de toda la ciudad (temperatura de superficie, islas de calor), no para lo que necesita este proyecto.

Esta decisión **sigue abierta a replantearse** más adelante, si el equipo encuentra una forma de usarlas sin esos riesgos, o si el alcance del proyecto cambia.

## Lo que no se encontró

- No se integró todavía una fuente de **metro en tiempo real** (la API de TMB la tiene, pero pide token).

## Equipo

Camilo Salazar · Luis Ángel Nerio · César Montoya · Maria Alejandra Ocampo Giraldo
