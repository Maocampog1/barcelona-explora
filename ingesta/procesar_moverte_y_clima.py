"""
Procesa datos del lago para "Cómo moverte" (05) y "Clima y ambiente" (06).

Lee de:   lago/raw/transporte/estacions-bus.csv          ← paradas de bus
          lago/raw/transporte/transports..csv            ← metro / FGC (y otros transportes)
          lago/raw/transporte/bicing_ubicacion_*.json    ← ubicación de estaciones Bicing (snapshot)
          lago/raw/transporte/bicing_estado_*.json       ← estado de estaciones Bicing (snapshot)
          lago/raw/ambiente_satelite/calidad_aire_prueba.json  ← calidad del aire (XVPCA)
          lago/raw/ambiente_satelite/arbrat_viari.json         ← arbolado viario

Escribe:  lago/procesado/moverte.json          ← bus, metro (sin tiempo real), y Bicing como respaldo
          lago/procesado/clima_ambiente.json   ← calidad del aire en Barcelona + arbolado (contexto)

Uso (desde la raíz del repo):
    python ingesta/procesar_moverte_y_clima.py

No requiere pandas: usa solo la librería estándar (csv, json), para que corra en cualquier
máquina del equipo sin instalar nada.

Decisiones de gobernanza (ver README):
- Bicing EN VIVO lo pide el navegador directo al feed GBFS oficial (assets/js/moverte.js). Aquí
  solo se deja un SNAPSHOT de respaldo (lago/raw/transporte/bicing_*), marcado como PROXY con su
  fecha: se usa si el feed en vivo falla, y siempre se avisa en pantalla cuál de los dos se mostró.
- El METRO no tiene fuente de tiempo real libre (la API de TMB pide token): se marca con
  tiempo_real=false y una nota de "pendiente", para no mezclar un dato estático con los que sí
  son en vivo (Bicing).
- La calidad del aire y el arbolado son datos BATCH: se muestran con su fecha y marcados como tal,
  nunca presentados como lectura "de ahora".
"""

import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "lago" / "raw"
PROCESADO = RAIZ / "lago" / "procesado"

# Snapshots de Bicing con fecha en el nombre: se toma el más reciente que exista.
def _ultimo(patron):
    archivos = sorted((RAW / "transporte").glob(patron))
    return archivos[-1] if archivos else None

BICING_UBICACION = _ultimo("bicing_ubicacion_*.json")
BICING_ESTADO = _ultimo("bicing_estado_*.json")

def _rel(ruta):
    """Ruta relativa a la raíz del repo, con / (para mostrarla como enlace en el sitio)."""
    return ruta.relative_to(RAIZ).as_posix() if ruta else None

FUENTES = {
    "bus": {
        "id": None,
        "nombre": "Estaciones y paradas de autobús",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/transporte/estacions-bus.csv",
    },
    "metro": {
        "id": None,
        "nombre": "Metro y líneas urbanas FGC (estaciones)",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/transporte/transports..csv",
    },
    "bicing_ubicacion": {
        "id": None,
        "nombre": "Bicing: ubicación y capacidad de las estaciones — snapshot de respaldo",
        "publicador": "Bicing (feed GBFS oficial)",
        "licencia": "Datos abiertos del operador",
        "archivo": _rel(BICING_UBICACION),
    },
    "bicing_estado": {
        "id": None,
        "nombre": "Bicing: estado de las estaciones (bicis y anclajes libres) — snapshot de respaldo",
        "publicador": "Bicing (feed GBFS oficial)",
        "licencia": "Datos abiertos del operador",
        "archivo": _rel(BICING_ESTADO),
    },
    "aire": {
        "id": None,
        "nombre": "Calidad del aire: datos de las estaciones de medición (XVPCA)",
        "publicador": "Generalitat de Catalunya — Xarxa de Vigilància i Previsió de la Contaminació Atmosfèrica",
        "licencia": "Datos abiertos de la Generalitat",
        "archivo": "lago/raw/ambiente_satelite/calidad_aire_prueba.json",
    },
    "arbolado": {
        "id": None,
        "nombre": "Arbolado viario de Barcelona",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/ambiente_satelite/arbrat_viari.json",
    },
}

