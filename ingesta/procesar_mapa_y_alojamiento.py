"""
Procesa datos del lago para "Explora el mapa" y "Alojamiento".

Lee de:   lago/raw/...                          y lago/procesado/lugares_imperdibles.json (capa turismo)
Escribe:  lago/procesado/zonas.json              ← barrios y distritos (polígonos), para filtros de zona
          lago/procesado/mapa.json               ← capas del mapa: turismo, restaurantes, bicing, alojamiento
          lago/procesado/alojamiento.json        ← hoteles, HUT y Airbnb con precio, más renta de barrio como contexto

Uso (desde la raíz del repo):
    python ingesta/procesar_portada_y_lugares.py   # primero: mapa.json reusa su capa de turismo
    python ingesta/procesar_mapa_y_alojamiento.py

Requiere: pandas

Decisiones de gobernanza (ver README):
- Los anuncios de Airbnb traen host_id, host_name, foto y URL de perfil del anfitrión: son datos
  de una persona. Aquí NO se copian al JSON del sitio. Solo queda el número de anuncios del mismo
  anfitrión (calculated_host_listings_count) y si es "superhost", que no identifican a nadie.
- La renta por sección censal se agrega por barrio (promedio) y se marca como "contexto", nunca
  como señal de a dónde alojarse: así lo pide el taller (dato sensible, sin usarlo para recomendar).
- Bicing aquí es el snapshot de prueba del lago (lago/raw/transporte/bicing_*), no una llamada en
  vivo al feed GBFS: se marca como PROXY/snapshot con su fecha, igual que hace datos_curiosos.json.
"""

import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "lago" / "raw"
PROCESADO = RAIZ / "lago" / "procesado"

# Fotos de hoteles y barrios (las descarga ingesta/descargar_fotos_alojamiento.py)
FOTOS = json.loads((RAW / "wikipedia" / "fotos_alojamiento.json").read_text(encoding="utf-8"))

FUENTES = {
    "censo_locales": {
        "id": None,
        "nombre": "Censo de locales en planta baja (actividad económica)",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/censo_locales_2024.csv",
    },
    "hoteles": {
        "id": None,
        "nombre": "Alojamiento: hoteles",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/opendatabcn_allotjament_hotels-csv.csv",
    },
    "hut": {
        "id": None,
        "nombre": "Viviendas de uso turístico con licencia (HUT)",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/hut_comunicacio_opendata.csv",
    },
    "fotos": {
        "id": None,
        "nombre": "Fotos de hoteles y barrios",
        "publicador": "Wikimedia Commons",
        "licencia": "Licencia abierta de cada archivo",
        "archivo": "lago/raw/wikipedia/fotos_alojamiento.json",
    },
    "airbnb": {
        "id": None,
        "nombre": "Anuncios de Airbnb (precio y ubicación, anfitrión anonimizado)",
        "publicador": "Inside Airbnb",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/listings.csv",
        "archivo_publico": False,  # Trae datos de anfitriones: no se sube al repositorio (ver .gitignore)
    },
    "bicing_estado": {
        "id": None,
        "nombre": "Bicing: estado de las estaciones (bicis y anclajes libres) — snapshot de prueba",
        "publicador": "Bicing (feed GBFS oficial)",
        "licencia": "no declara",
        "archivo": "lago/raw/transporte/bicing_estado_2026-10-01.json",
    },
    "bicing_ubicacion": {
        "id": None,
        "nombre": "Bicing: ubicación y capacidad de las estaciones — snapshot de prueba",
        "publicador": "Bicing (feed GBFS oficial)",
        "licencia": "no declara",
        "archivo": "lago/raw/transporte/bicing_ubicacion_2026-10-01.json",
    },
    "renta": {
        "id": None,
        "nombre": "Renta disponible de los hogares por persona (sección censal) — solo como contexto",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/economia_vivienda/2023_renda_disponible_llars_per_persona.csv",
    },
    "barrios": {
        "id": None,
        "nombre": "Barrios de Barcelona (polígonos)",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/geo/BarcelonaCiutat_Barris.csv",
    },
    "distritos": {
        "id": None,
        "nombre": "Distritos de Barcelona (polígonos)",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/geo/BarcelonaCiutat_Districtes.csv",
    },
    "turismo": {
        "id": None,
        "nombre": "Lugares imperdibles (miradores, museos, mercados e íconos)",
        "publicador": "Open Data BCN / Wikipedia (ver lugares_imperdibles.json)",
        "licencia": "CC BY 4.0 / CC BY-SA 4.0",
        "archivo": "lago/procesado/lugares_imperdibles.json",
    },
}

