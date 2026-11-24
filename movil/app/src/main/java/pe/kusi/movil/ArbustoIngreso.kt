package pe.kusi.movil

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

private data class Rama(val cuadro: Int, val raiz: Offset, val escala: Float, val giro: Float, val desfase: Float)

private val Ramas = listOf(
    Rama(0, Offset(0.29f, 0.82f), 0.30f, -18f, 0.10f),
    Rama(1, Offset(0.50f, 0.79f), 0.27f, -5f, 0.27f),
    Rama(2, Offset(0.71f, 0.81f), 0.28f, 18f, 0.42f),
)

private data class HojaAlViento(val inicio: Float, val origen: Float, val lado: Float, val altura: Float, val tamano: Float)

private val HojasAlSalir = listOf(
    HojaAlViento(0.03f, 0.43f, -0.30f, 0.24f, 0.135f),
    HojaAlViento(0.07f, 0.60f, 0.32f, 0.29f, 0.16f),
    HojaAlViento(0.15f, 0.50f, 0.14f, 0.40f, 0.115f),
    HojaAlViento(0.19f, 0.36f, -0.23f, 0.15f, 0.14f),
    HojaAlViento(0.26f, 0.66f, 0.25f, 0.18f, 0.11f),
)

internal fun DrawScope.dibujarRamasIngreso(
    arte: ImageBitmap,
    lado: Float,
    fase: Float,
    fuerza: Float,
    siluetas: List<SiluetaKusi>,
    visible: Boolean,
) {
    val celda = arte.width / 2
    for ((indice, rama) in Ramas.withIndex()) {
        val vaiven = sin((fase - rama.desfase) * 4 * PI).toFloat()
        val raiz = rama.raiz * lado
        val tamano = (lado * rama.escala).roundToInt().toFloat()
        val giro = rama.giro + 22f * vaiven * fuerza
        val radianes = giro * PI.toFloat() / 180f
        val apoyo = (ApoyoCuadroKusi.y - 0.87f) * tamano
        siluetas[indice].actualizar(arte, IntOffset(rama.cuadro % 2 * celda, rama.cuadro / 2 * celda),
            IntSize(celda, celda), raiz + Offset(-sin(radianes), cos(radianes)) * apoyo,
            Size(tamano, tamano), radianes)
        if (visible) rotate(giro, pivot = raiz) {
            dibujarHojaIngreso(arte, rama.cuadro, raiz - Offset(tamano * 0.5f, tamano * 0.87f), tamano)
        }
    }
}

internal fun DrawScope.dibujarHojasAlViento(arte: ImageBitmap, lado: Float, fase: Float, brote: Boolean) {
    for ((indice, hoja) in HojasAlSalir.withIndex()) {
        if (!brote && indice >= 2) break
        val inicio = if (brote) hoja.inicio else 0.22f + hoja.inicio * 3.5f
        val tiempo = (fase - inicio) / if (brote) 0.70f else 0.53f
        if (tiempo <= 0f || tiempo >= 1f) continue
        val alcance = if (brote) 1f else 0.55f
        val centro = Offset(
            (hoja.origen + hoja.lado * tiempo * alcance) * lado,
            (0.73f - 4f * hoja.altura * alcance * tiempo * (1f - tiempo) + tiempo * 0.07f) * lado,
        )
        val tamano = hoja.tamano * lado
        val giro = hoja.lado * (110f + 320f * tiempo) + sin(tiempo * 8f).toFloat() * 26f
        val alpha = (tiempo * 8f).coerceAtMost(1f) * ((1f - tiempo) * 4f).coerceAtMost(1f)
        rotate(giro, pivot = centro) {
            dibujarHojaIngreso(arte, 3, centro - Offset(tamano, tamano) / 2f, tamano, alpha)
        }
    }
}

internal fun DrawScope.dibujarHojaIngreso(arte: ImageBitmap, cuadro: Int, esquina: Offset, tamano: Float, alpha: Float = 1f) {
    val celda = arte.width / 2
    val lado = tamano.roundToInt().coerceAtLeast(1)
    drawImage(
        arte,
        srcOffset = IntOffset(cuadro % 2 * celda, cuadro / 2 * celda),
        srcSize = IntSize(celda, celda),
        dstOffset = IntOffset(esquina.x.roundToInt(), esquina.y.roundToInt()),
        dstSize = IntSize(lado, lado),
        alpha = alpha,
        filterQuality = FilterQuality.High,
    )
}
