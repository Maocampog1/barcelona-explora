"""
Descarga de Wikimedia Commons las fotos de la vista "Alojamiento".

Lee de:   lago/raw/turismo/opendatabcn_allotjament_hotels-csv.csv  (nombre y coordenadas de los hoteles)
          lago/raw/geo/BarcelonaCiutat_Barris.csv                  (nombres oficiales de los barrios)
Escribe:  lago/raw/wikipedia/fotos_alojamiento.json  (autor y licencia, lo usa procesar_mapa_y_alojamiento.py)
          assets/img/alojamiento/*.jpg               (miniaturas servidas por la web)

Uso (desde la raíz del repo):
    python ingesta/descargar_fotos_alojamiento.py

Requiere: pandas, requests. No pide clave ni tarjeta.

¿Por qué Commons y no Google Places o Booking? Google Places exige una tarjeta de crédito
y las fotos de esos servicios no se pueden redistribuir. En Commons cada archivo declara
autor y licencia.

Una foto solo se asigna a un hotel si el nombre del archivo coincide con el del hotel:
una foto cercana sin el nombre podría ser de otro edificio. El hotel sin foto propia
muestra la de su barrio, rotulada en la web como "Foto de la zona". No se usan las fotos
de los anuncios de Airbnb: son viviendas privadas y no tienen una licencia abierta.
"""

import json
import math
import re
import time
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote

import pandas as pd

from descargar_wikipedia import foto_commons, get

RAIZ = Path(__file__).resolve().parent.parent
HOTELES = RAIZ / "lago" / "raw" / "turismo" / "opendatabcn_allotjament_hotels-csv.csv"
SALIDA = RAIZ / "lago" / "raw" / "wikipedia" / "fotos_alojamiento.json"
FOTOS = RAIZ / "assets" / "img" / "alojamiento"
COMMONS = "https://commons.wikimedia.org/w/api.php"
ANCHO = 500  # ancho estándar de miniatura en Commons

# Palabras que no distinguen a un hotel de otro
COMUNES = {"hotel", "hotels", "hostal", "hostel", "boutique", "barcelona", "bcn", "by", "the", "and", "de", "del",
           "la", "el", "les", "els", "las", "los", "i", "y", "a", "an", "curio", "collection", "suites", "apartments"}
LICENCIA_ABIERTA = re.compile(r"\b(CC|Public domain|PD|FAL)\b|^CC", re.I)
NO_ES_FOTO = re.compile(r"mapa|map\b|plano|plànol|planol|escut|escudo|situaci|locali|logo|bandera|\.svg|\.png|\.tif", re.I)

# Revisión a ojo: el nombre coincide, pero la foto es de otro hotel ("Eurostars Ramblas", "Olivia Balmes")
HOTELES_SIN_COINCIDENCIA = {"Hotel Balmes", "Hotel Ramblas Barcelona"}

# Foto elegida a mano cuando el artículo del barrio no sirve: no existe, no tiene foto, o la
# búsqueda cae en otra cosa (el artículo "Porta" lleva a una puerta de la catedral de Lleida).
FOTOS_BARRIO = {
    "Porta": 'Can Baste 1 - Barcelona (Catalonia)-08019.2884.jpg',
    "Sant Antoni": "Mercat de Sant Antoni, Barcelona.jpg",
    "Sants - Badal": "Rambla de Badal.jpg",
    "el Barri Gòtic": "Barcelona - Barri Gotic. Carrer d'Avinyó.jpg",
    "el Raval": "Rambla del Raval 2014.jpg",
    "la Vila de Gràcia": "Plaça de la Vila de Gràcia 13 - 20230123 111637.jpg",
}


def normal(s):
    s = unicodedata.normalize("NFD", str(s)).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def distintivas(nombre):
    return [t for t in normal(nombre).split() if t not in COMUNES and len(t) > 1]


def titulo_coincide(nombre, titulo, cerca):
    """El archivo nombra al hotel, y además está junto a él o dice que es de Barcelona."""
    t = f" {normal(titulo.removeprefix('File:').rsplit('.', 1)[0])} "
    claves = distintivas(nombre)
    if not claves or not all(f" {c} " in t for c in claves):
        return False
    if not re.search(r" (hotel|hostal) ", t) and not (cerca and len(claves) > 1):
        return False
    return cerca or " barcelona " in t or " bcn " in t


def consultar(**params):
    """Consulta a Commons. Wikimedia a veces responde 200 con un error de límite en vez de 429."""
    for espera in (20, 60, 120):
        respuesta = get(COMMONS, format="json", **params).json()
        if "query" in respuesta:
            return respuesta["query"]
        print("  Commons respondió sin datos, se reintenta:", str(respuesta.get("error", respuesta))[:120])
        time.sleep(espera)
    raise RuntimeError(f"Commons no responde a {params}")


def candidatos_cerca(nombre, lat, lon):
    """Archivos junto a las coordenadas del hotel cuyo título lo nombra."""
    cerca = consultar(action="query", list="geosearch", gscoord=f"{lat}|{lon}", gsradius=200,
                      gsnamespace=6, gslimit=100)["geosearch"]
    return [c["title"] for c in cerca if titulo_coincide(nombre, c["title"], True)]


