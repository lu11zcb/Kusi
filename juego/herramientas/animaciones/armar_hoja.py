"""Arma hojas PNG sin redibujar el cuy ni cambiar la escala entre fotogramas.

La entrada puede ser una tira horizontal o una carpeta de PNG de Blender. Las
columnas transparentes separan los cuadros de una tira; los PNG de una carpeta
se ordenan por su nombre, considerando los números como números (2 antes de 10).
"""

import argparse
import json
import re
from array import array
from pathlib import Path

from PIL import Image


UMBRAL_ANCLA = 32


def componentes_conectados(alfa):
    """Encuentra islas de alfa con vecindad de ocho, sin erosionar sus bordes.

    Se usa alfa > 0: un borde suave pertenece al personaje aunque sea tenue. La
    limpieza elimina islas completas; nunca recorta los píxeles semitransparentes
    que continúan conectados al cuerpo. Los índices compactos evitan guardar una
    tupla de Python por cada píxel del original de alta resolución.
    """
    ancho, alto = alfa.size
    pendientes = bytearray(alfa.tobytes())
    componentes = []
    for inicio in range(len(pendientes)):
        if not pendientes[inicio]:
            continue
        pendientes[inicio] = 0
        pila = [inicio]
        indices = array("I")
        while pila:
            indice = pila.pop()
            indices.append(indice)
            y, x = divmod(indice, ancho)
            for vecino_y in range(max(0, y - 1), min(alto, y + 2)):
                fila = vecino_y * ancho
                for vecino_x in range(max(0, x - 1), min(ancho, x + 2)):
                    vecino = fila + vecino_x
                    if pendientes[vecino]:
                        pendientes[vecino] = 0
                        pila.append(vecino)
        componentes.append(indices)
    return componentes


def limpiar_islas(imagen, fraccion_minima=0.01):
    """Conserva los cuerpos grandes y borra únicamente islas desconectadas.

    En una tira cada personaje es una isla grande. El umbral relativo descarta
    las manchitas, sin exigir que los tres personajes estén conectados entre sí.
    Para un cuadro individual se puede pedir fracción 1 para conservar su cuerpo.
    """
    componentes = componentes_conectados(imagen.getchannel("A"))
    if not componentes:
        raise ValueError("La imagen no contiene píxeles visibles")
    area_mayor = max(len(componente) for componente in componentes)
    alfa_original = imagen.getchannel("A").tobytes()
    alfa_limpio = bytearray(len(alfa_original))
    eliminados = 0
    islas_eliminadas = 0
    for componente in componentes:
        if len(componente) < area_mayor * fraccion_minima:
            eliminados += len(componente)
            islas_eliminadas += 1
            continue
        for indice in componente:
            alfa_limpio[indice] = alfa_original[indice]
    limpia = imagen.copy()
    limpia.putalpha(Image.frombytes("L", imagen.size, bytes(alfa_limpio)))
    return limpia, {"islas_eliminadas": islas_eliminadas, "pixeles_eliminados": eliminados}


def medir_anclas(imagen):
    """Mide cabeza y suelo desde el alfa, excluyendo los brazos del centro x.

    La cabeza del cuy ocupa el 42 % superior de su silueta. Esa banda termina
    antes de los hombros y del pañuelo, de modo que extender un brazo no cambia
    el centro horizontal. La línea de apoyo es la última fila con alfa >= 32;
    así un halo de remuestreo casi invisible no se confunde con un pie.
    """
    alfa = imagen.getchannel("A").point(lambda valor: 255 if valor >= UMBRAL_ANCLA else 0)
    caja = alfa.getbbox()
    if caja is None:
        raise ValueError("El cuadro no tiene una silueta medible")
    izquierda, arriba, derecha, abajo = caja
    limite_cabeza = arriba + max(1, round((abajo - arriba) * 0.42))
    caja_cabeza = alfa.crop((0, 0, imagen.width, limite_cabeza)).getbbox()
    return {
        "centro_cabeza_x": (caja_cabeza[0] + caja_cabeza[2] - 1) / 2,
        "cima_cabeza_y": caja_cabeza[1],
        "linea_pies_y": abajo - 1,
        "caja_silueta": list(caja),
    }