# Actividades del censo de locales que cuentan como "restaurantes y bares" para el turista.
# Se deja fuera "serveis d'allotjament" (eso ya está en la capa de alojamiento) y "altres"/"vending".
ACTIVIDADES_GASTRONOMIA = {
    "Restaurants": "restaurante",
    "Bars   / CIBERCAFÈ": "bar",
    "Serveis de menjar take away MENJAR RÀPID": "comida rápida",
    "Bars especials amb actuació / Bars musicals / Discoteques /PUB": "bar musical",
    "Xocolateries / Geladeries / Degustació": "chocolatería / heladería",
    "serveis de menjar i begudes": "bar",
}


def leer_poligonos(ruta, campo_nombre, campo_distrito=None):
    """Lee BarcelonaCiutat_Barris.csv / _Districtes.csv: WKT (WGS84) -> anillos de (lon, lat)."""
    df = pd.read_csv(RAIZ / ruta, dtype=str)
    zonas = []
    for _, fila in df.iterrows():
        anillos = [[tuple(map(float, par.split())) for par in anillo.split(",")]
                   for anillo in re.findall(r"\(\(?([^()]+)\)", fila["geometria_wgs84"])]
        zonas.append({
            "nombre": fila[campo_nombre],
            "distrito": fila[campo_distrito] if campo_distrito else fila[campo_nombre],
            "anillos": anillos,
        })
    return zonas


def limpiar_nan(obj):
    """pandas deja NaN (float) en los campos vacíos del CSV. json.dumps por defecto los
    escribe como el token NaN, que no es JSON válido y rompe JSON.parse en el navegador.
    Aquí se cambian por null antes de guardar."""
    if isinstance(obj, float) and math.isnan(obj):
        return None
    if isinstance(obj, dict):
        return {k: limpiar_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [limpiar_nan(v) for v in obj]
    return obj


def dentro(lon, lat, anillo):
    adentro = False
    for (x1, y1), (x2, y2) in zip(anillo, anillo[1:] + anillo[:1]):
        if (y1 > lat) != (y2 > lat) and lon < x1 + (lat - y1) * (x2 - x1) / (y2 - y1):
            adentro = not adentro
    return adentro


def ubicar_barrio(lat, lon, barrios):
    for b in barrios:
        if any(dentro(lon, lat, a) for a in b["anillos"]):
            return b["nombre"], b["distrito"]
    return None, None


def simplificar(anillo, paso=2):
    """Se queda con 1 de cada `paso` vértices (y los extremos), suficiente para dibujar
    el contorno de un barrio en el mapa sin cargar miles de puntos redundantes."""
    recortado = anillo[::paso]
    if recortado[-1] != anillo[-1]:
        recortado.append(anillo[-1])
    return [[round(lon, 5), round(lat, 5)] for lon, lat in recortado]


def zonas_a_geojson(zonas):
    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"nombre": z["nombre"], "distrito": z["distrito"]},
            "geometry": {
                "type": "Polygon" if len(z["anillos"]) == 1 else "MultiPolygon",
                "coordinates": (
                    [simplificar(z["anillos"][0])]
                    if len(z["anillos"]) == 1
                    else [[simplificar(a)] for a in z["anillos"]]
                ),
            },
        } for z in zonas],
    }


# ---------------------------------------------------------------------------
# zonas.json: barrios y distritos, para los filtros de zona de ambas páginas
# ---------------------------------------------------------------------------
def construir_zonas():
    barrios = leer_poligonos(FUENTES["barrios"]["archivo"], "nom_barri", "nom_districte")
    distritos = leer_poligonos(FUENTES["distritos"]["archivo"], "nom_districte")
    return barrios, {
        "generado": AHORA,
        "fuentes": {"barrios": FUENTES["barrios"], "distritos": FUENTES["distritos"]},
        "barrios": zonas_a_geojson(barrios),
        "distritos": zonas_a_geojson(distritos),
    }


