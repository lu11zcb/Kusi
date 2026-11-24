#!/usr/bin/env python3
"""Genera frases con la voz de Kusi a partir de una muestra de referencia.

El taller graba cada frase de Kusi una sola vez y guarda el audio: el juego, en
cualquier dispositivo, reproduce el archivo y no necesita instalar nada. Este
programa es el motor de esa grabación (voz clonada) y lo llama vozKusi.mjs.

Uso:
    voz/.entorno/bin/python voz/decir.py --lista trabajos.json --informe fallos.json --referencia muestra.wav --modelo <identificador>

`trabajos.json` es una lista de objetos {"texto", "salida"} (salida en .wav).
`fallos.json` registra las salidas que no se pudieron generar y su motivo.
La referencia y su transcripción van en --referencia y --referencia-texto.
El identificador del modelo de voz va en --modelo.
"""

import argparse
import json
import sys
from pathlib import Path

def cargar_modelo(nombre):
    from mlx_audio.tts.utils import load_model

    print("[voz] cargando " + nombre, flush=True)
    return load_model(nombre)


def decir(modelo, texto, salida, referencia, texto_referencia, idioma):
    """Genera una frase y la deja exactamente en `salida`.

    El motor guarda con el nombre <prefijo>_000.wav; se pide ese nombre y se
    renombra, porque el taller nombra cada archivo con la huella de su frase.
    """
    from mlx_audio.tts.generate import generate_audio

    ruta = Path(salida)
    ruta.parent.mkdir(parents=True, exist_ok=True)
    prefijo = ruta.stem
    generado = ruta.parent / (prefijo + "_000.wav")
    # Un intento interrumpido puede dejar un archivo a medias. El siguiente
    # intento solo puede aceptar audio escrito en esa misma llamada.
    generado.unlink(missing_ok=True)
    ruta.unlink(missing_ok=True)
    opciones = {
        "text": texto,
        "model": modelo,
        "ref_audio": referencia,
        "lang_code": idioma,
        "output_path": str(ruta.parent),
        "file_prefix": prefijo,
        "audio_format": "wav",
        "save": True,
        "verbose": False,
    }
    # Sin la transcripción, el motor intentaría transcribir la muestra con otro
    # modelo y tardaría mucho más. Ya la tenemos escrita a mano.
    if texto_referencia:
        opciones["ref_text"] = texto_referencia
    generate_audio(**opciones)
    if not generado.is_file() or generado.stat().st_size == 0:
        raise RuntimeError("El motor no dejó audio.")
    if generado != ruta:
        generado.replace(ruta)


def main():
    analizador = argparse.ArgumentParser(description="Graba frases con la voz de Kusi.")
    analizador.add_argument("--lista", required=True, help='JSON con [{"texto", "salida"}]')
    analizador.add_argument("--informe", required=True, help="JSON de salida con los fallos por frase")
    analizador.add_argument("--referencia", required=True, help="Muestra de la voz (.wav)")
    analizador.add_argument("--referencia-texto", default="", help="Archivo con lo que dice la muestra")
    analizador.add_argument("--modelo", required=True, help="Identificador del modelo de voz")
    analizador.add_argument("--idioma", default="es")
    argumentos = analizador.parse_args()

    trabajos = json.loads(Path(argumentos.lista).read_text(encoding="utf-8"))
    texto_referencia = ""
    if argumentos.referencia_texto:
        ruta_texto = Path(argumentos.referencia_texto)
        if ruta_texto.exists():
            texto_referencia = ruta_texto.read_text(encoding="utf-8").strip()

    modelo = cargar_modelo(argumentos.modelo)
    total = len(trabajos)
    fallos = []
    for numero, trabajo in enumerate(trabajos, start=1):
        texto, salida = trabajo["texto"], trabajo["salida"]
        print("[voz] " + str(numero) + "/" + str(total) + " " + texto[:60], flush=True)
        try:
            decir(modelo, texto, salida, argumentos.referencia, texto_referencia, argumentos.idioma)
        except Exception as error:
            # El modelo de voz ya cargó: una frase fallida puede reintentarse sin
            # perder las grabaciones que sí pudo producir en esta tanda.
            fallos.append({"salida": salida, "motivo": str(error) or type(error).__name__})
    Path(argumentos.informe).write_text(json.dumps({"fallos": fallos}, ensure_ascii=False) + "\n", encoding="utf-8")
    print("[voz] grabadas: " + str(total - len(fallos)) + ", fallidas: " + str(len(fallos)), flush=True)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as error:  # noqa: BLE001 — el taller necesita el motivo completo
        print("[voz] error: " + str(error), file=sys.stderr, flush=True)
        sys.exit(1)
