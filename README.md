# barcelona-explora

Gemelo digital de Barcelona pensado para el turista: datos abiertos de movilidad, alojamiento, gastronomía, lugares de interés y ambiente, con una capa en tiempo real.

Taller de Datos — Tópicos de Sistemas de Información · Replica, con enfoque propio, el ejemplo de Lima que puso el profesor.

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

ingesta/                      ← scripts que descargan y actualizan cada fuente
```

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

- No existe ninguna fuente abierta de **precios de restaurantes** en Barcelona.
- No se integró todavía una fuente de **metro en tiempo real** (la API de TMB la tiene, pero pide token).

## Equipo

Camilo Salazar · Luis Ángel Nerio · César Montoya · Maria Alejandra Ocampo Giraldo
