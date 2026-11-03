"""
Procesa datos del lago para la página "Sobre Barcelona".

Lee de:   lago/raw/contexto/contexto_barcelona.json   (cifras e historia, copiadas de fuentes oficiales)
          lago/raw/geo/BarcelonaCiutat_Barris.csv     (distritos y barrios)
          lago/raw/turismo/calendarifestius_es.ics    (festivos)
          lago/procesado/lugares_imperdibles.json     (crédito de la foto y enlaces a lugares)
Escribe:  lago/procesado/sobre_barcelona.json

Uso (desde la raíz del repo):
    python ingesta/procesar_portada_y_lugares.py   # primero: esta página reusa sus lugares
    python ingesta/procesar_sobre_barcelona.py

Requiere: pandas

Decisiones:
- Población y visitantes no están en el lago: vienen de contexto_barcelona.json, con su fuente,
  URL y fecha de consulta. Este script no estima ni redondea esas cifras.
- El único dato calculado aquí (porcentaje de nacidos en el extranjero) se rotula como cálculo propio.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from catalogo import completar_fuentes

RAIZ = Path(__file__).resolve().parent.parent
RAW = RAIZ / "lago" / "raw"
SALIDA = RAIZ / "lago" / "procesado"

FOTO_BANNER = "assets/img/portada/casa-batllo.jpg"

FUENTES = {
    "barrios": {
        "id": "F01",
        "nombre": "Barrios y distritos de Barcelona",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/geo/BarcelonaCiutat_Barris.csv",
    },
    "festivos": {
        "id": "F15",
        "nombre": "Calendario de festivos de Barcelona",
        "publicador": "Open Data BCN (Ajuntament de Barcelona)",
        "licencia": "CC BY 4.0",
        "archivo": "lago/raw/turismo/calendarifestius_es.ics",
    },
    "contexto": {
        "id": "CTX",
        "nombre": "Cifras e historia de Barcelona (cada dato cita su fuente oficial)",
        "publicador": "Ajuntament de Barcelona, Idescat, BOE y otras",
        "licencia": "Datos públicos citados con su fuente",
        "archivo": "lago/raw/contexto/contexto_barcelona.json",
    },
}
completar_fuentes(FUENTES)


def cifras_del_lago():
    """Distritos y barrios: se cuentan los códigos oficiales, no los nombres."""
    df = pd.read_csv(RAIZ / FUENTES["barrios"]["archivo"], dtype=str, usecols=["codi_districte", "codi_barri"])
    fuente = FUENTES["barrios"]
    comun = {"anio_referencia": "Lago", "fuente": f"{fuente['nombre']}, {fuente['publicador']}", "url": None, "archivo": fuente["archivo"]}
    return [
        {"id": "distritos", "etiqueta": "Distritos", "valor": df["codi_districte"].nunique(), "unidad": "distritos", **comun},
        {"id": "barrios", "etiqueta": "Barrios", "valor": df["codi_barri"].nunique(), "unidad": "barrios", **comun},
    ]


def festivos():
    """Festivos del .ics: fecha y nombre. La web muestra los que aún no han pasado."""
    texto = (RAIZ / FUENTES["festivos"]["archivo"]).read_text(encoding="utf-8")
    salida = []
    for evento in re.findall(r"BEGIN:VEVENT(.*?)END:VEVENT", texto, flags=re.S):
        fecha = re.search(r"DTSTART;VALUE=DATE:(\d{4})(\d{2})(\d{2})", evento)
        nombre = re.search(r"SUMMARY:(.+)", evento)
        if fecha and nombre:
            salida.append({"fecha": "-".join(fecha.groups()), "nombre": nombre.group(1).strip()})
    return sorted(salida, key=lambda f: f["fecha"])


def main():
    contexto = json.loads((RAW / "contexto" / "contexto_barcelona.json").read_text(encoding="utf-8"))
    lugares = json.loads((SALIDA / "lugares_imperdibles.json").read_text(encoding="utf-8"))

    cifras = {c["id"]: c for c in contexto["cifras"]}
    extranjero = cifras["nacidos_extranjero"]
    porcentaje = extranjero["valor"] / cifras["poblacion"]["valor"] * 100
    extranjero["nota"] = f"Equivale al {porcentaje:.1f} % del padrón (cálculo propio).".replace(".", ",", 1)

    # Orden de las tarjetas en la página
    del_lago = {c["id"]: c for c in cifras_del_lago()}
    orden = ["poblacion", "visitantes", "superficie", "distritos", "barrios",
             "nacidos_extranjero", "nacionalidades", "lenguas_oficiales"]
    tarjetas = [{**cifras, **del_lago}[i] for i in orden]
    for c in tarjetas:
        fuente = FUENTES["barrios"] if c["id"] in del_lago else FUENTES["contexto"]
        c["id_fuente"] = fuente["id"]
        c.setdefault("fecha_consulta", fuente["fecha_prueba"])

    # Un enlace a un lugar que ya no existe se vería como una ficha que no abre
    ids = {l["id"] for l in lugares["lugares"]}
    for hito in contexto["linea_de_tiempo"]:
        if hito.get("lugar") and hito["lugar"]["id"] not in ids:
            print(f"  aviso: {hito['titulo']}: el lugar {hito['lugar']['id']} no está en lugares_imperdibles.json")
            del hito["lugar"]

    salida = {
        "generado": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "fuentes": FUENTES,
        "foto_banner": next((f for f in lugares["fondos"] if f["archivo"] == FOTO_BANNER), None),
        "cifras": tarjetas,
        "eras": contexto["eras"],
        "linea_de_tiempo": contexto["linea_de_tiempo"],
        "festivos": festivos(),
    }
    (SALIDA / "sobre_barcelona.json").write_text(json.dumps(salida, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"sobre_barcelona.json: {len(tarjetas)} cifras, {len(salida['linea_de_tiempo'])} hitos, {len(salida['festivos'])} festivos")


if __name__ == "__main__":
    main()
