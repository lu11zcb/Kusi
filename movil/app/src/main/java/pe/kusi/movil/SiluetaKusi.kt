package pe.kusi.movil

import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.waitForUpOrCancellation
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import kotlin.math.cos
import kotlin.math.sin

/** Guarda la transformación del cuadro visible para probar el alfa al tocarlo. */
internal class SiluetaKusi {
    private var arte: ImageBitmap? = null
    private var origen = IntOffset.Zero
    private var fuente = IntSize(LADO_FUENTE, LADO_FUENTE)
    private var apoyo = Offset.Zero
    private var tamano = Size.Zero
    private var coseno = 1f
    private var seno = 0f
    private var espejo = 1f
    private val pixel = IntArray(1)

    fun actualizar(
        arte: ImageBitmap,
        fotograma: FotogramaKusi,
        apoyo: Offset,
        tamano: Size,
        giro: Float,
        reflejado: Boolean = false,
    ) = actualizar(arte, fotograma.origen, IntSize(LADO_FUENTE, LADO_FUENTE), apoyo, tamano, giro, reflejado)

    fun actualizar(
        arte: ImageBitmap,
        origen: IntOffset,
        fuente: IntSize,
        apoyo: Offset,
        tamano: Size,
        giro: Float,
        reflejado: Boolean = false,
    ) {
        this.arte = arte
        this.origen = origen
        this.fuente = fuente
        this.apoyo = apoyo
        this.tamano = tamano
        coseno = cos(giro)
        seno = sin(giro)
        espejo = if (reflejado) -1f else 1f
    }

    fun contiene(posicion: Offset): Boolean {
        val imagen = arte ?: return false
        if (tamano.width <= 0f || tamano.height <= 0f) return false

        val desdeApoyo = posicion - apoyo
        val x = ApoyoCuadroKusi.x +
            espejo * (coseno * desdeApoyo.x + seno * desdeApoyo.y) / tamano.width
        val y = ApoyoCuadroKusi.y +
            (coseno * desdeApoyo.y - seno * desdeApoyo.x) / tamano.height
        if (x < 0f || x >= 1f || y < 0f || y >= 1f) return false

        imagen.readPixels(pixel, origen.x + (x * fuente.width).toInt(), origen.y + (y * fuente.height).toInt(), 1, 1)
        return (pixel[0] ushr 24) >= 96
    }
}

@Composable
internal fun Modifier.tocarSiluetaKusi(
    silueta: SiluetaKusi,
    descripcion: String,
    etiqueta: String,
    habilitado: Boolean = true,
    otrasSiluetas: List<SiluetaKusi> = emptyList(),
    alTocar: (Offset?) -> Unit,
): Modifier {
    val tocar by rememberUpdatedState(alTocar)
    return semantics {
        role = Role.Button
        contentDescription = descripcion
        if (habilitado) onClick(etiqueta) {
            tocar(null)
            true
        } else disabled()
    }.onKeyEvent { evento ->
        val activa = evento.key == Key.Enter || evento.key == Key.NumPadEnter ||
            evento.key == Key.DirectionCenter || evento.key == Key.Spacebar
        if (habilitado && activa && evento.type == KeyEventType.KeyUp) {
            tocar(null)
            true
        } else false
    }.focusable(enabled = habilitado)
        .pointerInput(silueta, otrasSiluetas, habilitado) {
            if (!habilitado) return@pointerInput
            awaitEachGesture {
                val inicio = awaitFirstDown()
                if (!silueta.contiene(inicio.position) && otrasSiluetas.none { it.contiene(inicio.position) }) return@awaitEachGesture
                inicio.consume()
                val fin = waitForUpOrCancellation() ?: return@awaitEachGesture
                if ((fin.position - inicio.position).getDistance() <= viewConfiguration.touchSlop) {
                    fin.consume()
                    tocar(inicio.position)
                }
            }
        }
}
