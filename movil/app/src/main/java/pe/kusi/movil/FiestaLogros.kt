package pe.kusi.movil

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

@Composable
internal fun Modifier.toqueLogros(quieto: Boolean, etiqueta: String, pulsar: () -> Unit): Modifier {
    val fuente = remember { MutableInteractionSource() }
    val pulsado by fuente.collectIsPressedAsState()
    val escala by animateFloatAsState(
        if (pulsado && !quieto) .96f else 1f,
        if (quieto) snap() else tween(140, easing = SalidaPlaza), label = "Presión",
    )
    return this.clickable(fuente, ripple(), role = Role.Button, onClickLabel = etiqueta, onClick = pulsar)
        .graphicsLayer { scaleX = escala; scaleY = escala }
}

@Composable
internal fun PortadaFiesta(
    resumen: ResumenLogrosInfantil?,
    altura: Dp,
    apariencia: AparienciaCuy,
    quieto: Boolean,
    celebrar: () -> Unit,
    verAvance: (() -> Unit)?,
) {
    val forma = RoundedCornerShape(26.dp)
    val pulso = remember { mutableIntStateOf(0) }
    val fase = faseDeFiesta(pulso.intValue, quieto)
    val reloj = relojDeFiesta(quieto, "Escenario")
    val saludando = saludoDeCuy(fase, reloj)
    BoxWithConstraints(
        Modifier.fillMaxWidth().height(altura).clip(forma)
            .background(Color(0xFFFFEACB)).border(1.dp, Color(0xFFE1BB81), forma),
    ) {
        val amplia = altura >= 200.dp && maxWidth >= 360.dp && LocalDensity.current.fontScale <= 1.3f
        val lado = minOf(maxWidth * .55f, altura - 5.dp, 265.dp)
        val margen = if (amplia) 20.dp else 7.dp
        FondoDelPremio(Modifier.matchParentSize(), lado, margen, reloj)
        Box(
            Modifier.align(Alignment.BottomEnd).padding(end = margen, bottom = 4.dp).size(lado)
                .clip(RoundedCornerShape(24.dp)).toqueLogros(quieto, "Jugar con mi cuy") {
                    pulso.intValue++
                    celebrar()
                },
            contentAlignment = Alignment.BottomCenter,
        ) {
            Canvas(Modifier.fillMaxSize()) {
                val vuelo = arcoDelCuy(fase.value)
                val reposo = size.width * (.43f - .12f * vuelo)
                drawOval(
                    Color(0xFF45302C).copy(alpha = .24f - .10f * vuelo),
                    topLeft = Offset((size.width - reposo) / 2, size.height * .907f),
                    size = Size(reposo, size.height * .053f),
                )
            }
            CuerpoMiCuy(
                apariencia,
                Modifier.fillMaxSize().graphicsLayer {
                    val p = fase.value
                    val vuelo = arcoDelCuy(p)
                    val flexion = if (p < .19f) oscilacionLogros(p / .19f) else if (p in 0.80f..0.97f) {
                        oscilacionLogros((p - .80f) / .17f) * .8f
                    } else 0f
                    val ciclo = reloj?.value ?: 0f
                    val respiro = oscilacionLogros(ciclo)
                    translationY = -(lado * (.17f * vuelo + .032f * respiro)).toPx()
                    rotationZ = sin(2 * PI * ciclo).toFloat() * 3.5f - 8f * vuelo + flexion * 4f
                    scaleX = 1f + flexion * .11f - vuelo * .06f
                    scaleY = 1f - flexion * .13f + vuelo * .09f
                    transformOrigin = TransformOrigin(.5f, .92f)
                },
                saludando = saludando.value,
            )
        }
        val centroCuy = 1f - ((margen + lado / 2f) / maxWidth)
        EstallidoLogros(fase, Modifier.matchParentSize(), origenX = centroCuy, origenY = .61f)
        if (resumen != null) {
            val texto = resumen.puntos.toString()
            val tamano = when {
                texto.length <= 3 && amplia -> 76.sp
                texto.length <= 3 -> 52.sp
                amplia -> 46.sp
                else -> 33.sp
            }
            val base = Modifier.align(Alignment.CenterStart).fillMaxWidth(.46f)
            val accion = if (verAvance != null) {
                base.clip(RoundedCornerShape(22.dp)).toqueLogros(quieto, "Ver mi avance", verAvance)
            } else base
            Column(
                accion.padding(start = if (amplia) 24.dp else 17.dp, top = 6.dp, bottom = 6.dp)
                    .semantics(mergeDescendants = true) {},
                horizontalAlignment = Alignment.Start,
            ) {
                Text(
                    texto, color = Color(0xFF442638),
                    style = MaterialTheme.typography.displayLarge.copy(fontSize = tamano, lineHeight = tamano),
                )
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    IconoKusi(R.drawable.ic_kusi_sparkle, modifier = Modifier.size(20.dp), color = Color(0xFF80430D))
                    Text(
                        if (resumen.puntos == 1L) "punto" else "puntos",
                        color = Color(0xFF442638), style = MaterialTheme.typography.titleMedium,
                    )
                }
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    Image(painterResource(R.drawable.kusi_libro_aventura), null, Modifier.size(20.dp))
                    Text(
                        if (resumen.retos == 1L) "1 reto" else "${resumen.retos} retos",
                        color = Color(0xFF442638), style = MaterialTheme.typography.titleSmall,
                    )
                }
            }
        }
    }
}

