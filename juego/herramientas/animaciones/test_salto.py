"""Comprueba que feliz conserva el salto y verifica sus apoyos reales.

Estas pruebas reconstruyen el PNG original en una carpeta temporal. Las
mediciones del resultado se hacen desde el alfa final, sin tomar las anclas
de salida del informe de armado como prueba de que el salto se conservó.
"""

import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageSequence

from armar_hoja import armar_hoja, leer_cuadros, medir_anclas
from verificar_hoja import verificar_hoja


RAIZ_JUEGO = Path(__file__).resolve().parents[2]
CELDA = (256, 256)
CUADROS_FELIZ = [9, 10, 11]
CUADROS_APOYADOS = [9, 11]


class PruebasSalto(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Los temporales quedan dentro del espacio de trabajo para funcionar
        # también en Windows con acceso restringido al TEMP global. Se verifica
        # su ubicación antes de registrar la limpieza recursiva de la carpeta.
        cls.temporal = tempfile.TemporaryDirectory(prefix=".prueba-salto-", dir=RAIZ_JUEGO)
        if Path(cls.temporal.name).resolve().parent != RAIZ_JUEGO.resolve():
            raise ValueError("La carpeta temporal debe permanecer dentro de juego/")
        cls.addClassCleanup(cls.temporal.cleanup)
        cls.carpeta = Path(cls.temporal.name)
        cls.original = RAIZ_JUEGO / "arte/cuy/origen/cuy-feliz-3-cuadros.png"
        cls.base = RAIZ_JUEGO / "public/dibujos/cuy-nino-cuadros-v2.png"
        cls.atlas = cls.carpeta / "cuadros-con-salto.png"
        cls.informe = armar_hoja(
            cls.original,
            cls.atlas,
            CELDA,
            hoja_base=cls.base,
            conservar_alturas=True,
            fraccion_cabeza=0.3,
        )
        cuadros, _ = leer_cuadros(cls.original)
        cls.anclas_originales = [medir_anclas(cuadro, 0.3) for cuadro in cuadros]

    def verificar_salto(self, ruta=None, cuadros_pies=None, altura_variable=True, fraccion_cabeza=0.3):
        return verificar_hoja(
            self.atlas if ruta is None else ruta,
            CELDA,
            cuadros_seleccionados=CUADROS_FELIZ,
            cuadros_pies=CUADROS_APOYADOS if cuadros_pies is None else cuadros_pies,
            altura_variable=altura_variable,
            fraccion_cabeza=fraccion_cabeza,
        )

    def test_anadir_feliz_preserva_los_nueve_cuadros_anteriores(self):
        self.assertTrue(self.informe["conservar_alturas"])
        self.assertEqual(self.informe["fraccion_cabeza"], 0.3)
        self.assertEqual([cuadro["cuadro"] for cuadro in self.informe["cuadros"]], CUADROS_FELIZ)
        with Image.open(self.atlas) as reconstruida, Image.open(self.base) as base:
            self.assertEqual(reconstruida.size, (768, 1024))
            self.assertEqual(base.size, (768, 768))
            self.assertEqual(reconstruida.crop((0, 0, 768, 768)).tobytes(), base.convert("RGBA").tobytes())
            with Image.open(RAIZ_JUEGO / "public/dibujos/cuy-nino-cuadros-v3.png") as publicada:
                self.assertEqual(reconstruida.size, publicada.size)
                self.assertEqual(reconstruida.tobytes(), publicada.convert("RGBA").tobytes())

    def test_el_salto_y_la_pose_conservan_su_altura_respecto_al_piso(self):
        medicion = self.verificar_salto()
        originales = self.anclas_originales
        finales = medicion["cuadros"]
        escala = self.informe["escala_uniforme"]
        altura_original = originales[0]["linea_pies_y"] - originales[1]["linea_pies_y"]
        altura_final = finales[0]["linea_pies_y"] - finales[1]["linea_pies_y"]
        self.assertEqual(altura_original, 58)
        self.assertEqual(finales[0]["linea_pies_y"], finales[2]["linea_pies_y"])
        self.assertEqual(altura_final, 19)
        self.assertAlmostEqual(altura_final, altura_original * escala, delta=1)

        # Los apoyos tienen igual suelo pero una pose diferente: el último
        # cuadro levanta más la cabeza. Alinear cada cuadro por su cima o su
        # pie eliminaría parte del movimiento que ya está dibujado en la tira.
        diferencia_original = originales[0]["cima_cabeza_y"] - originales[2]["cima_cabeza_y"]
        diferencia_final = finales[0]["cima_cabeza_y"] - finales[2]["cima_cabeza_y"]
        self.assertEqual(diferencia_original, 25)
        self.assertAlmostEqual(diferencia_final, diferencia_original * escala, delta=1)
        self.assertGreater(diferencia_final, 2)
        self.assertEqual(self.informe["piso_original_y"], originales[0]["linea_pies_y"])

    def test_verificar_salto_distingue_vuelo_y_apoyos(self):
        correcta = self.verificar_salto()
        self.assertTrue(correcta["correcta"])
        self.assertEqual(correcta["cuadros_comprobados"], CUADROS_FELIZ)
        self.assertEqual(correcta["cuadros_pies"], CUADROS_APOYADOS)
        self.assertEqual(correcta["referencias_comprobadas"], ["centro_cabeza_x", "linea_pies_y"])
        self.assertEqual(correcta["variacion_px"]["linea_pies_y"], 0)
        self.assertGreater(correcta["variacion_px"]["cima_cabeza_y"], 2)

        incluye_vuelo = self.verificar_salto(cuadros_pies=CUADROS_FELIZ)
        self.assertFalse(incluye_vuelo["correcta"])
        self.assertEqual(incluye_vuelo["variacion_px"]["linea_pies_y"], 19)
        exige_altura_constante = self.verificar_salto(altura_variable=False)
        self.assertFalse(exige_altura_constante["correcta"])
        self.assertIn("cima_cabeza_y", exige_altura_constante["referencias_comprobadas"])

    def test_altura_variable_no_oculta_un_apoyo_desplazado(self):
        # Solo se levanta cuatro píxeles el cuadro de aterrizaje. Mantener la
        # tolerancia de pies detecta el defecto aunque la cabeza pueda subir y
        # bajar libremente durante esta animación.
        with Image.open(self.atlas) as original:
            alterada = original.convert("RGBA")
        aterrizaje = alterada.crop((512, 768, 768, 1024))
        desplazada = Image.new("RGBA", CELDA)
        desplazada.paste(aterrizaje, (0, -4))
        alterada.paste(desplazada, (512, 768))
        ruta = self.carpeta / "aterrizaje-desplazado.png"
        alterada.save(ruta)
        medicion = self.verificar_salto(ruta=ruta)
        self.assertFalse(medicion["correcta"])
        self.assertEqual(medicion["variacion_px"]["centro_cabeza_x"], 0)
        self.assertEqual(medicion["variacion_px"]["linea_pies_y"], 4)

    def test_banda_de_cabeza_excluye_las_manos_levantadas(self):
        # En el último cuadro las manos alcanzan el 42 % superior de la
        # silueta. El 30 % mantiene la referencia sobre la cabeza y evita
        # desplazarla horizontalmente por la extensión de los brazos.
        medicion_cabeza = self.verificar_salto(fraccion_cabeza=0.3)
        medicion_con_manos = self.verificar_salto(fraccion_cabeza=0.42)
        self.assertEqual([cuadro["centro_cabeza_x"] for cuadro in medicion_cabeza["cuadros"]], [128, 128, 128])
        self.assertEqual(medicion_cabeza["variacion_px"]["centro_cabeza_x"], 0)
        self.assertGreater(medicion_con_manos["variacion_px"]["centro_cabeza_x"], 2)
        self.assertFalse(medicion_con_manos["correcta"])

    def test_gif_publicado_reproduce_tres_cuadros_una_vez(self):
        with Image.open(RAIZ_JUEGO / "arte/cuy/vista-previa/feliz.gif") as imagen:
            self.assertNotIn("loop", imagen.info)
            cuadros = []
            duraciones = []
            for cuadro in ImageSequence.Iterator(imagen):
                cuadros.append(cuadro.convert("RGB").copy())
                duraciones.append(cuadro.info["duration"])
        self.assertEqual(len(cuadros), 3)
        self.assertEqual(duraciones, [120, 130, 130])
        self.assertAlmostEqual(sum(duraciones), 3 * 1000 / 8, delta=5)
        for cuadro in cuadros:
            self.assertEqual(cuadro.size, CELDA)
            self.assertEqual(cuadro.getpixel((0, 0)), (90, 160, 74))


if __name__ == "__main__":
    unittest.main()
