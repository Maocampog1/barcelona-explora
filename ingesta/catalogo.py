"""
Une cada fuente de los scripts de ingesta con su fila en catalogo/fuentes.csv.

Así el ID (F01, F02…), la vigencia y la fecha de prueba que muestran las fichas salen de un solo lugar:
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


def vigencia(fila):
    """Periodo que cubre y frecuencia, tal como están en el diccionario."""
    frecuencia = fila["frecuencia"]
    return f"{fila['periodo_que_cubre']} · Actualización: {frecuencia[0].lower() + frecuencia[1:]}"


def completar_fuentes(fuentes):
    """Agrega "id", "vigencia" y "fecha_prueba" a cada fuente, buscándola por su archivo."""
    filas = leer_catalogo()
    por_archivo = {f["archivo"]: f for f in filas}
    por_id = {f["id"]: f for f in filas}
    for clave, fuente in fuentes.items():
        archivo = fuente["archivo"]
        if archivo in por_archivo:
            fuente["id"] = por_archivo[archivo]["id"]
            fuente["fecha_prueba"] = por_archivo[archivo]["fecha_de_prueba"]
            fuente["vigencia"] = vigencia(por_archivo[archivo])
        elif archivo in OTROS_ARCHIVOS:
            id_fuente, fecha = OTROS_ARCHIVOS[archivo]
            fuente["id"] = id_fuente
            fuente["fecha_prueba"] = fecha or por_id[id_fuente]["fecha_de_prueba"]
            # Una fuente compuesta (la capa de turismo) no tiene una sola vigencia: cada lugar trae la suya en el catálogo
            fuente["vigencia"] = vigencia(por_id[id_fuente]) if id_fuente in por_id else "Según cada fuente: ver el catálogo en Sobre el proyecto"
        else:
            raise ValueError(f"La fuente «{clave}» ({archivo}) no está en catalogo/fuentes.csv")
    return fuentes
