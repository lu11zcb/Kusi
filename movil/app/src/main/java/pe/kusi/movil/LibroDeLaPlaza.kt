package pe.kusi.movil

import android.graphics.Bitmap
import android.graphics.Canvas as LienzoAndroid
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Shader
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.IntSize
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.sin

private const val ULTIMA_DOBLE_PAGINA = 3
private const val MS_PASAR_PAGINA = 640
private const val COLUMNAS_PAPEL = 18
private const val FILAS_PAPEL = 10
private val Lomo = Offset(96f, 124f)
private val TintaPapel = Color(0xFFB87536)
private val Ilustraciones = listOf(
    R.drawable.kusi_jardin_mariposa, R.drawable.kusi_mochila_aventura,
    R.drawable.kusi_pila_numeros, R.drawable.kusi_tulipanes_abiertos,
    R.drawable.kusi_nav_inicio, R.drawable.kusi_emblema,
)

private data class Vuelta(val desde: Int, val hasta: Int, val vientoAlEmpezar: Float)

private fun vientoEnElLibro(brisa: Float?) =
    brisa?.let { (onda(it * 4f + .22f) - .42f).coerceAtLeast(0f) } ?: 0f

@Composable
internal fun LibroDeLaPlaza(modifier: Modifier, quieto: Boolean, brisa: State<Float>?, alPasar: () -> Unit) {
    val abierto = ImageBitmap.imageResource(R.drawable.kusi_jardin_libro_abierto)
    val cerrado = ImageBitmap.imageResource(R.drawable.kusi_jardin_libro_cerrado)
    val recursos = LocalContext.current.resources
    val papel = remember(recursos) {
        PapelDelLibro(Ilustraciones.map { ImageBitmap.imageResource(recursos, it).asAndroidBitmap() })
    }
    val notificar by rememberUpdatedState(alPasar)
    val interacciones = remember { MutableInteractionSource() }
    val pulsado by interacciones.collectIsPressedAsState()
    val presion = animateFloatAsState(
        if (pulsado && !quieto) .973f else 1f,
        animationSpec = if (quieto) snap() else tween(140, easing = SalidaPlaza),
        label = "Presionar el libro",
    )
    var pagina by rememberSaveable { mutableIntStateOf(1) }
    var vuelta by remember { mutableStateOf<Vuelta?>(null) }
    var pasarAlTerminar by remember { mutableStateOf(false) }
    val avance = remember(vuelta) { Animatable(0f) }
    val calma = remember { Animatable(1f) }
    fun pasar(reaccion: Boolean) {
        if (vuelta != null) {
            if (reaccion) pasarAlTerminar = true
            return
        }
        val siguiente = (pagina + 1) % (ULTIMA_DOBLE_PAGINA + 1)
        if (!quieto) vuelta = Vuelta(pagina, siguiente, vientoEnElLibro(brisa?.value) * calma.value)
        pagina = siguiente
        if (reaccion) notificar()
    }

    LaunchedEffect(vuelta, quieto) {
        if (vuelta != null) {
            calma.snapTo(0f)
            if (!quieto) avance.animateTo(1f, tween(MS_PASAR_PAGINA, easing = FastOutSlowInEasing))
            vuelta = null
            if (pasarAlTerminar) {
                pasarAlTerminar = false
                pasar(reaccion = true)
            }
        } else if (!quieto) {
            calma.animateTo(1f, tween(300, easing = SalidaPlaza))
        }
    }
    LaunchedEffect(pagina, vuelta, quieto) {
        if (!quieto && vuelta == null && pagina in 1 until ULTIMA_DOBLE_PAGINA) {
            delay(5_900)
            pasar(reaccion = false)
        }
    }

    Canvas(
        modifier.clickable(
            interactionSource = interacciones,
            indication = null,
            role = Role.Button,
            onClickLabel = when (pagina) {
                0 -> "Abrir el libro"
                ULTIMA_DOBLE_PAGINA -> "Cerrar el libro"
                else -> "Pasar la página"
            },
        ) { pasar(reaccion = true) }
            .semantics {
                contentDescription = "Libro de Kusi"
                stateDescription = if (pagina == 0) "Cerrado" else "Páginas ${pagina * 2 - 1} y ${pagina * 2}"
            }
            .graphicsLayer {
                transformOrigin = TransformOrigin(.5f, .87f)
                scaleX = presion.value
                scaleY = presion.value
            },
    ) {
        val cambio = vuelta
        val fase = avance.value
        scale(size.width / 192f, size.height / 192f, pivot = Offset.Zero) {
            when {
                cambio == null && pagina == 0 -> dibujarCubierta(cerrado)
                cambio == null -> {
                    dibujarCubierta(abierto)
                    val primera = (pagina - 1) * 2
                    papel.dibujar(this, primera, fase = 1f)
                    val viento = vientoEnElLibro(brisa?.value) * calma.value
                    if (viento > 0f) papel.dibujar(this, primera + 1, fase = 0f, tinta = 0f)
                    papel.dibujar(this, primera + 1, fase = viento * .115f, flexion = viento * .7f)
                }
                cambio.desde == 0 || cambio.hasta == 0 -> {
                    val apertura = if (cambio.desde == 0) fase else 1f - fase
                    val doble = (maxOf(cambio.desde, cambio.hasta) - 1) * 2
                    val abiertoAlfa = (apertura * 1.8f).coerceIn(0f, 1f)
                    scale(.69f + .31f * apertura, 1f, pivot = Lomo) {
                        dibujarCubierta(abierto, abiertoAlfa)
                        papel.dibujar(this, doble + 1, fase = 0f, alfa = abiertoAlfa)
                        papel.dibujar(this, doble, fase = .45f + .55f * apertura, alfa = abiertoAlfa)
                    }
                    dibujarCubierta(cerrado, (1f - apertura * 1.36f).coerceAtLeast(0f))
                }
                else -> {
                    val anterior = (cambio.desde - 1) * 2
                    val nueva = (cambio.hasta - 1) * 2
                    val angulo = fase + .115f * cambio.vientoAlEmpezar * (1f - fase)
                    val elevacion = sin(PI * angulo).toFloat()
                    val caeALaIzquierda = angulo >= .5f
                    dibujarCubierta(abierto)
                    papel.dibujar(this, anterior, fase = 1f)
                    papel.dibujar(this, nueva + 1, fase = 0f)
                    drawOval(
                        TintaPapel.copy(alpha = .22f * elevacion),
                        topLeft = Offset(96f + 31f * cos(PI * angulo).toFloat() - 20f * elevacion, 93f),
                        size = Size(40f * elevacion, 69f),
                    )
                    papel.dibujar(
                        this, if (caeALaIzquierda) nueva else anterior + 1, angulo,
                        flexion = maxOf(cambio.vientoAlEmpezar * .7f, (fase * 8f).coerceAtMost(1f)),
                        reverso = caeALaIzquierda,
                        tinta = (abs(angulo - .5f) * 10f).coerceIn(0f, 1f),
                    )
                }
            }
        }
    }
}

