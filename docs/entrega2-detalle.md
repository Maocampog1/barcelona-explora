> **Documento de apoyo, con fecha.** Es la documentación detallada de la Entrega 2, tal como estaba en el último commit de `main`. El documento vigente es el [README principal](../README.md).
> Algunas cifras cambiaron después (por ejemplo, ahora hay 32 fuentes y 8 vistas). Además, su afirmación de que nadie puede reconstruir la identidad de los anfitriones **no es correcta**, porque `listings.csv` sigue publicado: ver la sección Protección del README.

# Barcelona Explora · Gemelo Digital de Barcelona

> **Tópicos en Sistemas de Información · Taller de Datos (Entrega 2)**  
> **Universidad EAFIT · Semestre 2026-2**  
> **Sistema publicado:** [https://barcelona-explora.vercel.app](https://barcelona-explora.vercel.app) *(o desplegable en local con `python -m http.server`)*  
> **Repositorio del lago y código:** [https://github.com/Maocampog1/barcelona-explora](https://github.com/Maocampog1/barcelona-explora)

### Equipo de Desarrollo
- **María Alejandra Ocampo Giraldo** · Curaduría de datos, estándar visual trencadís, Portada, Lugares imperdibles e ingesta de Wikipedia.
- **Camilo Salazar** · Arquitectura geoespacial, MapLibre + OpenFreeMap, Alojamiento, anonimización de anfitriones y distancias.
- **César Montoya** · Sistemas en tiempo real, Bicing GBFS en vivo + fallback, enrutamiento OSRM, bus, metro y Clima y ambiente.
- **Luis Ángel Nerio Pereira** · Auditoría y trazabilidad del catálogo de fuentes (`F01–F30`), Sobre el proyecto, bitácora de IA y despliegue.

---

## 1. Resumen de Decisiones (en pocas líneas)

- **Qué decidimos mostrar y qué dejamos fuera:** Redujimos el catálogo inicial exploratorio de **142 fuentes en 16 categorías** a **30 fuentes consolidadas en el lago** y **17+ activas en pantalla**, enfocando el sistema al 100% en el **turista autosuficiente** que necesita resolver movilidad, alojamiento, atractivos, clima y servicios básicos sin pagar por aplicaciones. Descartamos deliberadamente presupuestos municipales, contratos públicos y delitos por carecer de valor para este usuario y arriesgar desinformación.
- **Si los datos se pueden usar (Licencias):** El 100% de los datos provienen de fuentes abiertas y reutilizables: licencia **Creative Commons Attribution 4.0 (CC BY 4.0)** en Open Data BCN, Inside Airbnb y Open-Meteo; **CC BY-SA 4.0** en textos de Wikipedia y licencias libres de Wikimedia Commons; datos abiertos del operador en Bicing (feed estándar **GBFS v3.0**) y datos abiertos de la Generalitat de Catalunya para calidad del aire (**XVPCA**).
- **Cómo protegimos los datos (Pregunta 5 de la Entrega 1):** Aplicamos **Privacidad por Diseño (Privacy by Design)** en los scripts de ingesta en Python: suprimimos radicalmente `host_id`, `host_name`, foto y URL de los anfitriones de Airbnb (`F19`) antes de serializar el JSON web. Asimismo, la renta disponible por habitante (`F02`) se presenta agregada por barrio exclusivamente como contexto macroeconómico, advirtiendo al usuario que no debe usarse para juzgar la seguridad de una zona ni estigmatizar vecindarios.
- **Manejo de datos PROXY y pendientes:** Honestidad y trazabilidad técnica en la interfaz. Cuando las APIs en streaming (`F03` Bicing o `F21` Open-Meteo) sufren caídas de red o restricciones CORS, el sitio degrada automáticamente al último snapshot fechado del lago marcado con una etiqueta visible: `DATO PROXY / Snapshot de respaldo (2026-10-01T16:05:52Z)`. La red de metro (`F05`) se declara abiertamente como `Sin tiempo real · pendiente` debido a la exigencia de token cerrado de TMB.

---

## 2. Bitácora de Exploración de Herramientas: Mapas

Probamos el mismo conjunto de datos espaciales del lago (`lago/procesado/mapa.json`, con más de 10.000 puntos de gastronomía, turismo, alojamiento y movilidad) en tres plataformas diferentes para justificar la elección técnica final:

| Criterio de Rúbrica | 1) MapLibre GL JS + OpenFreeMap <br>*(Elegida)* | 2) kepler.gl <br>*(Casi elegida / Descartada)* | 3) Google Maps Platform <br>*(Descartada)* |
| :--- | :--- | :--- | :--- |
| **1. ¿Qué pidió para empezar?** | Cero llaves, cero cuentas y cero tarjetas. Únicamente descargar el paquete JS/CSS localmente (`assets/vendor/maplibre-gl/`) y apuntar al estilo libre de OpenFreeMap. | Node.js/React para integrarlo como componente o crear una cuenta y token de acceso en Mapbox si se exportaba la aplicación compartida. | Crear una cuenta en Google Cloud Platform y **asociar obligatoriamente una tarjeta de crédito** bancaria. |
| **2. ¿Qué licencia tiene?** | Código: **BSD 3-Clause** (100% libre). Cartografía: **ODbL** (OpenStreetMap). | Código: **MIT License**. Sin embargo, sus estilos de mapa base predeterminados dependen de tokens comerciales de Mapbox. | Propietaria y cerrada, sujeta a cuotas y límites de consumo por encima del crédito de facturación. |
| **3. ¿Dónde quedan los datos al publicar?** | En el propio repositorio GitHub y en el navegador del usuario. Soberanía e integridad total del lago. | En la memoria del cliente o en buckets cloud de Kepler/Mapbox si se genera el enlace exportado. | En los servidores de Google al enviar las peticiones y coordenadas de búsqueda. |
| **4. ¿Qué resolvió?** | Renderizado vectorial WebGL de alto rendimiento para miles de puntos, control granular de capas, popups personalizados con estándar Gaudí, cálculo de distancia recta y rutas ciclistas/peatonales OSRM. | Excelente entorno de análisis visual exploratorio: mapas de calor, filtrado interactivo por rangos de precio con deslizadores y visualización 3D rápida. | Búsquedas de lugares y cálculo de rutas sumamente familiares para el público general. |
| **5. ¿Qué no resolvió?** | No cuenta con panel gráfico "no-code": toda capa, filtro y evento debe programarse manualmente en JavaScript. | Muy rígido y pesado para personalizar como sitio web multipágina: difícil de acoplar a nuestra navbar compartida, modales de trazabilidad y estética Gaudí. | Incumplía la regla de oro del taller: requería tarjeta de crédito bancaria para operar sin cortes. |
| **6. ¿Por qué quedó o no quedó?** | **QUEDÓ:** Es ligera, 100% gratuita, auditable, almacena los datos en el lago y respeta el estándar visual del proyecto. | **DESCARTADA:** Gran herramienta para el analista de datos en su computador; inadecuada para el turista móvil en un sitio interactivo a medida. | **DESCARTADA:** Descartada de raíz por barrera financiera (exigencia de tarjeta bancaria). |

