/* =========================================================================
   Barcelona Explora — Lógica de "Sobre el proyecto" (08)
   Catálogo de las 32 fuentes del lago (F01–F30) + Wikipedia (WIKI) + contexto (CTX),
   filtros dinámicos y modal de trazabilidad detallada al clic.
   ========================================================================= */

const FUENTES_PROYECTO = [
  {
    id: "F01",
    nombre: "Unidades administrativas de Barcelona (distritos, barrios, AEB y secciones censales)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Estático / Vigente (publicado 2019-12-13)",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["01 Inicio", "02 Sobre Barcelona", "03 Lugares imperdibles", "04 Explora el mapa", "05 Alojamiento", "06 Cómo moverte", "07 Clima y ambiente"],
    archivo: "lago/raw/geo/BarcelonaCiutat_Barris.csv",
    archivo_extra: "lago/raw/geo/BarcelonaCiutat_Districtes.csv y 0301100100_UNITATS_ADM_POLIGONS.json",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/20170706-districtes-barris",
    pregunta: "¿En qué distrito y barrio se encuentra cada punto de la ciudad? ¿Cuáles son los límites geográficos oficiales?",
    observaciones: "Es la llave maestra de cruce (codi_barri y codi_districte) que une todos los datos del lago. Los polígonos originales en EPSG:25831 se reproyectan a EPSG:4326 para MapLibre."
  },
  {
    id: "F02",
    nombre: "Renta disponible de los hogares por persona (€) por sección censal",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Anual (corte 2023, el más reciente publicado)",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["05 Alojamiento"],
    archivo: "lago/raw/economia_vivienda/2023_renda_disponible_llars_per_persona.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/dataset/renda-disponible-llars-bcn",
    pregunta: "¿Cómo varía el nivel de renta de cada barrio como contexto socioeconómico para el viajero?",
    observaciones: "Dato sensible (Pregunta 5 de la Entrega 1). Se mantiene estrictamente agregado por barrio y no por sección censal individual, utilizándose como contexto general y nunca como recomendación de zonas seguras o inseguras."
  },
  {
    id: "F03",
    nombre: "Bicing — estado en vivo de las estaciones (GBFS oficial)",
    publicador: "Bicing / Lyft (operador oficial del sistema)",
    tipo_publicador: "Empresa privada concesionaria",
    licencia: "Datos abiertos del operador (formato estándar GBFS v3.0)",
    tipo: "streaming",
    frecuencia: "Tiempo real (lectura minuto a minuto)",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["06 Cómo moverte", "04 Explora el mapa"],
    archivo: "lago/raw/transporte/bicing_estado_2026-10-01.json",
    url_origen: "https://barcelona.publicbikesystem.net/customer/gbfs/v3.0/station_status",
    pregunta: "¿Hay bicicletas disponibles y anclajes libres en la estación donde estoy ahora mismo?",
    observaciones: "En 'Cómo moverte' se consume directamente en vivo desde el navegador. Si la red o CORS fallan, degrada elegantemente al snapshot del lago fechado como DATO PROXY."
  },
  {
    id: "F04",
    nombre: "Bicing — ubicación y capacidad de estaciones (GBFS oficial)",
    publicador: "Bicing / Lyft (operador oficial del sistema)",
    tipo_publicador: "Empresa privada concesionaria",
    licencia: "Datos abiertos del operador (formato estándar GBFS v3.0)",
    tipo: "streaming",
    frecuencia: "Tiempo real / Actualización continua",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["06 Cómo moverte", "04 Explora el mapa"],
    archivo: "lago/raw/transporte/bicing_ubicacion_2026-10-01.json",
    url_origen: "https://barcelona.publicbikesystem.net/customer/gbfs/v3.0/station_information",
    pregunta: "¿Dónde está ubicada cada estación de Bicing y cuál es su capacidad máxima de anclajes?",
    observaciones: "Complementa a F03 con latitud, longitud, dirección y capacidad física de cada estación en el mapa."
  },
  {
    id: "F05",
    nombre: "Transportes públicos de Barcelona (metro, Renfe, FGC, funicular, tranvía)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["06 Cómo moverte"],
    archivo: "lago/raw/transporte/transports..csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/transports",
    pregunta: "¿Dónde están ubicados los accesos y estaciones de metro y tren urbano para moverme por Barcelona?",
    observaciones: "Marcado con badge 'Sin tiempo real · pendiente': muestra la ubicación física exacta de las estaciones, ya que la API de tiempos de espera en vivo de TMB requiere token privado."
  },
  {
    id: "F06",
    nombre: "Paradas de bus de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["06 Cómo moverte"],
    archivo: "lago/raw/transporte/estacions-bus.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/estacions-bus",
    pregunta: "¿Qué parada de autobús tengo más cerca y qué líneas de bus transitan por ella?",
    observaciones: "Permite geolocalizar más de 2.000 postes y marquesinas de autobuses urbanos TMB en la capa de movilidad."
  },
  {
    id: "F07",
    nombre: "Paradas de taxi de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "lago",
    vistas: ["Lago crudo / Pendiente de visualización"],
    archivo: "lago/raw/transporte/parades-de-taxi.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/parades-taxi",
    pregunta: "¿Dónde hay paradas oficiales de taxi en la calle para tomar transporte rápido?",
    observaciones: "Forma parte del catálogo de la Entrega 1. Almacenada y limpia en el lago; su visualización en mapa está proyectada para futuras iteraciones."
  },
  {
    id: "F08",
    nombre: "Censo de locales en planta baja destinados a actividad económica",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Trienal / Anual (censo 2024)",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["04 Explora el mapa"],
    archivo: "lago/raw/turismo/censo_locales_2024.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/cens-comercial-bcn",
    pregunta: "¿Dónde están los restaurantes, bares, cafeterías y locales de ocio nocturno en planta baja?",
    observaciones: "Filtrado en Python por ingesta/procesar_mapa_y_alojamiento.py para extraer más de 10.000 puntos de restauración y vida nocturna con sus coordenadas exactas."
  },
  {
    id: "F09",
    nombre: "Códigos y descripciones de las actividades del censo de locales",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Estático",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["04 Explora el mapa"],
    archivo: "lago/raw/turismo/2019_censcomercialbcn_class_act.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/cens-comercial-classificacio-activitats",
    pregunta: "¿Qué subtipo específico de actividad comercial o gastronómica opera en cada local?",
    observaciones: "Tabla maestra de codificación utilizada internamente en el pipeline ETL para clasificar F08 en 'Restaurante', 'Bar', 'Cafetería' u 'Ocio nocturno'."
  },
  {
    id: "F10",
    nombre: "Mercados municipales de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["03 Lugares imperdibles", "01 Inicio", "04 Explora el mapa"],
    archivo: "lago/raw/turismo/opendatabcn_mercats-centrescomercials_mercats-municipals.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/mercats-municipals",
    pregunta: "¿Dónde están los mercados gastronómicos tradicionales (como la Boqueria, Sant Antoni o Santa Caterina)?",
    observaciones: "Geolocalización, teléfonos y descripciones de los 39 mercados municipales tradicionales integrados a la guía visual."
  },
  {
    id: "F11",
    nombre: "Puntos de interés cultural y turístico (PICS)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización continua",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["03 Lugares imperdibles", "01 Inicio", "04 Explora el mapa"],
    archivo: "lago/raw/turismo/opendatabcn_pics-csv.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/punts-interes-turisme",
    pregunta: "¿Cuáles son los principales monumentos e hitos arquitectónicos que no me puedo perder?",
    observaciones: "Aporta monumentos de Gaudí (Sagrada Família, Casa Batlló, La Pedrera) y patrimonio histórico de la ciudad."
  },
  {
    id: "F12",
    nombre: "Bibliotecas y museos de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["03 Lugares imperdibles", "04 Explora el mapa"],
    archivo: "lago/raw/turismo/opendatabcn_cultura_biblioteques-i-museus.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/cultura-biblioteques-museus",
    pregunta: "¿Qué museos y centros de exhibición artística están abiertos en la ciudad?",
    observaciones: "Incluye el MNAC, Museu Picasso, Fundació Joan Miró y centros culturales con horarios y direcciones."
  },
  {
    id: "F13",
    nombre: "Espacios y equipamientos de cultura y ocio",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["03 Lugares imperdibles"],
    archivo: "lago/raw/turismo/opendatabcn_llista-equipaments_cultura-csv.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/equipaments-cultura",
    pregunta: "¿Qué teatros, salas de conciertos y equipamientos de ocio complementan la oferta cultural?",
    observaciones: "Utilizado en el pipeline de ingesta para consolidar el inventario exhaustivo de espacios de visita turística."
  },
  {
    id: "F14",
    nombre: "Miradores de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["03 Lugares imperdibles", "04 Explora el mapa"],
    archivo: "lago/raw/turismo/opendatabcn_NP-NASIA_Miradors-csv.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/miradors",
    pregunta: "¿Cuáles son los miradores oficiales con las mejores vistas panorámicas de la ciudad y el mar?",
    observaciones: "Identifica los Búnkers del Carmel, Mirador de Montjuïc, Tibidabo y miradores costeros."
  },
  {
    id: "F15",
    nombre: "Calendario de festivos de Barcelona (iCalendar / ICS)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Anual",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["02 Sobre Barcelona"],
    archivo: "lago/raw/turismo/calendarifestius_es.ics",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/calendari-festius",
    pregunta: "¿Qué días del año son festivos en Barcelona para prever cierres comerciales?",
    observaciones: "ingesta/procesar_sobre_barcelona.py lee el .ics y la página muestra los próximos festivos con esta fuente."
  },
  {
    id: "F16",
    nombre: "Agenda de eventos y actividades de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización diaria / periódica",
    fecha_prueba: "2026-10-01",
    estado: "lago",
    vistas: ["Lago crudo / Candidata"],
    archivo: "lago/raw/turismo/opendatabcn_agenda-csv.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/agenda-actes-activitats",
    pregunta: "¿Qué eventos, festivales, conciertos o actividades temporales ocurren hoy en la ciudad?",
    observaciones: "Descargada y guardada en el lago; se mantuvo como candidata para no sobrecargar el alcance MVP centrado en hitos permanentes."
  },
  {
    id: "F17",
    nombre: "Hoteles de Barcelona (lista, categoría y ubicación)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["05 Alojamiento", "04 Explora el mapa"],
    archivo: "lago/raw/turismo/opendatabcn_allotjament_hotels-csv.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/allotjament-hotels",
    pregunta: "¿Qué hoteles regulados existen en Barcelona y cuál es su número de estrellas y dirección?",
    observaciones: "Más de 400 hoteles georreferenciados con categoría oficial de 1 a 5 estrellas y gran lujo."
  },
  {
    id: "F18",
    nombre: "Viviendas de uso turístico (HUT) con licencia oficial",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["05 Alojamiento", "04 Explora el mapa"],
    archivo: "lago/raw/turismo/hut_comunicacio_opendata.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/habitatges-us-turistic",
    pregunta: "¿Qué pisos turísticos cuentan con número de registro legal oficial (HUTB) otorgado por la ciudad?",
    observaciones: "Más de 10.000 viviendas legales registradas que permiten verificar la autenticidad frente a alquileres irregulares."
  },
  {
    id: "F19",
    nombre: "Inside Airbnb · Barcelona · listados detallados y precios",
    publicador: "Inside Airbnb (proyecto independiente de datos abiertos)",
    tipo_publicador: "Iniciativa colaborativa / ONG de datos",
    licencia: "Creative Commons Attribution 4.0 International (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Trimestral",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["05 Alojamiento", "04 Explora el mapa"],
    archivo: "lago/raw/turismo/listings.csv",
    url_origen: "http://insideairbnb.com/get-the-data/",
    pregunta: "¿Qué precios por noche se ofertan en alquileres temporales por barrio y tipo de habitación?",
    observaciones: "PRIVACIDAD POR DISEÑO: El script ETL suprime en origen host_id, host_name, URL y foto del anfitrión. Solo se conserva si el host es profesional/multi-anuncio de forma anónima. CALIDAD DE PRECIOS: La columna price lleva $ pero está en euros (price_quote_raw). Solo las cotizaciones de hasta 7 noches se publican por noche; el resto, por mes. Se descartan precios imposibles (76 anuncios)."
  },
  {
    id: "F20",
    nombre: "Arbolado viario de Barcelona (árboles en calles)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Trimestral",
    fecha_prueba: "2026-10-03",
    estado: "integrada",
    vistas: ["07 Clima y ambiente", "01 Inicio"],
    archivo: "lago/raw/ambiente_satelite/arbrat_viari.json",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/arbrat-viari",
    pregunta: "¿Cuántos árboles urbanos hay en cada distrito y qué especies dan sombra en la ciudad?",
    observaciones: "Más de 200.000 árboles inventariados, procesados agregadamente por distrito y especies predominantes como contexto bioclimático."
  },
  {
    id: "F21",
    nombre: "Open-Meteo — pronóstico meteorológico horario y diario",
    publicador: "Open-Meteo API",
    tipo_publicador: "Servicio de datos abiertos meteorológicos",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "streaming",
    frecuencia: "Tiempo real (actualización horaria)",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["01 Inicio", "07 Clima y ambiente"],
    archivo: "lago/raw/ambiente_satelite/tiempo_prueba.json",
    url_origen: "https://api.open-meteo.com/v1/forecast",
    pregunta: "¿Qué temperatura, humedad, viento y probabilidad de lluvia hará hora a hora hoy y mañana?",
    observaciones: "Consumida directamente por el navegador sin clave ni tarjeta de crédito. Cuenta con snapshot de prueba fechado en el lago."
  },
  {
    id: "F22",
    nombre: "Calidad del aire en estaciones automáticas (XVPCA)",
    publicador: "Generalitat de Catalunya — XVPCA",
    tipo_publicador: "Entidad pública autonómica",
    licencia: "Datos abiertos de la Generalitat de Catalunya",
    tipo: "streaming",
    frecuencia: "Horaria / Tiempo real",
    fecha_prueba: "2026-10-03",
    estado: "integrada",
    vistas: ["07 Clima y ambiente"],
    archivo: "lago/raw/ambiente_satelite/calidad_aire_prueba.json",
    url_origen: "https://analisi.transparenciacatalunya.cat/es/Medi-Ambient/Qualitat-de-l-aire-als-punts-de-mesurament-autom/tasf-thgu",
    pregunta: "¿Qué nivel de contaminantes (NO2, PM10, O3) registran las estaciones de monitoreo de Barcelona?",
    observaciones: "Monitoreo equivalente a SIATA para Cataluña. Se presenta la última medición batch de cada estación oficial en la ciudad."
  },
  {
    id: "F23",
    nombre: "Hospitales y centros de atención primaria (CAP)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Anual",
    fecha_prueba: "2026-10-01",
    estado: "lago",
    vistas: ["Lago crudo / Candidata"],
    archivo: "lago/raw/municipio/opendatabcn_sanitat_hospitals-i-centres-atencio-primaria.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/sanitat-hospitals-centres-atencio-primaria",
    pregunta: "¿Dónde hay un centro de salud u hospital público de urgencias si sufro un percance médico?",
    observaciones: "Almacenada en el lago crudo para dar soporte ante emergencias sanitarias."
  },
  {
    id: "F24",
    nombre: "Catastro INSPIRE · edificios de Barcelona (municipio 08019)",
    publicador: "Dirección General del Catastro (Ministerio de Hacienda)",
    tipo_publicador: "Entidad pública estatal",
    licencia: "CC BY 4.0 DG Catastro",
    tipo: "batch",
    frecuencia: "Semestral",
    fecha_prueba: "2026-10-03",
    estado: "lago",
    vistas: ["Lago crudo / Candidata 3D"],
    archivo: "lago/raw/edificios/indice_barcelona.xml",
    url_origen: "http://www.catastro.hacienda.gob.es/INSPIRE/Buildings/08/08019-BARCELONA/A.ES.SDGC.BU.08019.zip",
    pregunta: "¿Cuál es la volumetría y altura 3D de cada parcela y edificio de Barcelona para el gemelo digital?",
    observaciones: "Índice ATOM y paquete GML descargados para la futura capa tridimensional del gemelo digital de la ciudad."
  },
  {
    id: "F25",
    nombre: "Edificios INSPIRE de Cataluña (ICGC)",
    publicador: "Institut Cartogràfic i Geològic de Catalunya (ICGC)",
    tipo_publicador: "Entidad pública autonómica",
    licencia: "Creative Commons Atribución 4.0 Internacional",
    tipo: "batch",
    frecuencia: "Anual",
    fecha_prueba: "2026-10-03",
    estado: "lago",
    vistas: ["Lago crudo / Candidata 3D"],
    archivo: "lago/raw/edificios/ (servicios ICGC)",
    url_origen: "https://geoserveis.ide.cat/servei/catalunya/inspire-edificis/atom/inspire-edificis.atom.xml",
    pregunta: "¿Cómo contrastar la cartografía de edificaciones de la Generalitat con la del Catastro estatal?",
    observaciones: "Segunda fuente de edificios descargada como ejercicio comparativo de contraste de datos geoespaciales."
  },
  {
    id: "F26",
    nombre: "Puntos WiFi públicos de Barcelona (Barcelona WiFi)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["01 Inicio (Datos curiosos)", "Lago"],
    archivo: "lago/raw/servicios_turista/opendatabcn_Internet_Wifi-BCN-CSV.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/punts-wifi",
    pregunta: "¿Dónde hay acceso gratuito a la red municipal de internet WiFi en espacios públicos?",
    observaciones: "Más de 1.900 puntos WiFi públicos que alimentan los datos curiosos y el catálogo de servicios al turista."
  },
  {
    id: "F27",
    nombre: "Baños públicos de Barcelona (lavabos)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["01 Inicio (Datos curiosos)", "Lago"],
    archivo: "lago/raw/servicios_turista/opendatabcn_lavabos-csv (1).csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/lavabos-publics",
    pregunta: "¿Dónde puedo encontrar un baño o lavabo público en plazas y parques de la ciudad?",
    observaciones: "Inventario municipal de cabinas y aseos públicos higiénicos de acceso abierto en Barcelona."
  },
  {
    id: "F28",
    nombre: "Duchas públicas en las playas de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["01 Inicio (Datos curiosos)", "Lago"],
    archivo: "lago/raw/servicios_turista/opendatabcn_dutxes-csv.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/dutxes-platges",
    pregunta: "¿Qué servicios de duchas y lavapiés están operativos en las playas de la Barceloneta o Bogatell?",
    observaciones: "Puntos de duchas del litoral barcelonés, monitoreados en el módulo de servicios al viajero."
  },
  {
    id: "F29",
    nombre: "Red de refugios climáticos de Barcelona",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Actualización periódica",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["01 Inicio (Datos curiosos)", "Lago"],
    archivo: "lago/raw/servicios_turista/opendatabcn_NP-NASIA_xarxa-refugis-climatics-csv.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/es/dataset/xarxa-refugis-climatics",
    pregunta: "¿A qué espacios públicos climatizados (bibliotecas, museos) puedo acudir para resguardarme de olas de calor?",
    observaciones: "Red municipal de resguardo térmico habilitada para proteger a peatones y turistas en verano."
  },
  {
    id: "F30",
    nombre: "Autorizaciones de terrazas ordinarias (restauración y hostelería)",
    publicador: "Ajuntament de Barcelona (Open Data BCN)",
    tipo_publicador: "Entidad pública",
    licencia: "Creative Commons Attribution 4.0 (CC BY 4.0)",
    tipo: "batch",
    frecuencia: "Semestral",
    fecha_prueba: "2026-10-01",
    estado: "lago",
    vistas: ["Lago crudo / Respaldo de restauración"],
    archivo: "lago/raw/turismo/2026_1s_data_set_opendata_terrasses.csv",
    url_origen: "https://opendata-ajuntament.barcelona.cat/data/ca/dataset/terrasses-comercos-vigents",
    pregunta: "¿Qué restaurantes disponen de terraza exterior autorizada y cuántas mesas y sillas ofrecen?",
    observaciones: "Fuente complementaria para responder por la oferta gastronómica ante la ausencia de una fuente pública abierta con precios de menú."
  },
  {
    id: "WIKI",
    nombre: "Wikipedia y Wikimedia Commons (visitas a 12 meses, fotos y resúmenes)",
    publicador: "Fundación Wikimedia",
    tipo_publicador: "Plataforma colaborativa mundial",
    licencia: "Texto: CC BY-SA 4.0 · Fotografías: Licencia libre individual de cada autor",
    tipo: "batch",
    frecuencia: "Mensual / Dinámica (descarga automatizada)",
    fecha_prueba: "2026-10-01",
    estado: "integrada",
    vistas: ["01 Inicio", "03 Lugares imperdibles", "04 Explora el mapa", "05 Alojamiento"],
    archivo: "lago/raw/wikipedia/wikipedia_lugares.json",
    url_origen: "https://wikimedia.org/api/rest_v1/metrics/pageviews/",
    pregunta: "¿Cuáles son los lugares objetivamente más populares según el interés público mundial en internet?",
    observaciones: "El script descargar_wikipedia.py suma las visitas en inglés y español de los últimos 12 meses para definir el ranking sin pagar por la API de Google Places ni requerir tarjetas."
  },
  {
    id: "CTX",
    nombre: "Cifras e historia de Barcelona (población, visitantes, superficie e hitos)",
    publicador: "Ajuntament de Barcelona, Idescat, BOE, MUHBA y otras",
    tipo_publicador: "Entidades públicas (cada dato cita la suya)",
    licencia: "Datos públicos citados con su fuente",
    tipo: "batch",
    frecuencia: "Manual: se revisa cuando se publica una cifra anual nueva",
    fecha_prueba: "2026-11-03",
    estado: "integrada",
    vistas: ["02 Sobre Barcelona"],
    archivo: "lago/raw/contexto/contexto_barcelona.json",
    url_origen: "https://dades.ajuntament.barcelona.cat/informe-padro-poblacio/en/",
    pregunta: "¿Cuánta gente vive en Barcelona y la visita al año, y qué hitos explican la ciudad de hoy?",
    observaciones: "Copiadas a mano de fuentes oficiales: cada dato guarda su valor, año de referencia, fuente, URL y fecha de consulta. No se estiman ni redondean."
  }
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const normal = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const FILTROS_CATALOGO = [
  { id: "todas", texto: "Todas las fuentes (32)" },
  { id: "integradas", texto: "Integradas en vistas (26)" },
  { id: "lago", texto: "En lago crudo / Candidatas (6)" },
  { id: "streaming", texto: "Streaming / Tiempo real (4)" },
  { id: "batch", texto: "Descarga batch (28)" },
];

const estadoCatalogo = {
  filtro: "todas",
  texto: ""
};

function filtrarFuentes() {
  const t = normal(estadoCatalogo.texto);
  return FUENTES_PROYECTO.filter((f) => {
    // Filtro por chip
    if (estadoCatalogo.filtro === "integradas" && f.estado !== "integrada") return false;
    if (estadoCatalogo.filtro === "lago" && f.estado !== "lago") return false;
    if (estadoCatalogo.filtro === "streaming" && f.tipo !== "streaming") return false;
    if (estadoCatalogo.filtro === "batch" && f.tipo !== "batch") return false;

    // Filtro por texto
    if (!t) return true;
    const corpus = normal(`${f.id} ${f.nombre} ${f.publicador} ${f.licencia} ${f.pregunta} ${f.archivo} ${f.observaciones}`);
    return corpus.includes(t);
  });
}

function pintarChipsCatalogo() {
  const cont = document.getElementById("chips-fuentes");
  if (!cont) return;
  cont.innerHTML = FILTROS_CATALOGO.map((fc) => `
    <button class="chip" type="button" data-filtro="${fc.id}" aria-pressed="${fc.id === estadoCatalogo.filtro}">
      ${fc.texto}
    </button>`).join("");

  cont.querySelectorAll(".chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      estadoCatalogo.filtro = btn.dataset.filtro;
      pintarChipsCatalogo();
      pintarFuentes();
    });
  });
}

