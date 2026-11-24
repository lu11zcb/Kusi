package pe.kusi.movil

import android.graphics.Paint
import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.nativeCanvas
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp

private const val COLUMNAS = 8
private const val FILAS = 12

private class PlantaFlexible {
    private val vertices = FloatArray((COLUMNAS + 1) * (FILAS + 1) * 2)
    private val pintura = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)

    fun dibujar(
        lienzo: DrawScope,
        planta: ImageBitmap,
        esquina: Offset,
        medidas: Size,
        raiz: Float,
        ciclo: Float?,
        amplitud: Float,
        alfa: Int = 255,
        apertura: Float = 0f,
    ) {
        var punto = 0
        for (fila in 0..FILAS) {
            val y = fila.toFloat() / FILAS
            val altoFlexible = (1f - y / raiz).coerceAtLeast(0f)
            for (columna in 0..COLUMNAS) {
                val x = columna.toFloat() / COLUMNAS
                val tramo = ciclo?.minus(x * .19f + y * .13f)
                val aire = tramo?.let { .76f * onda(it) + .24f * onda(it * 2f + .17f) } ?: 0f
                val punta = altoFlexible * altoFlexible
                val curva = amplitud * punta * aire
                val despliegue = apertura * (x - .5f) * punta
                vertices[punto++] = esquina.x + medidas.width * (x + curva + despliegue)
                vertices[punto++] = esquina.y + medidas.height * (y + curva * .2f - despliegue * .18f)
            }
        }
        pintura.alpha = alfa
        lienzo.drawIntoCanvas {
            it.nativeCanvas.drawBitmapMesh(planta.asAndroidBitmap(), COLUMNAS, FILAS, vertices, 0, null, 0, pintura)
        }
    }
}

@Composable
internal fun TulipanesDeLaPlaza(
    modifier: Modifier,
    abiertos: Boolean,
    quieto: Boolean,
    brisa: State<Float>?,
    pulsar: (Boolean) -> Unit,
) {
    val apertura = animateFloatAsState(
        if (abiertos && !quieto) .19f else 0f,
        animationSpec = if (quieto) snap() else tween(360, easing = SalidaPlaza),
        label = "Los pétalos se despliegan",
    )
    Box(
        modifier.clip(RoundedCornerShape(18.dp)).toggleable(
            abiertos, interactionSource = null, indication = null, role = Role.Button, onValueChange = pulsar,
        )
            .semantics {
                contentDescription = "Tulipanes de Kusi"
                stateDescription = if (abiertos) "Abiertos" else "En capullo"
            },
    ) {
        Crossfade(
            targetState = abiertos,
            animationSpec = if (quieto) snap() else tween(320, easing = SalidaPlaza),
            modifier = Modifier.fillMaxSize(),
            label = "Floración de los tulipanes",
        ) { florecio ->
            val dibujo = ImageBitmap.imageResource(if (florecio) R.drawable.kusi_tulipanes_abiertos else R.drawable.kusi_tulipanes_capullos)
            val tallos = remember { PlantaFlexible() }
            Canvas(Modifier.fillMaxSize()) {
                tallos.dibujar(
                    this, dibujo, Offset.Zero, size, .55f, brisa?.value?.let { it * 4f - .37f }, .22f,
                    apertura = apertura.value,
                )
            }
        }
    }
}

private data class Mata(val x: Float, val suelo: Float, val ancho: Float, val fase: Float)

private val Matas = listOf(
    Mata(.108f, .739f, .103f, .06f),
    Mata(.361f, .711f, .077f, .18f),
    Mata(.809f, .723f, .09f, .38f),
    Mata(.946f, .735f, .115f, .49f),
    Mata(.048f, .898f, .166f, .10f),
    Mata(.177f, .971f, .131f, .23f),
    Mata(.965f, .905f, .145f, .40f),
)

@Composable
internal fun HierbaDeLaPlaza(modifier: Modifier, brisa: State<Float>?, oscuro: Boolean) {
    val hierba = ImageBitmap.imageResource(R.drawable.kusi_plaza_hierba)
    val hoja = remember { PlantaFlexible() }
    Canvas(modifier) {
        val aire = brisa?.value
        Matas.forEach { mata ->
            val ancho = size.width * mata.ancho
            val alto = ancho * .68f
            val origen = Offset(size.width * mata.x - ancho / 2f, size.height * mata.suelo - alto * .91f)
            hoja.dibujar(
                this, hierba, origen, Size(ancho, alto), .88f,
                aire?.let { it * 4f - mata.fase }, .24f,
                if (oscuro) 184 else 237,
            )
        }
    }
}