private fun arcoDelCuy(fase: Float): Float =
    sin(PI * ((fase - .16f) / .67f).coerceIn(0f, 1f)).toFloat()

@Composable
internal fun saludoDeCuy(fase: State<Float>, reloj: State<Float>?, retraso: Float = 0f): State<Boolean> =
    remember(fase, reloj, retraso) {
        derivedStateOf {
            val p = fase.value
            if (p < 1f) {
                p in 0.21f..0.43f || p in 0.50f..0.77f
            } else if (reloj != null) {
                val ciclo = (reloj.value + retraso) % 1f
                ciclo in 0.48f..0.54f || ciclo in 0.60f..0.69f
            } else false
        }
    }

@Composable
private fun FondoDelPremio(modifier: Modifier, lado: Dp, margen: Dp, reloj: State<Float>?) {
    Canvas(modifier) {
        val w = size.width
        val h = size.height
        val x = w - margen.toPx() - lado.toPx() / 2f
        val piso = h - 4.dp.toPx() - lado.toPx() * .09f
        val ancho = minOf(w * .36f, lado.toPx() * .72f)
        val arco = Path().apply {
            moveTo(w * .44f, h)
            lineTo(w * .44f, h * .51f)
            cubicTo(w * .44f, -h * .11f, w * .98f, -h * .11f, w * .98f, h * .51f)
            lineTo(w * .98f, h)
            close()
        }
        drawRect(Brush.horizontalGradient(listOf(Color(0xFFFFF3D8), Color(0xFFFFD6AA))))
        drawPath(arco, Brush.verticalGradient(listOf(Color(0xFF795399), Color(0xFFB37AA2), Color(0xFFEBA791))))
        drawPath(arco, Color(0xFFF9D59C), style = Stroke(2.dp.toPx()))

        val ciclo = reloj?.value ?: 0f
        val guirnalda = Path().apply {
            moveTo(w * .47f, h * .10f)
            quadraticTo(w * .72f, h * .28f, w * .97f, h * .10f)
        }
        drawPath(guirnalda, Color(0xFFFFE7BD), style = Stroke(1.5.dp.toPx(), cap = StrokeCap.Round))
        for (i in 0..4) {
            val t = (i + 1f) / 6f
            val centro = Offset(w * (.47f + .5f * t), h * (.10f + .36f * t * (1f - t)))
            val vuelo = (oscilacionLogros(ciclo + t) - .5f) * 3.dp.toPx()
            val ladoBandera = minOf(8.dp.toPx(), w * .021f)
            val bandera = Path().apply {
                moveTo(centro.x - ladoBandera, centro.y)
                lineTo(centro.x + ladoBandera, centro.y)
                lineTo(centro.x + vuelo, centro.y + ladoBandera * 1.62f)
                close()
            }
            drawPath(bandera, PapelPicado[(i + 1) % PapelPicado.size])
        }
        val escalon = minOf(13.dp.toPx(), h * .09f)
        drawRoundRect(
            Color(0xFF9F554C), Offset(x - ancho, piso), Size(ancho * 2, escalon * 2),
            CornerRadius(escalon),
        )
        drawRoundRect(
            Color(0xFFD98B68), Offset(x - ancho, piso - escalon * .37f),
            Size(ancho * 2, escalon * 1.43f), CornerRadius(escalon),
        )
        drawOval(
            Color(0xFFF9C78A), Offset(x - ancho, piso - escalon * .74f),
            Size(ancho * 2, escalon * 1.22f),
        )
        val luz = oscilacionLogros(ciclo)
        destelloLogros(Offset(w * .54f, h * .43f), 8.dp.toPx(), Color(0xFFFFF6D5).copy(alpha = .54f + .43f * luz))
        destelloLogros(Offset(w * .91f, h * .46f), 9.dp.toPx(), Color(0xFFFFD978).copy(alpha = .96f - .35f * luz))
        destelloLogros(Offset(w * .90f, h * .66f), 4.dp.toPx(), Color(0xFFFFF6D5).copy(alpha = .47f + .43f * luz))
    }
}

