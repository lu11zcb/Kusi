package pe.kusi.movil

import android.graphics.Bitmap
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.unit.dp
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.espresso.Espresso.closeSoftKeyboard
import androidx.test.espresso.Espresso.pressBack
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
    private fun cuentaConCuy(escena: String): Cuenta {
        val estudiante = cuenta.copy(id = "prueba-inicio-$escena")
        InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("kusi_mi_cuy", android.content.Context.MODE_PRIVATE)
            .edit().putBoolean("creado_${estudiante.id}", true).apply()
        return estudiante
    }
    private fun capturar(nombre: String) {
        pantalla.waitForIdle()
        val ins = InstrumentationRegistry.getInstrumentation(); ins.waitForIdleSync(); Thread.sleep(350)
        val destino = File(ins.targetContext.getExternalFilesDir(null), "revision-sprint2"); destino.mkdirs()
        val config = ins.targetContext.resources.configuration
        val sufijo = if (config.smallestScreenWidthDp >= 600) "tablet" else if (config.orientation == 2) "horizontal" else if (config.fontScale > 1.2f) "grande" else if ((config.uiMode and 0x30) == 0x20) "oscuro" else "claro"
        ins.uiAutomation.takeScreenshot().also { im -> File(destino,"$nombre-$sufijo.png").outputStream().use { im.compress(Bitmap.CompressFormat.PNG,100,it) }; im.recycle() }
    }

    private fun SemanticsNodeInteraction.tocarCuy(x: Float = 0.36f, y: Float = 0.58f) {
        performTouchInput { click(Offset(width * x, height * y)) }
    }

    @Test fun mi_cuy_cierra_sesion_solo_si_se_confirma() {
        val estudiante = cuentaConCuy("confirmar-salida")
        var cierres = 0
        pantalla.setContent {
            TemaKusi {
                AplicacionInfantil(
                    EstadoEntradaKusi(estudiante, validado = true),
                    ingresar = { _, _, _ -> }, cambiarClave = { _, _, _ -> }, comprobar = {},
                    salir = { cierres++ },
                )
            }
        }

        pantalla.onNodeWithText("Mi cuy").performClick()
        val boton = pantalla.onNodeWithText("Cerrar sesión")
        boton.performScrollTo().performClick()
        pantalla.onNodeWithText("¿Cerrar sesión?").assertIsDisplayed()
        pantalla.onNodeWithText("Seguir jugando").performClick()
        pantalla.onNodeWithText("¿Cerrar sesión?").assertDoesNotExist()
        pantalla.runOnIdle { assertEquals(0, cierres) }

        boton.performClick()
        pressBack()
        pantalla.onNodeWithText("¿Cerrar sesión?").assertDoesNotExist()
        pantalla.runOnIdle { assertEquals(0, cierres) }

        boton.performClick()
        pantalla.onNodeWithText("Sí, cerrar sesión").performClick()
        pantalla.onNodeWithText("¿Cerrar sesión?").assertDoesNotExist()
        pantalla.runOnIdle { assertEquals(1, cierres) }
    }

    @Test fun cursos_muestra_solo_las_aventuras_de_la_materia_y_regresa_a_ella() {
        val estudiante = cuentaConCuy("cursos-aventuras")
        val lectura = aventura.copy(id = "prueba-lectura", titulo = "El cuento de la plaza", curso = "comunicación")
        var abierta: AventuraInfantil? = null
        pantalla.setContent {
            TemaKusi {
                AplicacionInfantil(
                    EstadoEntradaKusi(estudiante, validado = true), { _, _, _ -> }, { _, _, _ -> }, {}, {},
                    biblioteca = EstadoBibliotecaInfantil(listOf(aventura, lectura)), alVerMision = { abierta = it },
                )
            }
        }

        pantalla.onNodeWithText("Cursos").performClick()
        pantalla.onNodeWithText("Mis cursos").assertIsDisplayed()
        capturar("cursos-cuadricula")
        pantalla.onNodeWithText("Comunicación").assertHasClickAction().performClick()
        pantalla.onNodeWithText(lectura.titulo).assertIsDisplayed()
        pantalla.onNodeWithText(aventura.titulo).assertDoesNotExist()
        pantalla.onNodeWithText("Cursos").assertIsSelected()
        capturar("cursos-con-aventuras")

        pantalla.onNodeWithText("Ver la misión").performClick()
        pantalla.runOnIdle { assertEquals(lectura, abierta) }
        pressBack()
        pantalla.onNodeWithText(lectura.titulo).assertIsDisplayed()
        pantalla.onNodeWithContentDescription("Volver a Mis cursos").assertHasClickAction().performClick()
        pantalla.onNodeWithText("Matemática").assertHasClickAction().assertIsDisplayed()
    }

    @Test fun cursos_distingue_la_carga_el_error_y_la_espera_de_aventuras() {
        val estudiante = cuentaConCuy("cursos-espera")
        val biblioteca = mutableStateOf(EstadoBibliotecaInfantil(cargando = true))
        pantalla.setContent {
            TemaKusi {
                AplicacionInfantil(
                    EstadoEntradaKusi(estudiante, validado = true), { _, _, _ -> }, { _, _, _ -> }, {}, {},
                    biblioteca = biblioteca.value,
                    reintentarBiblioteca = { biblioteca.value = EstadoBibliotecaInfantil(listOf(aventura)) },
                )
            }
        }

        pantalla.onNodeWithText("Cursos").performClick()
        pantalla.onNodeWithText("Comunicación").performClick()
        pantalla.onNodeWithText("Buscando tus aventuras").assertIsDisplayed()
        pantalla.onNodeWithText("Pronto habrá aventuras aquí").assertDoesNotExist()

        pantalla.runOnIdle { biblioteca.value = EstadoBibliotecaInfantil(error = "No pudimos buscar tus aventuras.") }
        pantalla.onNodeWithText("No pudimos buscar tus aventuras.").assertIsDisplayed()
        pantalla.onNodeWithText("Intentar otra vez").performClick()
        pantalla.onNodeWithText("Pronto habrá aventuras aquí").assertIsDisplayed()
        capturar("cursos-en-espera")
        pantalla.onNodeWithContentDescription("Kusi en Comunicación").assertHasClickAction().performClick()
        pantalla.onNodeWithText("Explorar materias").performScrollTo().performClick()
        pantalla.onNodeWithText("Mis cursos").assertIsDisplayed()
    }

    @Test fun arranque_muestra_la_marca_y_abre_la_bienvenida() {
        val estado = mutableStateOf(EstadoEntradaKusi(cuenta = null, iniciando = true))
        pantalla.setContent { TemaKusi { AplicacionInfantil(estado.value, { _, _, _ -> }, { _, _, _ -> }, {}, {}) } }
        pantalla.onNodeWithContentDescription("Kusi").assertIsDisplayed()
        pantalla.onNodeWithText("Preparando la aventura…").assertIsDisplayed()
        pantalla.onNode(SemanticsMatcher.expectValue(SemanticsProperties.ProgressBarRangeInfo,
            ProgressBarRangeInfo.Indeterminate)).assertIsDisplayed()
        capturar("arranque")
        pantalla.onNodeWithContentDescription("Kusi sentado").assertIsDisplayed().assertHasClickAction()
            .performTouchInput { click(center) }
        capturar("arranque-saludo")
        pantalla.runOnIdle { estado.value = EstadoEntradaKusi(cuenta = null) }
        pantalla.onNodeWithText("Ven, vamos a", substring = true).assertIsDisplayed()
        pantalla.onNodeWithText("Preparando la aventura…").assertDoesNotExist()
    }
    @Test fun bienvenida_reproduce_los_cinco_efectos() {
        val efectos = pantalla.runOnUiThread {
            EfectosBienvenida(pantalla.activity.applicationContext).apply {
                mostrar(true)
                habilitar(true)
            }
        }
        try {
            for (sonido in SonidoKusi.entries) {
                pantalla.waitUntil(timeoutMillis = 4000) { pantalla.runOnUiThread { efectos.sonar(sonido) } }
            }
        } finally {
            pantalla.runOnUiThread { efectos.cerrar() }
        }
    }
    @Test fun bienvenida_ingreso_y_boton_animado() {
        var enviado: Triple<String,String,Boolean>? = null
        pantalla.mainClock.autoAdvance = false
        pantalla.setContent { TemaKusi { AplicacionInfantil(EstadoEntradaKusi(null), { d,c,r -> enviado=Triple(d,c,r) }, { _,_,_ -> }, {}, {}) } }
        // El botón permanece bloqueado incluso si se toca a Kusi mientras salta o saluda.
        pantalla.onNodeWithText("Ven, vamos a", substring = true).assertIsDisplayed()
        pantalla.onNodeWithContentDescription("Kusi").assertIsDisplayed()
        val kusi = pantalla.onNodeWithContentDescription("Kusi te saluda").assertHasClickAction()
        pantalla.onNodeWithContentDescription("Escuchar a Kusi").assertHasClickAction()
        val boton = pantalla.onNodeWithText("¡Vamos!", substring = true)
        boton.assertIsNotEnabled().performTouchInput { click() }
        pantalla.onNodeWithText("Mi DNI").assertDoesNotExist()
        pantalla.mainClock.advanceTimeBy(160)
        capturar("bienvenida-impulso")
        pantalla.mainClock.advanceTimeBy(64)
        capturar("bienvenida-despegue")
        pantalla.mainClock.advanceTimeBy(160)
        capturar("bienvenida-primer-salto")
        pantalla.mainClock.advanceTimeBy(192)
        capturar("bienvenida-numeros")
        kusi.tocarCuy(0.64f, 0.35f)
        boton.assertIsNotEnabled()
        pantalla.mainClock.advanceTimeBy(592)
        capturar("bienvenida-libro")
        pantalla.mainClock.advanceTimeBy(480)
        capturar("bienvenida-en-el-aire")
        pantalla.mainClock.advanceTimeBy(256)
        capturar("bienvenida-aterrizaje")
        pantalla.mainClock.advanceTimeBy(164)
        repeat(3) { kusi.tocarCuy() }
        boton.assertIsNotEnabled()
        capturar("bienvenida-saludo")
        pantalla.mainClock.advanceTimeBy(176)
        boton.assertIsNotEnabled()
        capturar("bienvenida-guino")
        pantalla.mainClock.advanceTimeBy(474)
        boton.assertIsEnabled().performScrollTo()
        capturar("bienvenida")
        pantalla.mainClock.advanceTimeBy(245)
        capturar("bienvenida-senala-abajo")
        pantalla.mainClock.advanceTimeBy(465)
        capturar("bienvenida-invita-con-las-patas")
        val efectosActivos = pantalla.onAllNodes(hasContentDescription("Silenciar efectos")).fetchSemanticsNodes().isNotEmpty()
        val etiquetaInicial = if (efectosActivos) "Silenciar efectos" else "Activar efectos"
        val etiquetaCambiada = if (efectosActivos) "Activar efectos" else "Silenciar efectos"
        pantalla.onNodeWithContentDescription(etiquetaInicial).performClick()
        pantalla.mainClock.advanceTimeByFrame()
        pantalla.onNodeWithContentDescription(etiquetaCambiada).performClick()
        pantalla.mainClock.advanceTimeByFrame()
        pantalla.onNodeWithContentDescription(etiquetaInicial).assertIsDisplayed()
        repeat(3) {
            kusi.tocarCuy()
            pantalla.mainClock.advanceTimeBy(48)
        }
        boton.assertIsEnabled()
        capturar("bienvenida-cosquillas")
        pantalla.mainClock.advanceTimeBy(480)
        kusi.tocarCuy()
        pantalla.mainClock.advanceTimeBy(160)
        capturar("bienvenida-risa")
        pantalla.mainClock.advanceTimeBy(480)
        kusi.tocarCuy()
        pantalla.mainClock.advanceTimeBy(160)
        boton.assertIsEnabled()
        capturar("bienvenida-sombrero")
        boton.performTouchInput { down(center) }
        pantalla.mainClock.advanceTimeBy(100)
        capturar("boton-presionado")
        boton.performTouchInput { cancel() }
        boton.performTouchInput { click() }
        pantalla.mainClock.advanceTimeBy(240)
        boton.assertIsNotEnabled()
        pantalla.onNodeWithText("Mi DNI").assertDoesNotExist()
        capturar("bienvenida-celebracion")
        pantalla.mainClock.advanceTimeBy(MS_CELEBRACION_KUSI.toLong())
        pantalla.mainClock.autoAdvance = true
        pantalla.onNodeWithText("Mi DNI").assertExists()
        pantalla.onNodeWithText("Entrar", substring=false).assertIsNotEnabled()
        pantalla.onNodeWithContentDescription("Kusi en el ingreso").assertHasClickAction()
        capturar("ingreso-inicial")
        val campoDni = pantalla.onNode(hasText("Mi DNI") and hasSetTextAction())
        campoDni.performTextInput("12")
        campoDni.performImeAction()
        pantalla.onNodeWithText("Escribe los 8 números de tu DNI.").assertExists()
        campoDni.performTextInput("3456789X")
        campoDni.performImeAction()
        pantalla.onNode(hasText("Mi contraseña") and hasSetTextAction()).performTextInput("Clave-sintetica-2026")
        pantalla.onNodeWithContentDescription("Mostrar Mi contraseña").performClick()
        pantalla.onNodeWithContentDescription("Ocultar Mi contraseña").performClick()
        closeSoftKeyboard()
        pantalla.onNodeWithText("Recordarme en este celular").performScrollTo().performClick()
        capturar("ingreso")
        pantalla.onNodeWithText("Entrar",substring=false).performScrollTo().performClick()
        pantalla.runOnIdle { assertEquals(Triple("12345678","Clave-sintetica-2026",false),enviado) }
        pantalla.onNodeWithText("Necesito ayuda").performScrollTo().performClick()
        pantalla.onNodeWithText("Kusi te ayuda").assertIsDisplayed()
        pantalla.onNode(hasText("Escuchar") and hasClickAction()).assertIsDisplayed()
        capturar("ayuda")
        pantalla.onNodeWithText("¡Entendido!").performClick()
        pantalla.onNodeWithText("¡Vamos a entrar!").assertIsDisplayed()
    }
    @Test fun bienvenida_invita_con_gestos_y_celebra_una_vez() {
        val frases = mutableListOf<String>()
        var entradas = 0
        pantalla.mainClock.autoAdvance = false
        pantalla.setContent {
            TemaKusi {
                BienvenidaKusi(VozKusi(true, hablar = { frases.add(it) }), entrar = { entradas++ })
            }
        }
        pantalla.mainClock.advanceTimeBy(3000)
        pantalla.runOnIdle { assertTrue(frases.isEmpty()) }
        pantalla.onNodeWithContentDescription("Escuchar a Kusi").performClick()
        pantalla.runOnIdle { assertTrue(frases.single().contains("Toca el botón verde.")) }

        val boton = pantalla.onNodeWithText("¡Vamos!").assertIsEnabled()
        boton.performTouchInput { click() }
        pantalla.mainClock.advanceTimeBy(200)
        boton.assertIsNotEnabled().performTouchInput { repeat(3) { click() } }
        pantalla.runOnIdle { assertEquals(0, entradas) }
        pantalla.mainClock.advanceTimeBy(MS_CELEBRACION_KUSI.toLong() + 96)
        pantalla.runOnIdle { assertEquals(1, entradas) }
    }

    @Test fun kusi_del_ingreso_reacciona_y_respeta_el_ojo_de_la_clave() {
        pantalla.mainClock.autoAdvance = false
        pantalla.setContent {
            TemaKusi {
                Scaffold { margen ->
                    Box(Modifier.padding(margen)) {
                        IngresoInfantil(EstadoEntradaKusi(null), VozKusi(false, {}), { _, _, _ -> }, {}, {})
                    }
                }
            }
        }
        val kusi = pantalla.onNodeWithContentDescription("Kusi en el ingreso")
        fun gesto(valor: GestoIngreso) {
            kusi.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, valor.descripcion))
        }

        val escondido = SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Kusi está escondido en el arbusto")
        kusi.assert(escondido)
        pantalla.mainClock.advanceTimeBy(EsperaArbustoIngreso - 400)
        kusi.assert(escondido)
        capturar("ingreso-arbusto")
        pantalla.mainClock.advanceTimeBy(1000)
        gesto(GestoIngreso.ALEGRE)
        capturar("ingreso-jardin")
        pantalla.mainClock.advanceTimeBy(450)
        gesto(GestoIngreso.DNI)
        capturar("ingreso-mira-el-dni")
        pantalla.mainClock.advanceTimeBy(4180)
        gesto(GestoIngreso.SALUDO)
        pantalla.mainClock.advanceTimeBy(700)
        gesto(GestoIngreso.REPOSO)
        kusi.tocarCuy(0.50f, 0.43f)
        pantalla.mainClock.advanceTimeBy(100)
        gesto(GestoIngreso.RISA)
        pantalla.mainClock.advanceTimeBy(600)
        gesto(GestoIngreso.REPOSO)
        pantalla.mainClock.autoAdvance = true

        pantalla.onNode(hasText("Mi DNI") and hasSetTextAction()).performTextInput("12345678")
        gesto(GestoIngreso.DNI)
        val clave = pantalla.onNode(hasText("Mi contraseña") and hasSetTextAction())
        clave.performTextInput("Clave-de-prueba")
        closeSoftKeyboard()
        gesto(GestoIngreso.PRIVACIDAD)
        capturar("ingreso-ojos-tapados")
        kusi.performScrollTo().tocarCuy(0.50f, 0.43f)
        gesto(GestoIngreso.PRIVACIDAD)
        pantalla.onNodeWithContentDescription("Mostrar Mi contraseña").performScrollTo().performClick()
        gesto(GestoIngreso.ESPIA)
        capturar("ingreso-un-ojo")
        pantalla.onNodeWithContentDescription("Ocultar Mi contraseña").performClick()
        gesto(GestoIngreso.PRIVACIDAD)
    }

    @Test fun tocar_el_arbusto_hace_salir_a_kusi_antes_del_tiempo() {
        pantalla.mainClock.autoAdvance = false
        pantalla.setContent {
            TemaKusi {
                CuyDeIngreso(Modifier.size(220.dp), GestoIngreso.REPOSO, 0, enviando = false, quieto = false)
            }
        }
        val kusi = pantalla.onNodeWithContentDescription("Kusi en el ingreso")
        val escondido = SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Kusi está escondido en el arbusto")
        kusi.tocarCuy(0.5f, 0.32f)
        pantalla.mainClock.advanceTimeBy(128)
        kusi.assert(escondido)
        kusi.tocarCuy(0.5f, 0.78f)
        pantalla.mainClock.advanceTimeBy(560)
        kusi.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, GestoIngreso.ALEGRE.descripcion))
    }

    @Test fun vestidor_tiene_un_dibujo_para_cada_combinacion_permitida() {
        val opciones = CategoriaCuy.entries.fold(listOf(AparienciaCuy())) { apariencias, categoria ->
            val piezas = PiezaCuy.entries.filter { !it.deTienda && it.categoria == categoria }
            apariencias.flatMap { apariencia -> listOf(apariencia) + piezas.map { apariencia.vestir(categoria, it) } }
        }
        val assets = InstrumentationRegistry.getInstrumentation().targetContext.assets
        assertEquals(opciones.map { "${it.archivo}.webp" }.toSet(), assets.list("vestidor")!!.toSet())
    }

    @Test fun crear_cuy_combina_piezas_y_guarda_el_dibujo_por_cuenta() {
        val id = "prueba-vestidor"
        val app = InstrumentationRegistry.getInstrumentation().targetContext
        val preferencias = app.getSharedPreferences("kusi_mi_cuy", android.content.Context.MODE_PRIVATE)
        fun limpiar() {
            preferencias.edit().remove("creado_$id").remove("pelaje_$id")
                .remove("conjunto_$id").remove("accesorios_$id").commit()
        }
        limpiar()
        try {
            val estado = mutableStateOf(EstadoEntradaKusi(null))
            pantalla.setContent {
                TemaKusi { AplicacionInfantil(estado.value, { _, _, _ -> }, { _, _, _ -> }, {}, {}) }
            }
            pantalla.runOnIdle { estado.value = EstadoEntradaKusi(cuenta.copy(id = id), validado = true) }
            pantalla.onNodeWithText("Crea tu cuy").assertIsDisplayed()
            val cuy = pantalla.onNodeWithContentDescription("Tu cuy")
            cuy.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Pelaje café"))
            capturar("vestidor-diseno-pelajes")
            pantalla.onNodeWithText("Gris").performScrollTo().performClick().assertIsSelected()
            fun categoria(etiqueta: String) {
                val pestaña = pantalla.onNode(hasText(etiqueta) and hasClickAction())
                if (!pestaña.isDisplayed()) pestaña.performScrollTo()
                pestaña.performClick()
            }
            for (pieza in PiezaCuy.entries.filter { it.deTienda }) {
                categoria(pieza.categoria.etiqueta)
                val bloqueado = pantalla.onNode(hasText(pieza.etiqueta) and hasText("Se compra con monedas"))
                bloqueado.performScrollTo().performClick()
                // Sin respuesta de la tienda no se compra ni se pone nada: la app ofrece volver a consultar.
                pantalla.onNodeWithText("No pudimos ver tus monedas. Vuelve a intentarlo.").assertIsDisplayed()
                pantalla.onNodeWithText("Ahora no").performClick()
                pantalla.onNodeWithText(pieza.categoria.sinPieza).assertIsSelected()
            }
            categoria("Ropa")
            pantalla.onNodeWithText("Ver puesto").performScrollTo().performClick()
            pantalla.onNodeWithText("Bloqueado · Se compra con monedas").assertIsDisplayed()
            capturar("vestidor-vista-chaleco")
            pantalla.onNodeWithText("Volver al vestidor").performClick()
            pantalla.onNodeWithText("Sin ropa").performScrollTo().assertIsSelected()
            categoria("Cabeza")
            pantalla.onNodeWithText("Sombrero verde").performScrollTo().performClick().assertIsSelected()
            categoria("Lentes")
            pantalla.onNodeWithText("Lentes celestes").performScrollTo().performClick().assertIsSelected()
            categoria("Ropa")
            pantalla.onNodeWithText("Polo azul").performScrollTo().performClick().assertIsSelected()
            categoria("Mochila")
            pantalla.onNodeWithText("Mochila miel").performScrollTo().performClick().assertIsSelected()
            categoria("Lentes")
            pantalla.onNodeWithText("Lentes menta").performScrollTo().performClick().assertIsSelected()
            val combinado = "pelaje gris, con sombrero verde, lentes menta, polo azul, mochila miel"
            cuy.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription,
                combinado.replaceFirstChar { it.uppercase() }))
            capturar("vestidor-accesorios-ajustados")
            pantalla.mainClock.autoAdvance = false
            cuy.tocarCuy(0.5f, 0.55f)
            pantalla.mainClock.advanceTimeBy(155)
            capturar("vestidor-accesorios-ajustados-saludo")
            pantalla.mainClock.advanceTimeBy(520)
            pantalla.mainClock.autoAdvance = true

            categoria("Ropa")
            pantalla.onNodeWithText("Bufanda azul").performScrollTo().performClick().assertIsSelected()
            capturar("vestidor-bufanda-vestida")
            pantalla.onNodeWithText("Polo azul").performScrollTo().performClick().assertIsSelected()
            pantalla.onNodeWithText("¡Listo!").performClick()
            pantalla.onNodeWithText("¡Hola, Mateo!").assertIsDisplayed()
            pantalla.runOnIdle {
                assertTrue(preferencias.getBoolean("creado_$id", false))
                assertEquals(PelajeCuy.GRIS.codigo, preferencias.getInt("pelaje_$id", -1))
                assertEquals(setOf("SOMBRERO", "LENTES_MENTA", "POLO", "MOCHILA"),
                    preferencias.getStringSet("accesorios_$id", emptySet()))
            }
            pantalla.onNodeWithText("Mi cuy", substring = false).performClick()
            pantalla.onNodeWithContentDescription("Mi cuy de " + combinado).assertIsDisplayed()
            pantalla.onNodeWithText("Personalizar mi cuy").performScrollTo().performClick()
            pantalla.onNodeWithText("Gris").assertIsSelected()
            categoria("Ropa")
            pantalla.onNodeWithText("Polo azul").assertIsSelected()
            pantalla.onNodeWithText("Sin ropa").performScrollTo().performClick().assertIsSelected()
            cuy.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription,
                "Pelaje gris, con sombrero verde, lentes menta, mochila miel"))
            capturar("vestidor-edita-pieza")
            pantalla.onNodeWithContentDescription("Volver").performClick()
            pantalla.onNodeWithContentDescription("Mi cuy de " + combinado).assertIsDisplayed()

            pantalla.onNodeWithText("Personalizar mi cuy").performScrollTo().performClick()
            for (pieza in listOf(PiezaCuy.GORRA_CELESTE, PiezaCuy.LENTES_CUADRADOS,
                PiezaCuy.POLERON_MENTA, PiezaCuy.MOCHILA_ESPACIO)) {
                categoria(pieza.categoria.etiqueta)
                pantalla.onNodeWithText(pieza.etiqueta).performScrollTo().performClick().assertIsSelected()
            }
            capturar("vestidor-gorra-nube-y-mochila-lunar")
            for (pieza in listOf(PiezaCuy.LAZO, PiezaCuy.LENTES_CORAZON, PiezaCuy.PETO_LILA, PiezaCuy.MOCHILA_FRESA)) {
                categoria(pieza.categoria.etiqueta)
                pantalla.onNodeWithText(pieza.etiqueta).performScrollTo().performClick().assertIsSelected()
            }
            capturar("vestidor-lazo-y-mochila-de-fresa")
            val nuevo = "Mi cuy de pelaje gris, con lazo coral, lentes corazón, jardinera lila, mochila de fresa"
            pantalla.onNodeWithText("Guardar cambios").performClick()
            pantalla.onNodeWithContentDescription(nuevo).assertIsDisplayed()

            pantalla.runOnIdle { estado.value = EstadoEntradaKusi(null) }
            pantalla.onNodeWithText("¡Vamos!").assertExists()
            pantalla.runOnIdle { estado.value = EstadoEntradaKusi(cuenta.copy(id = id), validado = true) }
            pantalla.onNodeWithText("¡Hola, Mateo!").assertIsDisplayed()
            pantalla.onNodeWithText("Mi cuy", substring = false).performClick()
            pantalla.onNodeWithContentDescription(nuevo).assertIsDisplayed()
        } finally {
            pantalla.mainClock.autoAdvance = true
            limpiar()
        }
    }
    @Test fun bienvenida_reacciona_solo_en_la_silueta_de_kusi() {
        var reacciones = 0
        pantalla.mainClock.autoAdvance = false
        pantalla.setContent {
            TemaKusi {
                KusiAnimado(
                    hablando = false, invitando = false, celebrando = false,
                    alSonar = { if (it == SonidoKusi.COSQUILLAS) reacciones++ },
                    alTerminarPresentacion = {}, alTerminarCelebracion = {},
                    modifier = Modifier.size(300.dp, 275.dp),
                )
            }
        }
        pantalla.mainClock.advanceTimeBy(2800)
        val escena = pantalla.onNodeWithContentDescription("Kusi te saluda").assertHasClickAction()
        escena.tocarCuy(0.83f, 0.64f)
        // Espacio transparente que sí cae dentro del rectángulo del sprite.
        escena.tocarCuy(0.15f, 0.56f)
        pantalla.mainClock.advanceTimeBy(100)
        pantalla.runOnIdle { assertEquals(0, reacciones) }

        escena.tocarCuy()
        pantalla.mainClock.advanceTimeBy(100)
        pantalla.runOnIdle { assertEquals(1, reacciones) }
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
        val estudiante = cuentaConCuy("mision")
        val cierre = mutableStateOf(EstadoCierreInfantil(1, 1))
        pantalla.setContent { TemaKusi { AplicacionInfantil(EstadoEntradaKusi(estudiante,validado=true),{_,_,_->},{_,_,_->},{},{},
            biblioteca=EstadoBibliotecaInfantil(listOf(aventura)),cierre=cierre.value,
            contenidoJuego={_,fin,_->BotonKusi("Terminar recorrido de prueba",fin)}) } }
        pantalla.onNodeWithText("Mis aventuras").assertIsDisplayed()
        pantalla.onNodeWithText("Cursos").assertIsDisplayed(); pantalla.onNodeWithText("Mi cuy").assertIsDisplayed()
        pantalla.onNodeWithText("La feria de las cantidades").assertIsDisplayed()
        pantalla.onNodeWithText("Ver la misión").performClick()
        pantalla.onNodeWithText("Escuchar la misión").assertExists(); capturar("mision")
        pantalla.onNodeWithText("¡Jugar!").performScrollTo().performClick()
        pantalla.onNodeWithText("Terminar recorrido de prueba").performClick()
        pantalla.onNodeWithText("¡Terminaste tu aventura!").assertExists(); capturar("cierre")
        pantalla.onNodeWithText("¡Tu aventura quedó guardada!").assertDoesNotExist()
        pantalla.onNodeWithText("Jugar otra vez").performScrollTo().assertIsNotEnabled()
        pantalla.runOnIdle { cierre.value = cierre.value.copy(guardado = true) }
        pantalla.onNodeWithText("Jugar otra vez").performScrollTo().assertIsEnabled().performClick()
        pantalla.onNodeWithText("Terminar recorrido de prueba").performClick()
        pantalla.onNodeWithText("Elegir otra aventura").performScrollTo().performClick()
        pantalla.onNodeWithText("Mis aventuras").assertIsDisplayed()
    }
    @Test fun buscar_juegos_y_ayuda_con_una_aventura_disponible() {
        var busquedas = 0
        val estudiante = cuentaConCuy("buscar")
        pantalla.setContent { TemaKusi { AplicacionInfantil(EstadoEntradaKusi(estudiante,validado=true),{_,_,_->},{_,_,_->},{},{},
            biblioteca=EstadoBibliotecaInfantil(listOf(aventura)),reintentarBiblioteca={busquedas++},
            contenidoJuego={_,_,volver->BotonKusi("Volver de la prueba",volver)}) } }
        pantalla.onNodeWithText("Buscar juegos nuevos").performScrollTo().performClick()
        pantalla.runOnIdle { assertEquals(1,busquedas) }
        pantalla.onNodeWithContentDescription("Necesito ayuda").performClick()
        pantalla.onNodeWithText("Elige una aventura de tu clase. Toca Ver la misión o Continuar si ya guardaste una partida.").assertExists()
        pantalla.onNodeWithText("¡Entendido!").performClick()
        pantalla.onNodeWithText("Ver la misión").performScrollTo().performClick()
        pantalla.onNodeWithContentDescription("Necesito ayuda").performClick()
        pantalla.onNodeWithText(aventura.consigna).assertExists()
        pantalla.onNodeWithText("¡Entendido!").performClick()
        pantalla.onNodeWithText("¡Jugar!").performScrollTo().performClick()
        pressBack()
        pantalla.onNodeWithText("¿Volvemos a la misión?").assertExists()
        pantalla.onNodeWithText("Seguir jugando").performClick()
        pantalla.onNodeWithText("Volver de la prueba").assertExists()
    }
    @Test fun inicio_calla_a_kusi_y_comparte_el_ajuste_con_mi_cuy() {
        val estudiante = cuentaConCuy("voz")
        val preferencias = InstrumentationRegistry.getInstrumentation().targetContext
            .getSharedPreferences("kusi_mi_cuy", android.content.Context.MODE_PRIVATE)
        val vozAnterior = preferencias.all["voz"] as? Boolean
        val seccion = mutableStateOf(0)
        val hablando = mutableStateOf(true)
        val frases = mutableListOf<String>()
        var interrupciones = 0
        preferencias.edit().putBoolean("voz", true).apply()
        try {
            pantalla.setContent {
                TemaKusi {
                    InicioReferencia(
                        cuenta = estudiante, estado = EstadoEntradaKusi(estudiante, validado = true),
                        biblioteca = EstadoBibliotecaInfantil(),
                        voz = VozKusi(
                            disponible = true,
                            hablar = { frases += it; hablando.value = true },
                            callar = { interrupciones++; hablando.value = false },
                            hablando = hablando.value,
                        ),
                        elegir = {}, recargar = null, comprobar = {}, salir = {},
                        apariencia = AparienciaCuy(), seccion = seccion.value, curso = null,
                        cambiarSeccion = { seccion.value = it }, abrirCurso = {}, personalizar = {}, ayuda = {},
                    )
                }
            }
            pantalla.onNodeWithContentDescription("Silenciar a Kusi").assertIsOn().performClick()
            pantalla.onNodeWithContentDescription("Activar y escuchar a Kusi").assertIsOff().assertIsEnabled()
            pantalla.onNodeWithContentDescription("Kusi en el jardín").performClick()
            pantalla.runOnIdle {
                assertEquals(1, interrupciones)
                assertFalse(hablando.value)
                assertFalse(preferencias.getBoolean("voz", true))
                assertTrue(frases.isEmpty())
            }
            pantalla.onNodeWithText("Mi cuy").performClick()
            pantalla.onNode(isToggleable()).performScrollTo().assertIsOff()
            pantalla.onNodeWithText("Inicio").performClick()
            pantalla.onNodeWithContentDescription("Activar y escuchar a Kusi").assertIsOff().performClick()
            pantalla.onNodeWithContentDescription("Silenciar a Kusi").assertIsOn()
            pantalla.runOnIdle {
                assertTrue(preferencias.getBoolean("voz", false))
                assertEquals(1, frases.size)
                hablando.value = false
            }
            pantalla.onNodeWithContentDescription("Silenciar a Kusi").performClick()
            pantalla.runOnIdle {
                assertEquals(2, interrupciones)
                assertEquals(1, frases.size)
            }
        } finally {
            preferencias.edit().apply {
                if (vozAnterior == null) remove("voz") else putBoolean("voz", vozAnterior)
                apply()
            }
        }
    }

    @Test fun estados_vacios_error_y_reintento() {
        val biblioteca=mutableStateOf(EstadoBibliotecaInfantil())
        var intentos=0
        val estudiante = cuentaConCuy("espera")
        pantalla.setContent { TemaKusi { AplicacionInfantil(EstadoEntradaKusi(estudiante,validado=true),{_,_,_->},{_,_,_->},{},{}, biblioteca=biblioteca.value,reintentarBiblioteca={intentos++}) } }
        pantalla.onNodeWithText("Tus aventuras están por llegar").assertIsDisplayed()
        capturar("inicio-nuevo-sin-juegos")
        pantalla.onNodeWithContentDescription("Kusi en el jardín").assertHasClickAction()
        pantalla.onNodeWithContentDescription("Plaza de Kusi").assertHasClickAction()
        val libro = pantalla.onNodeWithContentDescription("Libro de Kusi")
        libro.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Páginas 1 y 2"))
        libro.performTouchInput { click(center) }
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Páginas 3 y 4"))
        val tulipanes = pantalla.onNodeWithContentDescription("Tulipanes de Kusi").assertIsOff()
        tulipanes.performTouchInput { click(center) }.assertIsOn()
        pantalla.onNodeWithContentDescription("Mariposa").performTouchInput { click(center) }
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Lugar 2 de 3"))
        capturar("inicio-jardin-interactivo")
        libro.performClick().assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Páginas 5 y 6"))
        libro.performClick().assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Cerrado"))
        libro.performClick().assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Páginas 1 y 2"))
        pantalla.onNodeWithText("Buscar juegos nuevos").performScrollTo().performClick()
        pantalla.runOnIdle { assertEquals(1, intentos); biblioteca.value = EstadoBibliotecaInfantil(cargando = true) }
        pantalla.onNodeWithText("Buscando tus aventuras…").assertIsDisplayed()
        pantalla.runOnIdle { biblioteca.value=EstadoBibliotecaInfantil(error="No hay internet. Revisa el wifi.") }
        pantalla.onNodeWithText("No hay internet. Revisa el wifi.").assertIsDisplayed(); capturar("inicio-nuevo-error")
        pantalla.onNodeWithText("Intentar otra vez").performClick(); pantalla.runOnIdle { assertEquals(2,intentos) }
    }

    @Test fun libro_termina_una_vuelta_antes_de_pasar_la_hoja_pendiente() {
        pantalla.setContent {
            TemaKusi { LibroDeLaPlaza(Modifier.size(120.dp), quieto = false, brisa = null) {} }
        }
        val libro = pantalla.onNodeWithContentDescription("Libro de Kusi")
        libro.performTouchInput {
            repeat(3) {
                click(center)
                advanceEventTime(60)
            }
        }
        pantalla.mainClock.advanceTimeBy(1_450)
        libro.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Páginas 5 y 6"))
    }

    @Test fun inicio_deja_deslizar_sobre_la_plaza_y_abrir_los_juegos_de_abajo() {
        val estudiante = cuentaConCuy("lista")
        val aventuras = (1..9).map { numero ->
            aventura.copy(id = "aventura-$numero", titulo = "Juego $numero", consigna = "Consigna $numero")
        }
        pantalla.setContent {
            TemaKusi {
                AplicacionInfantil(
                    EstadoEntradaKusi(estudiante, validado = true), { _, _, _ -> }, { _, _, _ -> }, {}, {},
                    biblioteca = EstadoBibliotecaInfantil(aventuras),
                )
            }
        }

        val lista = pantalla.onNodeWithTag("Lista de aventuras")
        val libro = pantalla.onNodeWithContentDescription("Libro de Kusi")
        libro.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Páginas 1 y 2"))
            .performTouchInput { swipe(center, Offset(center.x, center.y - height * 2)) }
        pantalla.onNodeWithText("Mis aventuras").assertIsNotDisplayed()
        lista.performScrollToIndex(0)
        libro.assert(SemanticsMatcher.expectValue(SemanticsProperties.StateDescription, "Páginas 1 y 2"))
        pantalla.onNodeWithContentDescription("Tulipanes de Kusi").performClick().assertIsOn()
        lista.performScrollToNode(hasText("Juego 9"))
        pantalla.onNodeWithText("Juego 9").assertIsDisplayed()
        pantalla.onNodeWithText("Inicio").assertIsSelected().assertIsDisplayed()
        pantalla.onNodeWithText("Mi cuy").assertIsDisplayed()
        lista.performScrollToIndex(9)
        pantalla.onAllNodesWithText("Ver la misión").onLast().performClick()
        pantalla.onNodeWithText("Escuchar la misión").assertExists()
        pantalla.onNodeWithText("Juego 9").assertIsDisplayed()
    }

    @Test fun inicio_prioriza_y_abre_una_partida_guardada() {
        val estudiante = cuentaConCuy("continuar")
        val lectura = AventuraInfantil(
            "prueba-lectura", "Palabras en el valle", "Comunicación", "Encuentra las palabras.", "Escoge la palabra.",
            nuevo = true,
        )
        pantalla.setContent {
            TemaKusi {
                AplicacionInfantil(
                    EstadoEntradaKusi(estudiante, validado = true), { _, _, _ -> }, { _, _, _ -> }, {}, {},
                    biblioteca = EstadoBibliotecaInfantil(listOf(lectura, aventura.copy(enPausa = true))),
                    reintentarBiblioteca = {},
                    contenidoJuego = { juego, _, _ -> Text("Partida de ${juego.titulo}") },
                )
            }
        }
        pantalla.onNodeWithText("¡Hola, Mateo!").assertIsDisplayed()
        pantalla.onNodeWithText("En pausa").assertIsDisplayed()
        pantalla.onNodeWithText("Nueva").assertExists()
        pantalla.onNodeWithContentDescription("Kusi te saluda").assertHasClickAction()
        pantalla.onNodeWithText("Inicio").assertIsSelected()
        capturar("inicio-nuevo-con-juegos")
        pantalla.onNodeWithText("Cursos").performClick().assertIsSelected()
        pantalla.onNodeWithText("Mis cursos").assertIsDisplayed()
        pantalla.onNodeWithText("Logros").performClick().assertIsSelected()
        pantalla.onNodeWithText("Mis logros").assertIsDisplayed()
        pantalla.onNodeWithText("Mi cuy").performClick().assertIsSelected()
        pantalla.onNodeWithText("Mi cuy Mateo").assertIsDisplayed()
        pantalla.onNodeWithText("Inicio").performClick().assertIsSelected()
        pantalla.onNodeWithText("Continuar").performClick()
        pantalla.onNodeWithText("Partida de ${aventura.titulo}").assertIsDisplayed()
    }
}
