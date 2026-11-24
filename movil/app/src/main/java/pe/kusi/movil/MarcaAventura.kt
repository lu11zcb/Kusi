package pe.kusi.movil

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin

internal val PapelAventura = Color(0xFFFFF9EE)
private val TintaAventura = Color(0xFF55291D)
private val TintasCarga = listOf(Color(0xFFBD5B30), Color(0xFF9D4F86), Color(0xFF378557))

@Composable
internal fun EmblemaKusi(modifier: Modifier) {
    Image(painterResource(R.drawable.kusi_emblema), contentDescription = null, modifier = modifier)
}

@Composable
internal fun PalabraKusi(modifier: Modifier = Modifier) {
    val contexto = LocalContext.current
    val quieto = remember(contexto) { animacionesDesactivadas(contexto) }
    val llegada = remember { Animatable(if (quieto) 0f else -1f) }
    val destello = if (quieto) null else rememberInfiniteTransition(label = "pluma-de-kusi").animateFloat(
        0f, 1f, infiniteRepeatable(tween(3900, easing = LinearEasing)), label = "destello-del-logo",
    )
    LaunchedEffect(quieto) {
        if (!quieto) {
            llegada.animateTo(0.20f, tween(365, easing = FastOutSlowInEasing))
            llegada.animateTo(0f, tween(240, easing = FastOutSlowInEasing))
        }
    }
    Box(modifier.size(188.dp, 82.dp).graphicsLayer {
        val impulso = llegada.value
        val aire = sin((destello?.value ?: 0f) * 2f * PI.toFloat())
        translationY = -8.dp.toPx() * impulso - 2.5.dp.toPx() * aire
        rotationZ = 5f * impulso + 2.6f * aire
        scaleX = 1f + 0.08f * impulso + 0.014f * aire
        scaleY = scaleX
    }) {
        Image(painterResource(R.drawable.kusi_logo_aventura), contentDescription = "Kusi",
            modifier = Modifier.matchParentSize(), contentScale = ContentScale.Fit)
        if (destello != null) Canvas(Modifier.matchParentSize()) {
            val pulso = sin(PI.toFloat() * ((destello.value - 0.42f) / 0.21f).coerceIn(0f, 1f))
            val pluma = Offset(size.width * 0.880f, size.height * 0.218f - 3.dp.toPx() * pulso)
            val tamano = (2.6f + 2.2f * pulso).dp.toPx()
            drawLine(Color(0xFFFFC745), pluma - Offset(tamano, 0f), pluma + Offset(tamano, 0f),
                1.75.dp.toPx(), StrokeCap.Round, alpha = pulso.coerceAtLeast(0f))
            drawLine(Color(0xFFFFC745), pluma - Offset(0f, tamano), pluma + Offset(0f, tamano),
                1.75.dp.toPx(), StrokeCap.Round, alpha = pulso.coerceAtLeast(0f))
        }
    }
}

@Composable
internal fun PaisajeKusi(modifier: Modifier, velo: Float = 0f, papel: Color = PapelAventura) {
    Box(modifier) {
        Image(painterResource(R.drawable.kusi_valle_aventura), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop)
        Spacer(Modifier.matchParentSize().background(Brush.verticalGradient(
            0f to papel,
            0.14f to papel.copy(alpha = maxOf(0.73f, velo)),
            0.31f to papel.copy(alpha = velo),
            0.63f to papel.copy(alpha = velo),
            0.81f to papel.copy(alpha = maxOf(velo, 0.52f)),
            0.93f to papel.copy(alpha = maxOf(velo, 0.91f)),
            1f to papel,
        )))
    }
}

@Composable
internal fun ArranqueInfantil() {
    val fondoCarga = colorResource(R.color.kusi_fondo_carga)
    BoxWithConstraints(Modifier.fillMaxSize().background(fondoCarga), contentAlignment = Alignment.Center) {
        PaisajeKusi(Modifier.matchParentSize(), velo = 0.78f, papel = fondoCarga)
        val separacion = (maxHeight - 480.dp).coerceIn(0.dp, 72.dp)
        val tamanoCuy = (maxHeight * 0.24f).coerceIn(86.dp, 150.dp)
        Column(Modifier.fillMaxWidth().offset(y = separacion).padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally) {
            KusiEnEspera(Modifier.size(tamanoCuy))
            PalabraKusi()
            Spacer(Modifier.height(22.dp))
            HuellasDeCarga()
            Spacer(Modifier.height(14.dp))
            Text("Preparando la aventura…", style = MaterialTheme.typography.titleMedium, color = TintaAventura,
                textAlign = TextAlign.Center)
        }
    }
}