# ---------------------------------------------------------------------------
# Capa: restaurantes y bares (censo de locales)
# ---------------------------------------------------------------------------
def capa_restaurantes():
    df = pd.read_csv(RAIZ / FUENTES["censo_locales"]["archivo"], dtype=str)
    df = df[df["Nom_Activitat"].isin(ACTIVIDADES_GASTRONOMIA)]
    df = df.dropna(subset=["Latitud", "Longitud"])
    salida = []
    for _, f in df.iterrows():
        nombre = f["Nom_Local"]
        if not isinstance(nombre, str) or nombre.strip().upper() in {"", "SN"}:
            nombre = ACTIVIDADES_GASTRONOMIA[f["Nom_Activitat"]].capitalize()
        salida.append({
            "id": f["ID_Global"],
            "nombre": nombre.strip(),
            "subtipo": ACTIVIDADES_GASTRONOMIA[f["Nom_Activitat"]],
            "nocturno": f["SN_Oci_Nocturn"] == "Si",
            "direccion": f["Direccio_Unica"],
            "barrio": f["Nom_Barri"],
            "distrito": f["Nom_Districte"],
            "lat": round(float(f["Latitud"]), 6),
            "lon": round(float(f["Longitud"]), 6),
            "actualizado_en_fuente": f["Data_Revisio"],
            "fuente": "censo_locales",
        })
    return salida


# ---------------------------------------------------------------------------
# Capa: Bicing (snapshot) — une estado + ubicación por station_id
# ---------------------------------------------------------------------------
def capa_bicing():
    ubicacion = json.loads((RAIZ / FUENTES["bicing_ubicacion"]["archivo"]).read_text(encoding="utf-8"))
    estado = json.loads((RAIZ / FUENTES["bicing_estado"]["archivo"]).read_text(encoding="utf-8"))
    por_id = {e["station_id"]: e for e in estado["data"]["stations"]}
    salida = []
    for u in ubicacion["data"]["stations"]:
        e = por_id.get(u["station_id"])
        if not e:
            continue
        nombre = next((n["text"] for n in u["name"] if n["language"] == "es"), u["address"])
        salida.append({
            "id": u["station_id"],
            "nombre": nombre.strip(),
            "direccion": u["address"].strip(),
            "lat": round(u["lat"], 6),
            "lon": round(u["lon"], 6),
            "capacidad": u["capacity"],
            "bicis_disponibles": e["num_vehicles_available"],
            "anclajes_libres": e["num_docks_available"],
            "en_servicio": bool(e["is_renting"] and e["is_returning"]),
            "fuente": "bicing_ubicacion",
        })
    return {
        "snapshot_tomado": estado["last_updated"],
        "proxy": True,
        "nota": "Fotografía de un momento dado (snapshot de prueba), no una lectura en vivo del feed GBFS.",
        "estaciones": salida,
    }


# ---------------------------------------------------------------------------
# Alojamiento: hoteles, HUT y Airbnb (anfitrión anonimizado)
# ---------------------------------------------------------------------------
def leer_opendata_utf16(ruta):
    df = pd.read_csv(RAIZ / ruta, encoding="utf-16", dtype=str)
    df["register_id"] = df["register_id"].str.replace("\ufeff", "", regex=False).str.strip()
    return df


def alojamiento_hoteles():
    df = leer_opendata_utf16(FUENTES["hoteles"]["archivo"])
    df = df.dropna(subset=["geo_epgs_4326_lat", "geo_epgs_4326_lon"])
    salida = []
    for _, f in df.iterrows():
        salida.append({
            "id": f["register_id"],
            "tipo": "hotel",
            "nombre": re.sub(r"\s*-\s*HB-\d+$", "", f["name"]).strip(),
            "categoria": f["secondary_filters_name"],
            "barrio": f["addresses_neighborhood_name"],
            "distrito": f["addresses_district_name"],
            "lat": round(float(f["geo_epgs_4326_lat"]), 6),
            "lon": round(float(f["geo_epgs_4326_lon"]), 6),
            "precio_noche_eur": None,
            "foto": FOTOS["hoteles"].get(f["register_id"]),
            "fuente": "hoteles",
        })
    return salida


