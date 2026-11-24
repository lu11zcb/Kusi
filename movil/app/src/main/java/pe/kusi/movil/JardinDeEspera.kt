package pe.kusi.movil

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.currentStateAsState
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

private val gestosDeKusi = listOf(GestoDeLaPlaza.SALUDO, GestoDeLaPlaza.INVITA, GestoDeLaPlaza.RISA, GestoDeLaPlaza.BRINCO)
private val rumbos = listOf(Offset(.456f, .105f), Offset(.28f, .50f), Offset(.85f, .25f))
private val coloresDestello = listOf(Color(0xFFFFCA54), Color(0xFFFFF4B6), Color(0xFFF4868B), Color(0xFF4C9665))
private data class Nube(val x: Float, val y: Float, val ancho: Float, val alfa: Float, val lejana: Boolean = false)
private val NubesDeLaPlaza = listOf(
    Nube(.31f, .13f, .13f, .96f),
    Nube(.86f, .10f, .19f, 1f),
    Nube(.53f, .24f, .105f, .72f, lejana = true),
    Nube(.10f, .29f, .081f, .64f, lejana = true),
)
internal val SalidaPlaza = CubicBezierEasing(.23f, 1f, .32f, 1f)

internal fun onda(ciclo: Float): Float = sin(2 * PI * ciclo).toFloat()

@Composable
internal fun PlazaDeInicio(
    saludar: () -> Unit,
    visible: Boolean,
    enEspera: Boolean,
    cielo: Color,
    fondo: Color,
) {
    val contexto = LocalContext.current
    val cicloDeVida by LocalLifecycleOwner.current.lifecycle.currentStateAsState()
    val quieto = !visible || !cicloDeVida.isAtLeast(Lifecycle.State.STARTED) ||
        remember(contexto, cicloDeVida) { animacionesDesactivadas(contexto) }
    val aire = if (quieto) null else rememberInfiniteTransition(label = "brisa de la plaza")
    val brisa = aire?.animateFloat(
        0f, 1f, infiniteRepeatable(tween(16_000, easing = LinearEasing)), label = "ciclo de la plaza",
    )
    val nubesLejanas = aire?.animateFloat(
        0f, 1f, infiniteRepeatable(tween(29_000, easing = LinearEasing)), label = "cielo lejano",
    )
    var florecio by rememberSaveable { mutableStateOf(false) }
    var rumbo by remember { mutableIntStateOf(0) }
    var saludos by remember { mutableIntStateOf(0) }
    var gesto by remember { mutableStateOf<GestoDeLaPlaza?>(null) }
    var pulso by remember { mutableIntStateOf(0) }
    var toquesDeSuelo by remember { mutableIntStateOf(0) }
    var puntoSuelo by remember { mutableStateOf(Offset(.50f, .89f)) }
    var posicionMariposa by remember { mutableStateOf(rumbos.first()) }
    val vuelo = remember { Animatable(1f) }
    fun reaccionar(reaccion: GestoDeLaPlaza) {
        gesto = reaccion
        pulso++
    }
    fun tocarJardin(donde: Offset) {
        puntoSuelo = donde
        toquesDeSuelo++
    }

    LaunchedEffect(rumbo, quieto) {
        val meta = rumbos[rumbo]
        val desde = posicionMariposa
        if (quieto || desde == meta) {
            posicionMariposa = meta
        } else {
            vuelo.snapTo(0f)
            vuelo.animateTo(1f, tween(680, easing = FastOutSlowInEasing)) {
                posicionMariposa = Offset(
                    desde.x + (meta.x - desde.x) * value + .037f * onda(value),
                    desde.y + (meta.y - desde.y) * value - .118f * sin(PI * value).toFloat(),
                )
            }
        }
    }

    BoxWithConstraints(
        Modifier.fillMaxWidth().aspectRatio(1.5f).clipToBounds()
            .pointerInput(Unit) {
                detectTapGestures { tocarJardin(Offset(it.x / size.width, it.y / size.height)) }
            }
            .semantics {
                contentDescription = "Plaza de Kusi"
                onClick("Hacer brillar la plaza") {
                    tocarJardin(Offset(.25f, .58f))
                    true
                }
            },
    ) {
        val ancho = maxWidth
        val alto = maxHeight
        FondoPlaza(Modifier.matchParentSize(), brisa, nubesLejanas, cielo)

        val ladoKusi = alto * .78f
        KusiDeLaPlaza(
            Modifier.offset(x = ancho * .623f - ladoKusi / 2, y = alto * .83f - ladoKusi * ApoyoCuadroKusi.y)
                .size(ladoKusi),
            gesto, pulso, quieto, brisa,
            if (enEspera) "Kusi en el jardín" else "Kusi te saluda",
        ) {
            val saludo = gestosDeKusi[saludos % gestosDeKusi.size]
            reaccionar(saludo)
            saludos++
            if (saludo == GestoDeLaPlaza.SALUDO) saludar()
        }

        val libro = (ancho * .30f).coerceAtLeast(48.dp)
        LibroDeLaPlaza(
            Modifier.offset(x = ancho * .308f - libro / 2, y = alto * .84f - libro * .93f).size(libro),
            quieto, brisa,
        ) {
            reaccionar(GestoDeLaPlaza.LIBRO)
        }

        val maceta = (ancho * .286f).coerceAtLeast(48.dp)
        TulipanesDeLaPlaza(
            Modifier.offset(x = ancho * .878f - maceta / 2, y = alto * .904f - maceta * .914f).size(maceta),
            florecio, quieto, brisa,
        ) { abierta ->
            florecio = abierta
            reaccionar(GestoDeLaPlaza.TULIPANES)
        }

        if (toquesDeSuelo != 0) DestelloDelJardin(
            Modifier.matchParentSize(), puntoSuelo, toquesDeSuelo, quieto,
        )
        if (gesto == GestoDeLaPlaza.LIBRO) {
            DestelloDelJardin(Modifier.matchParentSize(), Offset(.306f, .68f), pulso, quieto, espera = 360)
        }
        if (florecio && gesto == GestoDeLaPlaza.TULIPANES) {
            DestelloDelJardin(Modifier.matchParentSize(), Offset(.878f, .56f), pulso, quieto, espera = 165)
        }

        val mariposa = (ancho * .148f).coerceAtLeast(48.dp)
        Box(
            Modifier.size(mariposa).graphicsLayer {
                val tiempo = brisa?.value
                val deriva = if (tiempo == null) Offset.Zero else Offset(
                    ancho.toPx() * (.063f * onda(tiempo * 2f) + .018f * onda(tiempo * 3f)),
                    alto.toPx() * (.029f * onda(tiempo * 2f + .16f) + .022f * onda(tiempo * 4f)),
                )
                translationX = ancho.toPx() * posicionMariposa.x + deriva.x - size.width / 2f
                translationY = alto.toPx() * posicionMariposa.y + deriva.y - size.height / 2f
                rotationZ = if (tiempo == null) 0f else 12f * onda(tiempo * 2f + .23f) + 16f * onda(vuelo.value)
            }.clip(CircleShape)
                .clickable(role = Role.Button, onClickLabel = "Hacer volar la mariposa") {
                    rumbo = (rumbo + 1) % rumbos.size
                    reaccionar(GestoDeLaPlaza.MARIPOSA)
                }
                .semantics { contentDescription = "Mariposa"; stateDescription = "Lugar ${rumbo + 1} de ${rumbos.size}" },
        ) {
            AlasDeMariposa(Modifier.fillMaxSize().padding(7.dp), brisa)
        }

        Surface(
            Modifier.offset(x = ancho * .064f, y = alto * .274f).widthIn(max = ancho * .388f),
            shape = RoundedCornerShape(22.dp), color = Color(0xFFFFF4D9),
            contentColor = Color(0xFF50311E),
        ) {
            Text(
                if (enEspera) "Toca para explorar" else "Mis aventuras",
                Modifier.padding(horizontal = 10.dp, vertical = 6.dp).semantics { heading() },
                style = if (enEspera) MaterialTheme.typography.titleSmall
                    else MaterialTheme.typography.titleLarge.copy(fontSize = 20.sp, lineHeight = 24.sp),
                textAlign = TextAlign.Center,
            )
        }
        Canvas(Modifier.matchParentSize()) {
            val borde = Path().apply {
                moveTo(0f, size.height)
                quadraticTo(size.width / 2, size.height * .862f, size.width, size.height)
                close()
            }
            drawPath(borde, fondo)
        }
    }
}

