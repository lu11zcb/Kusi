"""Comprueba el parpadeo del cuy: la hoja suplementaria de tres cuadros y su sexta fila en el atlas.

La hoja suplementaria (cuy-parpadeo-v1) se conserva como el resultado verificado
del armado. El atlas activo (cuy-nino-cuadros-v6) añade esos mismos tres cuadros
como sexta fila, sin tocar las cinco anteriores.
"""

import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageSequence

from armar_hoja import armar_hoja, medir_anclas
from verificar_hoja import verificar_hoja


RAIZ_JUEGO = Path(__file__).resolve().parents[2]
CELDA = (256, 256)
TOLERANCIA = 2


class PruebasParpadeo(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temporal = tempfile.TemporaryDirectory(prefix=".prueba-parpadeo-", dir=RAIZ_JUEGO)
        if Path(cls.temporal.name).resolve().parent != RAIZ_JUEGO.resolve():
            raise ValueError("La carpeta temporal debe permanecer dentro de juego/")
        cls.addClassCleanup(cls.temporal.cleanup)
        cls.original = RAIZ_JUEGO / "arte/cuy/origen/cuy-parpadeo-3-cuadros.png"
        cls.publicada = RAIZ_JUEGO / "public/dibujos/cuy-parpadeo-v1.png"
        cls.manifiesto = json.loads((RAIZ_JUEGO / "public/dibujos/cuy-parpadeo-v1.json").read_text(encoding="utf-8"))
        cls.reconstruida = Path(cls.temporal.name) / "parpadeo.png"
        cls.hash_original = hashlib.sha256(cls.original.read_bytes()).hexdigest()
        cls.informe = armar_hoja(
            cls.original, cls.reconstruida, CELDA,
            referencia=RAIZ_JUEGO / "arte/cuy/vista-previa/referencia-parpadeo.json",
        )
        # La receta del atlas: los mismos tres cuadros añadidos como sexta fila.
        cls.anterior = RAIZ_JUEGO / "public/dibujos/cuy-nino-cuadros-v5.png"
        cls.atlas = RAIZ_JUEGO / "public/dibujos/cuy-nino-cuadros-v6.png"
        cls.atlas_reconstruido = Path(cls.temporal.name) / "atlas-con-parpadeo.png"
        cls.informe_atlas = armar_hoja(
            cls.original, cls.atlas_reconstruido, CELDA,
            referencia=RAIZ_JUEGO / "arte/cuy/vista-previa/referencia-parpadeo.json",
            hoja_base=cls.anterior,
        )

    def test_hoja_reproducible_con_transparencia_y_sin_cambiar_la_fuente(self):
        with Image.open(self.publicada) as publicada, Image.open(self.reconstruida) as reconstruida:
            self.assertEqual(publicada.format, "PNG")
            self.assertEqual(publicada.mode, "RGBA")
            self.assertEqual(publicada.size, (768, 256))
            self.assertEqual(publicada.getchannel("A").getextrema(), (0, 255))
            self.assertEqual(publicada.tobytes(), reconstruida.tobytes())
        self.assertEqual(hashlib.sha256(self.original.read_bytes()).hexdigest(), self.hash_original)
        self.assertEqual(self.informe["escala_uniforme"], 0.33910533910533913)
        self.assertEqual(self.informe["anclaje_objetivo"], {"x": 128, "y": 244})

    def test_la_altura_la_cabeza_y_los_pies_coinciden_con_quieto_frontal(self):
        # Se mide el PNG activo, sin confiar en los offsets del reporte. El
        # fotograma quieto se busca en el manifiesto para no fijar una versión.
        datos = json.loads((RAIZ_JUEGO / "public/dibujos/cuy-nino-animado-v1.json").read_text(encoding="utf-8"))
        indice = datos["animaciones"]["frente"]["quieto"]["fotogramas"][0]
        with Image.open(RAIZ_JUEGO / "public/dibujos" / datos["imagen"]) as atlas:
            x = indice % datos["cuadricula"]["columnas"] * CELDA[0]
            y = indice // datos["cuadricula"]["columnas"] * CELDA[1]
            frente = medir_anclas(atlas.convert("RGBA").crop((x, y, x + CELDA[0], y + CELDA[1])))
        alineacion = verificar_hoja(self.publicada, CELDA, tolerancia=TOLERANCIA)
        self.assertTrue(alineacion["correcta"])
        for cuadro in alineacion["cuadros"]:
            for referencia in ("centro_cabeza_x", "cima_cabeza_y", "linea_pies_y"):
                self.assertAlmostEqual(cuadro[referencia], frente[referencia], delta=TOLERANCIA)
            self.assertEqual(cuadro["linea_pies_y"], frente["linea_pies_y"])
            self.assertGreaterEqual(min(cuadro["margenes"].values()), 8)

    def test_el_manifiesto_es_frontal_finito_y_recupera_los_ojos_abiertos(self):
        self.assertEqual(self.manifiesto["formato"], "kusi-parpadeo/1")
        self.assertEqual(self.manifiesto["fotograma"], {"ancho": 256, "alto": 256})
        self.assertEqual(self.manifiesto["anclaje"], {"x": 128, "y": 244})
        self.assertEqual(list(self.manifiesto["animaciones"]), ["frente"])
        self.assertEqual(self.manifiesto["animaciones"]["frente"]["parpadeo"], {
            "fotogramas": [0, 1, 2, 1, 0], "fps": 16, "repetir": 0,
        })

    def test_el_atlas_activo_conserva_las_cinco_filas_y_suma_el_parpadeo_como_sexta(self):
        with Image.open(self.atlas) as atlas, Image.open(self.anterior) as anterior, \
                Image.open(self.publicada) as suplementaria, Image.open(self.atlas_reconstruido) as reconstruido:
            self.assertEqual(atlas.format, "PNG")
            self.assertEqual(atlas.mode, "RGBA")
            self.assertEqual(atlas.size, (768, 1536))
            atlas = atlas.convert("RGBA")
            # Ni un píxel de las cinco filas anteriores cambia: se copian sin remuestrear.
            self.assertEqual(atlas.crop((0, 0, 768, 1280)).tobytes(), anterior.convert("RGBA").tobytes())
            # La fila nueva es exactamente la hoja suplementaria que ya pasó la alineación.
            self.assertEqual(atlas.crop((0, 1280, 768, 1536)).tobytes(), suplementaria.convert("RGBA").tobytes())
            # Y se reconstruye con la receta, sin depender de ningún archivo intermedio.
            self.assertEqual(atlas.tobytes(), reconstruido.convert("RGBA").tobytes())
        self.assertEqual(self.informe_atlas["cuadricula"], {"columnas": 3, "filas": 6})
        self.assertEqual(self.informe_atlas["escala_uniforme"], self.informe["escala_uniforme"])

    def test_los_cuadros_de_parpadeo_del_atlas_coinciden_con_quieto_frontal(self):
        datos = json.loads((RAIZ_JUEGO / "public/dibujos/cuy-nino-animado-v1.json").read_text(encoding="utf-8"))
        quieto = datos["animaciones"]["frente"]["quieto"]["fotogramas"][0]
        cuadros = datos["animaciones"]["frente"]["parpadeo"]["fotogramas"]
        alineacion = verificar_hoja(self.atlas, CELDA, tolerancia=TOLERANCIA, cuadros_seleccionados=[quieto, *sorted(set(cuadros))])
        self.assertTrue(alineacion["correcta"])
        self.assertTrue(all(variacion <= TOLERANCIA for variacion in alineacion["variacion_px"].values()))
        for cuadro in alineacion["cuadros"]:
            self.assertGreaterEqual(min(cuadro["margenes"].values()), 8)

    def test_el_manifiesto_principal_define_el_parpadeo_solo_de_frente_y_una_vez(self):
        datos = json.loads((RAIZ_JUEGO / "public/dibujos/cuy-nino-animado-v1.json").read_text(encoding="utf-8"))
        self.assertEqual(datos["imagen"], self.atlas.name)
        self.assertEqual(datos["cuadricula"], {"columnas": 3, "filas": 6})
        self.assertEqual(datos["animaciones"]["frente"]["parpadeo"], {
            "fotogramas": [15, 16, 17, 16, 15], "fps": 16, "repetir": 0,
            "siguiente": "quieto", "voltear": False,
        })
        # Son los mismos cuadros 0,1,2,1,0 de la hoja suplementaria, desplazados a la sexta fila.
        locales = self.manifiesto["animaciones"]["frente"]["parpadeo"]["fotogramas"]
        self.assertEqual([indice + 15 for indice in locales], datos["animaciones"]["frente"]["parpadeo"]["fotogramas"])
        for direccion in ("espaldas", "derecha", "izquierda"):
            self.assertNotIn("parpadeo", datos["animaciones"][direccion])

    def test_el_gif_es_una_sola_reproduccion_con_cadencia_equivalente(self):
        with Image.open(RAIZ_JUEGO / "arte/cuy/vista-previa/parpadeo.gif") as gif:
            self.assertEqual(gif.size, CELDA)
            self.assertNotIn("loop", gif.info)
            duraciones = [cuadro.info["duration"] for cuadro in ImageSequence.Iterator(gif)]
        self.assertEqual(duraciones, [60, 60, 70, 60, 60])
        self.assertAlmostEqual(sum(duraciones), 5 / 16 * 1000, delta=5)


if __name__ == "__main__":
    unittest.main()