def mapa_codigos_oficiales():
    """CODI_BARRI/CODI_DISTRICTE -> nombre oficial. Varios CSV (como el de HUT) escriben el
    nombre del barrio o distrito en mayúsculas, sin tilde o con una redacción distinta
    ("L'EIXAMPLE" en vez de "Eixample", "SANT MARTI" sin tilde...). El código numérico sí es
    estable, así que se usa para recuperar siempre el mismo nombre que usan barrios/distritos."""
    b = pd.read_csv(RAIZ / FUENTES["barrios"]["archivo"], dtype=str)
    barrio_por_codigo = dict(zip(b["codi_barri"], b["nom_barri"]))
    distrito_por_codigo = dict(zip(b["codi_districte"], b["nom_districte"]))
    return barrio_por_codigo, distrito_por_codigo


def alojamiento_hut():
    barrio_por_codigo, distrito_por_codigo = mapa_codigos_oficiales()
    df = pd.read_csv(RAIZ / FUENTES["hut"]["archivo"], dtype=str)
    df = df.dropna(subset=["LATITUD_Y", "LONGITUD_X"])
    salida = []
    for _, f in df.iterrows():
        direccion = " ".join(str(x) for x in [f["CARRER"], f["NUM1"]] if isinstance(x, str) and x.strip())
        salida.append({
            "id": f["N_EXPEDIENT"],
            "tipo": "hut",
            "nombre": f"Vivienda turística {f['NUMERO_REGISTRE_GENERALITAT']}",
            "licencia_hutb": f["NUMERO_REGISTRE_GENERALITAT"],
            "plazas": int(f["NUMERO_PLACES"]) if pd.notna(f["NUMERO_PLACES"]) else None,
            "direccion": direccion or None,
            "barrio": barrio_por_codigo.get(f["CODI_BARRI"], f["NOM_BARRI"]),
            "distrito": distrito_por_codigo.get(f["CODI_DISTRICTE"], f["NOM_DISTRICTE"]),
            "lat": round(float(f["LATITUD_Y"]), 6),
            "lon": round(float(f["LONGITUD_X"]), 6),
            "precio_noche_eur": None,
            "fuente": "hut",
        })
    return salida


# Airbnb escribe el nombre del barrio como texto libre: solo este no coincide con el
# nombre oficial de BarcelonaCiutat_Barris.csv (el resto de los 69 barrios sí coinciden).
ALIAS_BARRIO_AIRBNB = {"el Poble Sec": "el Poble-sec"}


# Límites de la limpieza de precios de Airbnb (ver docstring de alojamiento_airbnb)
NOCHES_ESTANCIA_CORTA = 7
PRECIO_MIN_NOCHE_EUR = 15     # Por debajo son errores o anuncios de prueba, como una habitación a 3,50 €
PRECIO_MAX_PERSONA_EUR = 400  # Por encima son errores, como un piso para 4 personas a 4.463 € la noche
PRECIO_MAX_LARGA_EUR = 500    # Estancia larga, por noche: equivale a más de 15.000 € al mes
ANUNCIOS_DESCARTADOS = {}


def precio_plausible(precio, capacidad, corta):
    personas = capacidad if pd.notna(capacidad) and capacidad > 0 else 1
    if precio < PRECIO_MIN_NOCHE_EUR or precio / personas > PRECIO_MAX_PERSONA_EUR:
        return False
    return corta or precio <= PRECIO_MAX_LARGA_EUR


