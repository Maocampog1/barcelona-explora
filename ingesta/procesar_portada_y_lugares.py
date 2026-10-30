"""
Procesa datos del lago para la Portada y la página "Lugares imperdibles".

Lee de:   lago/raw/...  (incluye lago/raw/wikipedia/, que baja ingesta/descargar_wikipedia.py)
Escribe:  lago/procesado/lugares_imperdibles.json
          lago/procesado/datos_curiosos.json

Uso (desde la raíz del repo):
    python ingesta/descargar_wikipedia.py        # solo si hay que refrescar fotos y visitas
    python ingesta/procesar_portada_y_lugares.py

Requiere: pandas
"""

import json
import math
import re
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "lago" / "raw"
SALIDA = RAIZ / "lago" / "procesado"

# ---------------------------------------------------------------------------
# Fuentes usadas. El campo "id" debe coincidir con el ID del Excel
# Diccionario_de_datos (F01, F02...). Si queda en None, el sitio no lo muestra.
# ---------------------------------------------------------------------------
FUENTES = {
    "miradores": {
        "id": None,
        "nombre": "Miradores de Barcelona",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/opendatabcn_NP-NASIA_Miradors-csv.csv",
    },
    "museos": {
        "id": None,
        "nombre": "Bibliotecas y museos",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/opendatabcn_cultura_biblioteques-i-museus.csv",
    },
    "mercados": {
        "id": None,
        "nombre": "Mercados municipales",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/opendatabcn_mercats-centrescomercials_mercats-municipals.csv",
    },
    "arbolado": {
        "id": None,
        "nombre": "Arbolado viario",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/ambiente_satelite/arbrat_viari.json",
    },
    "bicing": {
        "id": None,
        "nombre": "Bicing: ubicación de estaciones (GBFS)",
        "publicador": "Bicing (feed GBFS oficial)",
        "licencia": "Datos abiertos del operador",
        "archivo": "lago/raw/transporte/bicing_ubicacion_2026-10-01.json",
    },
    "airbnb": {
        "id": None,
        "nombre": "Listados de Airbnb",
        "publicador": "Inside Airbnb",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/listings.csv",
    },
    "wifi": {
        "id": None,
        "nombre": "Puntos WiFi BCN",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/servicios_turista/opendatabcn_Internet_Wifi-BCN-CSV.csv",
    },
    "refugios": {
        "id": None,
        "nombre": "Red de refugios climáticos",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/servicios_turista/opendatabcn_NP-NASIA_xarxa-refugis-climatics-csv.csv",
    },
    "lavabos": {
        "id": None,
        "nombre": "Lavabos públicos",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/servicios_turista/opendatabcn_lavabos-csv (1).csv",
    },
    "duchas": {
        "id": None,
        "nombre": "Duchas en playas",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/servicios_turista/opendatabcn_dutxes-csv.csv",
    },
    "barrios": {
        "id": None,
        "nombre": "Barrios de Barcelona (polígonos)",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/geo/BarcelonaCiutat_Barris.csv",
    },
    "wikipedia": {
        "id": None,
        "nombre": "Wikipedia y Wikimedia Commons: fotos, resúmenes y visitas por artículo",
        "publicador": "Fundación Wikimedia",
        "licencia": "Texto CC BY-SA 4.0 · fotos con la licencia de cada archivo",
        "archivo": "lago/raw/wikipedia/wikipedia_lugares.json",
    },
}

