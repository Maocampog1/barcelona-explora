"""
Une cada fuente de los scripts de ingesta con su fila en catalogo/fuentes.csv.

Así el ID (F01, F02…) y la fecha de prueba que muestran las fichas salen de un solo lugar:
si una fuente no está en el catálogo, el script falla en vez de publicarla sin ID.
"""

import csv
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent

# Archivos que no son el principal de su fuente en el catálogo: (ID, fecha de prueba o None para usar la del ID)
OTROS_ARCHIVOS = {
    "lago/raw/geo/BarcelonaCiutat_Districtes.csv": ("F01", None),
    "lago/raw/wikipedia/fotos_alojamiento.json": ("WIKI", "2026-11-03"),
    "lago/procesado/lugares_imperdibles.json": ("F10, F11, F12, F13, F14, WIKI", "2026-10-01 y 2026-10-30"),
}


def leer_catalogo():
    with open(RAIZ / "catalogo" / "fuentes.csv", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def completar_fuentes(fuentes):
    """Agrega "id" y "fecha_prueba" a cada fuente, buscándola por su archivo."""
    filas = leer_catalogo()
    por_archivo = {f["archivo"]: f for f in filas}
    por_id = {f["id"]: f for f in filas}
    for clave, fuente in fuentes.items():
        archivo = fuente["archivo"]
        if archivo in por_archivo:
            fuente["id"] = por_archivo[archivo]["id"]
            fuente["fecha_prueba"] = por_archivo[archivo]["fecha_de_prueba"]
        elif archivo in OTROS_ARCHIVOS:
            id_fuente, fecha = OTROS_ARCHIVOS[archivo]
            fuente["id"] = id_fuente
            fuente["fecha_prueba"] = fecha or por_id[id_fuente]["fecha_de_prueba"]
        else:
            raise ValueError(f"La fuente «{clave}» ({archivo}) no está en catalogo/fuentes.csv")
    return fuentes