private fun DrawScope.dibujarCubierta(imagen: ImageBitmap, alfa: Float = 1f) {
    drawImage(imagen, dstSize = IntSize(192, 192), alpha = alfa, filterQuality = FilterQuality.High)
}

private class PapelDelLibro(dibujos: List<Bitmap>) {
    private val papel = prepararPapel(null)
    private val hojas = dibujos.map { prepararPapel(it) }
    private val puntos = FloatArray((COLUMNAS_PAPEL + 1) * (FILAS_PAPEL + 1) * 2)
    private val luz = IntArray(puntos.size / 2)
    private val borde = Path()
    private val pincel = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    fun dibujar(
        dibujo: DrawScope,
        pagina: Int,
        fase: Float,
        flexion: Float = 0f,
        reverso: Boolean = fase > .5f,
        alfa: Float = 1f,
        tinta: Float = 1f,
    ) {
        val vuelo = sin(PI * fase).toFloat()
        val ondaPapel = flexion * vuelo
        for (fila in 0..FILAS_PAPEL) {
            val v = fila.toFloat() / FILAS_PAPEL
            for (columna in 0..COLUMNAS_PAPEL) {
                val horiz = columna.toFloat() / COLUMNAS_PAPEL
                val u = if (reverso) 1f - horiz else horiz
                val radio = (77f + 5f * v) * u
                // La punta superior se adelanta y levanta el papel antes que el borde de abajo.
                val giro = PI * (fase + ondaPapel * u * (.095f - .16f * v))
                val concha = sin(PI * u).toFloat()
                val altura = sin(giro).toFloat()
                val vertice = indice(columna, fila)
                puntos[vertice * 2] = 96f + radio * cos(giro).toFloat() + 5f * concha * ondaPapel
                puntos[vertice * 2 + 1] =
                    86f + 83f * v - (9f + v) * u - concha * (9f - 3f * v) -
                    radio * altura * (.68f - .19f * v)
                val sombra = (13f * (1f - u) + ondaPapel * (29f - u * 23f)).toInt()
                luz[vertice] = android.graphics.Color.rgb(255 - sombra, 255 - sombra, 255 - sombra)
            }
        }

        if (tinta < 1f) proyectar(dibujo, papel, alfa)
        if (tinta > 0f) proyectar(dibujo, hojas[pagina], alfa * tinta)
        borde.reset()
        coordenadaBorde(0, 0, inicio = true)
        for (columna in 1..COLUMNAS_PAPEL) coordenadaBorde(columna, 0)
        for (fila in 1..FILAS_PAPEL) coordenadaBorde(COLUMNAS_PAPEL, fila)
        for (columna in COLUMNAS_PAPEL - 1 downTo 0) coordenadaBorde(columna, FILAS_PAPEL)
        for (fila in FILAS_PAPEL - 1 downTo 1) coordenadaBorde(0, fila)
        borde.close()
        dibujo.drawPath(borde, TintaPapel, alpha = alfa, style = Stroke(1.2f))
    }