# Nombre que ve el turista (el de la fuente queda en "nombre_fuente")
NOMBRES_TURISTA = {
    "Museu Temple Expiatori": "Sagrada Família",
    "Santa Església Catedral Basílica de Barcelona": "Catedral de Barcelona",
    "Park Güell. Museu d'Història de Barcelona": "Park Güell",
    "Museu d'Història de Barcelona. Plaça del Rei": "Museo de Historia de Barcelona (MUHBA)",
    "Museu Nacional d'Art de Catalunya": "MNAC · Museo Nacional de Arte de Cataluña",
    "Museu d'Art Contemporani de Barcelona": "MACBA · Arte Contemporáneo",
    "Museu Olímpic i de l'Esport Joan Antoni Samaranch de Barcelona": "Museo Olímpico y del Deporte",
    "Museu Reial Monestir de Santa Maria de Pedralbes": "Monasterio de Pedralbes",
    "Museu Marítim de Barcelona": "Museo Marítimo",
    "Museu de la Xocolata": "Museo del Chocolate",
    "Museu d'Història de Catalunya": "Museo de Historia de Cataluña",
    "Museu Picasso": "Museo Picasso",
    "Museu Frederic Marès": "Museo Frederic Marès",
    "Museu Tàpies": "Fundació Antoni Tàpies",
    "Disseny Hub Barcelona": "Museo del Diseño (Disseny Hub)",
    "Mercat Boqueria - Sant Josep": "Mercado de La Boqueria",
    "Mercat Santa Caterina": "Mercado de Santa Caterina",
    "Mercat Sant Antoni": "Mercado de Sant Antoni",
    "Mercat Barceloneta": "Mercado de la Barceloneta",
    "Mercat Concepció": "Mercado de la Concepció",
    "Mercat Llibertat": "Mercado de la Llibertat",
    "Mercat Ninot": "Mercado del Ninot",
    "Mercat Abaceria Central": "Mercado de l'Abaceria",
    "Mercat de Sants": "Mercado de Sants",
    "Mercat Encants Barcelona - Fira de Bellcaire": "Els Encants (mercado de pulgas)",
    "Mirador de Vallvidrera, el Tibidabo i les Planes": "Mirador del Tibidabo",
    "Mirador torre Glòries": "Mirador de la Torre Glòries",
    "Mirador de la Mitja Lluna": "Mirador de la Mitja Lluna (Carmel)",
}
TOP_N = 16  # cuántos lugares entran al filtro "Top turísticos"

# Para el turista son íconos de la ciudad, aunque la fuente los cataloga como museos
ICONOS_DE_LA_FUENTE = {
    "Museu Temple Expiatori",
    "Park Güell. Museu d'Història de Barcelona",
    "Santa Església Catedral Basílica de Barcelona",
    "Casa Vicens",
}

# Nombre que se muestra en el crédito de cada foto de fondo de la Portada
NOMBRES_FONDO = {
    "sagrada-familia.jpg": "Sagrada Família",
    "casa-batllo.jpg": "Casa Batlló",
    "park-guell.jpg": "Park Güell",
    "casa-mila.jpg": "La Pedrera (Casa Milà)",
}

# ---------------------------------------------------------------------------
# Curaduría: qué entra en "Lugares imperdibles".
# Criterio: lugares abiertos al público, relevantes para un turista,
# y con coordenadas en la fuente.
# ---------------------------------------------------------------------------
MIRADORES_EXCLUIDOS = {"Sala Mirador"}  # es una sala, no un mirador al aire libre

MUSEOS_CURADOS = [
    "Fundació Joan Miró",
    "Museu Temple Expiatori",
    "Santa Església Catedral Basílica de Barcelona",
    "Museu Picasso",
    "Museu Nacional d'Art de Catalunya",
    "Museu d'Art Contemporani de Barcelona",
    "Museu Marítim de Barcelona",
    "Museu d'Història de Barcelona. Plaça del Rei",
    "Park Güell. Museu d'Història de Barcelona",
    "Casa Vicens",
    "CosmoCaixa Barcelona",
    "CaixaForum Barcelona",
    "Museu Frederic Marès",
    "Museu d'Història de Catalunya",
    "Museu Tàpies",
    "Disseny Hub Barcelona",
    "Museu Olímpic i de l'Esport Joan Antoni Samaranch de Barcelona",
    "Museu Reial Monestir de Santa Maria de Pedralbes",
    "Museu de la Xocolata",
]

MERCADOS_CURADOS = [
    "Mercat Boqueria - Sant Josep",
    "Mercat Santa Caterina",
    "Mercat Sant Antoni",
    "Mercat Barceloneta",
    "Mercat Concepció",
    "Mercat Llibertat",
    "Mercat Ninot",
    "Mercat Abaceria Central",
    "Mercat de Sants",
    "Mercat Encants Barcelona - Fira de Bellcaire",
]


def leer_opendata(ruta: str) -> pd.DataFrame:
    """Los CSV de Open Data BCN vienen en UTF-16 con BOM en algunas celdas."""
    df = pd.read_csv(RAIZ / ruta, encoding="utf-16", dtype=str)
    df["register_id"] = df["register_id"].str.replace("﻿", "", regex=False).str.strip()
    return df


