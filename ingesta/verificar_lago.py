"""
Verifica que el lago, el diccionario y lo que publica la web digan lo mismo.

Lee de:   catalogo/fuentes.csv, docs/Diccionario_de_datos_Barcelona_Explora.xlsx,
          lago/raw/, lago/procesado/ y el código del sitio
Escribe:  nada. Solo informa, y termina con error si algo falla.

Uso (desde la raíz del repo):
    python ingesta/verificar_lago.py               # revisa el repositorio
    python ingesta/verificar_lago.py --publicado   # además prueba el sitio en línea, sin sesión

Requiere: solo Python. Con openpyxl instalado, también compara el diccionario de Excel campo por campo.
"""

import csv
import json
import re
import statistics
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PROCESADO = RAIZ / "lago" / "procesado"
EXCEL = RAIZ / "docs" / "Diccionario_de_datos_Barcelona_Explora.xlsx"
SITIO = "https://barcelona-explora.vercel.app"

CLAVES_PERSONALES = {"host_id", "host_name", "host_url", "host_profile_id", "host_profile_url", "host_about", "host_location",
                     "host_thumbnail_url", "host_picture_url", "picture_url", "listing_url"}
SECRETOS = re.compile(r"AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{35}|BEGIN [A-Z ]*PRIVATE KEY")
PRECIO_MIN, PRECIO_MAX_PERSONA, PRECIO_MAX_LARGA = 15, 400, 500  # Mismos límites de procesar_mapa_y_alojamiento.py
CAJA_BCN = (41.30, 41.50, 2.05, 2.25)  # Latitud y longitud alrededor de Barcelona
PAGINAS = ["index.html", "sobre-barcelona.html", "lugares.html", "mapa.html", "alojamiento.html", "moverte.html", "clima.html", "proyecto.html"]

resultados = []


def revisar(nombre, fallos, detalle=""):
    """Anota una comprobación. fallos: lista de problemas; vacía si todo está bien."""
    resultados.append((nombre, not fallos))
    print(f"[{'OK' if not fallos else 'FALLA'}] {nombre}" + (f" · {detalle}" if detalle and not fallos else ""))
    for f in fallos[:8]:
        print(f"        - {f}")
    if len(fallos) > 8:
        print(f"        … y {len(fallos) - 8} más")


def aviso(texto):
    print(f"[AVISO] {texto}")


def json_de(nombre):
    return json.loads((PROCESADO / nombre).read_text(encoding="utf-8"))


def claves(x):
    if isinstance(x, dict):
        for k, v in x.items():
            yield k
            yield from claves(v)
    elif isinstance(x, list):
        for v in x:
            yield from claves(v)


def rastreados():
    r = subprocess.run(["git", "ls-files"], cwd=RAIZ, capture_output=True, text=True, encoding="utf-8")
    return r.stdout.splitlines() if r.returncode == 0 else None


def verificar_catalogo():
    with open(RAIZ / "catalogo" / "fuentes.csv", encoding="utf-8-sig", newline="") as f:
        filas = list(csv.DictReader(f))
    faltan, sin_datos = [], []
    for f in filas:
        if not (RAIZ / f["archivo"]).exists() and f["id"] != "F19":
            faltan.append(f"{f['id']}: {f['archivo']}")
        if not f["licencia_tal_como_aparece"] or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", f["fecha_de_prueba"]) or not f["url_origen"]:
            sin_datos.append(f["id"])
    revisar("Cada fuente del catálogo tiene su archivo en el lago", faltan, f"{len(filas)} fuentes")
    revisar("Cada fuente tiene licencia, fecha real de prueba y URL", sin_datos)
    ids = [f["id"] for f in filas]
    revisar("No hay ID de fuente repetidos", sorted({i for i in ids if ids.count(i) > 1}))
    return filas


