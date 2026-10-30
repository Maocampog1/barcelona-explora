"""
Descarga de Wikipedia / Wikimedia Commons la parte visual de "Lugares imperdibles":
foto, descripción corta, resumen y popularidad (visitas al artículo en el último año).

Lee de:   las listas TITULOS e ICONOS de este archivo
Escribe:  lago/raw/wikipedia/wikipedia_lugares.json   (respuesta cruda, la usa procesar_portada_y_lugares.py)
          assets/img/portada/*.jpg                      (fotos grandes del fondo de la Portada)

Uso (desde la raíz del repo):
    python ingesta/descargar_wikipedia.py

Requiere: requests. No pide clave ni tarjeta: son las APIs públicas de Wikimedia.

¿Por qué Wikipedia y no Google Maps? Google Places (calificaciones) exige una
tarjeta de crédito asociada, y el taller pide fuentes sin tarjeta. Las visitas
a Wikipedia son una medida abierta y verificable de qué lugares interesan más.
"""

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote, unquote

import requests

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "lago" / "raw" / "wikipedia" / "wikipedia_lugares.json"
FOTOS = RAIZ / "assets" / "img" / "portada"

S = requests.Session()
S.headers["User-Agent"] = "BarcelonaExplora/1.0 (proyecto estudiantil, Universidad EAFIT)"

# Ventana de visitas: últimos 12 meses completos
DESDE, HASTA = "2025100100", "2026093000"

# ---------------------------------------------------------------------------
# Lugares de Open Data BCN -> artículo en Wikipedia en español.
# La clave es el nombre tal cual viene en la fuente. Si falta, el lugar queda
# sin foto (la web muestra una ilustración en su lugar).
# ---------------------------------------------------------------------------
TITULOS = {
    "Castell de Torre Baró": "Castillo de Torre Baró",
    "Mirador torre Glòries": "Torre Glòries",
    "Mirador de Vallvidrera, el Tibidabo i les Planes": "Tibidabo",
    "Jardins del Mirador de l'Alcalde": "Jardines del Mirador del Alcalde",
    "Torre de les Aigües del Besòs": "Torre de las Aguas del Besós",
    "Mirador de la Mitja Lluna": "Parque del Carmelo",
    "Museu Marítim de Barcelona": "Museo Marítimo de Barcelona",
    "Museu d'Història de Barcelona. Plaça del Rei": "Museo de Historia de Barcelona",
    "CaixaForum Barcelona": "CaixaForum Barcelona",
    "Museu Frederic Marès": "Museo Frederic Marès",
    "Fundació Joan Miró": "Fundación Joan Miró",
    "Museu Tàpies": "Fundación Antoni Tàpies",
    "Museu Reial Monestir de Santa Maria de Pedralbes": "Monasterio de Pedralbes",
    "Museu Picasso": "Museo Picasso (Barcelona)",
    "Museu Temple Expiatori": "Templo Expiatorio de la Sagrada Familia",
    "Santa Església Catedral Basílica de Barcelona": "Catedral de Barcelona",
    "Museu d'Art Contemporani de Barcelona": "Museo de Arte Contemporáneo de Barcelona",
    "Museu de la Xocolata": "Museo del Chocolate de Barcelona",
    "Casa Vicens": "Casa Vicens",
    "Museu Olímpic i de l'Esport Joan Antoni Samaranch de Barcelona": "Museo Olímpico y del Deporte Joan Antoni Samaranch",
    "CosmoCaixa Barcelona": "CosmoCaixa Barcelona",
    "Park Güell. Museu d'Història de Barcelona": "Parque Güell",
    "Disseny Hub Barcelona": "Museo del Diseño de Barcelona",
    "Museu d'Història de Catalunya": "Museo de Historia de Cataluña",
    "Museu Nacional d'Art de Catalunya": "Museo Nacional de Arte de Cataluña",
    "Mercat Concepció": "Mercado de la Concepción (Barcelona)",
    "Mercat Sant Antoni": "Mercado de San Antonio (Barcelona)",
    "Mercat Encants Barcelona - Fira de Bellcaire": "Mercado de los Encantes de Barcelona",
    "Mercat Llibertat": "Mercado de la Libertad",
    "Mercat Abaceria Central": "Mercado de la Abacería Central",
    "Mercat Barceloneta": "Mercado de la Barceloneta",
    "Mercat Ninot": "Mercado del Ninot",
    "Mercat Boqueria - Sant Josep": "Mercado de La Boquería",
    "Mercat Santa Caterina": "Mercado de Santa Caterina",
    "Mercat de Sants": "Mercado de Sants",
}

