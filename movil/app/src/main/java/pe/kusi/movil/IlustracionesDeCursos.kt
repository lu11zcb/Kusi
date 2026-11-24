package pe.kusi.movil

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.floor
import kotlin.math.sin

private val Tintas = listOf(Color(0xFFA64A83), Color(0xFFE3A240), Color(0xFF497F75))
private val Cuentas = listOf(Color(0xFFE76652), Color(0xFF2AA3A0), Color(0xFFD98321))

@Composable
internal fun IlustracionAnimadaDelCurso(
    curso: Curso,
    reloj: State<Float>?,
    modifier: Modifier,
    accion: State<Float>? = null,
) {
    when (curso) {
        Curso.COMUNICACION -> LibroDelCurso(reloj, accion, modifier)
        else -> Box(modifier, contentAlignment = Alignment.Center) {
            val proporcion = when (curso) {
                Curso.PERSONAL_SOCIAL -> .98f
                Curso.MATEMATICA, Curso.INGLES -> .90f
                else -> .82f
            }
            Image(
                painterResource(curso.dibujoEnCursos), null,
                Modifier.fillMaxSize(proporcion).graphicsLayer {
                    val pulso = pasoDelMaterial(reloj?.value, accion?.value)
                    translationY = -size.height * .08f * pulso
                    rotationZ = when (curso) {
                        Curso.CIENCIA -> 0f
                        Curso.PERSONAL_SOCIAL -> 3f * pulso
                        Curso.MATEMATICA -> -3f * pulso
                        Curso.INGLES -> 8f * pulso
                        else -> -7f * pulso
                    }
                    scaleX = 1f + .045f * pulso
                    scaleY = scaleX
                },
            )
            RasgosDelCurso(curso, reloj, accion, Modifier.matchParentSize())
        }
    }
}

@Composable
private fun LibroDelCurso(reloj: State<Float>?, accion: State<Float>?, modifier: Modifier) {
    val abierto by remember(reloj, accion) {
        derivedStateOf {
            val toque = accion?.value ?: 1f
            if (toque < 1f) toque >= .21f else reloj == null || reloj.value >= .15f
        }
    }
    Box(modifier, contentAlignment = Alignment.Center) {
        Image(
            painterResource(if (abierto) R.drawable.kusi_jardin_libro_abierto else R.drawable.kusi_jardin_libro_cerrado),
            null,
            Modifier.fillMaxSize().graphicsLayer {
                translationY = -size.height * .09f
                rotationZ = -5f * pasoDelMaterial(reloj?.value, accion?.value)
            },
        )
        if (abierto && (reloj != null || accion != null)) Canvas(Modifier.matchParentSize()) {
            val toque = accion?.value ?: 1f
            val pagina = if (toque < 1f) ((toque - .25f) / .62f).coerceIn(0f, 1f) else {
                ((reloj?.value ?: 1f) - .42f).div(.14f).coerceIn(0f, 1f)
            }
            if (pagina in 0.01f..0.99f) {
                val w = size.width
                val h = size.height
                val lado = w * (.72f - .44f * pagina)
                val hoja = Path().apply {
                    moveTo(w * .51f, h * .43f)
                    quadraticTo(lado, h * .18f, lado, h * .36f)
                    lineTo(lado, h * .57f)
                    quadraticTo(w * .48f, h * .54f, w * .51f, h * .76f)
                    close()
                }
                drawPath(hoja, Brush.horizontalGradient(listOf(Color(0xFFFFDC91), Color(0xFFFFFADE))))
                drawPath(hoja, Color(0xFFC88948), style = Stroke(1.dp.toPx()))
            }
        }
    }
}

