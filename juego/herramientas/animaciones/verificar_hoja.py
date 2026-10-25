"""Comprueba la alineación leyendo los píxeles del PNG final, sin usar offsets.

No lee el informe del armado: mide otra vez las cabezas y los pies de cada
celda. Sale con código 1 si una referencia comprobada supera la tolerancia.
En saltos se seleccionan los apoyos y se permite variar la altura de la cabeza.
"""

import argparse
import json
from pathlib import Path

from PIL import Image

from armar_hoja import interpretar_celda, medir_anclas


def verificar_hoja(ruta, celda, tolerancia=2, cuadros_seleccionados=None, cuadros_pies=None, altura_variable=False, fraccion_cabeza=0.42):
    """Mide el PNG, distinguiendo el salto de una pérdida de alineación.

    Por defecto comprueba todas las referencias de todos los cuadros. Para una
    secuencia que salta, los apoyos se indican explícitamente y la altura de la
    cabeza se informa sin exigir que permanezca inmóvil durante el salto.
    """
    if tolerancia < 0:
        raise ValueError("La tolerancia no puede ser negativa")
    with Image.open(ruta) as original:
        if original.format != "PNG":
            raise ValueError("La hoja debe ser PNG")
        imagen = original.convert("RGBA")
    ancho, alto = celda
    if imagen.width % ancho or imagen.height % alto:
        raise ValueError("El tamaño de la hoja no es múltiplo de la celda")
    cuadros = []
    for y in range(0, imagen.height, alto):
        for x in range(0, imagen.width, ancho):
            cuadro = imagen.crop((x, y, x + ancho, y + alto))
            anclas = medir_anclas(cuadro, fraccion_cabeza)
            caja = cuadro.getchannel("A").getbbox()
            cuadros.append({
                "cuadro": len(cuadros),
                **anclas,
                "margenes": {"izquierdo": caja[0], "superior": caja[1], "derecho": ancho - caja[2], "inferior": alto - caja[3]},
            })
    seleccionados = list(range(len(cuadros))) if cuadros_seleccionados is None else list(cuadros_seleccionados)
    apoyos = seleccionados if cuadros_pies is None else list(cuadros_pies)
    if not seleccionados or len(set(seleccionados)) != len(seleccionados) or any(indice < 0 or indice >= len(cuadros) for indice in seleccionados):
        raise ValueError("Los cuadros deben existir en la hoja y no repetirse")
    if not apoyos or len(set(apoyos)) != len(apoyos) or any(indice not in seleccionados for indice in apoyos):
        raise ValueError("Los cuadros de pies deben pertenecer a la selección y no repetirse")
    variaciones = {}
    for referencia in ("centro_cabeza_x", "cima_cabeza_y", "linea_pies_y"):
        indices = apoyos if referencia == "linea_pies_y" else seleccionados
        valores = [cuadros[indice][referencia] for indice in indices]
        variaciones[referencia] = max(valores) - min(valores)
    referencias_comprobadas = ["centro_cabeza_x", "linea_pies_y"] if altura_variable else list(variaciones)
    correcta = all(variaciones[referencia] <= tolerancia for referencia in referencias_comprobadas)
    return {
        "hoja": str(ruta),
        "medicion": "Alfa >= 32; centro horizontal de la cabeza en el " + str(round(fraccion_cabeza * 100, 2)) + " % superior de la silueta; última fila visible de los pies",
        "tolerancia_px": tolerancia,
        "cuadros_comprobados": seleccionados,
        "cuadros_pies": apoyos,
        "altura_variable": altura_variable,
        "fraccion_cabeza": fraccion_cabeza,
        "referencias_comprobadas": referencias_comprobadas,
        "correcta": correcta,
        "variacion_px": variaciones,
        "cuadros": [cuadros[indice] for indice in seleccionados],
    }


def interpretar_cuadros(texto):
    try:
        cuadros = [int(parte) for parte in texto.split(",")]
        if not cuadros or min(cuadros) < 0 or len(set(cuadros)) != len(cuadros):
            raise ValueError()
        return cuadros
    except ValueError as error:
        raise argparse.ArgumentTypeError("Usa índices distintos separados por comas, por ejemplo 9,10,11") from error


def main():
    argumentos = argparse.ArgumentParser(description=__doc__)
    argumentos.add_argument("hoja", type=Path)
    argumentos.add_argument("--celda", type=interpretar_celda, default=(256, 256))
    argumentos.add_argument("--tolerancia", type=float, default=2)
    argumentos.add_argument("--cuadros", type=interpretar_cuadros, help="Cuadros de la secuencia que se comprueban")
    argumentos.add_argument("--cuadros-pies", type=interpretar_cuadros, help="Cuadros apoyados cuyos pies se comparan")
    argumentos.add_argument("--altura-variable", action="store_true", help="Informa la cima sin exigir altura constante durante un salto")
    argumentos.add_argument("--fraccion-cabeza", type=float, default=0.42)
    argumentos.add_argument("--reporte", type=Path)
    opciones = argumentos.parse_args()
    try:
        informe = verificar_hoja(opciones.hoja, opciones.celda, opciones.tolerancia, opciones.cuadros, opciones.cuadros_pies, opciones.altura_variable, opciones.fraccion_cabeza)
        if opciones.reporte:
            opciones.reporte.parent.mkdir(parents=True, exist_ok=True)
            opciones.reporte.write_text(json.dumps(informe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(informe, ensure_ascii=False, indent=2))
        if not informe["correcta"]:
            argumentos.exit(1, "AVISO: las referencias comprobadas varían más de " + str(opciones.tolerancia) + " px\n")
    except (OSError, ValueError) as error:
        argumentos.exit(1, "No se pudo verificar la hoja: " + str(error) + "\n")


if __name__ == "__main__":
    main()