def verificar_diccionario(filas):
    try:
        import openpyxl
    except ImportError:
        aviso("openpyxl no está instalado: no se comparó el Excel campo por campo.")
        return
    libro = openpyxl.load_workbook(EXCEL, read_only=True, data_only=True)
    fuentes = {r[0] for r in libro["1. Fuentes"].iter_rows(min_row=5, values_only=True) if r[0]}
    catalogo = {f["id"] for f in filas}
    revisar("El Excel y el catálogo tienen las mismas fuentes", sorted(fuentes ^ catalogo), f"{len(fuentes)} fuentes")

    contenidos, problemas, total = {}, [], 0
    for r in libro["2. Diccionario"].iter_rows(min_row=5, values_only=True):
        if not r[0]:
            continue
        total += 1
        ruta, campo = re.sub(r" \(linea_de_tiempo\)$", "", r[1]), str(r[2])
        if ruta.endswith("listings.csv") and not (RAIZ / ruta).exists():
            continue
        if ruta not in contenidos:
            p = RAIZ / ruta
            if not p.exists():
                contenidos[ruta] = None
            else:
                crudo = p.read_bytes()
                # Basta el encabezado o una muestra: el campo tiene que aparecer como nombre, no como valor
                for cod in ("utf-16", "utf-8-sig", "latin-1") if crudo[:2] in (b"\xff\xfe", b"\xfe\xff") else ("utf-8-sig", "latin-1"):
                    try:
                        contenidos[ruta] = crudo.decode(cod)
                        break
                    except UnicodeDecodeError:
                        continue
        if contenidos[ruta] is None:
            problemas.append(f"{r[0]}: no existe {ruta}")
        elif campo not in contenidos[ruta]:
            problemas.append(f"{r[0]}: el campo {campo} no aparece en {ruta}")
    revisar("Cada campo del diccionario existe en su archivo", problemas, f"{total} campos")
    sin_def = [str(r[2]) for r in libro["2. Diccionario"].iter_rows(min_row=5, values_only=True) if r[0] and (not r[4] or not r[12])]
    revisar("Cada campo tiene significado y pregunta asociada", sin_def)
    expuestos = [str(r[2]) for r in libro["2. Diccionario"].iter_rows(min_row=5, values_only=True)
                 if r[0] and r[10] == "Dato personal" and str(r[2]) in CLAVES_PERSONALES and r[7] != "[no se reproduce]"]
    revisar("El Excel no reproduce ejemplos de datos personales", expuestos)


def verificar_personas():
    problemas = []
    archivos = sorted(PROCESADO.glob("*.json"))
    for p in archivos:
        encontradas = set(claves(json.loads(p.read_text(encoding="utf-8")))) & CLAVES_PERSONALES
        if encontradas:
            problemas.append(f"{p.name}: {sorted(encontradas)}")
    revisar("Ningún JSON publicado trae campos de anfitriones", problemas, f"{len(archivos)} archivos")

    a = json_de("alojamiento.json")
    malos = [x["id"] for x in a["alojamientos"] if x["tipo"] == "airbnb" and not re.fullmatch(r"airbnb-\d+", x["id"])]
    revisar("Los anuncios de Airbnb llevan seudónimo, no su id real", malos)
    enlaces = [p.name for p in (RAIZ / "assets" / "js").glob("*.js") if re.search(r"airbnb\.[a-z.]+/rooms", p.read_text(encoding="utf-8"))]
    revisar("El sitio no enlaza a los anuncios de Airbnb", enlaces)
    for x in a["renta_barrios"]:
        if "seccion_censal" in x:
            revisar("La renta se publica por barrio, no por sección censal", [x.get("barrio", "?")])
            break
    else:
        revisar("La renta se publica por barrio, no por sección censal", [])


def verificar_repositorio():
    archivos = rastreados()
    if archivos is None:
        aviso("No hay git disponible: no se revisó qué se sube al repositorio.")
        return
    prohibidos = [f for f in archivos if f == ".env" or f.endswith("listings.csv") or f.startswith("docs/originales/")]
    revisar("El repositorio no incluye listings.csv, .env ni los originales", prohibidos)
    claves_ = []
    for f in archivos:
        if f.endswith((".py", ".js", ".html", ".md", ".css", ".yml", ".yaml", ".txt")) and "vendor" not in f:
            p = RAIZ / f
            if p.exists() and SECRETOS.search(p.read_text(encoding="utf-8", errors="ignore")):
                claves_.append(f)
    revisar("El código no contiene claves ni llaves privadas", claves_)


