package pe.kusi.movil

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.espresso.Espresso.closeSoftKeyboard
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Before
import org.junit.Test
import java.io.File

/** Fixtures exclusivas de androidTest. No generan matrículas ni resultados en servidor. */
class InterfazInfantilTest {
    @get:Rule val pantalla = createAndroidComposeRule<ComponentActivity>()
    @Before fun ventana() { pantalla.runOnUiThread { pantalla.activity.enableEdgeToEdge() } }
    private val cuenta = Cuenta("solo-pruebas", "Mateo", setOf("estudiante"), false)
    private val aventura = AventuraInfantil("prueba-feria", "La feria de las cantidades", "Matemática", "Ayuda a la casera a juntar lo que pide cada cliente.", "Escucha el pedido y cuenta los productos.")
    private fun capturar(nombre: String) {
        pantalla.waitForIdle()
        val ins = InstrumentationRegistry.getInstrumentation(); ins.waitForIdleSync(); Thread.sleep(350)
        val destino = File(ins.targetContext.getExternalFilesDir(null), "revision-sprint2"); destino.mkdirs()
        val config = ins.targetContext.resources.configuration
        val sufijo = if (config.smallestScreenWidthDp >= 600) "tablet" else if (config.orientation == 2) "horizontal" else if (config.fontScale > 1.2f) "grande" else if ((config.uiMode and 0x30) == 0x20) "oscuro" else "claro"
        ins.uiAutomation.takeScreenshot().also { im -> File(destino,"$nombre-$sufijo.png").outputStream().use { im.compress(Bitmap.CompressFormat.PNG,100,it) }; im.recycle() }
    }
    @Test fun bienvenida_ingreso_y_boton_animado() {
        var enviado: Triple<String,String,Boolean>? = null
        pantalla.setContent { TemaKusi { AplicacionInfantil(EstadoEntradaKusi(null), { d,c,r -> enviado=Triple(d,c,r) }, { _,_,_ -> }, {}, {}) } }
        pantalla.onNodeWithText("¡Hola! Soy Kusi").assertIsDisplayed(); capturar("bienvenida")
        val boton = pantalla.onNodeWithText("¡Vamos a entrar!")
        boton.performScrollTo()
        pantalla.mainClock.autoAdvance=false
        boton.performTouchInput { down(center) }; pantalla.mainClock.advanceTimeBy(100); capturar("boton-presionado")
        boton.performTouchInput { up() }; pantalla.mainClock.autoAdvance=true
        pantalla.onNodeWithText("Mi DNI").assertExists()
        pantalla.onNodeWithText("Entrar", substring=false).assertIsNotEnabled()
        pantalla.onNode(hasText("Mi DNI") and hasSetTextAction()).performTextInput("123456789X")
        pantalla.onNode(hasText("Mi contraseña") and hasSetTextAction()).performTextInput("Clave-sintetica-2026")
        pantalla.onNodeWithContentDescription("Mostrar Mi contraseña").performClick()
        pantalla.onNodeWithContentDescription("Ocultar Mi contraseña").assertExists(); closeSoftKeyboard()
        pantalla.onNodeWithText("Recordarme en este celular").performScrollTo().performClick()
        capturar("ingreso")
        pantalla.onNodeWithText("Entrar",substring=false).performScrollTo().performClick()
        pantalla.runOnIdle { assertEquals(Triple("12345678","Clave-sintetica-2026",false),enviado) }
        pantalla.onNodeWithText("Olvidé mi contraseña").performScrollTo().performClick()
        pantalla.onNodeWithText("Pide una mano a tu profe").assertIsDisplayed(); capturar("ayuda")
        pantalla.runOnUiThread { pantalla.activity.onBackPressedDispatcher.onBackPressed() }
        pantalla.onNodeWithText("¡Ya casi!").assertIsDisplayed()
    }
    @Test fun nueva_clave_sin_repetir_la_temporal() {
        val estado=mutableStateOf(EstadoEntradaKusi(cuenta.copy(temporal=true),claveTemporalDisponible=true))
        var cambio: Triple<String,String,String>?=null
        pantalla.setContent { TemaKusi { AplicacionInfantil(estado.value,{_,_,_->},{a,n,c->cambio=Triple(a,n,c)},{},{}) } }
        pantalla.onNodeWithText("Contraseña actual").assertDoesNotExist(); capturar("nueva-clave")
        pantalla.onNode(hasText("Nueva contraseña") and hasSetTextAction()).performTextInput("NuevaClave2026!")
        pantalla.onNode(hasText("Repite tu contraseña") and hasSetTextAction()).performTextInput("Distinta2026!"); closeSoftKeyboard()
        pantalla.onNodeWithText("Las dos contraseñas deben ser iguales.").performScrollTo().assertIsDisplayed()
        pantalla.onNodeWithText("Guardar y continuar").assertIsNotEnabled(); capturar("claves-distintas")
        pantalla.onNode(hasText("Repite tu contraseña") and hasSetTextAction()).performTextReplacement("NuevaClave2026!"); closeSoftKeyboard()
        pantalla.onNodeWithText("Guardar y continuar").performScrollTo().performClick()
        pantalla.runOnIdle { assertEquals(Triple("","NuevaClave2026!","NuevaClave2026!"),cambio); estado.value=estado.value.copy(ocupado=true) }
        pantalla.onNodeWithText("Guardando…").assertIsNotEnabled()
    }
    @Test fun inicio_aventura_y_cierre() {
        pantalla.setContent { TemaKusi { AplicacionInfantil(EstadoEntradaKusi(cuenta,validado=true),{_,_,_->},{_,_,_->},{},{},
            biblioteca=EstadoBibliotecaInfantil(listOf(aventura)),cierre=EstadoCierreInfantil(1,1),
            contenidoJuego={_,fin,_->BotonKusi("Terminar recorrido de prueba",fin)}) } }
        pantalla.onNodeWithText("Elige una\naventura").assertIsDisplayed()
        pantalla.onNodeWithText("Cursos").assertDoesNotExist(); pantalla.onNodeWithText("Mi cuy").assertDoesNotExist(); capturar("inicio")
        pantalla.onNodeWithText("La feria de las cantidades").performScrollTo().performClick()
        pantalla.onNodeWithText("Escuchar la misión").assertExists(); capturar("mision")
        pantalla.onNodeWithText("¡Jugar!").performScrollTo().performClick()
        pantalla.onNodeWithText("Terminar recorrido de prueba").performClick()
        pantalla.onNodeWithText("¡Terminaste tu aventura!").assertExists(); capturar("cierre")
        pantalla.onNodeWithText("Tu recorrido se guardó.").assertDoesNotExist()
        pantalla.onNodeWithText("Jugar otra vez").performScrollTo().performClick()
        pantalla.onNodeWithText("Terminar recorrido de prueba").performClick()
        pantalla.onNodeWithText("Volver al inicio").performScrollTo().performClick()
        pantalla.onNodeWithText("Elige una\naventura").assertIsDisplayed()
    }
    @Test fun estados_vacios_error_y_reintento() {
        val biblioteca=mutableStateOf(EstadoBibliotecaInfantil())
        var intentos=0
        pantalla.setContent { TemaKusi { AplicacionInfantil(EstadoEntradaKusi(cuenta,validado=true),{_,_,_->},{_,_,_->},{},{}, biblioteca=biblioteca.value,reintentarBiblioteca={intentos++}) } }
        pantalla.onNodeWithText("Tu próxima aventura\nestá por llegar").assertExists(); capturar("sin-aventuras")
        pantalla.runOnIdle { biblioteca.value=EstadoBibliotecaInfantil(error="No hay internet. Revisa el wifi.") }
        pantalla.onNodeWithText("No hay internet. Revisa el wifi.").assertExists(); capturar("sin-internet")
        pantalla.onNodeWithText("Intentar otra vez").performClick(); pantalla.runOnIdle { assertEquals(1,intentos) }
    }
}