@Composable
private fun AlasDeMariposa(modifier: Modifier, brisa: State<Float>?) {
    val mariposa = ImageBitmap.imageResource(R.drawable.kusi_jardin_mariposa)
    Canvas(modifier) {
        val tamano = IntSize(size.width.roundToInt(), size.height.roundToInt())
        val tiempo = brisa?.value
        if (tiempo == null) {
            drawImage(mariposa, dstSize = tamano, filterQuality = FilterQuality.High)
        } else {
            val aleteo = tiempo * 53f + .11f * onda(tiempo * 3)
            scale(.70f + .30f * onda(aleteo), 1f, pivot = center) {
                clipRect(right = center.x) { drawImage(mariposa, dstSize = tamano, filterQuality = FilterQuality.High) }
            }
            scale(.70f + .30f * onda(aleteo + .065f), 1f, pivot = center) {
                clipRect(left = center.x) { drawImage(mariposa, dstSize = tamano, filterQuality = FilterQuality.High) }
            }
            clipRect(left = size.width * .431f, right = size.width * .565f) {
                drawImage(mariposa, dstSize = tamano, filterQuality = FilterQuality.High)
            }
        }
    }
}

private val SiluetaHojaDeLaPlaza = Path().apply {
    moveTo(-1f, 0f)
    quadraticTo(.03f, -1.07f, 1f, -.12f)
    quadraticTo(.27f, .71f, -1f, 0f)
    close()
}

