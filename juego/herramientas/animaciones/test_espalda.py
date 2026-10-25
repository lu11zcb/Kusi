"""Regresiones de la caminata de espalda, desde el PNG hasta el GIF publicado.

La reconstrucción reutiliza la escala frontal; las comprobaciones de alineación
y de orientación leen los píxeles finales, sin aceptar las anclas del informe
de armado como sustituto de la imagen.
"""

import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageChops, ImageSequence

from armar_hoja import armar_hoja, leer_cuadros
from crear_vista_previa import crear_vista_previa
from verificar_hoja import verificar_hoja


RAIZ_JUEGO = Path(__file__).resolve().parents[2]
CELDA = (256, 256)
CUADROS_ESPALDA = [12, 13, 14]
SECUENCIA_ESPALDA = [12, 13, 14, 13]
COLOR_PASTO = (90, 160, 74)


def error_rgb(primera, segunda):
    """Error absoluto medio por canal, tolerante a la paleta de un GIF."""
    diferencias = ImageChops.difference(primera.convert("RGB"), segunda.convert("RGB"))
    histograma = diferencias.histogram()
    return sum((indice % 256) * cantidad for indice, cantidad in enumerate(histograma)) / (
        primera.width * primera.height * 3
    )


class PruebasEspalda(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporal = tempfile.TemporaryDirectory(prefix=".prueba-espalda-", dir=RAIZ_JUEGO)
        if Path(cls.temporal.name).resolve().parent != RAIZ_JUEGO.resolve():
            raise ValueError("La carpeta temporal debe permanecer dentro de juego/")
        cls.addClassCleanup(cls.temporal.cleanup)
        cls.carpeta = Path(cls.temporal.name)
        cls.original = RAIZ_JUEGO / "arte/cuy/origen/cuy-espalda-3-cuadros-v2.png"
        cls.referencia = RAIZ_JUEGO / "arte/cuy/vista-previa/armado.json"
        cls.base = RAIZ_JUEGO / "public/dibujos/cuy-nino-cuadros-v3.png"
        cls.publicada = RAIZ_JUEGO / "public/dibujos/cuy-nino-cuadros-v5.png"
        cls.manifiesto = RAIZ_JUEGO / "public/dibujos/cuy-nino-animado-v1.json"
        cls.atlas = cls.carpeta / "cuadros-con-espalda.png"
        cls.informe = armar_hoja(
            cls.original,
            cls.atlas,
            CELDA,
            # Se conserva el margen de la receta de espalda. La referencia
            # fija la escala y el apoyo; el margen solo comprueba que cabe
            # todo el borde suave, sin alterar esa transformación.
            margen=7,
            referencia=cls.referencia,
            hoja_base=cls.base,
        )

    def leer_gif(self, ruta):
        with Image.open(ruta) as imagen:
            bucle = imagen.info.get("loop")
            cuadros = []
            duraciones = []
            for cuadro in ImageSequence.Iterator(imagen):
                cuadros.append(cuadro.convert("RGB").copy())
                duraciones.append(cuadro.info["duration"])
        return cuadros, duraciones, bucle

    def cuadro_sobre_pasto(self, indice):
        with Image.open(self.publicada) as atlas:
            x = (indice % 3) * CELDA[0]
            y = (indice // 3) * CELDA[1]
            dibujo = atlas.convert("RGBA").crop((x, y, x + CELDA[0], y + CELDA[1]))
        fondo = Image.new("RGBA", CELDA, COLOR_PASTO)
        fondo.alpha_composite(dibujo)
        return fondo.convert("RGB")

    def test_reconstruccion_conserva_escala_frontal_y_las_cuatro_filas_previas(self):
        referencia = json.loads(self.referencia.read_text(encoding="utf-8"))
        self.assertEqual(self.informe["escala_uniforme"], referencia["escala_uniforme"])
        self.assertEqual(self.informe["anclaje_objetivo"], referencia["anclaje_objetivo"])
        self.assertEqual(self.informe["cuadricula"], {"columnas": 3, "filas": 5})
        self.assertEqual([cuadro["cuadro"] for cuadro in self.informe["cuadros"]], CUADROS_ESPALDA)
        with Image.open(self.atlas) as reconstruida, Image.open(self.base) as base:
            with Image.open(self.publicada) as publicada:
                self.assertEqual(publicada.format, "PNG")
                self.assertEqual(publicada.mode, "RGBA")
                self.assertEqual(publicada.size, (768, 1280))
                self.assertEqual(reconstruida.size, publicada.size)
                self.assertEqual(reconstruida.tobytes(), publicada.tobytes())
                self.assertEqual(
                    publicada.crop((0, 0, 768, 1024)).tobytes(),
                    base.convert("RGBA").tobytes(),
                )
                self.assertEqual(publicada.getchannel("A").getextrema(), (0, 255))

        # Se comprueba además el tamaño medible de los dibujos, para que un
        # informe con la escala correcta no pueda ocultar otro remuestreo.
        originales, _ = leer_cuadros(self.original)
        escala = referencia["escala_uniforme"]
        with Image.open(self.publicada) as atlas:
            for indice, original in enumerate(originales):
                final = atlas.crop((indice * 256, 1024, (indice + 1) * 256, 1280))
                cajas = [
                    imagen.getchannel("A").point(lambda valor: 255 if valor >= 32 else 0).getbbox()
                    for imagen in (original, final)
                ]
                for primero, ultimo in ((0, 2), (1, 3)):
                    tamano_original = cajas[0][ultimo] - cajas[0][primero] - 1
                    tamano_final = cajas[1][ultimo] - cajas[1][primero] - 1
                    self.assertAlmostEqual(tamano_final, tamano_original * escala, delta=1.5)

    def test_espalda_y_frente_comparten_anclaje_con_tolerancia_de_dos_pixeles(self):
        informe = verificar_hoja(
            self.publicada, CELDA, tolerancia=2, cuadros_seleccionados=[0, 1, 2, *CUADROS_ESPALDA]
        )
        self.assertTrue(informe["correcta"])
        self.assertEqual(informe["tolerancia_px"], 2)
        self.assertTrue(all(variacion <= 2 for variacion in informe["variacion_px"].values()))
        espaldas = informe["cuadros"][3:]
        for cuadro in espaldas:
            self.assertAlmostEqual(cuadro["centro_cabeza_x"], 128, delta=2)
            self.assertAlmostEqual(cuadro["linea_pies_y"], 244, delta=2)

    def test_verificador_detecta_una_espalda_desplazada_cuatro_pixeles(self):
        with Image.open(self.publicada) as original:
            alterada = original.convert("RGBA")
        primera = alterada.crop((0, 1024, 256, 1280))
        desplazada = Image.new("RGBA", CELDA)
        desplazada.paste(primera, (4, -4))
        alterada.paste(desplazada, (0, 1024))
        ruta = self.carpeta / "espalda-desplazada.png"
        alterada.save(ruta)
        informe = verificar_hoja(ruta, CELDA, tolerancia=2, cuadros_seleccionados=CUADROS_ESPALDA)
        self.assertFalse(informe["correcta"])
        self.assertGreater(informe["variacion_px"]["centro_cabeza_x"], 2)
        self.assertGreater(informe["variacion_px"]["linea_pies_y"], 2)

    def test_manifiesto_de_espalda_usa_la_quinta_fila_y_no_deja_voltear_frente_o_espalda(self):
        datos = json.loads(self.manifiesto.read_text(encoding="utf-8"))
        self.assertEqual(datos["imagen"], self.publicada.name)
        self.assertEqual(datos["fotograma"], {"ancho": 256, "alto": 256})
        self.assertEqual(datos["cuadricula"], {"columnas": 3, "filas": 5})
        espalda = datos["animaciones"]["espaldas"]
        caminar = espalda["caminar_espalda"]
        self.assertEqual(caminar["fotogramas"], SECUENCIA_ESPALDA)
        self.assertEqual((caminar["fps"], caminar["repetir"]), (8, -1))
        self.assertEqual(espalda["quieto"]["fotogramas"], [13])
        self.assertEqual(espalda["reposo"]["fotogramas"], [13])
        for direccion in ("frente", "espaldas"):
            for animacion in datos["animaciones"][direccion].values():
                self.assertFalse(animacion.get("voltear", False))

    def test_gif_publicado_tiene_secuencia_de_cuatro_pasos_500ms_bucle_y_pasto(self):
        cuadros, duraciones, bucle = self.leer_gif(
            RAIZ_JUEGO / "arte/cuy/vista-previa/caminar-espalda.gif"
        )
        self.assertEqual(len(cuadros), 4)
        self.assertEqual(duraciones, [120, 130, 130, 120])
        self.assertEqual(sum(duraciones), 500)
        self.assertEqual(bucle, 0)
        self.assertEqual(cuadros[1].tobytes(), cuadros[3].tobytes())
        esperados = {indice: self.cuadro_sobre_pasto(indice) for indice in CUADROS_ESPALDA}
        for cuadro, indice in zip(cuadros, SECUENCIA_ESPALDA):
            self.assertEqual(cuadro.size, CELDA)
            self.assertEqual(cuadro.getpixel((0, 0)), COLOR_PASTO)
            error_correcto = error_rgb(cuadro, esperados[indice])
            self.assertLess(error_correcto, 2)
            # El paso solicitado debe parecerse más al dibujo correcto que a
            # cualquier otro paso o a su espejo, incluso tras cuantizar el GIF.
            for otro_indice, esperado in esperados.items():
                if otro_indice != indice:
                    self.assertLess(error_correcto, error_rgb(cuadro, esperado))
            espejo = esperados[indice].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            self.assertLess(error_correcto, error_rgb(cuadro, espejo))

    def test_vista_previa_ignora_voltear_aunque_se_solicite_en_frente_o_espalda(self):
        original = json.loads(self.manifiesto.read_text(encoding="utf-8"))
        for direccion, estado, secuencia in (
            ("frente", "caminar", [0, 1, 2, 1]),
            ("espaldas", "caminar_espalda", SECUENCIA_ESPALDA),
        ):
            versiones = []
            for voltear in (False, True):
                datos = json.loads(json.dumps(original))
                datos["imagen"] = str(self.publicada)
                datos["animaciones"][direccion][estado]["voltear"] = voltear
                manifiesto = self.carpeta / f"{direccion}-{voltear}.json"
                manifiesto.write_text(json.dumps(datos), encoding="utf-8")
                salida = manifiesto.with_suffix(".gif")
                crear_vista_previa(manifiesto, salida, direccion, estado)
                versiones.append(self.leer_gif(salida))
            sin_volteo, con_volteo = versiones
            self.assertEqual((sin_volteo[1], sin_volteo[2]), (con_volteo[1], con_volteo[2]))
            self.assertEqual(len(sin_volteo[0]), len(secuencia))
            for normal, solicitado, indice in zip(sin_volteo[0], con_volteo[0], secuencia):
                self.assertEqual(normal.tobytes(), solicitado.tobytes())
                esperado = self.cuadro_sobre_pasto(indice)
                error_correcto = error_rgb(solicitado, esperado)
                self.assertLess(error_correcto, 2)
                self.assertLess(
                    error_correcto,
                    error_rgb(solicitado, esperado.transpose(Image.Transpose.FLIP_LEFT_RIGHT)),
                )


if __name__ == "__main__":
    unittest.main()