# ---------------------------------------------------------------------------
# Transporte: bus y metro desde los CSV de "mapa de la ciudad"
# Columnas: CODI_CAPA, CAPA_GENERICA, NOM_CAPA, ED50_X, ED50_Y, ETRS89_X, ETRS89_Y,
#           LONGITUD, LATITUD, EQUIPAMENT, DISTRICTE, BARRI, NOM_DISTRICTE, NOM_BARRI, ADRECA, TELEFON
# ---------------------------------------------------------------------------

def _limpiar_nombre_parada(equipament):
    """Los nombres vienen como 'Clot (Aragó / Meridiana)-' o 'BUS -130--': se quitan los
    guiones de relleno del final y los espacios sobrantes, dejando algo legible."""
    s = (equipament or "").strip()
    s = re.sub(r"-+$", "", s).strip()          # guiones finales de relleno
    s = re.sub(r"\s+", " ", s)
    return s or "Parada"

def _leer_transporte(ruta, filtro_nom_capa=None):
    """Lee un CSV de transporte y devuelve puntos con lat/lon y zona. Si se pasa
    filtro_nom_capa, solo deja las filas cuya NOM_CAPA esté en ese conjunto."""
    salida = []
    with open(RAIZ / ruta, encoding="utf-8-sig", newline="") as f:
        for fila in csv.DictReader(f):
            nom_capa = (fila.get("NOM_CAPA") or "").strip()
            if filtro_nom_capa and nom_capa not in filtro_nom_capa:
                continue
            lat, lon = fila.get("LATITUD"), fila.get("LONGITUD")
            if not lat or not lon:
                continue
            try:
                lat, lon = round(float(lat), 6), round(float(lon), 6)
            except ValueError:
                continue
            salida.append({
                "nombre": _limpiar_nombre_parada(fila.get("EQUIPAMENT")),
                "tipo_servicio": nom_capa,
                "direccion": (fila.get("ADRECA") or "").strip() or None,
                "barrio": (fila.get("NOM_BARRI") or "").strip() or None,
                "distrito": (fila.get("NOM_DISTRICTE") or "").strip() or None,
                "lat": lat,
                "lon": lon,
            })
    return salida

def capa_bus():
    return _leer_transporte(FUENTES["bus"]["archivo"])

def capa_metro():
    # El CSV de "transports" trae metro/FGC, tren al aeropuerto, FGC, etc. Nos quedamos con
    # el metro y las líneas urbanas de FGC, que es lo que usa el turista para moverse por la ciudad.
    paradas = _leer_transporte(FUENTES["metro"]["archivo"], filtro_nom_capa={"Metro i línies urbanes FGC"})
    for p in paradas:
        p["tiempo_real"] = False
        p["nota_pendiente"] = ("Sin tiempo real (pendiente): la API de llegadas del metro en vivo "
                               "(TMB) exige token, así que aquí solo se muestra la ubicación de la estación.")
    return paradas