def alojamiento_airbnb():
    """
    Anonimización: de las ~90 columnas del listado solo se copian las que no
    identifican a una persona (ni host_id, host_name, host_url, fotos o perfil
    del anfitrión). calculated_host_listings_count es un conteo, no un dato
    personal: dice si el mismo anfitrión administra varios anuncios.

    Precios: la columna "price" lleva "$" pero está en euros (price_quote_raw dice
    "currency": "EUR" en todos los anuncios). Y no siempre es el precio de una noche:
    es lo cotizado por noche para la estancia de price_quote_checkin/checkout, que puede
    ser de 250 noches con descuento. Por eso solo la cotización de hasta
    NOCHES_ESTANCIA_CORTA noches se publica como precio por noche; el resto se publica
    como precio mensual de estancia larga. Ver precio_plausible para lo que se descarta.
    """
    cols = ["id", "name", "neighbourhood_cleansed", "neighbourhood_group_cleansed",
            "latitude", "longitude", "room_type", "property_type", "accommodates",
            "bedrooms", "beds", "price", "minimum_nights", "number_of_reviews",
            "review_scores_rating", "host_is_superhost", "calculated_host_listings_count",
            "license", "last_scraped", "price_quote_checkin_date", "price_quote_checkout_date"]
    df = pd.read_csv(RAIZ / FUENTES["airbnb"]["archivo"], usecols=cols, low_memory=False)
    df["precio_eur"] = pd.to_numeric(df["price"].str.replace(r"[$,]", "", regex=True), errors="coerce")
    df = df.dropna(subset=["latitude", "longitude", "precio_eur"])
    df["noches_cotizadas"] = (pd.to_datetime(df["price_quote_checkout_date"], errors="coerce")
                              - pd.to_datetime(df["price_quote_checkin_date"], errors="coerce")).dt.days
    df["corta"] = df["noches_cotizadas"] <= NOCHES_ESTANCIA_CORTA
    con_precio = len(df)
    df = df[[precio_plausible(*fila) for fila in zip(df["precio_eur"], df["accommodates"], df["corta"])]]
    ANUNCIOS_DESCARTADOS["airbnb"] = con_precio - len(df)
    salida = []
    # El id real del anuncio lleva a su página en Airbnb, donde se ve al anfitrión: aquí va un
    # seudónimo. Solo sirve para enlazar el mapa con la ficha dentro de este mismo sitio.
    for n, (_, f) in enumerate(df.iterrows(), start=1):
        hutb = re.search(r"HUTB-?\d+", str(f["license"]) if pd.notna(f["license"]) else "")
        salida.append({
            "id": f"airbnb-{n}",
            "tipo": "airbnb",
            "nombre": f["name"],
            "tipo_propiedad": f["property_type"],
            "tipo_habitacion": f["room_type"],
            "capacidad": int(f["accommodates"]) if pd.notna(f["accommodates"]) else None,
            "habitaciones": int(f["bedrooms"]) if pd.notna(f["bedrooms"]) else None,
            "barrio": ALIAS_BARRIO_AIRBNB.get(f["neighbourhood_cleansed"], f["neighbourhood_cleansed"]),
            "distrito": f["neighbourhood_group_cleansed"],
            "lat": round(float(f["latitude"]), 6),
            "lon": round(float(f["longitude"]), 6),
            "estancia": "corta" if f["corta"] else "larga",
            "noches_cotizadas": int(f["noches_cotizadas"]),
            "precio_noche_eur": round(float(f["precio_eur"]), 2) if f["corta"] else None,
            "precio_mes_eur": None if f["corta"] else round(float(f["precio_eur"]) * 30),
            "min_noches": int(f["minimum_nights"]) if pd.notna(f["minimum_nights"]) else None,
            "reseñas": int(f["number_of_reviews"]) if pd.notna(f["number_of_reviews"]) else 0,
            "calificacion": float(f["review_scores_rating"]) if pd.notna(f["review_scores_rating"]) else None,
            "superhost_anonimo": f["host_is_superhost"] == "t",
            "anuncios_del_mismo_anfitrion": int(f["calculated_host_listings_count"]) if pd.notna(f["calculated_host_listings_count"]) else None,
            "licencia_hutb": hutb.group(0) if hutb else None,
            "actualizado_en_fuente": f["last_scraped"],
            "fuente": "airbnb",
        })
    return salida


def renta_por_barrio():
    df = pd.read_csv(RAIZ / FUENTES["renta"]["archivo"], dtype=str)
    df["Import_Euros"] = pd.to_numeric(df["Import_Euros"], errors="coerce")
    g = df.groupby(["Nom_Barri", "Nom_Districte"])["Import_Euros"].mean().reset_index()
    return [{
        "barrio": r["Nom_Barri"],
        "distrito": r["Nom_Districte"],
        "renta_media_euros": round(r["Import_Euros"]),
        "proxy": True,
        "nota": "Promedio de las secciones censales del barrio. Es contexto, no una señal de qué tan "
                "recomendable es alojarse ahí: no se usa para ordenar ni destacar zonas.",
    } for _, r in g.iterrows()]


