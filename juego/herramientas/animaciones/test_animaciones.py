"""Regresiones del armado y de los GIF, ejecutables con unittest y Pillow.

Los archivos de prueba se escriben únicamente en una carpeta temporal. El
original frontal sirve de referencia independiente para comprobar que añadir
la vista lateral conserva tanto su escala como todos sus píxeles originales.
"""

import json
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageSequence

from armar_hoja import armar_hoja
from crear_vista_previa import crear_vista_previa
from verificar_hoja import verificar_hoja


RAIZ_JUEGO = Path(__file__).resolve().parents[2]
CELDA = (256, 256)
COLOR_PASTO = (90, 160, 74)


class PruebasAnimaciones(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Se reconstruye a partir del PNG de ChatGPT, sin reutilizar las anclas
        # del lateral publicado. Así el resultado comprueba todo el recorrido
        # de separación, limpieza, remuestreo y composición de las dos filas.
        # Se usa el propio espacio de trabajo: algunos entornos Windows no
        # permiten escribir en la carpeta temporal global del proceso.
        cls.temporal = tempfile.TemporaryDirectory(prefix=".prueba-animaciones-", dir=RAIZ_JUEGO)
        if Path(cls.temporal.name).resolve().parent != RAIZ_JUEGO.resolve():
            raise ValueError("La carpeta temporal debe permanecer dentro de juego/")
        cls.addClassCleanup(cls.temporal.cleanup)
        cls.carpeta = Path(cls.temporal.name)
        cls.referencia = RAIZ_JUEGO / "arte/cuy/vista-previa/armado.json"
        cls.frontal = RAIZ_JUEGO / "public/dibujos/cuy-nino-caminar-v1.png"
        cls.lateral = RAIZ_JUEGO / "arte/cuy/origen/cuy-lado-3-cuadros.png"
        cls.atlas = cls.carpeta / "cuadros.png"
        cls.informe = armar_hoja(
            cls.lateral,
            cls.atlas,
            CELDA,
            referencia=cls.referencia,
            hoja_base=cls.frontal,
        )

    def crear_manifiesto(self, nombre, direcciones):
        # El contrato temporal usa el atlas recién reconstruido. No depende de
        # que el manifiesto real ya haya incorporado el estado caminar_lado.
        datos = {
            "imagen": self.atlas.name,
            "fotograma": {"ancho": 256, "alto": 256},
            "cuadricula": {"columnas": 3, "filas": 2},
            "animaciones": direcciones,
        }
        manifiesto = self.carpeta / (nombre + ".json")
        manifiesto.write_text(json.dumps(datos), encoding="utf-8")
        return manifiesto

    def leer_gif(self, ruta):
        with Image.open(ruta) as imagen:
            bucle = imagen.info.get("loop")
            cuadros = []
            duraciones = []
            for cuadro in ImageSequence.Iterator(imagen):
                cuadros.append(cuadro.convert("RGB").copy())
                duraciones.append(cuadro.info["duration"])
        return cuadros, duraciones, bucle

    def test_lateral_conserva_escala_anclaje_y_pixeles_frontales(self):
        referencia = json.loads(self.referencia.read_text(encoding="utf-8"))
        self.assertEqual(self.informe["escala_uniforme"], referencia["escala_uniforme"])
        self.assertEqual(self.informe["anclaje_objetivo"], referencia["anclaje_objetivo"])
        self.assertEqual(self.informe["cuadricula"], {"columnas": 3, "filas": 2})
        self.assertEqual([cuadro["cuadro"] for cuadro in self.informe["cuadros"]], [3, 4, 5])
        with Image.open(self.atlas) as reconstruida, Image.open(self.frontal) as frontal:
            self.assertEqual(reconstruida.size, (768, 512))
            self.assertEqual(
                reconstruida.crop((0, 0, 768, 256)).tobytes(),
                frontal.convert("RGBA").tobytes(),
            )
            publicada = RAIZ_JUEGO / "public/dibujos/cuy-nino-cuadros-v1.png"
            if publicada.exists():
                with Image.open(publicada) as atlas_publicado:
                    self.assertEqual(reconstruida.size, atlas_publicado.size)
                    self.assertEqual(reconstruida.tobytes(), atlas_publicado.convert("RGBA").tobytes())
        alineacion = verificar_hoja(self.atlas, CELDA)
        self.assertTrue(alineacion["correcta"])
        self.assertTrue(all(valor <= 2 for valor in alineacion["variacion_px"].values()))

    def test_escala_fija_que_no_cabe_se_rechaza_sin_guardar(self):
        datos = json.loads(self.referencia.read_text(encoding="utf-8"))
        datos["escala_uniforme"] *= 2
        referencia_grande = self.carpeta / "referencia-demasiado-grande.json"
        referencia_grande.write_text(json.dumps(datos), encoding="utf-8")
        salida = self.carpeta / "no-debe-existir.png"
        with self.assertRaisesRegex(ValueError, "La escala de referencia no cabe"):
            armar_hoja(self.lateral, salida, CELDA, referencia=referencia_grande)
        self.assertFalse(salida.exists())

    def test_verificador_detecta_un_desplazamiento_real_superior_a_dos_pixeles(self):
        # Se modifica solamente el PNG final. El verificador no recibe informes
        # de armado ni offsets que puedan ocultar esta pérdida de alineación.
        with Image.open(self.atlas) as original:
            alterada = original.convert("RGBA")
        desplazada = Image.new("RGBA", CELDA)
        desplazada.paste(alterada.crop((0, 0, 256, 256)), (4, -4))
        alterada.paste(desplazada, (0, 0))
        ruta = self.carpeta / "atlas-desplazado.png"
        alterada.save(ruta)
        informe = verificar_hoja(ruta, CELDA)
        self.assertFalse(informe["correcta"])
        self.assertGreater(informe["variacion_px"]["centro_cabeza_x"], 2)
        self.assertGreater(informe["variacion_px"]["linea_pies_y"], 2)

    def test_gifs_laterales_respetan_espejo_cadencia_bucle_y_pasto(self):
        animacion = {"fotogramas": [3, 4, 5, 4], "fps": 8, "repetir": -1}
        manifiesto = self.crear_manifiesto("laterales", {
            "derecha": {"caminar_lado": {**animacion, "voltear": False}},
            "izquierda": {"caminar_lado": {**animacion, "voltear": True}},
        })
        rutas = [self.carpeta / "derecha.gif", self.carpeta / "izquierda.gif"]
        for direccion, ruta in zip(("derecha", "izquierda"), rutas):
            crear_vista_previa(manifiesto, ruta, direccion, "caminar_lado")
        derecha, duraciones, bucle = self.leer_gif(rutas[0])
        izquierda, duraciones_izquierda, bucle_izquierda = self.leer_gif(rutas[1])
        self.assertEqual(len(derecha), 4)
        self.assertEqual(len(izquierda), 4)
        self.assertEqual(duraciones, [120, 130, 130, 120])
        self.assertEqual(sum(duraciones), 500)
        self.assertEqual(duraciones_izquierda, duraciones)
        self.assertEqual((bucle, bucle_izquierda), (0, 0))
        self.assertNotEqual(derecha[0].tobytes(), izquierda[0].tobytes())
        for cuadro_derecho, cuadro_izquierdo in zip(derecha, izquierda):
            self.assertEqual(cuadro_derecho.size, CELDA)
            self.assertEqual(cuadro_derecho.getpixel((0, 0)), COLOR_PASTO)
            self.assertEqual(cuadro_izquierdo.getpixel((0, 0)), COLOR_PASTO)
            self.assertEqual(
                cuadro_derecho.transpose(Image.Transpose.FLIP_LEFT_RIGHT).tobytes(),
                cuadro_izquierdo.tobytes(),
            )

    def test_frente_nunca_se_voltea_y_una_vez_no_incluye_bucle(self):
        animacion = {"fotogramas": [0, 1, 2, 1], "fps": 8, "repetir": 0}
        rutas = []
        for voltear in (False, True):
            nombre = "frente-con-volteo" if voltear else "frente-original"
            manifiesto = self.crear_manifiesto(nombre, {
                "frente": {"caminar": {**animacion, "voltear": voltear}},
            })
            salida = self.carpeta / (nombre + ".gif")
            crear_vista_previa(manifiesto, salida)
            rutas.append(salida)
        original, duraciones, bucle = self.leer_gif(rutas[0])
        con_volteo, otras_duraciones, otro_bucle = self.leer_gif(rutas[1])
        self.assertEqual(len(original), 4)
        self.assertEqual(sum(duraciones), 500)
        self.assertEqual(duraciones, otras_duraciones)
        self.assertIsNone(bucle)
        self.assertIsNone(otro_bucle)
        for cuadro_original, cuadro_con_volteo in zip(original, con_volteo):
            self.assertEqual(cuadro_original.tobytes(), cuadro_con_volteo.tobytes())


if __name__ == "__main__":
    unittest.main()