def horario_a_texto(html: str):
    """Convierte la tabla HTML de horario de Open Data BCN en líneas de texto."""
    if not isinstance(html, str) or not html.strip():
        return []
    lineas = []
    for fila in re.findall(r"<tr[^>]*>(.*?)</tr>", html, flags=re.S | re.I):
        if "<th" in fila.lower():
            continue
        celdas = re.findall(r"<td[^>]*>(.*?)</td>", fila, flags=re.S | re.I)
        textos = []
        for c in celdas:
            t = re.sub(r"<br\s*/?>|</p>|</li>", " ", c, flags=re.I)
            t = re.sub(r"<[^>]+>", " ", t)
            t = re.sub(r"\s+", " ", unescape(t)).strip()
            if t:
                textos.append(t)
        if textos:
            lineas.append(" · ".join(textos))
    return lineas


def registros(df: pd.DataFrame, tipo: str, clave_fuente: str):
    """Agrupa las filas (una por atributo) en un registro por lugar."""
    salida = []
    for rid, g in df.groupby("register_id", sort=False):
        p = g.iloc[0]
        nombre = p["name"]
        if nombre.strip() == "Museu" and isinstance(p.get("institution_name"), str):
            nombre = p["institution_name"]  # en la fuente, algunos museos se llaman solo "Museu"
        tel = g.loc[g["values_attribute_name"].isin(["Tel.", "Centraleta", "Informació", "Informació i reserves"]), "values_value"]
        tel = tel.dropna().iloc[0] if not tel.dropna().empty else None
        lat, lon = p["geo_epgs_4326_lat"], p["geo_epgs_4326_lon"]
        if pd.isna(lat) or pd.isna(lon):
            continue
        direccion = " ".join(
            str(x) for x in [p["addresses_road_name"], p["addresses_start_street_number"]] if isinstance(x, str)
        )
        salida.append({
            "id": rid,
            "nombre": nombre.strip(),
            "tipo": tipo,
            "direccion": direccion or None,
            "barrio": p["addresses_neighborhood_name"],
            "distrito": p["addresses_district_name"],
            "lat": round(float(lat), 6),
            "lon": round(float(lon), 6),
            "telefono": tel,
            "horario": horario_a_texto(p["timetable"]),
            "actualizado_en_fuente": (p["modified"] or "")[:10] or None,
            "fuente": clave_fuente,
        })
    return salida


def lugares_imperdibles():
    mir = leer_opendata(FUENTES["miradores"]["archivo"])
    mir = mir[~mir["name"].isin(MIRADORES_EXCLUIDOS)]
    lugares = registros(mir, "mirador", "miradores")
    for l in lugares:  # un registro se llama solo "Mirador": se le añade el barrio
        if l["nombre"] == "Mirador":
            l["nombre"] = f"Mirador de {l['barrio']}"

    mus = leer_opendata(FUENTES["museos"]["archivo"])
    mus = mus[mus["secondary_filters_name"].isin(["Museus", "Museus municipals"])]
    mus = mus[(mus["name"].isin(MUSEOS_CURADOS)) | (mus["institution_name"].isin(MUSEOS_CURADOS))]
    lugares += registros(mus, "museo", "museos")

    mer = leer_opendata(FUENTES["mercados"]["archivo"])
    mer = mer[mer["name"].isin(MERCADOS_CURADOS)]
    lugares += registros(mer, "mercado", "mercados")
    return lugares


# ---------------------------------------------------------------------------
# Capa visual: fotos, resumen y popularidad desde lago/raw/wikipedia/
# ---------------------------------------------------------------------------
def distancia_m(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(a))


def resumen_corto(texto, maximo=330):
    """Las primeras frases del resumen de Wikipedia, sin pasar de ~330 caracteres."""
    if not texto:
        return None
    frases = re.split(r"(?<=[.!?])\s+", texto.strip())
    salida = frases[0]
    for f in frases[1:]:
        if len(salida) + len(f) + 1 > maximo:
            break
        salida += " " + f
    return salida


def capa_wikipedia(w):
    if not w:
        return {"foto": None, "descripcion": None, "resumen": None, "wikipedia": None, "popularidad": 0}
    en_espanol = w.get("idioma", "es") == "es"  # de ca.wikipedia solo se usan foto y visitas
    return {
        "foto": w["foto"],
        "descripcion": w["descripcion"] if en_espanol else None,
        "resumen": resumen_corto(w["resumen"]) if en_espanol else None,
        "wikipedia": w["url"],
        "popularidad": w["visitas_es"] + w["visitas_en"],
    }