# ---------------------------------------------------------------------------
# Íconos de la ciudad que no están en los conjuntos de Open Data BCN usados
# (Gaudí, modernismo, playa...). Entran a "Lugares imperdibles" con Wikipedia
# como fuente; el barrio se calcula con los polígonos del lago (lago/raw/geo).
# ---------------------------------------------------------------------------
ICONOS = {
    "Casa Batlló": "Casa Batlló",
    "La Pedrera (Casa Milà)": "Casa Milà",
    "Palau Güell": "Palacio Güell",
    "Recinto Modernista de Sant Pau": "Hospital de la Santa Cruz y San Pablo",
    "Palau de la Música Catalana": "Palacio de la Música Catalana",
    "Basílica de Santa Maria del Mar": "Basílica de Santa María del Mar",
    "La Rambla": "Las Ramblas",
    "Barrio Gótico": "Barrio Gótico (Barcelona)",
    "Playa de la Barceloneta": "Playa de la Barceloneta",
    "Spotify Camp Nou": "Spotify Camp Nou",
    "Castillo de Montjuïc": "Castillo de Montjuïc",
    "Font Màgica de Montjuïc": "Fuente mágica de Montjuïc",
    "Arco de Triunfo": "Arco de Triunfo de Barcelona",
    "Parque de la Ciutadella": "Parque de la Ciudadela",
    "Búnkers del Carmel": "Turó de la Rovira",
    "Poble Espanyol": "Pueblo Español (Barcelona)",
}

# Fotos grandes para el fondo de la Portada: (archivo local, artículo del que sale la foto)
FONDOS = [
    ("sagrada-familia.jpg", "Templo Expiatorio de la Sagrada Familia"),
    ("casa-batllo.jpg", "Casa Batlló"),
    ("park-guell.jpg", "Parque Güell"),
    ("casa-mila.jpg", "Casa Milà"),
]


def get(url, **params):
    for intento in range(6):
        time.sleep(0.4)  # Wikimedia corta a quien pregunta demasiado rápido
        r = S.get(url, params=params or None, timeout=30)
        if r.status_code == 429 or r.status_code >= 500:
            time.sleep(int(r.headers.get("Retry-After", 0)) or 5 * (intento + 1))
            continue
        return r
    r.raise_for_status()


def resumen(titulo, idioma="es"):
    r = get(f"https://{idioma}.wikipedia.org/api/rest_v1/page/summary/{quote(titulo.replace(' ', '_'), safe='')}")
    if r.status_code == 200:
        return r.json()
    # Si el título exacto no existe, se toma el primer resultado del buscador de Wikipedia
    hallados = get(f"https://{idioma}.wikipedia.org/w/api.php", action="opensearch", search=titulo, limit=1, format="json").json()[1]
    if hallados and hallados[0] != titulo:
        print(f"  ~~ '{titulo}' no existe; se usa '{hallados[0]}'")
        return resumen(hallados[0], idioma)
    return None


def visitas(proyecto, titulo):
    if not titulo:
        return 0
    url = (f"https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/{proyecto}/all-access/user/"
           f"{quote(titulo.replace(' ', '_'), safe='')}/monthly/{DESDE}/{HASTA}")
    r = get(url)
    return sum(i["views"] for i in r.json().get("items", [])) if r.status_code == 200 else 0


def titulo_en(titulo_es, idioma="es"):
    r = get(f"https://{idioma}.wikipedia.org/w/api.php", action="query", titles=titulo_es,
            prop="langlinks", lllang="en", format="json", formatversion=2)
    enlaces = r.json()["query"]["pages"][0].get("langlinks", [])
    return enlaces[0]["title"] if enlaces else None


def foto_commons(url_original, ancho=None):
    """Autor, licencia y una miniatura del archivo de Commons al que apunta la foto del artículo."""
    if not url_original:
        return None
    # .../commons/d/d8/Archivo.jpg  o  .../commons/thumb/4/48/Archivo.jpg/1920px-Archivo.jpg  (+ ?parámetros)
    ruta = url_original.split("?")[0]
    archivo = unquote(ruta.split("/thumb/")[1].split("/")[2] if "/thumb/" in ruta else ruta.rsplit("/", 1)[-1])
    params = dict(action="query", titles=f"File:{archivo}", prop="imageinfo",
                  iiprop="url|extmetadata", format="json")
    if ancho:
        params["iiurlwidth"] = ancho
    pagina = next(iter(get("https://commons.wikimedia.org/w/api.php", **params).json()["query"]["pages"].values()))
    if "imageinfo" not in pagina:
        return None
    info = pagina["imageinfo"][0]
    meta = info.get("extmetadata", {})
    limpio = lambda k: re.sub(r"<[^>]+>", "", meta.get(k, {}).get("value", "")).strip()
    return {
        "archivo": archivo,
        "url": info.get("thumburl") or info["url"],
        "pagina": info.get("descriptionurl"),
        "autor": limpio("Artist") or "Desconocido",
        "licencia": limpio("LicenseShortName") or "Ver en Commons",
    }