# ---------------------------------------------------------------------------
# Bicing (snapshot de respaldo) — une estado + ubicación por station_id
# (mismo criterio que ingesta/procesar_mapa_y_alojamiento.py)
# ---------------------------------------------------------------------------
def capa_bicing_fallback():
    if not (BICING_UBICACION and BICING_ESTADO):
        return None
    ubicacion = json.loads(BICING_UBICACION.read_text(encoding="utf-8"))
    estado = json.loads(BICING_ESTADO.read_text(encoding="utf-8"))
    por_id = {e["station_id"]: e for e in estado["data"]["stations"]}
    salida = []
    for u in ubicacion["data"]["stations"]:
        e = por_id.get(u["station_id"])
        if not e:
            continue
        nombre = next((n["text"] for n in u.get("name", []) if n.get("language") == "es"), u.get("address", ""))
        salida.append({
            "id": u["station_id"],
            "nombre": (nombre or "").strip(),
            "direccion": (u.get("address") or "").strip(),
            "lat": round(u["lat"], 6),
            "lon": round(u["lon"], 6),
            "capacidad": u.get("capacity"),
            "bicis_disponibles": e.get("num_vehicles_available"),
            "anclajes_libres": e.get("num_docks_available"),
            "en_servicio": bool(e.get("is_renting") and e.get("is_returning")),
        })
    return {
        "snapshot_tomado": estado.get("last_updated"),
        "proxy": True,
        "nota": "Fotografía de un momento dado (snapshot de respaldo), no una lectura en vivo del feed GBFS. "
                "Se usa solo si el feed en vivo no responde.",
        "estaciones": salida,
    }

# ---------------------------------------------------------------------------
# Calidad del aire (XVPCA): estaciones de Barcelona con su última lectura por contaminante
# Cada registro trae h01..h24 (una por hora del día) por contaminante; tomamos la última hora
# informada (el último valor no vacío).
# ---------------------------------------------------------------------------
UNIDAD_NORMAL = {"ug/m3": "µg/m³", "µg/m3": "µg/m³", "mg/m3": "mg/m³"}

# Guía rápida de qué es cada contaminante, para el turista.
DESC_CONTAMINANTE = {
    "NO2": "Dióxido de nitrógeno (tráfico)",
    "NOX": "Óxidos de nitrógeno (tráfico)",
    "NO": "Monóxido de nitrógeno (tráfico)",
    "O3": "Ozono troposférico",
    "PM10": "Partículas en suspensión (PM10)",
    "PM2.5": "Partículas finas (PM2.5)",
    "SO2": "Dióxido de azufre",
    "CO": "Monóxido de carbono",
    "H2S": "Sulfuro de hidrógeno",
}

def _ultima_hora(registro):
    """Devuelve (hora, valor) de la última hora informada (h01..h24), o (None, None)."""
    ultima = (None, None)
    for h in range(1, 25):
        v = registro.get(f"h{h:02d}")
        if v not in (None, "", "-"):
            try:
                ultima = (h, float(v))
            except ValueError:
                continue
    return ultima

def capa_aire():
    datos = json.loads((RAIZ / FUENTES["aire"]["archivo"]).read_text(encoding="utf-8"))
    estaciones = {}
    fecha_max = None
    for r in datos:
        if (r.get("municipi") or "").strip() != "Barcelona":
            continue
        fecha = (r.get("data") or "")[:10]
        if fecha and (fecha_max is None or fecha > fecha_max):
            fecha_max = fecha
        clave = r.get("codi_eoi")
        est = estaciones.setdefault(clave, {
            "id": clave,
            "nombre": (r.get("nom_estacio") or "").strip(),
            "tipo_estacion": r.get("tipus_estacio"),
            "lat": round(float(r["latitud"]), 6) if r.get("latitud") else None,
            "lon": round(float(r["longitud"]), 6) if r.get("longitud") else None,
            "altitud_m": int(float(r["altitud"])) if r.get("altitud") else None,
            "_por_contaminante": {},
        })
        hora, valor = _ultima_hora(r)
        if valor is None:
            continue
        contaminante = r.get("contaminant")
        medicion = {
            "contaminante": contaminante,
            "descripcion": DESC_CONTAMINANTE.get(contaminante, contaminante),
            "valor": valor,
            "unidad": UNIDAD_NORMAL.get(r.get("unitats"), r.get("unitats")),
            "hora": f"{hora:02d}:00" if hora else None,
            "_fecha": fecha,
        }
        # Una sola medición por contaminante: la lectura más reciente (fecha, y a igual fecha,
        # la hora más tardía). El JSON crudo trae varias filas de la misma estación/contaminante.
        previa = est["_por_contaminante"].get(contaminante)
        if previa is None or (fecha, hora or 0) >= (previa["_fecha"], int((previa["hora"] or "0:0").split(":")[0])):
            est["_por_contaminante"][contaminante] = medicion
    # Solo estaciones con al menos una medición; mediciones ordenadas por contaminante.
    salida = []
    for est in estaciones.values():
        mediciones = sorted(est.pop("_por_contaminante").values(), key=lambda m: m["contaminante"])
        for m in mediciones:
            m.pop("_fecha", None)
        if not mediciones:
            continue
        est["mediciones"] = mediciones
        salida.append(est)
    salida.sort(key=lambda e: e["nombre"])
    return {"fecha": fecha_max, "estaciones": salida}