def leer_barrios():
    """Polígonos WGS84 de los 73 barrios, para ubicar los íconos que no traen barrio."""
    df = pd.read_csv(RAIZ / FUENTES["barrios"]["archivo"])
    barrios = []
    for _, b in df.iterrows():
        anillos = [[tuple(map(float, par.split())) for par in anillo.split(",")]
                   for anillo in re.findall(r"\(\(?([^()]+)\)", b["geometria_wgs84"])]
        barrios.append((b["nom_barri"], b["nom_districte"], anillos))
    return barrios


def dentro(lon, lat, anillo):
    adentro = False
    for (x1, y1), (x2, y2) in zip(anillo, anillo[1:] + anillo[:1]):
        if (y1 > lat) != (y2 > lat) and lon < x1 + (lat - y1) * (x2 - x1) / (y2 - y1):
            adentro = not adentro
    return adentro


def ubicar(lat, lon, barrios):
    for nombre, distrito, anillos in barrios:
        if any(dentro(lon, lat, a) for a in anillos):
            return nombre, distrito
    return None, None


def enriquecer(lugares):
    wiki = json.loads((RAIZ / FUENTES["wikipedia"]["archivo"]).read_text(encoding="utf-8"))

    for l in lugares:
        w = wiki["lugares"].get(l["nombre"])
        c = (w or {}).get("coordenadas")
        if c and distancia_m(l["lat"], l["lon"], c["lat"], c["lon"]) > 1500:
            print(f"  aviso: el artículo de Wikipedia de {l['nombre']} queda a más de 1,5 km; no se usa")
            w = None
        l["nombre_fuente"] = l["nombre"]
        l["nombre"] = NOMBRES_TURISTA.get(l["nombre"], l["nombre"])
        if l["nombre_fuente"] in ICONOS_DE_LA_FUENTE:
            l["tipo"] = "icono"
        l.update(capa_wikipedia(w))

    barrios = leer_barrios()
    for nombre, w in wiki["iconos"].items():
        if not w or not w.get("coordenadas"):
            print(f"  aviso: el ícono {nombre} no tiene coordenadas en Wikipedia; no entra")
            continue
        lat, lon = w["coordenadas"]["lat"], w["coordenadas"]["lon"]
        barrio, distrito = ubicar(lat, lon, barrios)
        lugares.append({
            "id": w["qid"],
            "nombre": nombre,
            "nombre_fuente": w["titulo"],
            "tipo": "icono",
            "direccion": None,
            "barrio": barrio or "Barcelona",
            "distrito": distrito or "Barcelona",
            "lat": round(lat, 6),
            "lon": round(lon, 6),
            "telefono": None,
            "horario": [],
            "actualizado_en_fuente": wiki["descargado"][:10],
            "fuente": "wikipedia",
            **capa_wikipedia(w),
        })

    # Ranking por visitas a Wikipedia (es + en) en los últimos 12 meses
    orden = sorted((l for l in lugares if l["popularidad"]), key=lambda l: -l["popularidad"])
    for i, l in enumerate(orden, 1):
        l["ranking"] = i
        l["top"] = i <= TOP_N
    for l in lugares:
        l.setdefault("ranking", None)
        l.setdefault("top", False)

    for f in wiki["fondos"]:
        f["nombre"] = NOMBRES_FONDO.get(Path(f["archivo"]).name, f["lugar"])
    return lugares, wiki


def n(x):
    """Formato de miles en español: 145034 -> 145.034"""
    return f"{x:,}".replace(",", ".")