---

## 3. Preguntas de la Entrega 1: Respondidas vs. Pendientes

| Pregunta de la Entrega 1 | Fuentes Asociadas | Estado de Cumplimiento | Qué resuelve hoy en el sitio web | Qué queda pendiente / abierto |
| :--- | :--- | :--- | :--- | :--- |
| **1. Movilidad:** *¿Cómo me puedo mover por la ciudad haciendo uso de bicicleta, bus, taxi o metro, y qué tan lejos estoy de cada opción?* | `F03`, `F04`, `F05`, `F06`, `F07` | **Respondida parcialmente (con alcance claro)** en `05 Cómo moverte` y `03 Explora el mapa` | Consulta en tiempo real de **543 estaciones de Bicing** (`F03`, `F04`) vía GBFS oficial con hora UTC, trazado de rutas en bici OSRM, paradas de autobús (`F06`) y estaciones de metro/FGC (`F05`) en mapa con filtros por distrito. | **Llegadas de metro en tiempo real:** La API de TMB exige token cerrado; las estaciones se muestran con ubicación estática y badge `Sin tiempo real · pendiente`. Las paradas de taxi (`F07`) están en el lago crudo. |
| **2. Atractivos y Servicios:** *¿Qué puedo visitar cerca de mí, como puntos de interés, museos, bibliotecas, miradores o eventos de la agenda?* | `F10`, `F11`, `F12`, `F13`, `F14`, `F15`, `F16`, `F08`, `F09`, `F30`, `WIKI` | **Respondida con curaduría y ranking real** en `02 Lugares imperdibles`, `01 Portada` y `03 Explora el mapa` | 78 hitos curados (Gaudí `F11`, museos `F12`, miradores `F14`, mercados `F10`) clasificados por **popularidad real de visitas en Wikipedia a 12 meses** (`WIKI`), 10.000+ locales de comida (`F08`, `F09`) y servicios al turista en datos curiosos (WiFi `F26`, baños `F27`, duchas `F28`, refugios `F29`). | **Precios de carta de restaurantes:** No existe fuente pública abierta; se suple mostrando locales en planta baja (`F08`) y terrazas autorizadas con capacidad (`F30`). Eventos de agenda (`F16`) y festivos (`F15`) se reservan en el lago. |
| **3. Alojamiento:** *¿Dónde me puedo alojar, y cómo es ese barrio en renta, oferta de hoteles, viviendas turísticas o Airbnb?* | `F02`, `F17`, `F18`, `F19` | **Respondida al 100% con protección ética** en `04 Alojamiento` y `03 Explora el mapa` | Consolidación de más de 24.000 registros: 400+ hoteles oficiales (`F17`), 9.000+ viviendas turísticas con licencia HUTB (`F18`) y 15.000+ anuncios de Inside Airbnb (`F19`) con precio por noche, zona, y tabla de renta por habitante (`F02`) como contexto. | Ninguno. Se respondió completamente integrando la advertencia explícita de no usar la renta como ranking de seguridad. |

