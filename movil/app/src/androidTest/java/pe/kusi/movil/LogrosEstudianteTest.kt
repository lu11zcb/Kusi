package pe.kusi.movil

import androidx.activity.ComponentActivity
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test

class LogrosEstudianteTest {
    @get:Rule val pantalla = createAndroidComposeRule<ComponentActivity>()

    @Test
    fun tablero_muestra_el_cuy_el_podio_y_las_medallas_en_una_vista() {
        val avances = EstadoLogrosInfantil(
            resumen = ResumenLogrosInfantil(33, 6, emptyList()),
            ranking = RankingSalonInfantil(listOf(PuestoSalonInfantil("Lucía", 54)), misPuntos = 33),
            metaSalon = MetaSalonInfantil(235, 400),
        )
        pantalla.setContent {
            TemaKusi {
                LogrosEstudiante(
                    EstadoEntradaKusi(cuenta = null, validado = true),
                    avances,
                    VozKusi(disponible = false, hablar = {}),
                    vozActiva = false,
                    ayuda = {}, comprobar = {}, recargar = null, abrirCursos = {},
                    apariencia = AparienciaCuy(PelajeCuy.GRIS),
                )
            }
        }
        pantalla.onNodeWithContentDescription("Mi cuy de pelaje gris").assertIsDisplayed()
        pantalla.onNodeWithText("Lucía").assertIsDisplayed()
        pantalla.onNodeWithText("235 / 400").assertIsDisplayed()
        pantalla.onNodeWithText("6 retos").assertIsDisplayed()
        pantalla.onNodeWithText("6 retos superados").assertDoesNotExist()

        pantalla.onNodeWithContentDescription("Diez retos").performClick()
        pantalla.onNodeWithText("6 de 10 retos").assertIsDisplayed()
        pantalla.onNodeWithText("Cerrar").performClick()

        pantalla.onNodeWithContentDescription("Cinco retos").performClick()
        pantalla.onNodeWithText("¡Medalla ganada!").assertIsDisplayed()
        pantalla.onNodeWithText("Cerrar").performClick()
        pantalla.onNodeWithText("¡Medalla ganada!").assertDoesNotExist()

        pantalla.onNodeWithText("Lucía").performClick().assertIsDisplayed()
    }

    @Test
    fun podio_muestra_tres_cuyes_y_el_mensaje_que_corresponde_al_estudiante() {
        val puestos = listOf(
            PuestoSalonInfantil("Lucía", 40),
            PuestoSalonInfantil("Inti", 36),
            PuestoSalonInfantil("Mateo", 30, esMiPuesto = true),
            PuestoSalonInfantil("Sami", 25),
        )
        val ranking = mutableStateOf(RankingSalonInfantil(puestos, misPuntos = 30))
        var abrioCursos = false
        pantalla.setContent {
            TemaKusi { PodioDelSalon(ranking.value, abrirCursos = { abrioCursos = true }) }
        }

        pantalla.onNodeWithText("Lucía").assertIsDisplayed()
        pantalla.onNodeWithText("Inti").assertIsDisplayed()
        pantalla.onNodeWithText("¡Tú!").assertIsDisplayed()
        pantalla.onNodeWithText("Mateo").assertDoesNotExist()
        pantalla.onNodeWithText("Sami").assertDoesNotExist()

        pantalla.runOnIdle {
            ranking.value = RankingSalonInfantil(puestos.map { it.copy(esMiPuesto = false) }, misPuntos = 15)
        }
        pantalla.onNodeWithText("¡Tú!").assertDoesNotExist()
        pantalla.onNodeWithText("Tú: 15 puntos. ¡Sigue jugando!").assertIsDisplayed()

        pantalla.runOnIdle { ranking.value = RankingSalonInfantil(emptyList(), misPuntos = 0) }
        pantalla.onNodeWithText("¡Sé el primero en ganar puntos!").assertIsDisplayed().performClick()
        pantalla.runOnIdle { assertTrue(abrioCursos) }
    }
}