def separar_columnas(imagen):
    """Corta por bandas verticales vacías después de quitar las manchitas."""
    alfa = imagen.getchannel("A")
    bandas = []
    inicio = None
    for x in range(imagen.width + 1):
        visible = x < imagen.width and alfa.crop((x, 0, x + 1, imagen.height)).getbbox() is not None
        if visible and inicio is None:
            inicio = x
        if not visible and inicio is not None:
            bandas.append(imagen.crop((inicio, 0, x, imagen.height)))
            inicio = None
    return bandas


def orden_natural(ruta):
    return [int(parte) if parte.isdigit() else parte.lower() for parte in re.split(r"(\d+)", ruta.name)]


def leer_cuadros(entrada):
    """No escribe sobre los originales ni cambia sus nombres o ubicación."""
    informe = []
    if entrada.is_dir():
        archivos = sorted(entrada.glob("*.png"), key=orden_natural)
        if not archivos:
            raise ValueError("La carpeta no contiene cuadros PNG")
        cuadros = []
        for archivo in archivos:
            with Image.open(archivo) as original:
                if original.format != "PNG":
                    raise ValueError("El cuadro " + str(archivo) + " no es PNG")
                cuadro, limpieza = limpiar_islas(original.convert("RGBA"), 1)
            cuadros.append(cuadro)
            informe.append({"archivo": str(archivo), **limpieza})
        return cuadros, informe
    with Image.open(entrada) as original:
        if original.format != "PNG":
            raise ValueError("La entrada debe ser PNG para conservar la transparencia")
        limpia, limpieza = limpiar_islas(original.convert("RGBA"))
    informe.append({"archivo": str(entrada), **limpieza})
    return separar_columnas(limpia), informe


