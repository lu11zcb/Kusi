package pe.kusi.movil

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.sin

private val AlaDorada = Color(0xFFFFD878)
private val AlaRosada = Color(0xFFFFC2AA)
private val BordeAla = Color(0xB699642C)
private val BrilloPolen = Color(0xFFFFF3B9)
private val Petalo = Color(0xFFFFB981)
private val NubeSol = Color(0xFFFFF8EA)
private val BordeNube = Color(0xFFE9D5AF)
private val SiluetaNube = Path().apply {
    moveTo(-34f, 6f)
    cubicTo(-34f, 0f, -25f, -4.1f, -17f, -3f)
    cubicTo(-12f, -16f, 9f, -16f, 15f, -6f)
    cubicTo(24f, -10f, 40f, -2f, 38f, 5f)
    cubicTo(37f, 9f, 28f, 10f, 16f, 10f)
    lineTo(-21f, 10f)
    quadraticTo(-33f, 10f, -34f, 6f)
    close()
}

@Composable
internal fun AmbienteBienvenida(modifier: Modifier) {
    val contexto = LocalContext.current
    if (remember(contexto) { animacionesDesactivadas(contexto) }) return

    val bucle = rememberInfiniteTransition(label = "brisa-en-el-valle")
    val izquierda = bucle.animateFloat(0f, 1f, infiniteRepeatable(tween(5120, easing = LinearEasing)), label = "vuelo-izquierdo")
    val derecha = bucle.animateFloat(0f, 1f, infiniteRepeatable(tween(6760, easing = LinearEasing)), label = "vuelo-derecho")
    val viento = bucle.animateFloat(0f, 1f, infiniteRepeatable(tween(7100, easing = LinearEasing)), label = "polen")
    val nubes = bucle.animateFloat(0f, 1f, infiniteRepeatable(tween(13900, easing = LinearEasing)), label = "nubes")
    Canvas(modifier) {
        val brisa = nubes.value * 2f * PI.toFloat()
        nube(Offset(size.width * (0.17f + 0.08f * sin(brisa)), size.height * 0.226f), 0.92f, 0.88f)
        nube(Offset(size.width * (0.76f + 0.07f * sin(brisa + 2.6f)), size.height * 0.173f), 0.72f, 0.75f)
        // Los vuelos se quedan cerca de los bordes. El salto de Kusi sigue siendo lo primero que se ve.
        mariposa(izquierda.value, Offset(size.width * 0.15f, size.height * 0.47f), 21.dp.toPx(), AlaDorada, -11f)
        mariposa(derecha.value + 0.24f, Offset(size.width * 0.86f, size.height * 0.39f), 17.dp.toPx(), AlaRosada, 15f)
        for (i in 0..4) {
            val fase = (viento.value + i * 0.22f) % 1f
            val centro = if (i % 2 == 0) 0.12f + i * 0.035f else 0.87f - i * 0.025f
            val x = size.width * (centro + 0.037f * sin(fase * 2f * PI.toFloat()))
            val y = size.height * (0.71f - (0.13f + i * 0.03f) * fase)
            val alfa = 0.72f * sin(fase * PI.toFloat())
            drawCircle(if (i % 2 == 0) BrilloPolen else Petalo, (2.1f + i * 0.18f).dp.toPx(), Offset(x, y), alpha = alfa)
        }
    }
}

private fun DrawScope.nube(posicion: Offset, proporcion: Float, alfa: Float) {
    val tamano = 1.dp.toPx() * proporcion
    translate(posicion.x, posicion.y) {
        scale(tamano, tamano, pivot = Offset.Zero) {
            drawPath(SiluetaNube, BordeNube, alpha = alfa * 0.6f, style = Stroke(1.6f))
            drawPath(SiluetaNube, NubeSol, alpha = alfa)
        }
    }
}

private fun DrawScope.mariposa(tiempo: Float, origen: Offset, tamano: Float, color: Color, giro: Float) {
    val fase = tiempo * 2f * PI.toFloat()
    val x = origen.x + 28.dp.toPx() * sin(fase)
    val y = origen.y + 12.dp.toPx() * sin(2f * fase + 0.8f)
    val aleteo = 0.64f + 0.36f * sin(13f * fase).let { it * it }
    translate(x, y) {
        rotate(giro + 15f * sin(fase), pivot = Offset.Zero) {
            scale(tamano / 20f, tamano / 20f, pivot = Offset.Zero) {
                val ala = Path().apply {
                    moveTo(0f, 1f)
                    cubicTo(1f, -11f, 11f, -11f, 10f, -4f)
                    cubicTo(10f, 0f, 7f, 2f, 5f, 2f)
                    cubicTo(10f, 6f, 3f, 10f, 0f, 2f)
                    close()
                }
                for (lado in listOf(-1f, 1f)) scale(lado * aleteo, 1f, pivot = Offset.Zero) {
                    drawPath(ala, color, alpha = 0.92f)
                    drawCircle(BordeAla, 1.15f, Offset(6f, -4f), alpha = 0.67f)
                }
                drawLine(BordeAla, Offset(0f, -4f), Offset(0f, 5f), 1.4f, StrokeCap.Round)
            }
        }
    }
}
