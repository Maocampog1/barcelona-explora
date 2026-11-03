# Barcelona · sistema de información

Grupo: María Alejandra Ocampo Giraldo (curaduría de datos, estándar visual, Inicio, Sobre Barcelona, Lugares imperdibles e ingesta de Wikipedia) · Camilo Salazar (arquitectura geoespacial, mapa, Alojamiento y anonimización) · César Montoya (tiempo real, Bicing, rutas, Cómo moverte y Clima y ambiente) · Luis Ángel Nerio Pereira (auditoría del catálogo, Sobre el proyecto, bitácora de IA y despliegue)

Enlace: <https://barcelona-explora.vercel.app> · Repositorio: <https://github.com/Maocampog1/barcelona-explora> · Revisado: 2026-11-03

**Documentación:** [Diccionario de datos](docs/Diccionario_de_datos_Barcelona_Explora.xlsx) · [Por qué estos datos](docs/Preguntas_por_que_estos_datos_Barcelona_Explora.docx) · [Matriz de cumplimiento](docs/Matriz_Cumplimiento_Entrega2_Barcelona_Explora.docx) · [Catálogo de fuentes](catalogo/fuentes.csv)

## Las cuatro decisiones

1. **Qué mostrar y qué no:** pasamos de 142 fuentes a 31, todas al servicio de un turista que se organiza solo. Dejamos fuera delitos, presupuestos y contratos municipales porque no le sirven a este usuario.
2. **Si los datos se pueden usar:** copiamos cada licencia tal como aparece en la fuente. La mayoría es «Creative Commons Attribution 4.0», pero calidad del aire dice «See Terms of Use» y Bicing no declara licencia.
3. **Cómo protegemos los datos:** los anfitriones de Airbnb no llegan a la web, el archivo original no se publica, y la renta se muestra como promedio por barrio y solo como contexto.
4. **Cómo tratamos lo aproximado y lo que falta:** los respaldos de Bicing muestran su fecha, las fotos de barrio dicen «Foto de la zona», y un precio que no existe abierto se declara en vez de inventarse.

## Para quién y qué pregunta

- **Usuario:** un turista autosuficiente que visita Barcelona y quiere moverse, dormir, comer y planear su día sin apps de pago.
- **Preguntas:**
  1. ¿Cómo me muevo en bici, bus o metro, y qué tan lejos estoy de cada opción? → `Cómo moverte`, `Explora el mapa`
  2. ¿Qué puedo visitar y qué servicios tengo cerca? → `Lugares imperdibles`, `Explora el mapa`
  3. ¿Dónde me puedo alojar, a qué precio, y cómo es ese barrio? → `Alojamiento`
  4. ¿Qué clima y qué aire voy a encontrar hoy? → `Clima y ambiente`
  5. ¿Qué conviene saber de la ciudad y de quienes la habitan antes de salir? → `Sobre Barcelona`

  Las preguntas 1 a 3 vienen de la Entrega 1. Las preguntas 4 y 5 corresponden a vistas agregadas después.
- **Escala y comparación:** ciudad, 10 distritos y 73 barrios. Se compara entre zonas de Barcelona con filtros por distrito y una tabla de renta por barrio. No se compara con otras ciudades ni se construyen rankings de barrios.
- **Lo que decidimos no mostrar, y por qué:**
  - Delitos, presupuestos y contratos municipales: estaban en el ejemplo de Lima, pero no le sirven a este usuario.
  - Nombre, foto y perfil de los anfitriones de Airbnb: son datos personales.
  - Renta como señal de dónde alojarse: solo aparece como contexto, para no estigmatizar barrios.
  - Fotos de anuncios de Airbnb: son viviendas privadas sin licencia abierta.
  - Precios que no existen o no son creíbles: hoteles y viviendas turísticas no publican precio abierto y no se inventa. Se descartaron 76 anuncios de Airbnb con precios imposibles.

## La réplica

