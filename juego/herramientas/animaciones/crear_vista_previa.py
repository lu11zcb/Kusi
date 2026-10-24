"""Reproduce un ciclo del manifiesto sobre el verde del juego, sin otro catálogo."""

import argparse
import json
from pathlib import Path
import re

from PIL import Image


def crear_vista_previa(manifiesto, salida, direccion="frente", estado="caminar"):
    """Lee cuadros y cadencia del mismo JSON que consume cuyAnimado.js."""
    datos = json.loads(manifiesto.read_text(encoding="utf-8"))
    animacion = datos["animaciones"][direccion][estado]
    ancho = datos["fotograma"]["ancho"]
    alto = datos["fotograma"]["alto"]
    columnas = datos["cuadricula"]["columnas"]
    raiz_juego = Path(__file__).resolve().parents[2]
    medidas = (raiz_juego / "src" / "medidas.js").read_text(encoding="utf-8")
    coincidencia = re.search(r"verde:\s*['\"](#[0-9a-fA-F]{6})['\"]", medidas)
    if coincidencia is None:
        raise ValueError("No se encontró COLOR.verde en src/medidas.js")
    color_pasto = coincidencia.group(1)

    with Image.open(manifiesto.parent / datos["imagen"]) as original:
        hoja = original.convert("RGBA")
    fondo = Image.new("RGBA", hoja.size, color_pasto)
    fondo.alpha_composite(hoja)
    # Una paleta compartida evita que los colores parpadeen entre fotogramas.
    hoja_con_fondo = fondo.convert("RGB").quantize(
        colors=256, method=Image.Quantize.MEDIANCUT
    )
    cuadros = []
    for indice in animacion["fotogramas"]:
        izquierda = (indice % columnas) * ancho
        arriba = (indice // columnas) * alto
        cuadro = hoja_con_fondo.crop(
            (izquierda, arriba, izquierda + ancho, arriba + alto)
        )
        if direccion == "izquierda":
            cuadro = cuadro.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        cuadros.append(cuadro)

    # GIF guarda centésimas de segundo: alternar 120/130 ms representa 8 fps
    # en promedio, sin convertir cada paso de 125 ms en uno de 120 ms.
    fps = animacion["fps"]
    instantes = [round(indice * 100 / fps) * 10 for indice in range(len(cuadros) + 1)]
    duraciones = [fin - inicio for inicio, fin in zip(instantes, instantes[1:])]
    if min(duraciones) < 10:
        raise ValueError("La cadencia es demasiado alta para una vista previa GIF")
    salida.parent.mkdir(parents=True, exist_ok=True)
    cuadros[0].save(
        salida,
        save_all=True,
        append_images=cuadros[1:],
        duration=duraciones,
        loop=0,
        disposal=2,
        optimize=False,
    )
    print("GIF: " + str(salida))
    print("Fondo COLOR.verde: " + color_pasto)
    print("Duraciones (ms): " + str(duraciones))


if __name__ == "__main__":
    argumentos = argparse.ArgumentParser(description=__doc__)
    argumentos.add_argument("manifiesto", type=Path)
    argumentos.add_argument("salida", type=Path)
    argumentos.add_argument("--direccion", default="frente")
    argumentos.add_argument("--estado", default="caminar")
    opciones = argumentos.parse_args()
    crear_vista_previa(
        opciones.manifiesto, opciones.salida, opciones.direccion, opciones.estado
    )