@Composable
private fun KusiEnEspera(modifier: Modifier) {
    val contexto = LocalContext.current
    val quieto = remember(contexto) { animacionesDesactivadas(contexto) }
    val arte = ImageBitmap.imageResource(HojaKusi.ESPERA.recurso)
    val silueta = remember { SiluetaKusi() }
    val reloj = if (quieto) null else rememberInfiniteTransition(label = "kusi-sentado").animateFloat(
        0f, 3200f, infiniteRepeatable(tween(3200, easing = LinearEasing)), label = "kusi-mira-alrededor",
    )
    var toques by remember { mutableIntStateOf(0) }
    var reacciona by remember { mutableStateOf(false) }
    LaunchedEffect(toques) {
        if (toques > 0) {
            reacciona = true
            delay(650)
            reacciona = false
        }
    }
    Canvas(modifier.tocarSiluetaKusi(silueta, "Kusi sentado", "Saludar a Kusi mientras esperas") { toques++ }) {
        val tiempo = reloj?.value ?: 0f
        val cuadro = when {
            reacciona && toques % 2 == 1 -> FotogramaKusi.ESPERA_PARPADEA
            reacciona -> FotogramaKusi.ESPERA_LADO
            tiempo < 420f -> FotogramaKusi.ESPERA_REPOSO
            tiempo < 1000f -> FotogramaKusi.ESPERA_MIRA
            tiempo < 1210f -> FotogramaKusi.ESPERA_PARPADEA
            tiempo < 1560f -> FotogramaKusi.ESPERA_MIRA
            tiempo < 2060f -> FotogramaKusi.ESPERA_REPOSO
            tiempo < 2720f -> FotogramaKusi.ESPERA_LADO
            else -> FotogramaKusi.ESPERA_REPOSO
        }
        val vaiven = 1.6f * sin(tiempo / 3200f * 2f * PI.toFloat())
        val tamano = IntSize(size.width.roundToInt(), size.height.roundToInt())
        val apoyo = Offset(tamano.width * ApoyoCuadroKusi.x, tamano.height * ApoyoCuadroKusi.y)
        silueta.actualizar(arte, cuadro, apoyo, Size(tamano.width.toFloat(), tamano.height.toFloat()),
            vaiven * PI.toFloat() / 180f)
        rotate(vaiven, pivot = apoyo) {
            dibujarCuadroKusi(arte, cuadro, tamano)
        }
        if (reacciona) {
            val brillo = Offset(size.width * 0.85f, size.height * 0.34f)
            val brazo = 3.7.dp.toPx()
            drawLine(Color(0xFFF0AB31), brillo - Offset(brazo, 0f), brillo + Offset(brazo, 0f),
                1.8.dp.toPx(), StrokeCap.Round)
            drawLine(Color(0xFFF0AB31), brillo - Offset(0f, brazo), brillo + Offset(0f, brazo),
                1.8.dp.toPx(), StrokeCap.Round)
        }
    }
}

@Composable
private fun HuellasDeCarga() {
    val contexto = LocalContext.current
    val quieto = remember(contexto) { animacionesDesactivadas(contexto) }
    if (quieto) {
        DibujarHuellas(0f)
    } else {
        val transicion = rememberInfiniteTransition(label = "carga-de-kusi")
        val avance by transicion.animateFloat(0f, 1f, infiniteRepeatable(tween(1120, easing = LinearEasing)),
            label = "tres-huellas")
        DibujarHuellas(avance)
    }
}

@Composable
private fun DibujarHuellas(avance: Float) {
    Canvas(Modifier.size(106.dp, 35.dp).semantics { progressBarRangeInfo = ProgressBarRangeInfo.Indeterminate }) {
        val unidad = 1.dp.toPx()
        for ((indice, tinta) in TintasCarga.withIndex()) {
            val fase = (avance - indice * 0.16f + 1f) % 1f
            val pulso = sin(PI.toFloat() * (fase / 0.54f).coerceIn(0f, 1f))
            val x = center.x + (indice - 1) * 28f * unidad
            val y = center.y + (3f - 5f * pulso) * unidad
            val alfa = 0.67f + 0.33f * pulso
            rotate(-17f, pivot = Offset(x, y)) {
                drawOval(tinta, Offset(x - 5f * unidad, y - 3f * unidad), Size(10f * unidad, 13f * unidad), alpha = alfa)
                drawCircle(tinta, 2.05f * unidad, Offset(x - 5.1f * unidad, y - 4.2f * unidad), alpha = alfa)
                drawCircle(tinta, 2.3f * unidad, Offset(x, y - 6.4f * unidad), alpha = alfa)
                drawCircle(tinta, 2.05f * unidad, Offset(x + 5.1f * unidad, y - 4.2f * unidad), alpha = alfa)
            }
        }
    }
}