    private fun indice(columna: Int, fila: Int) = fila * (COLUMNAS_PAPEL + 1) + columna

    private fun coordenadaBorde(columna: Int, fila: Int, inicio: Boolean = false) {
        val i = indice(columna, fila) * 2
        if (inicio) borde.moveTo(puntos[i], puntos[i + 1]) else borde.lineTo(puntos[i], puntos[i + 1])
    }

    private fun proyectar(dibujo: DrawScope, textura: Bitmap, alfa: Float) {
        pincel.alpha = (alfa * 255f).toInt()
        dibujo.drawIntoCanvas {
            it.nativeCanvas.drawBitmapMesh(textura, COLUMNAS_PAPEL, FILAS_PAPEL, puntos, 0, luz, 0, pincel)
        }
    }

    private fun prepararPapel(ilustracion: Bitmap?): Bitmap {
        val textura = Bitmap.createBitmap(192, 216, Bitmap.Config.ARGB_8888)
        val lienzo = LienzoAndroid(textura)
        val pintura = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
        pintura.shader = LinearGradient(
            0f, 0f, 55f, 216f,
            intArrayOf(0xFFFFF5CD.toInt(), 0xFFFFEDAE.toInt(), 0xFFF6DB95.toInt()),
            null, Shader.TileMode.CLAMP,
        )
        lienzo.drawPaint(pintura)
        pintura.shader = null
        if (ilustracion != null) {
            val arte = if (ilustracion.config == Bitmap.Config.HARDWARE) ilustracion.copy(Bitmap.Config.ARGB_8888, false)
                else ilustracion
            lienzo.drawBitmap(arte, null, RectF(36f, 27f, 156f, 147f), pintura)
            pintura.color = 0xFFC69754.toInt()
            pintura.strokeCap = Paint.Cap.ROUND
            pintura.strokeWidth = 3.5f
            lienzo.drawLine(64f, 158f, 128f, 158f, pintura)
            lienzo.drawLine(76f, 174f, 116f, 174f, pintura)
        }
        return textura
    }
}