---

## 4. Bitácora de IA Actualizada (Aciertos y Errores)

A lo largo de las Entregas 1 y 2, documentamos el papel de los asistentes de Inteligencia Artificial (Claude / ChatGPT) en la toma de decisiones:

- **Acierto #1 (Verificación de Licencia F19):** Al consultar por listados de Airbnb, la IA alertó que las réplicas en Kaggle e IBM declaraban erróneamente CC0, mientras que el portal primario oficial (*Inside Airbnb*) establecía claramente la licencia **CC BY 4.0**. Esto evitó un problema de atribución legal desde el día 1.
- **Acierto #2 (ETL y compresión para producción):** La IA asistió en la vectorización matemática de coordenadas geográficas (reproyección de EPSG:25831 a EPSG:4326) y en la técnica de serialización compacta (JSON sin saltos de línea ni indentación para `mapa.json` y `alojamiento.json`), ahorrando megabytes de transferencia móvil.
- **Error / Aprendizaje #1 (APIs en streaming vs. Snapshots estáticos):** En las primeras reuniones creímos que una API como Bicing (`F03`) o Open-Meteo (`F21`) se "vinculaba" al repositorio y quedaba actualizándose sola. Comprendimos que descargar el endpoint solo genera un archivo estático fechado, y que para lograr el tiempo real verdadero se debía programar un cliente `fetch` en el navegador del usuario respaldado por snapshots de contingencia en el lago.
- **Error #2 (Falso negativo en Open Data BCN - F05):** Al preguntarle a la IA si el Ayuntamiento disponía de un dataset con todas las paradas de metro y tren urbano, respondió inicialmente que no existía. Al contrastar manualmente en el catálogo encontramos `transports..csv`. Esto reafirmó que la IA es una herramienta de asistencia exploratoria, pero nunca el auditor final de verdad.
- **Error #3 (Desfase de identificadores en borradores tempranos):** En las primeras pruebas de código algunos scripts empleaban claves arbitrarias; auditamos el código completo para que cada referencia en el frontend (`abrirFicha`) empate de forma unívoca con los identificadores `F01` a `F30` del diccionario Excel oficial.

