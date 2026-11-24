package pe.kusi.movil

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlin.math.PI
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin

// Los índices coinciden con las celdas de la hoja y con el modelo de Rive.
internal enum class GestoIngreso(val cuadro: Int, val descripcion: String) {
    REPOSO(0, "Asomado en su arbusto"),
    DNI(1, "Se apoya en el panel y mira el DNI"),
    PRIVACIDAD(2, "Se tapa los dos ojos"),
    ESPIA(3, "Espía con un solo ojo"),
    RISA(4, "Se ríe y agita las hojas"),
    SALUDO(5, "Saluda con una patita"),
    ALEGRE(6, "Sonríe mirando al frente"),
}

private enum class MovimientoIngreso(val codigo: Float, val duracion: Int) {
    QUIETO(0f, 0),
    ESCONDIDO(1f, 1550),
    ASOMARSE(2f, 720),
    COSQUILLAS(3f, 600),
    TECLEAR(4f, 360),
    SALUDAR(5f, 670),
}

internal const val EsperaArbustoIngreso = 5000L
private const val PausaAntesDeSaludar = 4300L
internal const val MiradaAlFrenteIngreso = 920L
internal const val MiradaAlDniIngreso = 770L
internal val SolapePanelIngreso = 22.dp

@Composable
internal fun CuyDeIngreso(
    modifier: Modifier,
    gesto: GestoIngreso,
    pulsosDni: Int,
    enviando: Boolean,
    quieto: Boolean,
) {
    var escondido by rememberSaveable { mutableStateOf(true) }
    var apareciendo by remember { mutableStateOf(false) }
    var poseEntrada by remember { mutableStateOf<GestoIngreso?>(null) }
    var cosquillas by remember { mutableStateOf(false) }
    var tecla by remember { mutableStateOf(false) }
    var saludo by remember { mutableStateOf(false) }
    var ultimoPulso by remember { mutableIntStateOf(pulsosDni) }
    val privacidad = gesto == GestoIngreso.PRIVACIDAD || gesto == GestoIngreso.ESPIA

    fun asomar() {
        escondido = false
        apareciendo = !quieto
        if (!quieto) poseEntrada = GestoIngreso.ALEGRE
    }

    LaunchedEffect(escondido) {
        if (escondido) {
            delay(EsperaArbustoIngreso)
            asomar()
        }
    }
    LaunchedEffect(apareciendo) {
        if (apareciendo) {
            delay(MovimientoIngreso.ASOMARSE.duracion.toLong())
            apareciendo = false
        }
    }
    LaunchedEffect(escondido, quieto) {
        if (!escondido && !quieto && poseEntrada == GestoIngreso.ALEGRE) {
            delay(MiradaAlFrenteIngreso)
            poseEntrada = GestoIngreso.DNI
            delay(MiradaAlDniIngreso)
            poseEntrada = null
        }
    }
    LaunchedEffect(cosquillas) {
        if (cosquillas) {
            delay(MovimientoIngreso.COSQUILLAS.duracion.toLong())
            cosquillas = false
        }
    }
    LaunchedEffect(pulsosDni, gesto, escondido) {
        tecla = gesto == GestoIngreso.DNI && pulsosDni != ultimoPulso && !escondido
        ultimoPulso = pulsosDni
        if (tecla) {
            delay(MovimientoIngreso.TECLEAR.duracion.toLong())
            tecla = false
        }
    }
    LaunchedEffect(escondido, apareciendo, cosquillas, privacidad, enviando, pulsosDni, quieto) {
        saludo = false
        if (!escondido && !apareciendo && !cosquillas && !privacidad && !enviando && !quieto) {
            while (isActive) {
                delay(PausaAntesDeSaludar)
                saludo = true
                delay(MovimientoIngreso.SALUDAR.duracion.toLong())
                saludo = false
            }
        }
    }
    val movimiento = when {
        escondido -> MovimientoIngreso.ESCONDIDO
        apareciendo -> MovimientoIngreso.ASOMARSE
        cosquillas -> MovimientoIngreso.COSQUILLAS
        tecla -> MovimientoIngreso.TECLEAR
        saludo && !privacidad -> MovimientoIngreso.SALUDAR
        else -> MovimientoIngreso.QUIETO
    }
    val saludoInicial = poseEntrada
    val pose = when {
        privacidad -> gesto
        movimiento == MovimientoIngreso.COSQUILLAS -> GestoIngreso.RISA
        gesto == GestoIngreso.DNI && !apareciendo && movimiento != MovimientoIngreso.SALUDAR -> gesto
        saludoInicial != null -> saludoInicial
        movimiento == MovimientoIngreso.SALUDAR -> GestoIngreso.SALUDO
        else -> gesto
    }
    val descripcion = if (escondido) "Kusi está escondido en el arbusto" else pose.descripcion

    val siluetaCuy = remember { SiluetaKusi() }
    val siluetaArbusto = remember { SiluetaKusi() }
    val siluetasRamas = remember { List(3) { SiluetaKusi() } }
    Box(modifier
        .tocarSiluetaKusi(
            siluetaArbusto, "Kusi en el ingreso",
            if (escondido) "Buscar a Kusi en el arbusto" else "Hacer cosquillas a Kusi",
            otrasSiluetas = if (escondido || apareciendo) siluetasRamas else siluetasRamas + siluetaCuy,
        ) {
            if (escondido) asomar()
            else if (!apareciendo && !cosquillas) cosquillas = true
        }
        .semantics { stateDescription = descripcion },
    ) {
        // El RML y Compose usan la misma hoja de poses.
        val riveListo = !quieto && EscenaRiveLocal("kusi_ingreso", "Ingreso", "KusiIngreso", Modifier.fillMaxSize()) { modelo ->
            LaunchedEffect(modelo, pose, movimiento) {
                modelo.setNumber("pose", pose.cuadro.toFloat())
                modelo.setNumber("movimiento", movimiento.codigo)
            }
        }
        val avance = remember(movimiento) { Animatable(0f) }
        val hojas = if (escondido && !quieto && !riveListo) {
            rememberInfiniteTransition(label = "arbusto-inquieto").animateFloat(
                0f, 1f, infiniteRepeatable(tween(MovimientoIngreso.ESCONDIDO.duracion, easing = LinearEasing)),
                label = "sacudir-hojas",
            )
        } else null
        LaunchedEffect(avance, quieto, riveListo) {
            if (!quieto && !riveListo && !escondido && movimiento.duracion > 0) {
                avance.animateTo(1f, tween(movimiento.duracion, easing = LinearEasing))
            }
        }

        val arte = ImageBitmap.imageResource(R.drawable.kusi_poses_ingreso)
        val arbusto = ImageBitmap.imageResource(R.drawable.kusi_hojas_ingreso)
        val ramas = ImageBitmap.imageResource(R.drawable.kusi_ramas_ingreso)
        val fuenteArbusto = IntSize(arbusto.width, arbusto.height)
        val celda = arte.width / 3
        val origen = IntOffset(pose.cuadro % 3 * celda, pose.cuadro / 3 * celda)
        Canvas(Modifier.fillMaxSize()) {
            val lado = size.minDimension.roundToInt()
            val bordeDelPanel = lado - SolapePanelIngreso.toPx()
            val apoyado = pose == GestoIngreso.DNI
            val fraccion = hojas?.value ?: avance.value
            val arco = sin(fraccion * PI).toFloat()
            val subir = when (movimiento) {
                MovimientoIngreso.ASOMARSE -> 0.77f * (1f - fraccion).pow(4) - 0.058f * arco * fraccion
                MovimientoIngreso.COSQUILLAS -> -0.045f * arco
                MovimientoIngreso.SALUDAR -> -0.024f * arco
                else -> 0f
            }
            val fuerzaRamas = when (movimiento) {
                MovimientoIngreso.ESCONDIDO -> arco * arco * 0.91f
                MovimientoIngreso.ASOMARSE -> arco * (1f - fraccion) * 1.8f
                MovimientoIngreso.COSQUILLAS, MovimientoIngreso.TECLEAR -> arco * 0.60f
                else -> 0f
            }
            val giroCuy = when (movimiento) {
                MovimientoIngreso.COSQUILLAS -> 3.5f * sin(fraccion * 4f * PI).toFloat() * arco
                MovimientoIngreso.SALUDAR -> -4f * arco
                else -> 0f
            }
            val tamanoCuy = (lado * if (apoyado) 0.89f else 0.84f).roundToInt()
            val correccionX = if (pose == GestoIngreso.ALEGRE || apoyado) 0f else (1 - pose.cuadro % 3) * 0.038f * lado
            val alturaCuy = if (apoyado) bordeDelPanel - tamanoCuy * 0.927f
                else lado * (0.015f + if (quieto || riveListo) 0f else subir)
            val esquinaCuy = IntOffset(((lado - tamanoCuy) / 2f - correccionX).roundToInt(), alturaCuy.roundToInt())
            val altoHojas = (lado * arbusto.height.toFloat() / arbusto.width).roundToInt()
            val esquinaHojas = IntOffset(0, (lado * 0.559f).roundToInt())
            val apoyoCuy = Offset(esquinaCuy.x + tamanoCuy * ApoyoCuadroKusi.x,
                esquinaCuy.y + tamanoCuy * ApoyoCuadroKusi.y)
            val apoyoHojas = Offset(lado * ApoyoCuadroKusi.x, esquinaHojas.y + altoHojas * ApoyoCuadroKusi.y)
            siluetaCuy.actualizar(arte, origen, IntSize(celda, celda), apoyoCuy,
                Size(tamanoCuy.toFloat(), tamanoCuy.toFloat()), giroCuy * PI.toFloat() / 180f)
            siluetaArbusto.actualizar(arbusto, IntOffset.Zero, fuenteArbusto, apoyoHojas,
                Size(lado.toFloat(), altoHojas.toFloat()), giro = 0f)
            clipRect(bottom = bordeDelPanel) {
                dibujarRamasIngreso(ramas, lado.toFloat(), fraccion, fuerzaRamas, siluetasRamas, visible = !riveListo)
            }
            if (riveListo) return@Canvas
            if (!escondido && !apoyado) {
                clipRect(bottom = bordeDelPanel) {
                    rotate(giroCuy, pivot = apoyoCuy) {
                        drawImage(arte, srcOffset = origen, srcSize = IntSize(celda, celda), dstOffset = esquinaCuy,
                            dstSize = IntSize(tamanoCuy, tamanoCuy), filterQuality = FilterQuality.High)
                    }
                }
            }
            clipRect(bottom = bordeDelPanel) {
                drawImage(arbusto, dstOffset = esquinaHojas, dstSize = IntSize(lado, altoHojas), filterQuality = FilterQuality.High)
            }
            if (!escondido && apoyado) {
                val cabeceo = if (movimiento == MovimientoIngreso.TECLEAR) 0.02f * arco else 0f
                scale(1f, 1f - cabeceo, pivot = apoyoCuy) {
                    drawImage(arte, srcOffset = origen, srcSize = IntSize(celda, celda), dstOffset = esquinaCuy,
                        dstSize = IntSize(tamanoCuy, tamanoCuy), filterQuality = FilterQuality.High)
                }
            }
            if (!quieto && (escondido || apareciendo || cosquillas)) {
                dibujarHojasAlViento(ramas, lado.toFloat(), fraccion, brote = !escondido)
            }
        }
    }
}