- **Qué replicamos tal cual del ejemplo y qué tuvimos que cambiar para nuestra ciudad:** del ejemplo de Lima replicamos la idea del lago por temas y el catálogo amplio inicial (16 categorías). Cambiamos el foco a un solo usuario, el turista, lo que dejó fuera seguridad y gobernanza. Para Barcelona añadimos Inside Airbnb y viviendas turísticas con licencia, y usamos la XVPCA de la Generalitat para el aire y el feed GBFS del operador de Bicing, porque el de Open Data BCN pedía token y fallaba.
- **Fuentes catalogadas · integradas · caídas · descartadas:** 142 catalogadas · 26 integradas en las vistas, más 5 solo en el lago (31 en total) · 0 caídas · 133 descartadas. Una fila del catálogo inicial puede dar varias fuentes del lago. Registro completo en la hoja `4.Catalogo Inicial` del [diccionario](docs/Diccionario_de_datos_Barcelona_Explora.xlsx) y en [catalogo/fuentes.csv](catalogo/fuentes.csv). Las 5 que solo están en el lago son taxi (F07), agenda (F16), salud (F23), catastro (F24) y terrazas (F30).
- **Huecos: lo que buscamos y no existe abierto para esta ciudad:**
  - Llegadas de metro en tiempo real: la API de TMB pide token, así que el metro se muestra como ubicación fija.
  - Precios de hoteles y de viviendas turísticas: las fichas enlazan a Google Maps para consultarlos.
  - Precios de carta de restaurantes.
  - Fotos abiertas de la mayoría de los hoteles: 58 de 446 tienen foto propia, y los demás muestran una foto de su barrio rotulada como «Foto de la zona».

## ¿Se puede usar?

Resumen por grupo, con la licencia copiada de la fuente el 2026-11-03. Las 31 fuentes, una por una, están en el [diccionario](docs/Diccionario_de_datos_Barcelona_Explora.xlsx).

| Fuente | Licencia | Personas | Estado | Condición |
|---|---|---|---|---|
| Open Data BCN: geografía, transporte, cultura, mercados, miradores, festivos y servicios (F01, F05, F06, F09–F15, F17, F20, F26–F29) | Creative Commons Attribution 4.0 | No | Integradas | Atribuir |
| Open Data BCN: renta por sección censal (F02) | Creative Commons Attribution 4.0 | Solo conteos por zona | Integrada | Atribuir. Se muestra por barrio y solo como contexto |
| Open Data BCN: censo de locales (F08) | Creative Commons Attribution 4.0 | Nombres de negocios | Integrada | Atribuir. Solo locales de comida y ocio |
| Open Data BCN: viviendas turísticas con licencia (F18) | Creative Commons Attribution 4.0 | Sin nombres; dirección hasta piso y puerta | Integrada | Atribuir. La web solo muestra calle y número |
| Open Data BCN: taxi, agenda, salud y terrazas (F07, F16, F23, F30) | Creative Commons Attribution 4.0 | No | Solo en el lago | Atribuir |
| Inside Airbnb (F19) | Creative Commons Attribution 4.0 International License | **Sí:** nombre, foto y perfil del anfitrión | Integrada sin esos campos | Atribuir. El archivo original no se publica |
| Bicing, feed GBFS (F03, F04) | no declara | No | Integradas, en vivo | Respaldo fechado si el feed falla |
| Open-Meteo (F21) | Attribution 4.0 International (CC BY 4.0) | No | Integrada, en vivo | Atribuir. Gratis para uso no comercial |
| Calidad del aire XVPCA (F22) | See Terms of Use | No | Integrada | Citar la fuente |
| Catastro INSPIRE (F24) | This service can be used free of charge in every instance, as long as that the D. G. of the Cadastre (Ministry of Finance) is mentioned as author and owner of the information | No | Solo el índice, en el lago | Mencionar a la D. G. del Catastro |
| Wikipedia y Wikimedia Commons (WIKI) | Texto CC BY-SA 4.0; fotos con la licencia de cada archivo | Autores de fotos | Integrada | Crédito con autor y licencia en cada ficha |
| Cifras e historia de la ciudad (CTX) | Varía por dato: cada uno cita su fuente y URL | No | Integrada | Citar fuente, URL y fecha de consulta |
| Mapa base OpenStreetMap vía OpenFreeMap | ODbL | No | Integrada | Atribución visible en el mapa |

## Bitácora de exploración

Por lo menos dos herramientas probadas en cada tramo, con los mismos criterios. «Estado del proyecto» es el estado de la herramienta según GitHub o su sitio el 2026-11-03.