---

## 5. Posición del Equipo frente a las 2 Reflexiones del Taller

### Reflexión 1: Sobre los Datos (Curaduría con propósito vs. Publicar todo)
El ejercicio de arrancar con 142 fuentes y descartar más de 110 nos enseñó que **un lago de datos sin un usuario claro es un vertedero digital**. En el sector público existe la tentación de "liberar todo sin procesar", pero arrojar tablas de presupuestos o series estadísticas complejas a un ciudadano común produce desinterés o malas interpretaciones.  
Al enfocar el gemelo digital en el turista autosuficiente, la curaduría se convirtió en una responsabilidad ética: abrir la renta disponible por habitante (`F02`) a nivel de sección censal sin filtros hubiera permitido generar rankings amarillistas de "barrios pobres", estigmatizando sectores populares de Barcelona. Decidimos procesar los datos con un propósito claro, agregando la información donde era necesario y enmarcándola con advertencias para evitar sesgos territoriales.

### Reflexión 2: Sobre la Seguridad y Privacidad (Privacy by Design y Soberanía)
La transparencia urbana no puede construirse a costa de la intimidad de las personas. Los anuncios de alquiler temporal (`F19`) incluían fotos, nombres de pila y enlaces de perfiles de vecinos de la ciudad. El equipo adoptó una postura tajante: **la privacidad se resuelve en el pipeline de datos (backend/ETL), jamás con estilos cosméticos en el navegador**. Si un dato personal viaja en el JSON al cliente, la privacidad ya fue vulnerada. Suprimir los identificadores en `procesar_mapa_y_alojamiento.py` garantiza que nadie pueda reconstruir la identidad de los anfitriones inspeccionando el código de la página.  
Asimismo, la soberanía tecnológica exige no atar un proyecto público a tarjetas de crédito bancarias ni monopolios privados: utilizar MapLibre GL JS y OpenFreeMap garantiza que el sistema siga operando indefinidamente a costo cero, sin riesgo de apagón por vencimiento de créditos.

---

## 6. Guía para la Presentación en Vivo (Las 3 preguntas de clase)

1. **¿Qué herramienta descartaron que casi eligen?**  
   **kepler.gl:** Estuvo a punto de ser nuestro motor cartográfico. Es fantástica para el análisis exploratorio rápido (mapas de calor de Airbnb, filtros temporales), pero la descartamos porque era demasiado rígida y pesada para ensamblar una experiencia turística integral: no permitía incrustar fácilmente nuestro menú de navegación, modales de trazabilidad técnica, cálculo de rutas OSRM ni el estándar visual trencadís. Elegimos **MapLibre GL JS + OpenFreeMap**.
2. **¿Qué decidieron no mostrar?**  
   - Los datos personales de los anfitriones de Airbnb (`F19`: nombres, fotos, perfiles).
   - La renta por sección censal desagregada como un indicador de inseguridad o "zonas no recomendadas" (`F02`).
   - El catálogo inicial de 112 fuentes no turísticas (delitos, contratos municipales, presupuestos de gobierno).
3. **¿Qué tendría que cambiar para que la respuesta fuera otra?**  
   - Si Transports Metropolitans de Barcelona (TMB) abriera un endpoint público sin token cerrado de registro, el metro pasaría inmediatamente de ser un dato estático a un widget en tiempo real como Bicing.
   - Si existiera una API abierta de hostelería con precios reales de menús, la habríamos incorporado para sustituir la estimación basada en terrazas (`F30`) y censo de locales (`F08`).
   - Si el público objetivo fuera el Departamento de Urbanismo del Ayuntamiento en lugar del turista, herramientas analíticas densas como **kepler.gl** habrían tenido pleno sentido.