def verificar_precios():
    a = json_de("alojamiento.json")
    al = a["alojamientos"]
    noche = [x for x in al if x.get("precio_noche_eur") is not None]
    mes = [x for x in al if x.get("precio_mes_eur") is not None]
    malos = []
    for x in noche:
        personas = x.get("capacidad") or 1
        if x["precio_noche_eur"] < PRECIO_MIN or x["precio_noche_eur"] / personas > PRECIO_MAX_PERSONA:
            malos.append(f"{x['id']}: {x['precio_noche_eur']} €/noche")
    for x in mes:
        if not PRECIO_MIN * 30 - 15 <= x["precio_mes_eur"] <= PRECIO_MAX_LARGA * 30 + 15:
            malos.append(f"{x['id']}: {x['precio_mes_eur']} €/mes")
    revisar("Los precios de Airbnb están dentro de los límites escritos", malos, f"{len(noche)} por noche y {len(mes)} por mes")
    revisar("Hoteles y viviendas turísticas no traen precios inventados",
            [x["id"] for x in al if x["tipo"] != "airbnb" and x.get("precio_noche_eur") is not None])

    r = a["resumen"]
    mediana = statistics.median(x["precio_noche_eur"] for x in noche)
    errores = []
    if abs(mediana - r["precio_mediana_eur"]) > .01:
        errores.append(f"mediana {mediana} y resumen {r['precio_mediana_eur']}")
    if r["total"] != len(al):
        errores.append(f"total {len(al)} y resumen {r['total']}")
    for tipo, n in r["por_tipo"].items():
        if n != sum(1 for x in al if x["tipo"] == tipo):
            errores.append(f"conteo de {tipo}")
    revisar("El resumen de Alojamiento coincide con los registros", errores, f"mediana {mediana:g} €")
    curioso = next(d["dato"] for d in json_de("datos_curiosos.json")["datos"] if "Airbnb" in d["dato"])
    revisar("Inicio y Alojamiento dicen la misma mediana", [] if f"{mediana:.0f} €" in curioso else [curioso])


def verificar_territorio():
    z = json_de("zonas.json")
    barrios, distritos = z.get("barrios", []), z.get("distritos", [])
    n_b = len(barrios.get("features", barrios)) if isinstance(barrios, dict) else len(barrios)
    n_d = len(distritos.get("features", distritos)) if isinstance(distritos, dict) else len(distritos)
    revisar("El territorio tiene 73 barrios y 10 distritos", [] if (n_b, n_d) == (73, 10) else [f"{n_b} barrios y {n_d} distritos"])
    la0, la1, lo0, lo1 = CAJA_BCN
    fuera = [x["id"] for x in json_de("alojamiento.json")["alojamientos"] if not (la0 <= x["lat"] <= la1 and lo0 <= x["lon"] <= lo1)]
    revisar("Los alojamientos caen dentro de Barcelona", fuera)


