"""Comprueba la alineación leyendo los píxeles del PNG final, sin usar offsets.

No lee el informe del armado: mide otra vez las cabezas y los pies de cada
celda. Sale con código 1 si alguna referencia varía más de la tolerancia.
"""

import argparse
import json
from pathlib import Path

from PIL import Image

from armar_hoja import interpretar_celda, medir_anclas


def verificar_hoja(ruta, celda, tolerancia=2):
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
            anclas = medir_anclas(cuadro)
            caja = cuadro.getchannel("A").getbbox()
            cuadros.append({
                "cuadro": len(cuadros),
                **anclas,
                "margenes": {"izquierdo": caja[0], "superior": caja[1], "derecho": ancho - caja[2], "inferior": alto - caja[3]},
            })
    variaciones = {}
    for referencia in ("centro_cabeza_x", "cima_cabeza_y", "linea_pies_y"):
        valores = [cuadro[referencia] for cuadro in cuadros]
        variaciones[referencia] = max(valores) - min(valores)
    correcta = all(variacion <= tolerancia for variacion in variaciones.values())
    return {
        "hoja": str(ruta),
        "medicion": "Alfa >= 32; centro horizontal de la cabeza en el 42 % superior de la silueta; última fila visible de los pies",
        "tolerancia_px": tolerancia,
        "correcta": correcta,
        "variacion_px": variaciones,
        "cuadros": cuadros,
    }


def main():
    argumentos = argparse.ArgumentParser(description=__doc__)
    argumentos.add_argument("hoja", type=Path)
    argumentos.add_argument("--celda", type=interpretar_celda, default=(256, 256))
    argumentos.add_argument("--tolerancia", type=float, default=2)
    argumentos.add_argument("--reporte", type=Path)
    opciones = argumentos.parse_args()
    try:
        informe = verificar_hoja(opciones.hoja, opciones.celda, opciones.tolerancia)
        if opciones.reporte:
            opciones.reporte.parent.mkdir(parents=True, exist_ok=True)
            opciones.reporte.write_text(json.dumps(informe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps(informe, ensure_ascii=False, indent=2))
        if not informe["correcta"]:
            argumentos.exit(1, "AVISO: la cabeza o los pies varían más de " + str(opciones.tolerancia) + " px\n")
    except (OSError, ValueError) as error:
        argumentos.exit(1, "No se pudo verificar la hoja: " + str(error) + "\n")


if __name__ == "__main__":
    main()