---

## 7. Estructura del Lago de Datos y Repositorio

```text
lago/
├── raw/                      ← Datos originales crudos tal como llegan del publicador
│   ├── geo/                  ← F01: Unidades administrativas, barrios y distritos (llave maestra)
│   ├── transporte/           ← F03–F07: Bicing (en vivo y snapshot), bus, metro/FGC, taxi
│   ├── turismo/              ← F08–F19, F30: Hoteles, HUTs, Airbnb, locales, miradores, terrazas
│   ├── economia_vivienda/    ← F02: Renta disponible por persona (sección censal)
│   ├── ambiente_satelite/    ← F20–F22: Arbolado viario, Open-Meteo y calidad de aire XVPCA
│   ├── municipio/            ← F23: Hospitales y centros de atención primaria
│   ├── edificios/            ← F24, F25: Catastro INSPIRE e ICGC para el gemelo 3D
│   ├── servicios_turista/    ← F26–F29: WiFi municipal, baños públicos, duchas y refugios climáticos
│   └── wikipedia/            ← WIKI: Resúmenes, autores de fotos y visitas de Wikipedia a 12 meses
└── procesado/                ← JSONs optimizados listos para consumo web (salen de ingesta/)
```

### El Sitio Web (Arquitectura en 7 Vistas)
- `index.html` — **01 Portada:** Reloj y clima en vivo de Barcelona, carrusel de datos curiosos y accesos rápidos.
- `lugares.html` — **02 Lugares imperdibles:** 78 hitos curados, filtros por tipo, ranking por visitas en Wikipedia y ficha de fuente.
- `mapa.html` — **03 Explora el mapa:** MapLibre + OpenFreeMap, capas activables de turismo, restaurantes, Bicing y hoteles, y medición de distancias.
- `alojamiento.html` — **04 Alojamiento:** 24.000+ opciones (hoteles, HUTs, Airbnb anonimizado) y tabla de contexto de renta.
- `moverte.html` — **05 Cómo moverte:** Bicing en tiempo real vía GBFS oficial con fallback a snapshot, paradas de bus, estaciones de metro y rutas ciclistas OSRM.
- `clima.html` — **06 Clima y ambiente:** Pronóstico meteorológico por hora en vivo (Open-Meteo), calidad del aire de estaciones XVPCA y arbolado viario.
- `proyecto.html` — **07 Sobre el proyecto:** Arquitectura en 3 capas, respuestas a la Entrega 1, comparativa técnica, bitácora de IA y catálogo interactivo de las 30 fuentes del lago.

---

## 8. Guía de Ejecución y Reproducibilidad

### Probar el sitio en local
Dado que el frontend realiza peticiones locales `fetch` a la carpeta `lago/procesado/`, debe servirse mediante un servidor HTTP local (abrir con doble clic bloquea las peticiones por seguridad CORS):
```bash
python -m http.server 8000
```
Abrir `http://localhost:8000` en cualquier navegador moderno.

### Regenerar los datos del lago (ETL en Python)
Todos los scripts se ejecutan desde la raíz del repositorio:
1. **Refrescar popularidad y fotos de Wikipedia:**  
   `python ingesta/descargar_wikipedia.py` *(requiere `requests`)*
2. **Procesar Portada y Lugares imperdibles:**  
   `python ingesta/procesar_portada_y_lugares.py` *(requiere `pandas`)*
3. **Procesar Mapa y Alojamiento (anonimización de Airbnb y polígonos):**  
   `python ingesta/procesar_mapa_y_alojamiento.py` *(requiere `pandas`)*
4. **Procesar Moverte y Clima/Ambiente:**  
   `python ingesta/procesar_moverte_y_clima.py` *(utiliza exclusivamente la librería estándar de Python)*