| Tramo | Herramienta | Qué pidió para empezar | Licencia | Dónde quedan los datos | ¿Se rehace con un comando? | Estado del proyecto | Qué resolvió | Qué no pudo | ¿Quedó? ¿Por qué? |
|---|---|---|---|---|---|---|---|---|---|
| Mapa | MapLibre GL JS 4.7.1 + OpenFreeMap | Nada: sin cuenta, clave ni tarjeta | BSD-3; mapa ODbL | Repositorio y navegador | Sí: `python ingesta/procesar_mapa_y_alojamiento.py` | Activo | Miles de puntos, capas, fichas propias y distancias | No tiene panel visual: todo se programa | **Quedó.** Cumple lo que había que mostrar y proteger |
| Mapa | kepler.gl | Subir el archivo; token de Mapbox para integrarlo | MIT | Navegador, o nube si se exporta | No | Activo | Mapas de calor y filtros en minutos | Interfaz de analista, difícil de acoplar a fichas propias | **No quedó.** Fue la descartada por poco |
| Mapa | Google Maps Platform | Cuenta y tarjeta de crédito | Propietaria | Servidores de Google | No | Servicio comercial | Búsqueda y rutas familiares | Operar sin tarjeta | **No quedó como motor.** Solo enlaces públicos sin clave |
| Ingesta | pandas | `pip install pandas` | BSD-3 | `lago/raw` y `lago/procesado` | Sí: `python ingesta/procesar_portada_y_lugares.py` | Activo | Archivos grandes y cruces | Pide instalar una dependencia | **Quedó** para lo pesado |
| Ingesta | Librería estándar de Python | Nada | PSF | `lago/raw` y `lago/procesado` | Sí: `python ingesta/procesar_moverte_y_clima.py` | Activo | Scripts sin dependencias | Cruces más largos de escribir | **Quedó** para Moverte y Clima |
| Bicing en vivo | Feed GBFS del operador | Nada | no declara | Navegador, con respaldo en el lago | El respaldo sí; lo demás es en vivo | Activo | 543 estaciones en vivo | Lleva solo Bicing, no metro | **Quedó.** Responde sin clave |
| Bicing en vivo | Feed de Open Data BCN | Token | Creative Commons Attribution 4.0 | No se usó | No | Activo | Nada de forma estable | Respondió con fallas persistentes | **No quedó** |
| Edificios | Catastro INSPIRE | Nada | Texto de la D. G. del Catastro | `lago/raw/edificios` | No | Activo | Índice ATOM | El ZIP respondió con una página HTML el 2026-11-03 | **Solo el índice.** Ninguna vista lo usa |
| Edificios | ICGC | Nada | Creative commons atribución 4.0 internacional | No se descargó | No | Activo | Índice de servicio | No dejamos archivo en el lago | **No quedó.** Ninguna vista necesita edificios |
| Rutas y distancias | OSRM público | Nada | BSD-2; datos ODbL | Servidor público de OSRM | No: es en vivo | Activo | Ruta en bici entre dos puntos | Depende de un servidor público | **Quedó** para las rutas |
| Rutas y distancias | Línea recta en MapLibre | Nada | BSD-3 | Navegador | No aplica | Activo | Medir distancia en el mapa | No sigue las calles | **Quedó** para medir |
| Fotos | Wikidata y coordenadas de Commons | Nada | Abierta, por archivo | `assets/img/alojamiento` y `lago/raw/wikipedia` | Sí: `python ingesta/descargar_fotos_alojamiento.py`, con resultado variable | Activo | 58 hoteles y 73 barrios con autor y licencia | Cubrir todos los hoteles | **Quedó.** Google Places pide tarjeta |
| Fotos | Buscador de texto de Commons | Nada | Abierta, por archivo | No se usó | No | Activo | Encontrar por nombre | Respondió «too busy» el 2026-11-03 | **No quedó** |
| Publicación | Vercel | Cuenta conectada al repositorio | Propietaria | Vercel y GitHub | Sí: se despliega al subir a `main` | Servicio comercial | Sitio estático sin compilar | Publica lo que esté en el repositorio | **Quedó.** Sin costo para este proyecto |
| Publicación | Servidor local (`http.server`) | Python | PSF | Tu computador | Sí: `python -m http.server 8000` | Activo | Probar antes de subir | No publica para otros | **Quedó** solo para pruebas |

## Protección

- **Nivel:** abierto para los datos de ciudad · solo agregados para la renta · no se publica para los datos de anfitriones.
- **Qué protegemos, y de quién:** la identidad de los anfitriones de Airbnb, frente a cualquier visitante o programa que descargue nuestros archivos. También protegemos a los barrios de ser estigmatizados por su renta, y evitamos publicar credenciales.
- **Pruebas de terminal o de ventana privada** (2026-11-03, sin sesión iniciada):