@Composable
internal fun FondoPlaza(modifier: Modifier, brisa: State<Float>?, nubesLejanas: State<Float>?, cielo: Color) {
    val oscuro = cielo.luminance() < .30f
    Box(modifier) {
        Image(
            painterResource(R.drawable.kusi_plaza_aventuras), null, Modifier.matchParentSize(),
            contentScale = ContentScale.FillBounds,
        )
        Canvas(Modifier.matchParentSize().drawWithCache {
            val altoDeLaMezcla = size.height * .145f
            val remateDelCielo = Brush.verticalGradient(
                listOf(cielo, cielo.copy(alpha = 0f)),
                endY = altoDeLaMezcla,
            )
            onDrawBehind {
                if (oscuro) drawRect(Color(0x66203452))
                drawRect(remateDelCielo, size = Size(size.width, altoDeLaMezcla))
            }
        }) {
            val w = size.width
            val h = size.height
            val tiempo = brisa?.value ?: 0f
            drawOval(Color(0x287C4016), Offset(w * .197f, h * .819f), Size(w * .222f, h * .038f))

            NubesDeLaPlaza.forEach { nube ->
                val trayecto = if (nube.lejana) nubesLejanas?.value ?: 0f else tiempo
                val margen = nube.ancho * .82f
                val tramo = 1f + margen * 2f
                val x = (nube.x + margen + tramo * trayecto) % tramo - margen
                val cx = w * x
                val cy = h * (nube.y + .009f * onda(trayecto + nube.x))
                val ancho = w * nube.ancho
                val alto = ancho * .34f
                val sombra = (if (oscuro) Color(0xFFAECDE7) else Color(0xFFD4EEFF)).copy(alpha = nube.alfa)
                val luz = (if (oscuro) Color(0xFFD4E6F3) else Color(0xFFF9FDFF)).copy(alpha = nube.alfa)
                drawOval(sombra, Offset(cx - ancho / 2, cy), Size(ancho, alto * .65f))
                drawOval(luz, Offset(cx - ancho * .43f, cy - alto * .18f), Size(ancho * .58f, alto * .62f))
                drawOval(luz, Offset(cx - ancho * .182f, cy - alto * .5f), Size(ancho * .53f, alto))
                drawOval(luz, Offset(cx - ancho * .07f, cy + alto * .025f), Size(ancho * .53f, alto * .43f))
            }
            if (brisa != null) repeat(6) { i ->
                val pulso = onda(tiempo * 2f + i * .17f)
                val altura = .64f - (i % 3) * .073f
                val centro = Offset(w * (.12f + i * .148f + .017f * onda(tiempo + i * .21f)), h * (altura + pulso * .019f))
                drawCircle(Color(0xFFFFF2A3), w * .0045f, centro, alpha = .24f + .23f * pulso)
            }
            if (brisa != null) repeat(3) { i ->
                val viaje = (tiempo * 2f + i * .327f) % 1f
                val altura = h * (.76f - .088f * sin(PI * viaje).toFloat() + .022f * onda(2f * viaje + i))
                val distancia = w * (.055f + i * .23f + viaje * .37f)
                val tamano = w * (.007f + (i % 2) * .002f)
                translate(distancia, altura) {
                    rotate(16f + 37f * onda(viaje * 2f + i), pivot = Offset.Zero) {
                        scale(tamano, tamano, pivot = Offset.Zero) {
                            drawPath(SiluetaHojaDeLaPlaza, Color(0xFF9DBE44), alpha = .82f * sin(PI * viaje).toFloat())
                        }
                    }
                }
            }
        }
        HierbaDeLaPlaza(Modifier.matchParentSize(), brisa, oscuro)
    }
}

@Composable
private fun DestelloDelJardin(modifier: Modifier, origen: Offset, pulso: Int, quieto: Boolean, espera: Int = 45) {
    val avance = remember(pulso) { Animatable(0f) }
    LaunchedEffect(avance, quieto) {
        if (quieto) {
            avance.snapTo(.43f)
            delay(300)
            avance.snapTo(1f)
        } else avance.animateTo(1f, tween(360, delayMillis = espera, easing = SalidaPlaza))
    }
    Canvas(modifier) {
        val fase = avance.value
        if (fase in 0.001f..0.995f) {
            val x = size.width * origen.x
            val y = size.height * origen.y
            val amplitud = size.minDimension * (.026f + .16f * fase)
            val alfa = (1f - fase).coerceIn(0f, 1f)
            for (i in 0..6) {
                val angulo = (i * 2.0 * PI / 7.0)
                val p = Offset(x + cos(angulo).toFloat() * amplitud, y + sin(angulo).toFloat() * amplitud * .72f)
                val radio = (if (i % 2 == 0) 3.5.dp else 2.dp).toPx() * (.7f + .4f * alfa)
                drawCircle(coloresDestello[i % coloresDestello.size], radio, p, alpha = alfa)
            }
        }
    }
}