function pintarFuentes() {
  const lista = filtrarFuentes();
  const cont = document.getElementById("catalogo-fuentes");
  const contador = document.getElementById("contador-fuentes");
  if (contador) contador.textContent = `${lista.length} fuentes encontradas`;
  if (!cont) return;

  if (!lista.length) {
    cont.innerHTML = `<p class="aviso" style="grid-column: 1 / -1;">No hay fuentes que coincidan con la búsqueda o filtro seleccionado.</p>`;
    return;
  }

  cont.innerHTML = lista.map((f) => `
    <div class="fuente-item" role="button" tabindex="0" data-id="${f.id}" aria-label="Ver ficha técnica de ${f.id}">
      <div class="fuente-item__cab">
        <span class="fuente-item__id">${f.id}</span>
        <span class="etiqueta ${f.tipo === 'streaming' ? 'etiqueta--mercado' : ''}">
          ${f.tipo === 'streaming' ? '● Streaming' : 'Batch'}
        </span>
      </div>
      <h4>${esc(f.nombre)}</h4>
      <p class="fuente-item__pub">${esc(f.publicador)}</p>
      <span class="fuente-item__licencia">${esc(f.licencia)}</span>
      <div class="fuente-item__pie">
        <span class="fuente-item__fecha">Probada: ${f.fecha_prueba}</span>
        <span class="fuente-item__ver">Ver trazabilidad →</span>
      </div>
    </div>`).join("");

  cont.querySelectorAll(".fuente-item").forEach((item) => {
    item.addEventListener("click", () => abrirFichaFuente(item.dataset.id));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        abrirFichaFuente(item.dataset.id);
      }
    });
  });
}