def resumen_precios(alojamientos):
    precios = pd.Series([a["precio_noche_eur"] for a in alojamientos if a.get("precio_noche_eur")])
    por_tipo = {}
    for tipo in ["hotel", "hut", "airbnb"]:
        por_tipo[tipo] = sum(1 for a in alojamientos if a["tipo"] == tipo)
    return {
        "total": len(alojamientos),
        "por_tipo": por_tipo,
        "airbnb_estancia_corta": sum(1 for a in alojamientos if a.get("estancia") == "corta"),
        "airbnb_estancia_larga": sum(1 for a in alojamientos if a.get("estancia") == "larga"),
        "airbnb_descartados": ANUNCIOS_DESCARTADOS["airbnb"],
        "precio_mediana_eur": round(precios.median(), 2) if len(precios) else None,
        "precio_p25_eur": round(precios.quantile(.25), 2) if len(precios) else None,
        "precio_p75_eur": round(precios.quantile(.75), 2) if len(precios) else None,
    }


def cargar_turismo():
    ruta = RAIZ / FUENTES["turismo"]["archivo"]
    if not ruta.exists():
        print("  aviso: no existe lugares_imperdibles.json; corre primero procesar_portada_y_lugares.py")
        return []
    j = json.loads(ruta.read_text(encoding="utf-8"))
    return [{
        "id": l["id"], "nombre": l["nombre"], "tipo": l["tipo"],
        "barrio": l["barrio"], "distrito": l["distrito"],
        "lat": l["lat"], "lon": l["lon"],
        "top": l["top"], "fuente": "turismo",
    } for l in j["lugares"]]


def main():
    global AHORA
    AHORA = datetime.now(timezone.utc).isoformat(timespec="seconds")
    PROCESADO.mkdir(parents=True, exist_ok=True)

    barrios, zonas = construir_zonas()
    (PROCESADO / "zonas.json").write_text(
        json.dumps(limpiar_nan(zonas), ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    print(f"zonas.json: {len(zonas['barrios']['features'])} barrios, {len(zonas['distritos']['features'])} distritos")

    restaurantes = capa_restaurantes()
    bicing = capa_bicing()
    turismo = cargar_turismo()

    hoteles = alojamiento_hoteles()
    hut = alojamiento_hut()
    airbnb = alojamiento_airbnb()
    alojamientos = hoteles + hut + airbnb

    mapa = {
        "generado": AHORA,
        "fuentes": {k: FUENTES[k] for k in
                    ["censo_locales", "bicing_estado", "bicing_ubicacion", "hoteles", "hut", "airbnb", "turismo"]},
        "capas": {
            "turismo": turismo,
            "restaurantes": restaurantes,
            "bicing": bicing,
            "alojamiento": [{
                "id": a["id"], "tipo": a["tipo"], "nombre": a["nombre"],
                "barrio": a["barrio"], "distrito": a["distrito"],
                "lat": a["lat"], "lon": a["lon"],
                "precio_noche_eur": a["precio_noche_eur"], "precio_mes_eur": a.get("precio_mes_eur"), "fuente": a["fuente"],
            } for a in alojamientos],
        },
    }
    # mapa.json y alojamiento.json tienen miles de puntos: sin indentar para que el
    # navegador los descargue rápido (los demás JSON del lago procesado sí van indentados).
    (PROCESADO / "mapa.json").write_text(
        json.dumps(limpiar_nan(mapa), ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    print(f"mapa.json: {len(turismo)} turismo, {len(restaurantes)} restaurantes, "
          f"{len(bicing['estaciones'])} bicing, {len(alojamientos)} alojamiento")

    ruta_lugares = PROCESADO / "lugares_imperdibles.json"
    fondos = json.loads(ruta_lugares.read_text(encoding="utf-8"))["fondos"] if ruta_lugares.exists() else []
    alojamiento_json = {
        "generado": AHORA,
        "fuentes": {k: FUENTES[k] for k in ["hoteles", "hut", "airbnb", "renta", "fotos"]},
        "fotos_barrios": FOTOS["barrios"],
        "foto_banner": next((f for f in fondos if f["archivo"] == "assets/img/portada/casa-mila.jpg"), None),
        "resumen": resumen_precios(alojamientos),
        "renta_barrios": renta_por_barrio(),
        "alojamientos": alojamientos,
    }
    (PROCESADO / "alojamiento.json").write_text(
        json.dumps(limpiar_nan(alojamiento_json), ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8")
    print(f"alojamiento.json: {len(alojamientos)} alojamientos "
          f"({len(hoteles)} hoteles, {len(hut)} HUT, {len(airbnb)} Airbnb)")


if __name__ == "__main__":
    main()