def ficha(titulo, titulo_ca=None):
    """Artículo en español; si no existe, el de la Wikipedia en catalán (muchos mercados y miradores solo están ahí)."""
    idioma = "es"
    s = resumen(titulo)
    if not s and titulo_ca:
        idioma = "ca"
        s = resumen(titulo_ca, "ca")
    if not s:
        print(f"  !! no existe en Wikipedia: {titulo}")
        return None
    en = titulo_en(s["title"], idioma)
    foto = foto_commons((s.get("originalimage") or {}).get("source"), ancho=960)
    if foto and ("map" in foto["archivo"].lower() or foto["archivo"].lower().endswith(".svg")) and en:
        # Algunos artículos abren con un mapa de ubicación: se usa la foto del artículo en inglés
        s_en = resumen(en, "en")
        foto = foto_commons(((s_en or {}).get("originalimage") or {}).get("source"), ancho=960) or foto
    return {
        "titulo": s["title"],
        "idioma": idioma,
        "qid": s.get("wikibase_item"),
        "descripcion": s.get("description"),
        "resumen": s.get("extract"),
        "coordenadas": s.get("coordinates"),
        "url": s.get("content_urls", {}).get("desktop", {}).get("page"),
        "titulo_en": en,
        "visitas_es": visitas(f"{idioma}.wikipedia", s["title"]),  # en catalán si el artículo es de ca.wikipedia
        "visitas_en": visitas("en.wikipedia", en),
        "foto": foto,
    }


def main():
    # Lo ya descargado se reutiliza (Wikimedia limita las consultas y la descarga completa tarda).
    # Para bajar todo de nuevo, borra lago/raw/wikipedia/wikipedia_lugares.json
    previo = json.loads(SALIDA.read_text(encoding="utf-8")) if SALIDA.exists() else {"lugares": {}, "iconos": {}}

    def guardar():
        SALIDA.parent.mkdir(parents=True, exist_ok=True)
        SALIDA.write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")

    salida = {
        "descargado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ventana_visitas": f"{DESDE[:8]}-{HASTA[:8]}",
        "fuente": "Wikipedia en español e inglés (texto CC BY-SA 4.0), Wikimedia Commons (fotos, licencia por archivo), API de visitas de Wikimedia",
        "lugares": {},
        "iconos": {},
        "fondos": [],
    }
    for grupo, lista in (("lugares", TITULOS), ("iconos", ICONOS)):
        for nombre, titulo in lista.items():
            if previo[grupo].get(nombre):
                salida[grupo][nombre] = previo[grupo][nombre]
                continue
            print(nombre)
            # Los lugares de Open Data BCN ya traen su nombre en catalán: sirve para buscar en ca.wikipedia
            salida[grupo][nombre] = ficha(titulo, nombre if grupo == "lugares" else None)
            guardar()

    FOTOS.mkdir(parents=True, exist_ok=True)
    for archivo, titulo in FONDOS:
        s = resumen(titulo)
        foto = foto_commons((s.get("originalimage") or {}).get("source"), ancho=1920)
        if not foto:
            print(f"  !! sin foto de fondo para {titulo}")
            continue
        (FOTOS / archivo).write_bytes(get(foto["url"]).content)
        salida["fondos"].append({**foto, "archivo_commons": foto["archivo"],
                                 "archivo": f"assets/img/portada/{archivo}", "lugar": s["title"]})
        print(f"fondo: {archivo} ({foto['autor']}, {foto['licencia']})")

    guardar()
    sin_foto = [k for k, v in {**salida["lugares"], **salida["iconos"]}.items() if not v or not v["foto"]]
    print(f"\n{SALIDA.relative_to(RAIZ)}: {len(salida['lugares'])} lugares + {len(salida['iconos'])} íconos")
    print(f"sin foto: {sin_foto}")


if __name__ == "__main__":
    main()