| Prueba | Resultado | Lectura |
|---|---|---|
| Buscar `host_id`, `host_name`, `host_url`, `host_picture`, `picture_url` y `listing_url` en los 8 JSON de `lago/procesado` | 0 coincidencias | ✅ La web no recibe esos datos |
| `curl https://barcelona-explora.vercel.app/lago/raw/turismo/listings.csv` y el mismo archivo en `raw.githubusercontent.com` | 206: se descargaba con `host_name`, `host_url` y `host_picture_url` | ❌ **Lo encontramos con esta prueba** y lo corregimos: ver abajo |
| Enlaces a Airbnb en el código del sitio (`/rooms/`) | 0 coincidencias | ✅ Se quitó el botón que llevaba al anuncio |
| Identificador de los anuncios en `alojamiento.json` | `airbnb-1` a `airbnb-13279` | ✅ Seudónimo: ya no lleva a la página del anfitrión |
| `curl .../.env` y `curl .../.git/config` en producción | 404 | ✅ No se publican |
| Buscar correos y teléfonos en los JSON | Solo créditos de foto y teléfonos de instituciones | ✅ Revisado por campo |
| Títulos de anuncios de Airbnb, que son texto libre | 81 de 13.279 parecen incluir un nombre de persona | ⚠️ Los escribió cada anfitrión y aún se muestran |

  **Corrección del 2026-11-03:** sacamos `listings.csv` de lo que se sube y se publica (`.gitignore`), quitamos su enlace de las fichas y reemplazamos el id real por un seudónimo. Para regenerar los datos se descarga de la URL que indica el diccionario. El archivo sigue en commits anteriores del historial de git.

- **Revisión de secretos en el historial:** `.env` está en `.gitignore`, nunca entró al historial (0 commits) y da 404 en GitHub y en producción. Solo contiene `BICING_TOKEN`, que ningún archivo de `ingesta/` ni del sitio usa. Una búsqueda de patrones de claves (AWS, GitHub, OpenAI, Google, Slack, llaves privadas y asignaciones de `api_key`, `secret` o `password`) en todo el historial dio 0 coincidencias en los archivos de código y texto. No cubre los archivos de `lago/`, y la hicimos con `git log -G`, no con una herramienta especializada.

## Herramienta elegida para las vistas

- **Qué necesitábamos mostrar:** un sitio de 8 vistas para celular, con más de 34.000 puntos en mapa, capas, filtros, fichas con su fuente y datos en vivo de Bicing y del clima.
- **Qué teníamos que proteger:** los datos de anfitriones, que no debían llegar al navegador, y el proyecto, que no debía depender de claves ni tarjetas.
- **Por qué esta herramienta cumple las dos cosas, y cuál descartamos por poco:** elegimos **HTML, CSS y JavaScript sin frameworks, con MapLibre GL JS y OpenFreeMap**. El navegador solo recibe los JSON que dejamos pasar en `lago/procesado`, así que la anonimización ocurre antes de publicar, y no pide cuenta, clave ni tarjeta. Descartamos por poco **kepler.gl**: es muy buena para explorar, pero su interfaz es para analistas y es difícil de acoplar a un sitio multipágina con fichas propias.

## Nuestra posición

