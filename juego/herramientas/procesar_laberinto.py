"""Prepara los dibujos aprobados de HU46 sin modificar sus originales.

Desde juego/: .venv/Scripts/python herramientas/procesar_laberinto.py
Requiere Pillow, ya usado por las herramientas de animaciones.
"""

from collections import deque
from pathlib import Path
import json

from PIL import Image


JUEGO = Path(__file__).resolve().parents[1]
ORIGEN = JUEGO / "arte" / "laberinto" / "origen"
DESTINO = JUEGO / "public" / "dibujos"
PIEZAS = (
    ("muro-adobe-1", (64, 64, 576, 576)),
    ("muro-adobe-2", (704, 64, 1216, 576)),
    ("puerta-cerrada", (64, 704, 576, 1216)),
    ("puerta-abierta", (704, 704, 1216, 1216)),
)


def limpiar_alfa(imagen):
    """Conserva el bloque y su antialias; elimina motas aisladas casi invisibles."""
    imagen = imagen.convert("RGBA")
    alfa = imagen.getchannel("A")
    ancho, alto = imagen.size
    valores = list(alfa.tobytes())
    visitado = bytearray(ancho * alto)
    mayor = []
    for inicio, valor in enumerate(valores):
        if valor < 9 or visitado[inicio]:
            continue
        grupo = []
        pendientes = deque([inicio])
        visitado[inicio] = 1
        while pendientes:
            actual = pendientes.popleft()
            grupo.append(actual)
            x, y = actual % ancho, actual // ancho
            vecinos = []
            if x:
                vecinos.append(actual - 1)
            if x + 1 < ancho:
                vecinos.append(actual + 1)
            if y:
                vecinos.append(actual - ancho)
            if y + 1 < alto:
                vecinos.append(actual + ancho)
            for vecino in vecinos:
                if valores[vecino] >= 9 and not visitado[vecino]:
                    visitado[vecino] = 1
                    pendientes.append(vecino)
        if len(grupo) > len(mayor):
            mayor = grupo
    limpio = [0] * (ancho * alto)
    for indice in mayor:
        limpio[indice] = 255 if valores[indice] >= 248 else valores[indice]
    alfa.putdata(limpio)
    imagen.putalpha(alfa)
    return imagen


def diferencia_bordes(imagen):
    pixeles = imagen.load()
    ancho, alto = imagen.size
    horizontal = sum(
        abs(pixeles[0, y][c] - pixeles[ancho - 1, y][c])
        for y in range(alto) for c in range(3)
    ) / (alto * 3)
    vertical = sum(
        abs(pixeles[x, 0][c] - pixeles[x, alto - 1][c])
        for x in range(ancho) for c in range(3)
    ) / (ancho * 3)
    return {"izquierda_derecha": horizontal, "arriba_abajo": vertical}


def igualar_bordes(imagen, banda=32):
    """Une ambos extremos con una mezcla suave y local, sin tocar el centro."""
    imagen = imagen.convert("RGB").copy()
    pixeles = imagen.load()
    ancho, alto = imagen.size
    banda = min(banda, ancho // 4, alto // 4)
    for distancia in range(banda):
        progreso = distancia / (banda - 1)
        suave = progreso * progreso * (3 - 2 * progreso)
        mezcla = (1 - suave) * 0.5
        for y in range(alto):
            a = pixeles[distancia, y]
            b = pixeles[ancho - 1 - distancia, y]
            pixeles[distancia, y] = tuple(round((1 - mezcla) * a[c] + mezcla * b[c]) for c in range(3))
            pixeles[ancho - 1 - distancia, y] = tuple(round((1 - mezcla) * b[c] + mezcla * a[c]) for c in range(3))
    for distancia in range(banda):
        progreso = distancia / (banda - 1)
        suave = progreso * progreso * (3 - 2 * progreso)
        mezcla = (1 - suave) * 0.5
        for x in range(ancho):
            a = pixeles[x, distancia]
            b = pixeles[x, alto - 1 - distancia]
            pixeles[x, distancia] = tuple(round((1 - mezcla) * a[c] + mezcla * b[c]) for c in range(3))
            pixeles[x, alto - 1 - distancia] = tuple(round((1 - mezcla) * b[c] + mezcla * a[c]) for c in range(3))
    assert diferencia_bordes(imagen) == {"izquierda_derecha": 0, "arriba_abajo": 0}
    return imagen


def datos_archivo(ruta):
    with Image.open(ruta) as imagen:
        return {"archivo": str(ruta.relative_to(JUEGO)), "ancho": imagen.width,
                "alto": imagen.height, "modo": imagen.mode, "bytes": ruta.stat().st_size}


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    resultado = {"archivos": [], "faltantes": []}

    bloques = ORIGEN / "bloques.png"
    if bloques.exists():
        with Image.open(bloques) as hoja:
            if hoja.size != (1280, 1280):
                raise ValueError("La hoja aprobada bloques.png debe medir 1280 × 1280")
            for nombre, recorte in PIEZAS:
                pieza = limpiar_alfa(hoja.crop(recorte))
                pieza = pieza.resize((256, 256), Image.Resampling.LANCZOS)
                destino = DESTINO / (nombre + ".png")
                pieza.save(destino, optimize=True, compress_level=9)
                resultado["archivos"].append(datos_archivo(destino))
    else:
        resultado["faltantes"].append(str(bloques.relative_to(JUEGO)))

    fondo = ORIGEN / "fondo-pueblito.png"
    if fondo.exists():
        with Image.open(fondo) as imagen:
            imagen = imagen.convert("RGB")
            if imagen.width > 2048:
                imagen = imagen.resize((2048, round(imagen.height * 2048 / imagen.width)), Image.Resampling.LANCZOS)
            destino = DESTINO / "fondo-pueblito.webp"
            imagen.save(destino, quality=88, method=6)
            resultado["archivos"].append(datos_archivo(destino))
    else:
        resultado["faltantes"].append(str(fondo.relative_to(JUEGO)))

    piso = ORIGEN / "piso-tierra.png"
    if piso.exists():
        with Image.open(piso) as imagen:
            imagen = imagen.convert("RGB")
            resultado["bordes_antes"] = diferencia_bordes(imagen)
            imagen = igualar_bordes(imagen)
            destino = DESTINO / "piso-tierra.png"
            imagen.save(destino, optimize=True, compress_level=9)
            resultado["bordes_despues"] = diferencia_bordes(imagen)
            resultado["archivos"].append(datos_archivo(destino))
    else:
        resultado["faltantes"].append(str(piso.relative_to(JUEGO)))

    print(json.dumps(resultado, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
