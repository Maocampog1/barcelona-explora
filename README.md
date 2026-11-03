# Barcelona · sistema de información

Grupo: María Alejandra Ocampo Giraldo (curaduría de datos, estándar visual, Inicio, Sobre Barcelona, Lugares imperdibles e ingesta de Wikipedia) · Camilo Salazar (arquitectura geoespacial, mapa, Alojamiento y anonimización) · César Montoya (tiempo real, Bicing, rutas, Cómo moverte y Clima y ambiente) · Luis Ángel Nerio Pereira (auditoría del catálogo, Sobre el proyecto, bitácora de IA y despliegue)

Enlace: <https://barcelona-explora.vercel.app> · Repositorio: <https://github.com/Maocampog1/barcelona-explora> · Revisado: 2026-11-03

## Para quién y qué pregunta

- **Usuario:** un turista autosuficiente que visita Barcelona y quiere moverse, dormir, comer y planear su día sin apps de pago.
- **Preguntas:**
  1. ¿Cómo me muevo en bici, bus, taxi o metro, y qué tan lejos estoy de cada opción? → `Cómo moverte`, `Explora el mapa`
  2. ¿Qué puedo visitar y qué servicios tengo cerca? → `Lugares imperdibles`, `Explora el mapa`
  3. ¿Dónde me puedo alojar, a qué precio, y cómo es ese barrio? → `Alojamiento`
  4. ¿Qué clima y qué aire voy a encontrar hoy? → `Clima y ambiente`
  5. ¿Qué conviene saber de la ciudad y de quienes la habitan antes de salir? → `Sobre Barcelona`

  Las preguntas 1 a 3 vienen de la Entrega 1. Las preguntas 4 y 5 corresponden a vistas agregadas después.