@Composable
private fun RasgosDelCurso(curso: Curso, reloj: State<Float>?, accion: State<Float>?, modifier: Modifier) {
    Canvas(modifier) {
        val ciclo = reloj?.value ?: 0f
        val toque = accion?.value ?: 1f
        for (indice in 0..2) {
            val paso = if (toque < 1f) ((toque - indice * .11f) / .78f).coerceIn(0f, 1f) else {
                (ciclo + indice * .27f) % 1f
            }
            val cuadro = floor(paso * 10f) / 10f
            val pulso = if (reloj == null && toque == 1f) .6f else sin(PI * paso).toFloat().coerceAtLeast(0f)
            val centro = Offset(
                size.width * (if (indice == 1) .87f else .11f + indice * .10f),
                size.height * (.56f - .30f * cuadro - indice * .10f),
            )
            when (curso) {
                Curso.MATEMATICA -> {
                    val cuenta = Offset(size.width * (.86f + indice * .04f), size.height * (.69f - cuadro * .35f - indice * .14f))
                    val radio = (3f + pulso * 2.5f).dp.toPx()
                    drawCircle(Cuentas[indice].copy(alpha = .95f * pulso), radio, cuenta)
                    drawCircle(Color(0xFFFFEBC6).copy(alpha = pulso), radio * .30f, cuenta - Offset(radio * .25f, radio * .27f))
                }
                Curso.INGLES -> {
                    val radio = (5f + indice * 4f).dp.toPx()
                    drawArc(
                        Color(0xFF278475).copy(alpha = pulso * .82f), -50f, 83f, false,
                        topLeft = Offset(size.width * .80f - radio, size.height * .27f - radio),
                        size = Size(radio * 2, radio * 2), style = Stroke(1.7.dp.toPx()),
                    )
                }
                Curso.PERSONAL_SOCIAL -> {
                    val radio = (5f + pulso * 2f).dp.toPx()
                    val x = if (indice == 1) size.width * .86f else size.width * .13f
                    val y = size.height * (.49f - .15f * indice - .20f * cuadro)
                    val corazon = Path().apply {
                        moveTo(x, y + radio)
                        cubicTo(x - radio * 2, y - radio * .5f, x - radio * .5f, y - radio * 1.3f, x, y - radio * .45f)
                        cubicTo(x + radio * .5f, y - radio * 1.3f, x + radio * 2, y - radio * .5f, x, y + radio)
                        close()
                    }
                    drawPath(corazon, Color(0xFFE97371).copy(alpha = .79f * pulso))
                }
                Curso.CIENCIA -> {
                    val radio = (3f + indice).dp.toPx() * (.65f + .35f * pulso)
                    drawCircle(Color(0xFF6BC3C1).copy(alpha = .30f * pulso), radio, centro)
                    drawCircle(Color(0xFF338C90).copy(alpha = .78f * pulso), radio, centro, style = Stroke(1.2.dp.toPx()))
                    drawCircle(Color.White.copy(alpha = .9f * pulso), radio * .25f, centro - Offset(radio * .25f, radio * .3f))
                }
                Curso.ARTE -> {
                    val gota = Size((3f + pulso * 2f).dp.toPx(), (5f + pulso * 3f).dp.toPx())
                    rotate(35f * indice + paso * 90f, centro) {
                        drawOval(Tintas[indice].copy(alpha = .85f * pulso), centro, gota)
                    }
                }
                else -> destelloLogros(
                    centro, (3.5f + pulso * 2f).dp.toPx(),
                    curso.acento.copy(alpha = .68f * pulso),
                )
            }
        }
    }
}

@Composable
internal fun MochilaDeCursos(reloj: State<Float>?, modifier: Modifier = Modifier) {
    Box(modifier, contentAlignment = Alignment.BottomCenter) {
        Canvas(Modifier.matchParentSize()) {
            val paso = pasoDelMaterial(reloj?.value, null)
            destelloLogros(Offset(size.width * .86f, size.height * .29f), (6f + 3f * paso).dp.toPx(), Color(0xFFFFD578))
            destelloLogros(Offset(size.width * .16f, size.height * .65f), 6.dp.toPx(), Color(0xFFFFF0BF))
            val ciclo = reloj?.value
            if (ciclo != null) {
                for (i in 0..3) {
                    val p = (ciclo + i * .19f) % 1f
                    val brillo = sin(PI * p).toFloat().coerceAtLeast(0f)
                    val centro = Offset(
                        size.width * (.39f + i * .11f + (i - 1.5f) * .07f * p),
                        size.height * (.64f - .50f * p),
                    )
                    val color = if (i % 2 == 0) Color(0xFFFFDB81) else Color(0xFF9EE4BB)
                    destelloLogros(centro, (4f + brillo * 3f).dp.toPx(), color.copy(alpha = brillo * .79f))
                }
            }
        }
        Box(
            Modifier.align(Alignment.TopStart).padding(start = 9.dp, top = 13.dp)
                .size(37.dp).graphicsLayer {
                    val pulso = pasoDelMaterial(reloj?.value, null, .16f)
                    translationY = -11.dp.toPx() * pulso
                    rotationZ = -14f + 12f * pulso
                },
            contentAlignment = Alignment.Center,
        ) {
            Image(painterResource(R.drawable.kusi_bloque_dorado), null, Modifier.fillMaxSize())
            Text("3", Modifier.clearAndSetSemantics {}, color = Color(0xFF60412B), style = MaterialTheme.typography.titleSmall)
        }
        Image(
            painterResource(R.drawable.kusi_curso_ciencia), null,
            Modifier.align(Alignment.TopEnd).padding(end = 12.dp, top = 6.dp)
                .size(48.dp).graphicsLayer {
                    val pulso = pasoDelMaterial(reloj?.value, null, .31f)
                    translationY = -9.dp.toPx() * pulso
                    rotationZ = 14f + 8f * pulso
                },
        )
        Image(
            painterResource(R.drawable.kusi_mochila_aventura), null,
            Modifier.fillMaxHeight(.89f).fillMaxWidth(.68f).graphicsLayer {
                val pulso = pasoDelMaterial(reloj?.value, null)
                translationY = -4.dp.toPx() * pulso
                rotationZ = -4f + 5f * pulso
            },
        )
    }
}

private fun pasoDelMaterial(ciclo: Float?, accion: Float?, desfase: Float = 0f): Float {
    if (accion != null && accion < 1f) {
        val avance = ((accion - desfase) / (1f - desfase)).coerceIn(0f, 1f)
        return sin(PI * avance).toFloat().coerceAtLeast(0f)
    }
    if (ciclo == null) return 0f
    val avance = (((ciclo + 1f - desfase) % 1f) / .44f).coerceIn(0f, 1f)
    return sin(PI * avance).toFloat().coerceAtLeast(0f)
}