def armar_hoja(entrada, salida, celda, margen=8):
    if entrada.is_file() and entrada.resolve() == salida.resolve():
        raise ValueError("La salida no puede sobrescribir la imagen original")
    if entrada.is_dir() and salida.resolve().parent == entrada.resolve():
        # La hoja no debe reemplazar un cuadro ni convertirse en otro cuadro
        # de entrada cuando se vuelva a ejecutar el armado de la carpeta.
        raise ValueError("Guarda la hoja fuera de la carpeta de cuadros originales")
    if salida.suffix.lower() != ".png":
        raise ValueError("El nombre de salida debe terminar en .png")
    cuadros, limpieza = leer_cuadros(entrada)
    anclas = [medir_anclas(cuadro) for cuadro in cuadros]
    cajas = [cuadro.getchannel("A").getbbox() for cuadro in cuadros]
    ancho, alto = celda
    if margen < 0 or min(celda) <= 2 * margen + 4:
        raise ValueError("La celda no deja espacio para el margen solicitado")

    # Los extremos se expresan respecto de la cabeza y del suelo, no respecto
    # del centro del rectángulo. Hay UNA escala calculada con todos los cuadros.
    izquierda = max(ancla["centro_cabeza_x"] - caja[0] for ancla, caja in zip(anclas, cajas))
    derecha = max(caja[2] - 1 - ancla["centro_cabeza_x"] for ancla, caja in zip(anclas, cajas))
    arriba = max(ancla["linea_pies_y"] - caja[1] for ancla, caja in zip(anclas, cajas))
    abajo = max(caja[3] - 1 - ancla["linea_pies_y"] for ancla, caja in zip(anclas, cajas))
    # Dos píxeles reservados para el antialias de Lanczos mantienen el margen
    # visible alrededor de la hoja, incluso tras reducir el original grande.
    reserva = margen + 2
    escala = min(
        (ancho - 1 - 2 * reserva) / (2 * max(izquierda, derecha)),
        (alto - 1 - 2 * reserva) / (arriba + abajo),
    )
    centro_destino = ancho / 2
    pies_destino = alto - 1 - reserva - abajo * escala
    hoja = Image.new("RGBA", (ancho * len(cuadros), alto))
    detalle = []
    for indice, (cuadro, ancla) in enumerate(zip(cuadros, anclas)):
        # El remuestreo usa la misma transformación isotrópica en TODOS los
        # cuadros. No se redondea el ancho y el alto por separado ni se estira
        # cada pose para llenar su celda. RGBa evita bordes blancos en el alfa.
        sobremuestreo = 4
        escala_grande = escala * sobremuestreo
        transformacion = (
            1 / escala_grande, 0, ancla["centro_cabeza_x"] - centro_destino / escala,
            0, 1 / escala_grande, ancla["linea_pies_y"] - pies_destino / escala,
        )
        ampliada = cuadro.convert("RGBa").transform(
            (ancho * sobremuestreo, alto * sobremuestreo),
            Image.Transform.AFFINE,
            transformacion,
            resample=Image.Resampling.BICUBIC,
        )
        celda_final = ampliada.resize(celda, Image.Resampling.LANCZOS).convert("RGBA")
        # El filtro puede crear islas de alfa 1 separadas del borde. Se quitan
        # después de reducir, manteniendo todos los bordes conectados al cuy.
        celda_final, limpieza_final = limpiar_islas(celda_final, 1)
        hoja.paste(celda_final, (indice * ancho, 0))
        detalle.append({
            "cuadro": indice,
            "anclas_original": ancla,
            "anclas_salida": medir_anclas(celda_final),
            "caja_alfa_salida": list(celda_final.getchannel("A").getbbox()),
            "limpieza_remuestreo": limpieza_final,
        })
    salida.parent.mkdir(parents=True, exist_ok=True)
    hoja.save(salida, format="PNG")
    return {
        "entrada": str(entrada),
        "salida": str(salida),
        "fotograma": {"ancho": ancho, "alto": alto},
        "cuadricula": {"columnas": len(cuadros), "filas": 1},
        "escala_uniforme": escala,
        "anclaje_objetivo": {"x": centro_destino, "y": pies_destino},
        "margen_solicitado": margen,
        "limpieza_original": limpieza,
        "cuadros": detalle,
    }


def interpretar_celda(texto):
    try:
        ancho, alto = texto.lower().split("x")
        celda = (int(ancho), int(alto))
        if min(celda) <= 0:
            raise ValueError()
        return celda
    except ValueError as error:
        raise argparse.ArgumentTypeError("Usa ANCHOxALTO, por ejemplo 256x256") from error


def main():
    argumentos = argparse.ArgumentParser(description=__doc__)
    argumentos.add_argument("entrada", type=Path, help="Tira PNG o carpeta de cuadros PNG de Blender")
    argumentos.add_argument("--celda", type=interpretar_celda, default=(256, 256))
    argumentos.add_argument("--salida", type=Path, required=True, help="Nombre del PNG de salida")
    argumentos.add_argument("--margen", type=int, default=8)
    argumentos.add_argument("--reporte", type=Path, help="Informe opcional de limpieza, escala y anclas")
    opciones = argumentos.parse_args()
    try:
        informe = armar_hoja(opciones.entrada, opciones.salida, opciones.celda, opciones.margen)
        if opciones.reporte:
            opciones.reporte.parent.mkdir(parents=True, exist_ok=True)
            opciones.reporte.write_text(json.dumps(informe, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Hoja guardada: " + str(opciones.salida))
        print("Cuadros: " + str(informe["cuadricula"]["columnas"]) + "; escala uniforme: " + str(round(informe["escala_uniforme"], 8)))
    except (OSError, ValueError) as error:
        argumentos.exit(1, "No se pudo armar la hoja: " + str(error) + "\n")


if __name__ == "__main__":
    main()