# ---------------------------------------------------------------------------
# Arbolado viario: resumen agregado (contexto), nunca árbol por árbol en el sitio
# ---------------------------------------------------------------------------
def capa_arbolado():
    datos = json.loads((RAIZ / FUENTES["arbolado"]["archivo"]).read_text(encoding="utf-8"))
    por_distrito = {}
    por_especie = {}
    total = 0
    for a in datos:
        total += 1
        distrito = (a.get("nom_districte") or "").strip().title() or "Sin distrito"
        por_distrito[distrito] = por_distrito.get(distrito, 0) + 1
        especie = (a.get("cat_nom_castella") or "").strip()
        if especie and especie != "-":
            por_especie[especie] = por_especie.get(especie, 0) + 1
    top_especies = sorted(por_especie.items(), key=lambda kv: kv[1], reverse=True)[:10]
    distritos = sorted(por_distrito.items(), key=lambda kv: kv[1], reverse=True)
    return {
        "total": total,
        "muestra": True,
        "nota": "Muestra del inventario de arbolado viario (no es el total de árboles de la ciudad). "
                "Se usa como contexto del verde urbano, agregado por distrito y especie.",
        "top_especies": [{"especie": e, "cantidad": n} for e, n in top_especies],
        "por_distrito": [{"distrito": d, "cantidad": n} for d, n in distritos],
    }

# ---------------------------------------------------------------------------

def main():
    ahora = datetime.now(timezone.utc).isoformat(timespec="seconds")
    PROCESADO.mkdir(parents=True, exist_ok=True)

    bus = capa_bus()
    metro = capa_metro()
    bicing = capa_bicing_fallback()

    moverte = {
        "generado": ahora,
        "fuentes": {k: FUENTES[k] for k in ["bus", "metro", "bicing_ubicacion", "bicing_estado"]},
        "bus": bus,
        "metro": metro,
        "bicing_fallback": bicing,
    }
    (PROCESADO / "moverte.json").write_text(
        json.dumps(moverte, ensure_ascii=False, separators=(",", ":"), allow_nan=False), encoding="utf-8")
    n_bicing = len(bicing["estaciones"]) if bicing else 0
    print(f"moverte.json: {len(bus)} paradas de bus, {len(metro)} de metro/FGC, "
          f"{n_bicing} estaciones Bicing (respaldo)")

    aire = capa_aire()
    arbolado = capa_arbolado()
    clima = {
        "generado": ahora,
        "fuentes": {k: FUENTES[k] for k in ["aire", "arbolado"]},
        "aire": aire,
        "arbolado": arbolado,
    }
    (PROCESADO / "clima_ambiente.json").write_text(
        json.dumps(clima, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")
    print(f"clima_ambiente.json: {len(aire['estaciones'])} estaciones de aire en Barcelona "
          f"(fecha {aire['fecha']}), {arbolado['total']} árboles en la muestra, "
          f"top especie: {arbolado['top_especies'][0]['especie'] if arbolado['top_especies'] else '—'}")


if __name__ == "__main__":
    main()