def datos_curiosos(lugares):
    """Datos escritos para el turista: algo útil o sorprendente, con el número que sale de la fuente."""
    datos = []

    top = min((l for l in lugares if l["ranking"]), key=lambda l: l["ranking"])
    datos.append({
        "titulo": "El más buscado",
        "dato": f"{top['nombre']} es el lugar de Barcelona que más gente busca: su artículo de Wikipedia "
                f"se leyó {n(round(top['popularidad'], -3))} veces en el último año, en español e inglés.",
        "icono": "foto",
        "fuente": "wikipedia",
    })

    mir = [l for l in lugares if l["tipo"] == "mirador"]
    dist = pd.Series([l["distrito"] for l in mir]).value_counts()
    datos.append({
        "titulo": "Vistas gratis",
        "dato": f"La ciudad tiene {len(mir)} miradores oficiales y no cobran entrada. {dist.iloc[0]} están en "
                f"{dist.index[0]}, en la montaña de Montjuïc: perfectos para ver el atardecer sobre el puerto.",
        "icono": "mirador",
        "fuente": "miradores",
    })

    mer = leer_opendata(FUENTES["mercados"]["archivo"])
    n_mer = mer.loc[mer["secondary_filters_name"] == "Mercats municipals", "register_id"].nunique()
    datos.append({
        "titulo": "Come como un local",
        "dato": f"Hay {n_mer} mercados municipales de comida fresca. La Boqueria es el famoso, "
                f"pero en Santa Caterina o Sant Antoni también se come muy bien y con menos turistas.",
        "icono": "mercado",
        "fuente": "mercados",
    })

    wifi = leer_opendata(FUENTES["wifi"]["archivo"])
    datos.append({
        "titulo": "Internet gratis en la calle",
        "dato": f"Barcelona tiene {n(wifi['register_id'].nunique())} puntos de WiFi público y gratuito "
                f"en plazas, bibliotecas y museos. Busca la red «Barcelona WiFi».",
        "icono": "wifi",
        "fuente": "wifi",
    })

    arboles = pd.read_json(RAIZ / FUENTES["arbolado"]["archivo"])
    especie = arboles["cat_nom_castella"].value_counts()
    datos.append({
        "titulo": "Paseos a la sombra",
        "dato": f"Las calles tienen {n(len(arboles))} árboles y casi {round(especie.iloc[0] / len(arboles) * 100)} % son "
                f"{especie.index[0].lower()}s: por eso las avenidas del Eixample se sienten más frescas en verano.",
        "icono": "arbol",
        "fuente": "arbolado",
    })

    ref = leer_opendata(FUENTES["refugios"]["archivo"])
    datos.append({
        "titulo": "Si aprieta el calor",
        "dato": f"La ciudad tiene {ref['register_id'].nunique()} refugios climáticos: bibliotecas, museos y parques "
                f"donde puedes entrar a refrescarte gratis en los días de mucho calor.",
        "icono": "sol",
        "fuente": "refugios",
    })

    lav = leer_opendata(FUENTES["lavabos"]["archivo"])
    datos.append({
        "titulo": "¿Buscas un baño?",
        "dato": f"Hay {lav['register_id'].nunique()} baños públicos repartidos por la ciudad, "
                f"muchos en parques y plazas. Pronto los verás en el mapa del sitio.",
        "icono": "bano",
        "fuente": "lavabos",
    })

    abnb = pd.read_csv(RAIZ / FUENTES["airbnb"]["archivo"], usecols=["price", "room_type"], low_memory=False)
    precio = pd.to_numeric(abnb["price"].str.replace(r"[$,]", "", regex=True), errors="coerce").dropna()
    casas = (abnb["room_type"] == "Entire home/apt").mean() * 10
    datos.append({
        "titulo": "¿Cuánto cuesta dormir?",
        "dato": f"La mitad de los Airbnb de Barcelona cuesta menos de {precio.median():.0f} USD por noche, "
                f"y {casas:.0f} de cada 10 son pisos completos, no habitaciones.",
        "icono": "cama",
        "fuente": "airbnb",
    })
    return datos


def main():
    SALIDA.mkdir(parents=True, exist_ok=True)
    generado = datetime.now(timezone.utc).isoformat(timespec="seconds")

    lugares, wiki = enriquecer(lugares_imperdibles())
    curiosos = datos_curiosos(lugares)

    (SALIDA / "lugares_imperdibles.json").write_text(json.dumps(
        {"generado": generado, "fuentes": FUENTES, "fondos": wiki["fondos"], "lugares": lugares},
        ensure_ascii=False, indent=1), encoding="utf-8")
    (SALIDA / "datos_curiosos.json").write_text(json.dumps(
        {"generado": generado, "fuentes": FUENTES, "datos": curiosos}, ensure_ascii=False, indent=1), encoding="utf-8")

    por_tipo = pd.Series([l["tipo"] for l in lugares]).value_counts().to_dict()
    print(f"lugares_imperdibles.json: {len(lugares)} lugares {por_tipo}")
    print(f"datos_curiosos.json: {len(curiosos)} datos")


if __name__ == "__main__":
    main()