- **Escala y comparación:** ciudad, 10 distritos y 73 barrios. Se compara entre zonas de Barcelona con filtros por distrito y una tabla de renta por barrio. No se compara con otras ciudades ni se construyen rankings de barrios.
- **Lo que decidimos no mostrar, y por qué:**
  - Delitos, presupuestos y contratos municipales: estaban en el ejemplo de Lima, pero no le sirven a este usuario.
  - Anfitriones de Airbnb: son datos personales. En los JSON de la web no hay nombre, foto ni perfil, pero ver el problema abierto en [Protección](#protección).
  - Renta como señal de dónde alojarse: solo aparece como contexto, para no estigmatizar barrios.
  - Fotos de anuncios de Airbnb: son viviendas privadas sin licencia abierta.
  - Precios que no existen o no son creíbles: hoteles y viviendas turísticas no publican precio abierto y no se inventa. Se descartaron 76 anuncios de Airbnb con precios imposibles.

## La réplica

- **Qué replicamos tal cual del ejemplo y qué tuvimos que cambiar para nuestra ciudad:** del ejemplo de Lima replicamos la idea del lago por temas y el catálogo amplio inicial (16 categorías y más de 140 fuentes). Cambiamos el foco a un solo usuario, el turista, lo que dejó fuera seguridad y gobernanza. Para Barcelona añadimos Inside Airbnb y viviendas turísticas con licencia, y usamos la XVPCA de la Generalitat para la calidad del aire y el feed GBFS del operador de Bicing, porque el de Open Data BCN pedía token y fallaba.
- **Fuentes catalogadas · integradas · caídas · descartadas:** 142 catalogadas en la exploración inicial · 32 en el lago, de las cuales 26 integradas y 6 solo en el lago · 0 caídas confirmadas · 110 descartadas. Detalle y comprobación en [catalogo/fuentes.csv](catalogo/fuentes.csv).
  - Comprobación del 2026-11-03: 11 enlaces de nuestro catálogo dan 404 (F07, F08, F09, F11, F12, F13, F14, F15, F16, F17 y F23). Hay que corregirlos: no sabemos si cambió la dirección o si estaba mal anotada, pero sus datos están en el lago. No los contamos como caídas.
  - El listado de las 142 fuentes está en el Excel `Diccionario_de_datos`, que no está en este repositorio.
- **Huecos: lo que buscamos y no existe abierto para esta ciudad:**
  - Llegadas de metro en tiempo real: la API de TMB pide token, así que el metro se muestra como ubicación fija con la etiqueta `Sin tiempo real · pendiente`.
  - Precios de hoteles y de viviendas turísticas: las fichas enlazan a Google Maps para consultarlos.
  - Precios de carta de restaurantes.
  - Fotos abiertas de la mayoría de los hoteles: 58 de 446 tienen foto propia, y los demás muestran una foto de su barrio rotulada como "Foto de la zona".

## ¿Se puede usar?

Resumen por grupo. Las 32 fuentes, una por una, están en [catalogo/fuentes.csv](catalogo/fuentes.csv).

| Fuente | Licencia | Personas | Estado | Condición |
|---|---|---|---|---|
| Open Data BCN: geografía, transporte, cultura, mercados, miradores, festivos y servicios (F01, F05, F06, F09–F15, F17, F20, F26–F29) | CC BY 4.0 | No | Integradas | Atribuir |
| Open Data BCN: renta por sección censal (F02) | CC BY 4.0 | Agregada, sin individuos | Integrada | Atribuir. Se muestra por barrio y solo como contexto |
| Open Data BCN: censo de locales (F08) | CC BY 4.0 | Nombres de negocios | Integrada | Atribuir. Solo locales de comida y ocio |
| Open Data BCN: viviendas turísticas con licencia (F18) | CC BY 4.0 | Dirección de una vivienda, sin nombre | Integrada | Atribuir. La dirección ya es pública en el registro oficial |
| Open Data BCN: taxi, agenda, salud y terrazas (F07, F16, F23, F30) | CC BY 4.0 | No revisado a fondo | Solo en el lago | Atribuir si se integran |
| Inside Airbnb (F19) | CC BY 4.0 | **Sí:** nombre, foto y perfil del anfitrión | Integrada sin esos campos | Atribuir. **El archivo crudo sigue público: ver Protección** |
| Bicing, feed GBFS (F03, F04) | Datos abiertos del operador | No | Integradas, en vivo | Respaldo fechado si el feed falla |
| Open-Meteo (F21) | CC BY 4.0 | No | Integrada, en vivo | Atribuir. Gratis para uso no comercial |
| Calidad del aire XVPCA (F22) | Datos abiertos de la Generalitat | No | Integrada | Citar la fuente |
| Catastro INSPIRE e ICGC (F24, F25) | CC BY 4.0 | No revisado a fondo | Solo en el lago | Atribuir si se integran |
| Wikipedia y Wikimedia Commons (WIKI) | Texto: CC BY-SA 4.0. Fotos: licencia de cada archivo | Autores de fotos | Integrada | Crédito con autor y licencia en cada ficha |
| Cifras e historia de la ciudad (CTX) | Datos públicos, cada uno con su fuente | No | Integrada | Citar fuente, URL y fecha de consulta |
| Mapa base OpenStreetMap vía OpenFreeMap | ODbL | No | Integrada | Atribución visible en el mapa |

## Bitácora de exploración

"Estado del proyecto" es el estado de la herramienta, según GitHub, el 2026-11-03.

| Tramo | Herramienta | Qué pidió para empezar | Licencia | Dónde quedan los datos | ¿Se rehace con un comando? | Estado del proyecto | Qué resolvió | Qué no pudo | ¿Quedó? ¿Por qué? |
|---|---|---|---|---|---|---|---|---|---|
| Lago y procesamiento | Python + pandas | Instalar `pandas` y `requests` | BSD-3 (pandas) | `lago/raw` y `lago/procesado`, en el repositorio | Sí, ver [Cómo correrlo](#anexo-cómo-correrlo) | Activo | Limpieza, cruces y anonimización | Las fotos no se rehacen igual si Commons está saturado | **Quedó.** Es auditable y sin costo |
| Mapa | MapLibre GL JS 4.7.1 + OpenFreeMap | Nada: sin cuenta, clave ni tarjeta | BSD-3; mapa ODbL | Repositorio y navegador | Sí: `python ingesta/procesar_mapa_y_alojamiento.py` | Activo | Miles de puntos, capas, fichas propias y distancias | No tiene panel visual: todo se programa | **Quedó.** Cumple lo que había que mostrar y proteger |
| Mapa | kepler.gl | Node/React, o token de Mapbox para su mapa base | MIT | Navegador, o nube si se exporta enlace | No lo documentamos | Activo | Exploración rápida, mapas de calor, filtros | Difícil de acoplar a un sitio multipágina con fichas propias | **No quedó.** Fue la descartada por poco |
| Mapa | Google Maps Platform | Cuenta y tarjeta de crédito | Propietaria | Servidores de Google | No | Servicio comercial | Búsqueda y rutas familiares | Operar sin tarjeta | **No quedó como motor.** Solo enlaces públicos que no piden clave |
| Rutas en bici | OSRM público | Nada | BSD-2; datos ODbL | Servidor público de OSRM | No aplica: es en vivo | Activo | Ruta entre dos puntos | No garantizamos que el servidor público siempre responda | **Quedó.** Sin clave ni tarjeta |
| Tiempo real | Feed GBFS de Bicing | Nada | Datos abiertos del operador | Navegador, con respaldo en el lago | Solo el respaldo: `python ingesta/procesar_moverte_y_clima.py` | Activo | 543 estaciones en vivo | Falta el metro | **Quedó.** El de Open Data BCN pedía token y fallaba |
| Tiempo real | API de TMB | Registro y token | No revisada | No se usó | No | No revisado | Nada: no la integramos | Abrirse sin token | **No quedó.** El metro se declara sin tiempo real |
| Satélite | Imágenes de la NASA | Registro no documentado | No revisada | No se usó | No | No revisado | Sirven a escala de ciudad | Ver calle o edificio | **No quedó.** No alcanza la resolución para este usuario |
| Fotos | Wikipedia, Commons y Wikidata | Nada | Abierta, por archivo | `assets/img/alojamiento` y `lago/raw/wikipedia` | Sí: `python ingesta/descargar_fotos_alojamiento.py`, con resultado variable | Activo | Fotos con autor y licencia | La búsqueda se saturó el 2026-11-03 y paramos con 58 hoteles | **Quedó.** Google Places pide tarjeta |
| Publicación | Vercel | Cuenta conectada al repositorio | Propietaria | Vercel y GitHub | Sí: se despliega al subir a `main` | Servicio comercial | Sitio estático sin compilación | Publica todo el repositorio si no se excluye nada: ver Protección | **Quedó.** Sin costo para este proyecto |

## Protección

- **Nivel:** abierto para los datos de ciudad · solo agregados para la renta · **no se publica** debería ser el nivel de los datos de anfitriones, pero hoy **no se cumple** (ver abajo).
- **Qué protegemos, y de quién:** la identidad de los anfitriones de Airbnb, frente a cualquier visitante o programa que descargue nuestros archivos. También protegemos a los barrios de ser estigmatizados por su renta, y evitamos publicar credenciales.
- **Pruebas de terminal o de ventana privada** (2026-11-03, sin sesión iniciada):

| Prueba | Resultado | Lectura |
|---|---|---|
| Buscar `host_id`, `host_name`, `host_url`, `host_picture` y `picture_url` en los 8 JSON de `lago/procesado` | 0 coincidencias | ✅ La anonimización funciona en lo que usa la web |
| `curl https://barcelona-explora.vercel.app/lago/raw/turismo/listings.csv` | **206, descarga con `host_name`, `host_url` y `host_picture_url`** | ❌ **Datos de anfitriones expuestos** |
| El mismo archivo en `raw.githubusercontent.com`, repositorio público | **206, descargable** | ❌ **Expuesto, y en el historial desde el 2026-10-01** |
| Ficha de Airbnb en `Alojamiento` | Enlaza a ese archivo en "Archivo en el lago" | ❌ El propio sitio lleva al archivo |
| `curl .../.env` y `curl .../.git/config` en producción | 404 | ✅ No se publican |
| Buscar correos y teléfonos en los JSON | Solo créditos de foto y teléfonos de instituciones | ✅ Revisado por campo |
| Nombres de anuncios de Airbnb, que son texto libre | 81 de 13.279 parecen incluir un nombre de persona | ⚠️ Riesgo sin resolver |
| Identificador de Airbnb en cada anuncio | La ficha enlaza al anuncio original, donde Airbnb muestra al anfitrión | ⚠️ Decisión por revisar |

  **Problema abierto:** anonimizamos bien lo que muestra la web, pero `listings.csv` sigue publicado. Inside Airbnb ya difunde esos datos, pero eso no cambia lo que afirmamos proteger. Para cerrarlo hay que quitar el archivo del repositorio y de Vercel, quitar el enlace de la ficha y limpiar el historial de git.

- **Revisión de secretos en el historial:** `.env` está en `.gitignore`, nunca entró al historial (0 commits) y da 404 en GitHub y en producción. Solo contiene `BICING_TOKEN`, que ningún archivo de `ingesta/` ni del sitio usa. Una búsqueda de patrones de claves (AWS, GitHub, OpenAI, Google, Slack, llaves privadas y asignaciones de `api_key`, `secret` o `password`) en todo el historial dio 0 coincidencias en los archivos de código y texto (`.py`, `.js`, `.html`, `.md`, `.css`, `.txt`, `.yml`). No cubre los archivos de `lago/`, y la hicimos con `git log -G`, no con una herramienta especializada.

## Herramienta elegida para las vistas

- **Qué necesitábamos mostrar:** un sitio de 8 vistas para celular, con más de 34.000 puntos en mapa, capas, filtros, fichas con su fuente y datos en vivo de Bicing y del clima.
- **Qué teníamos que proteger:** los datos de anfitriones, que no debían llegar al navegador, y el proyecto, que no debía depender de claves ni tarjetas.
- **Por qué esta herramienta cumple las dos cosas, y cuál descartamos por poco:** elegimos **HTML, CSS y JavaScript sin frameworks, con MapLibre GL JS y OpenFreeMap**. El navegador solo recibe los JSON que dejamos pasar en `lago/procesado`, así que la anonimización ocurre antes de publicar, y no pide cuenta, clave ni tarjeta. Descartamos por poco **kepler.gl**: es muy buena para explorar, pero difícil de acoplar a un sitio multipágina con fichas propias. Esta elección protege lo que llega por la web, no lo que se publica aparte en el repositorio: eso es justo el problema abierto de [Protección](#protección).

## Nuestra posición

- **Gestión y gobierno de datos: un dato abierto no es un dato listo para usar.** Pasar de 142 fuentes a 32 nos mostró que catalogar sin un usuario claro produce un inventario, no un sistema. Y que un campo con formato correcto puede significar otra cosa: la columna `price` de Inside Airbnb lleva `$`, pero `price_quote_raw` dice `EUR` en los 13.355 anuncios con precio, y parte de esos precios son descuentos de estancias de hasta 250 noches. El sitio llegó a mostrar habitaciones a 4 USD la noche hasta que una integrante del equipo notó que no era creíble. **Evidencia:** ahora el precio por noche solo sale de cotizaciones de hasta 7 noches (de 28 € a 6.151 €, mediana 258 €), 5.288 anuncios se muestran por mes, y 76 se descartan con reglas escritas en `ingesta/procesar_mapa_y_alojamiento.py`.
- **Ciberseguridad: proteger la vista no es proteger el dato.** Creíamos resuelta la privacidad porque el JSON de la web no trae anfitriones, y esa parte es cierta: 0 coincidencias. Pero al probar como lo haría un atacante, el archivo crudo se descargó desde la dirección pública, sin sesión y con un enlace en nuestro propio sitio. **Evidencia:** las pruebas de [Protección](#protección). Lo que tomamos de esto es que hay que probar el sistema publicado desde afuera, y que un lago público no puede guardar lo que la vista promete ocultar. La revisión de secretos sí salió bien porque `.env` se ignoró desde el inicio.

## Bitácora de IA

En los tramos de la Entrega 1 y 2 no quedó registrado qué asistente se usó en cada caso.

| Tramo | Herramienta | Qué le encargamos | Qué entregó | Qué le corregimos |
|---|---|---|---|---|
| Licencias (Entrega 1) | Claude o ChatGPT | Revisar la licencia de los datos de Airbnb | Alertó que las copias en Kaggle e IBM decían CC0 y remitió a la fuente original (CC BY 4.0) | Lo confirmamos en el sitio de Inside Airbnb |
| Exploración de fuentes (Entrega 1) | Claude o ChatGPT | Buscar si había datos de paradas de metro y tren | Dijo que no existían | Los encontramos a mano en Open Data BCN (`transports..csv`) |
| Tiempo real (Entrega 2) | Claude o ChatGPT | Ayudar a conectar las APIs en vivo | Explicó que descargar un endpoint solo da una foto fechada | Cambiamos a consultas desde el navegador, con respaldo en el lago |
| Procesamiento (Entrega 2) | Claude o ChatGPT | Reproyectar coordenadas y aligerar los JSON | Conversión de EPSG:25831 a EPSG:4326 y JSON compacto | Revisamos el resultado en el mapa |
| Código temprano (Entrega 2) | Claude o ChatGPT | Escribir los primeros scripts | Código con claves de fuente arbitrarias | Las alineamos con los ID `F01`–`F30` del diccionario |
| Precios de Alojamiento (2026-11-03) | Claude Code | Corregir los precios absurdos, y agregar fotos y mapa | Causa (moneda y estancias largas), reglas de limpieza, mapa y fichas | Una integrante detectó el error. La página aún no se probó en producción |
| Fotos (2026-11-03) | Claude Code | Conseguir fotos abiertas de hoteles y barrios | 73 barrios y 60 hoteles | Al revisar a ojo se cambiaron la foto de Porta (una puerta en Lleida) y la del Raval, y se quitaron 2 de hoteles. También señaló por error la foto de Navas, que era correcta |
| Sobre Barcelona (2026-11-03) | Claude Code | Crear la página con cifras oficiales, historia y cultura | Página, datos con fuente y script | Pendiente de revisión del equipo: el contenido cultural general no tiene fuente oficial |
| Este README (2026-11-03) | Claude Code | Llenar la plantilla del curso | Este documento y las pruebas de Protección | Encontró la exposición de `listings.csv`. Pendiente de revisión del equipo |

## Revisión cruzada

> **Pendiente:** no hay registro de esta revisión en el repositorio. El equipo debe completar los dos primeros puntos cuando se haga, sin dar por hechos sus resultados.

- **Tres cifras auditadas por el grupo `<X>`:** pendiente. Candidatas: 1.729.963 habitantes, 258 € de mediana por noche y 24.446 alojamientos.
- **Ataque del grupo `<Y>`:** pendiente. Nosotros ya encontramos la exposición de `listings.csv` en una prueba propia.
- **Vueltas atrás en la ruta:**
  - De las vistas al catálogo: empezamos replicando Lima sin usuario claro y volvimos a recortar el catálogo pensando en el turista.
  - De la vista de Alojamiento a la ingesta: un precio de 4 USD nos hizo volver a revisar qué significaba la columna `price`.
  - De la documentación a la publicación: al revisar la protección para este README, encontramos que el crudo estaba expuesto. El arreglo sigue pendiente.

## Anexo: cómo correrlo

El sitio necesita un servidor local, porque carga los JSON con `fetch`:

```bash
python -m http.server 8000
```

Luego abre <http://localhost:8000>. Para regenerar los datos, desde la raíz del repositorio y con `pandas` y `requests` instalados:

```bash
python ingesta/descargar_wikipedia.py            # opcional: refresca fotos y visitas de Wikipedia
python ingesta/descargar_fotos_alojamiento.py    # opcional: refresca fotos de hoteles y barrios
python ingesta/procesar_portada_y_lugares.py
python ingesta/procesar_mapa_y_alojamiento.py
python ingesta/procesar_sobre_barcelona.py
python ingesta/procesar_moverte_y_clima.py
```

Los cuatro `procesar_*` se ejecutaron el 2026-11-03 sin errores. La documentación detallada de la Entrega 2 está en [docs/entrega2-detalle.md](docs/entrega2-detalle.md).