def hoteles_wikidata():
    """Una sola consulta: los hoteles de Barcelona que en Wikidata tienen foto y coordenadas."""
    consulta = """SELECT ?etiqueta ?lat ?lon ?foto WHERE {
      ?h wdt:P31 wd:Q27686; wdt:P131 wd:Q1492; wdt:P18 ?foto;
         p:P625/psv:P625 [wikibase:geoLatitude ?lat; wikibase:geoLongitude ?lon].
      SERVICE wikibase:label { bd:serviceParam wikibase:language "ca,es,en". ?h rdfs:label ?etiqueta. }
    }"""
    filas = get("https://query.wikidata.org/sparql", query=consulta, format="json").json()["results"]["bindings"]
    return [{"etiqueta": f["etiqueta"]["value"], "lat": float(f["lat"]["value"]), "lon": float(f["lon"]["value"]),
             "archivo": "File:" + unquote(f["foto"]["value"].rsplit("/", 1)[-1])} for f in filas]


def candidatos_wikidata(nombre, lat, lon, items):
    """Item a menos de 300 m cuyo nombre contiene al del hotel, o al revés."""
    claves = set(distintivas(nombre))
    salida = []
    for i in items:
        etiqueta = set(distintivas(i["etiqueta"]))
        metros = math.hypot((float(lat) - i["lat"]) * 111_000, (float(lon) - i["lon"]) * 83_000)
        if claves and etiqueta and metros <= 300 and (claves <= etiqueta or etiqueta <= claves):
            salida.append(i["archivo"])
    return salida


def primera_valida(titulos):
    for titulo in titulos:
        if NO_ES_FOTO.search(titulo):
            continue
        foto = foto_commons(titulo.removeprefix("File:"), ancho=ANCHO)
        if foto and LICENCIA_ABIERTA.search(foto["licencia"]):
            return foto
    return None


def foto_barrio(barrio):
    """Foto principal del artículo del barrio, en catalán (mismos nombres que la fuente) o en español."""
    if barrio in FOTOS_BARRIO:
        return foto_commons(FOTOS_BARRIO[barrio], ancho=ANCHO)
    for idioma, t in (("ca", barrio), ("ca", f"{barrio} (Barcelona)"), ("es", barrio), ("es", f"{barrio} (Barcelona)")):
        paginas = get(f"https://{idioma}.wikipedia.org/w/api.php", action="query", titles=t, redirects=1,
                      prop="pageimages", piprop="original", format="json").json()["query"]["pages"]
        for p in paginas.values():
            url = (p.get("original") or {}).get("source")
            if url and not NO_ES_FOTO.search(url):
                foto = foto_commons(url, ancho=ANCHO)
                if foto and LICENCIA_ABIERTA.search(foto["licencia"]):
                    return foto
    return None


def bajar(foto, archivo):
    destino = FOTOS / archivo
    if not destino.exists():
        destino.write_bytes(get(foto["url"]).content)
    return {"archivo_local": f"assets/img/alojamiento/{archivo}", "pagina": foto["pagina"],
            "autor": foto["autor"], "licencia": foto["licencia"], "archivo_commons": foto["archivo"]}


def slug(s):
    return normal(s).replace(" ", "-")


def main():
    FOTOS.mkdir(parents=True, exist_ok=True)
    previo = json.loads(SALIDA.read_text(encoding="utf-8")) if SALIDA.exists() else {"hoteles": {}, "barrios": {}}
    df = pd.read_csv(HOTELES, encoding="utf-16", dtype=str).dropna(subset=["geo_epgs_4326_lat", "geo_epgs_4326_lon"])
    df["register_id"] = df["register_id"].str.replace("﻿", "", regex=False).str.strip()
    salida = {"descargado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
              "hoteles": previo["hoteles"], "barrios": previo["barrios"]}

    barrios = sorted(set(df["addresses_neighborhood_name"].dropna()) |
                     set(pd.read_csv(RAIZ / "lago" / "raw" / "geo" / "BarcelonaCiutat_Barris.csv", dtype=str, usecols=["nom_barri"])["nom_barri"].dropna()))
    def guardar():
        SALIDA.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")

    for barrio in barrios:
        if barrio in salida["barrios"]:
            continue
        foto = foto_barrio(barrio)
        print("barrio", barrio, "->", foto["archivo"] if foto else "SIN FOTO")
        if foto:
            salida["barrios"][barrio] = bajar(foto, f"barrio-{slug(barrio)}.jpg")
            guardar()

    # Primero Wikidata (una consulta, foto elegida por sus editores) y luego Commons hotel por hotel
    items = hoteles_wikidata()
    print(f"{len(items)} hoteles con foto en Wikidata")
    for buscar in (lambda n, la, lo: candidatos_wikidata(n, la, lo, items), candidatos_cerca):
        for _, f in df.iterrows():
            nombre = re.sub(r"\s*-\s*HB-\d+$", "", f["name"]).strip()
            if f["register_id"] in salida["hoteles"] or nombre in HOTELES_SIN_COINCIDENCIA:
                continue
            foto = primera_valida(buscar(nombre, f["geo_epgs_4326_lat"], f["geo_epgs_4326_lon"]))
            if foto:
                print("hotel", nombre, "->", foto["archivo"])
                salida["hoteles"][f["register_id"]] = {"nombre": nombre, **bajar(foto, f"hotel-{f['register_id']}.jpg")}
                guardar()

    guardar()
    print(f"fotos_alojamiento.json: {len(salida['hoteles'])} hoteles y {len(salida['barrios'])} barrios con foto")


if __name__ == "__main__":
    main()