@Composable
internal fun relojDeFiesta(quieto: Boolean, etiqueta: String, duracion: Int = 3500): State<Float>? {
    if (quieto) return null
    return rememberInfiniteTransition(label = etiqueta).animateFloat(
        0f, 1f, infiniteRepeatable(tween(duracion, easing = LinearEasing)), label = "Ciclo",
    )
}

internal fun oscilacionLogros(ciclo: Float) = (1f - cos(2f * PI * ciclo).toFloat()) / 2f

@Composable
internal fun entradaDeLogros(quieto: Boolean, espera: Int = 0): State<Float> {
    val fase = remember { Animatable(if (quieto) 1f else 0f) }
    LaunchedEffect(quieto, espera) {
        if (quieto) fase.snapTo(1f)
        else fase.animateTo(1f, tween(420, delayMillis = espera, easing = SalidaPlaza))
    }
    return fase.asState()
}

@Composable
internal fun faseDeFiesta(pulso: Int, quieto: Boolean, duracion: Int = 620): State<Float> {
    val fase = remember { Animatable(1f) }
    LaunchedEffect(pulso, quieto, duracion) {
        if (pulso == 0 || quieto) {
            fase.snapTo(1f)
        } else {
            fase.snapTo(0f)
            fase.animateTo(1f, tween(duracion, easing = LinearEasing))
        }
    }
    return fase.asState()
}

private val PapelPicado = listOf(Color(0xFFFFDF75), Color(0xFFFF9A83), Color(0xFFA6E1AF), Color(0xFFE0C9FF), Color(0xFFFFF6DA))

@Composable
internal fun EstallidoLogros(fase: State<Float>, modifier: Modifier, origenX: Float = .5f, origenY: Float = .58f) {
    Canvas(modifier) {
        val progreso = fase.value
        if (progreso >= 1f) return@Canvas
        val radio = size.minDimension * .58f * SalidaPlaza.transform(progreso)
        val opacidad = minOf(progreso / .11f, (1f - progreso) / .40f, 1f)
        val origen = Offset(size.width * origenX, size.height * origenY)
        for (i in 0 until 18) {
            val angulo = (PI * 2 * i / 18 - .28)
            val radioPieza = radio * (.70f + .13f * (i % 3))
            val punto = origen + Offset(
                cos(angulo).toFloat() * radioPieza,
                sin(angulo).toFloat() * radioPieza - size.height * .16f * progreso,
            )
            val color = PapelPicado[i % PapelPicado.size].copy(alpha = opacidad)
            val lado = (if (i % 3 == 0) 8.dp else 4.dp).toPx()
            if (i % 3 == 0) {
                destelloLogros(punto, lado, color)
            } else {
                rotate(23f * i + 160f * progreso, punto) {
                    drawRect(color, punto - Offset(lado / 2f, lado), Size(lado, lado * 2f))
                }
            }
        }
    }
}