- **Gestión y gobierno de datos: un dato abierto no es un dato listo para usar.** Pasar de 142 fuentes a 31 nos mostró que catalogar sin un usuario claro produce un inventario, no un sistema. Y que un campo con formato correcto puede significar otra cosa: la columna `price` de Inside Airbnb lleva `$`, pero `price_quote_raw` dice `EUR` en los 13.355 anuncios con precio, y parte de esos precios son descuentos de estancias de hasta 250 noches. El sitio llegó a mostrar habitaciones a 4 USD la noche hasta que una integrante del equipo notó que no era creíble. **Evidencia:** ahora el precio por noche solo sale de cotizaciones de hasta 7 noches (de 28 € a 6.151 €, mediana 258 €), 5.288 anuncios se muestran por mes, y 76 se descartan con reglas escritas en `ingesta/procesar_mapa_y_alojamiento.py`.
- **Ciberseguridad: proteger la vista no es proteger el dato.** Creíamos resuelta la privacidad porque el JSON de la web no traía anfitriones, y esa parte era cierta. Pero al probar como lo haría un atacante, el archivo crudo se descargó desde la dirección pública, sin sesión y con un enlace en nuestro propio sitio. **Evidencia:** las pruebas de [Protección](#protección) y la corrección que hicimos. Lo que tomamos de esto es que hay que probar el sistema publicado desde afuera, y que un lago público no puede guardar lo que la vista promete ocultar. La revisión de secretos sí salió bien porque `.env` se ignoró desde el inicio.

## Bitácora de IA

Registro detallado en la hoja `3. Bitácora IA` del [diccionario](docs/Diccionario_de_datos_Barcelona_Explora.xlsx). Donde dice «No quedó registrada», no anotamos qué asistente se usó en ese momento.

| Tramo | Herramienta | Qué le encargamos | Qué entregó | Qué le corregimos |
|---|---|---|---|---|
| Búsqueda de fuentes (Entrega 1) | Claude | Mínimo 100 fuentes para Barcelona | 134 fuentes, casi todas con enlace a la raíz del portal | Verificamos las páginas exactas de las que usamos |
| Licencias (Entrega 1) | Claude | Revisar la licencia de Inside Airbnb | Alertó que las copias en Kaggle e IBM decían CC0 | Lo confirmamos en el sitio de Inside Airbnb |
| Metro y tren (Entrega 1) | Claude | Buscar si había un dataset en Open Data BCN | Dijo que no lo encontraba | Otra búsqueda encontró `transports..csv` |
| Bicing (Entrega 1) | Claude | Ubicar el feed en tiempo real | Primero un portal y un dataset que pedía token | Tras varias fallas, llegamos al feed GBFS del operador |
| Tiempo real (Entrega 2) | No quedó registrada | Ayudar a conectar las APIs en vivo | Explicó que descargar un endpoint solo da una foto fechada | Cambiamos a consultas desde el navegador, con respaldo en el lago |
| Código temprano (Entrega 2) | No quedó registrada | Escribir los primeros scripts | Códigos de fuente que no coincidían con el Excel | Los alineamos con el diccionario |
| Precios de Alojamiento | Claude Code | Corregir precios absurdos | Causa (moneda y estancias largas) y reglas de limpieza | Una integrante detectó el error y pidió corregirlo |
| Fotos | Claude Code | Conseguir fotos abiertas de hoteles y barrios | 73 barrios y 60 hoteles | A ojo se cambió la foto de Porta (una puerta en Lleida) y la del Raval, y se quitaron 2 de hoteles. También señaló por error la de Navas, que era correcta |
| Protección y documentación | Claude Code | Llenar este README y actualizar el diccionario | Pruebas desde afuera, licencias textuales y 949 campos validados contra el lago | Encontró `listings.csv` expuesto; el equipo decidió sacarlo de lo publicado |

## Revisión cruzada

- **Vueltas atrás en la ruta:**
  - De las vistas al catálogo: empezamos replicando Lima sin usuario claro y volvimos a recortar el catálogo pensando en el turista.
  - De la vista de Alojamiento a la ingesta: un precio de 4 USD nos hizo volver a revisar qué significaba la columna `price`.
  - De la documentación a la publicación: al revisar la protección para este README, encontramos el archivo crudo expuesto y lo sacamos de lo publicado.
  - Del diccionario al lago: al comparar el Excel con los archivos reales, corregimos rutas y campos, y quitamos F25, que nunca se descargó.

## Anexo: cómo correrlo

El sitio necesita un servidor local, porque carga los JSON con `fetch`:

```bash
python -m http.server 8000
```

Luego abre <http://localhost:8000>. Para regenerar los datos, desde la raíz del repositorio y con `pandas` y `requests` instalados:

```bash
# Primero descarga listings.csv (URL en la fila F19 del diccionario) y déjalo en lago/raw/turismo/
python ingesta/descargar_wikipedia.py            # opcional: refresca fotos y visitas de Wikipedia
python ingesta/descargar_fotos_alojamiento.py    # opcional: refresca fotos de hoteles y barrios
python ingesta/procesar_portada_y_lugares.py
python ingesta/procesar_mapa_y_alojamiento.py
python ingesta/procesar_sobre_barcelona.py
python ingesta/procesar_moverte_y_clima.py
```

Los cuatro `procesar_*` se ejecutaron el 2026-11-03 sin errores. La documentación detallada de la Entrega 2 está en [docs/entrega2-detalle.md](docs/entrega2-detalle.md).