def verificar_fuentes_publicadas(filas):
    ids = {f["id"] for f in filas}
    problemas, enlaces, vistas = [], [], 0
    for p in sorted(PROCESADO.glob("*.json")):
        for clave, f in (json.loads(p.read_text(encoding="utf-8")).get("fuentes") or {}).items():
            vistas += 1
            if not f.get("id") or any(i.strip() not in ids for i in f["id"].split(",")):
                problemas.append(f"{p.name}/{clave}: ID «{f.get('id')}»")
            if not f.get("fecha_prueba"):
                problemas.append(f"{p.name}/{clave}: sin fecha de prueba")
            if not (RAIZ / f["archivo"]).exists() and f.get("archivo_publico") is not False:
                enlaces.append(f"{p.name}/{clave}: {f['archivo']}")
    revisar("Cada fuente publicada tiene ID del catálogo y fecha de prueba", problemas, f"{vistas} referencias")
    revisar("Los enlaces a archivos del lago llevan a un archivo real", enlaces)
    sin = [f.name for f in (RAIZ / "assets" / "js").glob("*.js") if f.name in ("alojamiento.js", "lugares.js", "mapa.js", "moverte.js", "clima.js")
           and "filasTrazabilidad(" not in f.read_text(encoding="utf-8")]
    revisar("Todas las fichas muestran el ID y la fecha de prueba", sin)
    fecha_f21 = next(f["fecha_de_prueba"] for f in filas if f["id"] == "F21")
    clima = (RAIZ / "assets" / "js" / "clima.js").read_text(encoding="utf-8")
    revisar("La fecha de Open-Meteo en la web coincide con el catálogo", [] if fecha_f21 in clima else [fecha_f21])

    cifras = json_de("sobre_barcelona.json")["cifras"]
    sin_fuente = [c["id"] for c in cifras if not (c.get("id_fuente") and c.get("fuente") and c.get("fecha_consulta") and (c.get("url") or c.get("archivo")))]
    revisar("Cada cifra de Sobre Barcelona tiene ID, fuente y fecha", sin_fuente, f"{len(cifras)} cifras")


def verificar_sitio():
    rotos = []
    for pagina in PAGINAS:
        texto = (RAIZ / pagina).read_text(encoding="utf-8")
        for ref in re.findall(r'(?:src|href)="((?:assets|lago)/[^"#?]+)"', texto):
            if not (RAIZ / ref).exists():
                rotos.append(f"{pagina}: {ref}")
    a = json_de("alojamiento.json")
    fotos = [x["foto"]["archivo_local"] for x in a["alojamientos"] if x.get("foto")] + [f["archivo_local"] for f in a["fotos_barrios"].values()]
    rotos += [f for f in fotos if not (RAIZ / f).exists()]
    revisar("Las páginas y las fotos apuntan a archivos reales", rotos, f"{len(PAGINAS)} páginas y {len(fotos)} fotos")
    lugares = {l["id"] for l in json_de("lugares_imperdibles.json")["lugares"]}
    hitos = [h["titulo"] for h in json_de("sobre_barcelona.json")["linea_de_tiempo"] if h.get("lugar") and h["lugar"]["id"] not in lugares]
    revisar("Los hitos enlazan a lugares que existen", hitos)
    nombres = (RAIZ / "assets" / "js" / "navegacion.js").read_text(encoding="utf-8")
    revisar("Los nombres del grupo están en el pie", [n for n in ("Camilo Salazar", "Luis Ángel Nerio", "César Montoya", "Maria Alejandra Ocampo Giraldo") if n not in nombres])


def estado_web(ruta):
    pedido = urllib.request.Request(f"{SITIO}/{ruta}", headers={"User-Agent": "verificar_lago", "Range": "bytes=0-100"})
    try:
        with urllib.request.urlopen(pedido, timeout=30) as r:
            return r.status
    except urllib.error.HTTPError as e:
        return e.code


def verificar_publicado():
    prohibidos = {r: estado_web(r) for r in ("lago/raw/turismo/listings.csv", ".env", ".git/config", "docs/originales/")}
    revisar("El sitio publicado no entrega datos protegidos", [f"{r}: {s}" for r, s in prohibidos.items() if s not in (403, 404)])
    caidas = {p: estado_web(p) for p in PAGINAS}
    revisar("Las páginas publicadas responden", [f"{p}: {s}" for p, s in caidas.items() if s not in (200, 206)])


def main():
    filas = verificar_catalogo()
    verificar_diccionario(filas)
    verificar_personas()
    verificar_repositorio()
    verificar_precios()
    verificar_territorio()
    verificar_fuentes_publicadas(filas)
    verificar_sitio()
    if "--publicado" in sys.argv:
        verificar_publicado()
    fallas = sum(1 for _, ok in resultados if not ok)
    print(f"\n{len(resultados) - fallas} de {len(resultados)} comprobaciones correctas.")
    sys.exit(1 if fallas else 0)


if __name__ == "__main__":
    main()
