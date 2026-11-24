package pe.kusi.movil

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.sin

private val FormaBotonAventura = RoundedCornerShape(26.dp)
private val VerdeLuz = Color(0xFF258F54)
private val VerdeFondo = Color(0xFF116647)
private val VerdeBase = Color(0xFF124735)
private val TintaPapel = Color(0xFFFFF9E8)
private val OroAventura = Color(0xFFFFCF58)
private val OroClaro = Color(0xFFFFED9E)
private val TintaFlecha = Color(0xFF543414)

@Composable
internal fun BotonAventura(
    habilitado: Boolean,
    celebrando: Boolean,
    movimientoReducido: Boolean,
    entrar: () -> Unit,
    modifier: Modifier = Modifier,
    texto: String = "¡Vamos!",
) {
    val interaccion = remember { MutableInteractionSource() }
    val pulsado by interaccion.collectIsPressedAsState()
    val tacto = LocalHapticFeedback.current
    val activo = habilitado || celebrando
    val relieve = 8.dp
    val profundidad = when {
        pulsado && habilitado -> relieve
        celebrando -> 3.dp
        else -> 0.dp
    }
    val descenso = if (movimientoReducido) profundidad else animateDpAsState(
        profundidad, spring(dampingRatio = 0.72f, stiffness = 850f), label = "presion-de-vamos",
    ).value
    val aviso = remember { Animatable(0f) }
    LaunchedEffect(activo, movimientoReducido) {
        if (activo && !movimientoReducido) {
            aviso.animateTo(1f, tween(510, easing = FastOutSlowInEasing))
        }
    }
    val pulso = if (movimientoReducido) 0f
        else sin(PI.toFloat() * aviso.value).coerceAtLeast(0f)
    val cara = remember(activo) {
        val colores = if (activo) listOf(VerdeLuz, VerdeFondo)
            else listOf(Color(0xFFF4ECD5), Color(0xFFE5DBC0))
        Brush.verticalGradient(colores)
    }
    val base = if (activo) VerdeBase else Color(0xFFCCBC9D)
    val borde = if (activo) lerp(OroAventura, OroClaro, 0.75f * pulso) else Color(0xFFCBB995)
    Box(modifier.padding(bottom = relieve)) {
        Box(Modifier.matchParentSize().offset(y = relieve)
            .background(base, FormaBotonAventura)
            .border(2.dp, base, FormaBotonAventura))
        Button(
            onClick = {
                tacto.performHapticFeedback(HapticFeedbackType.LongPress)
                entrar()
            },
            modifier = Modifier.fillMaxWidth().heightIn(min = 66.dp).offset(y = descenso)
                .background(cara, FormaBotonAventura),
            enabled = habilitado,
            interactionSource = interaccion,
            shape = FormaBotonAventura,
            border = BorderStroke(2.75.dp, borde),
            elevation = null,
            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = Color.Transparent, disabledContainerColor = Color.Transparent,
                contentColor = TintaPapel, disabledContentColor = if (celebrando) TintaPapel else Color(0xFF695D47),
            ),
        ) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                if (activo) {
                    Canvas(Modifier.align(Alignment.CenterStart).padding(start = 6.dp).size(31.dp)) {
                        val estrella = Offset(size.width * 0.42f, size.height * 0.48f)
                        val largo = (5.7f + 1.7f * pulso).dp.toPx()
                        drawLine(OroClaro, estrella - Offset(largo, 0f), estrella + Offset(largo, 0f),
                            2.dp.toPx(), StrokeCap.Round)
                        drawLine(OroClaro, estrella - Offset(0f, largo), estrella + Offset(0f, largo),
                            2.dp.toPx(), StrokeCap.Round)
                        drawCircle(OroAventura, 2.1.dp.toPx(), Offset(size.width * 0.83f, size.height * 0.66f))
                    }
                }
                Text(texto, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold,
                    textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(horizontal = 46.dp))
                Box(
                    Modifier.align(Alignment.CenterEnd).size(42.dp)
                        .background(Brush.verticalGradient(if (activo) listOf(OroClaro, OroAventura)
                            else listOf(Color(0xFFF9F0D9), Color(0xFFEDE0BD))), CircleShape)
                        .border(1.5.dp, if (activo) Color(0xFFDBAA38) else Color(0xFFD8C599), CircleShape),
                    contentAlignment = Alignment.Center,
                ) {
                    Canvas(Modifier.size(20.dp).graphicsLayer { translationX = 3.dp.toPx() * pulso }) {
                        val tinta = if (activo) TintaFlecha else Color(0xFF796741)
                        val y = center.y
                        val punta = Offset(size.width * 0.83f, y)
                        drawLine(tinta, Offset(size.width * 0.15f, y), punta, 2.65.dp.toPx(), StrokeCap.Round)
                        drawLine(tinta, Offset(size.width * 0.51f, size.height * 0.19f), punta, 2.65.dp.toPx(), StrokeCap.Round)
                        drawLine(tinta, Offset(size.width * 0.51f, size.height * 0.81f), punta, 2.65.dp.toPx(), StrokeCap.Round)
                    }
                }
            }
        }
    }
}