function abrirFichaFuente(id) {
  const f = FUENTES_PROYECTO.find((x) => x.id === id);
  if (!f) return;

  const ficha = document.getElementById("ficha");
  const cuerpo = document.getElementById("ficha-cuerpo");
  if (!ficha || !cuerpo) return;

  cuerpo.innerHTML = `
    <div style="padding: 24px 28px 12px; border-bottom: 1px solid var(--linea);">
      <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
        <span class="tag-fuente" style="font-size:1rem; padding: 4px 10px;">${f.id}</span>
        <span class="etiqueta ${f.tipo === 'streaming' ? 'etiqueta--mercado' : ''}">
          ${f.tipo === 'streaming' ? 'Tiempo Real / Streaming' : 'Descarga Batch'}
        </span>
        <span class="etiqueta ${f.estado === 'integrada' ? 'etiqueta--mirador' : ''}">
          ${f.estado === 'integrada' ? 'Integrada en sitio web' : 'En el Lago / Candidata'}
        </span>
      </div>
      <h2 style="font-size: 1.6rem; color: var(--mar); margin: 6px 0;">${esc(f.nombre)}</h2>
      <p style="margin: 0; color: var(--tinta-suave); font-size: .95rem;">${esc(f.publicador)} (${esc(f.tipo_publicador)})</p>
    </div>

    <div class="ficha__cuerpo" style="padding: 22px 28px 28px;">
      <div class="ficha__datos">
        <span class="dato-rapido">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Licencia: ${esc(f.licencia)}
        </span>
        <span class="dato-rapido">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Probada: <strong class="mono" style="margin-left:4px;">${f.fecha_prueba}</strong>
        </span>
        <span class="dato-rapido">Frecuencia: ${esc(f.frecuencia)}</span>
      </div>

      <div style="margin-bottom: 20px;">
        <h4 style="margin:0 0 6px; color:var(--mar); font-size:1rem;">Pregunta del sistema que responde:</h4>
        <p style="margin:0; font-size:1.05rem; line-height:1.55; color:var(--tinta); background:#f7f9fb; padding:12px 16px; border-radius:12px; border-left:4px solid var(--turquesa);">
          <em>«${esc(f.pregunta)}»</em>
        </p>
      </div>

      <details open style="border-top:1px solid var(--linea); padding-top:14px;">
        <summary style="font-weight:700; color:var(--mar); cursor:pointer;">Ficha de Metadatos y Trazabilidad del Lago</summary>
        <dl style="display:grid; grid-template-columns: 160px 1fr; gap:8px 16px; margin: 14px 0 0; font-size:.9rem;">
          <dt style="color:var(--tinta-suave);">ID Oficial</dt>
          <dd><strong class="mono">${f.id}</strong></dd>

          <dt style="color:var(--tinta-suave);">Archivo en el repositorio</dt>
          <dd><a class="mono" href="${esc(f.archivo)}" target="_blank" rel="noopener">${esc(f.archivo)}</a> ${f.archivo_extra ? `<br><small class="mono" style="color:var(--tinta-suave)">+ ${esc(f.archivo_extra)}</small>` : ''}</dd>

          <dt style="color:var(--tinta-suave);">URL de origen / API</dt>
          <dd><a href="${esc(f.url_origen)}" target="_blank" rel="noopener" style="word-break:break-all;">${esc(f.url_origen)}</a></dd>

          <dt style="color:var(--tinta-suave);">Vistas donde se usa</dt>
          <dd>${f.vistas.map(v => `<span class="etiqueta" style="margin-right:4px; margin-bottom:4px;">${esc(v)}</span>`).join("")}</dd>

          <dt style="color:var(--tinta-suave);">Observaciones técnicas</dt>
          <dd style="line-height:1.5;">${esc(f.observaciones)}</dd>
        </dl>
      </details>
    </div>`;

  if (!ficha.open) ficha.showModal();
  ficha.scrollTop = 0;
  history.replaceState(null, "", `#fuente-${encodeURIComponent(f.id)}`);
}

function abrirDesdeEnlace() {
  if (location.hash.startsWith("#fuente-")) {
    const id = decodeURIComponent(location.hash.slice(8));
    abrirFichaFuente(id);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  pintarChipsCatalogo();
  pintarFuentes();

  const buscarInput = document.getElementById("buscar-fuentes");
  if (buscarInput) {
    buscarInput.addEventListener("input", (e) => {
      estadoCatalogo.texto = e.target.value;
      pintarFuentes();
    });
  }

  // Delegar clics en cualquier tag-fuente del documento (sección preguntas, etc.)
  document.body.addEventListener("click", (e) => {
    const tag = e.target.closest(".tag-fuente");
    if (tag && tag.dataset.fuente) {
      e.preventDefault();
      abrirFichaFuente(tag.dataset.fuente);
    }
  });

  const ficha = document.getElementById("ficha");
  if (ficha) {
    const cerrar = ficha.querySelector(".ficha__cerrar");
    if (cerrar) cerrar.addEventListener("click", () => ficha.close());
    ficha.addEventListener("click", (e) => { if (e.target === ficha) ficha.close(); });
    ficha.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
  }

  window.addEventListener("hashchange", abrirDesdeEnlace);
  abrirDesdeEnlace();
});

