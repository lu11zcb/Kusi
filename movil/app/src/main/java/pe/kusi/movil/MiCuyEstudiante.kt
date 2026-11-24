package pe.kusi.movil

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.currentStateAsState
import kotlin.math.PI
import kotlin.math.sin

@Composable
internal fun MiCuyEstudiante(
    nombre: String,
    apariencia: AparienciaCuy,
    voz: VozKusi,
    vozActiva: Boolean,
    cambiarVoz: (Boolean) -> Unit,
    personalizar: () -> Unit,
    ayuda: () -> Unit,
    salir: () -> Unit,
    modifier: Modifier = Modifier,
    salidaHabilitada: Boolean = true,
) {
    val contexto = LocalContext.current
    val ciclo by LocalLifecycleOwner.current.lifecycle.currentStateAsState()
    val quieto = !ciclo.isAtLeast(Lifecycle.State.STARTED) ||
        remember(contexto, ciclo) { animacionesDesactivadas(contexto) }
    val colores = MaterialTheme.colorScheme
    var confirmarSalida by rememberSaveable { mutableStateOf(false) }
    BoxWithConstraints(modifier.widthIn(max = 820.dp).fillMaxSize()) {
        val ancho = maxWidth >= 620.dp
        val alto = when {
            maxHeight < 500.dp && ancho -> 190.dp
            maxHeight < 600.dp -> 225.dp
            else -> 286.dp
        }
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
                .padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 12.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    if (nombre.isBlank()) "Mi cuy" else "Mi cuy $nombre",
                    Modifier.weight(1f).semantics { heading() },
                    color = colores.onBackground,
                    style = MaterialTheme.typography.headlineLarge,
                )
                BotonIconoKusi(R.drawable.ic_question, "Necesito ayuda", ayuda)
            }
            val cuy: @Composable () -> Unit = {
                RincónDelCuy(apariencia, Modifier.fillMaxWidth().height(alto), quieto) {
                    if (vozActiva) voz.hablar(if (nombre.isBlank()) "¡Hola!" else "¡Hola, $nombre!")
                }
            }
            val controles: @Composable () -> Unit = {
                Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
                    BotonKusi(
                        "Personalizar mi cuy", personalizar, Modifier.fillMaxWidth(),
                        icono = R.drawable.ic_kusi_sparkle,
                    )
                    val forma = RoundedCornerShape(20.dp)
                    Surface(
                        Modifier.fillMaxWidth().clip(forma)
                            .toggleable(vozActiva, role = Role.Switch, onValueChange = cambiarVoz),
                        shape = forma, color = colores.secondaryContainer,
                        contentColor = colores.onSecondaryContainer,
                        border = BorderStroke(1.dp, colores.onSecondaryContainer.copy(alpha = .19f)),
                    ) {
                        Row(
                            Modifier.heightIn(min = 61.dp).padding(horizontal = 13.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(11.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            IconoKusi(if (vozActiva) R.drawable.ic_ingreso_voz else R.drawable.ic_ingreso_silenciar)
                            Text("Voz de Kusi", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
                            Switch(checked = vozActiva, onCheckedChange = null)
                        }
                    }
                    BotonDeSalida("Cerrar sesión", salidaHabilitada) { confirmarSalida = true }
                }
            }
            if (ancho) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(15.dp)) {
                    Box(Modifier.weight(1.1f)) { cuy() }
                    Box(Modifier.weight(.9f)) { controles() }
                }
            } else {
                cuy()
                controles()
            }
        }
    }
    if (confirmarSalida) {
        ConfirmarCierreDeSesion(
            apariencia, quieto, salidaHabilitada, seguir = { confirmarSalida = false },
        ) {
            if (confirmarSalida && salidaHabilitada) {
                confirmarSalida = false
                voz.callar()
                salir()
            }
        }
    }
}

@Composable
private fun BotonDeSalida(
    texto: String,
    habilitado: Boolean,
    confirmar: Boolean = false,
    pulsar: () -> Unit,
) {
    val colores = MaterialTheme.colorScheme
    val fondo = if (confirmar) colores.errorContainer else colores.tertiaryContainer
    val tinta = if (confirmar) colores.onErrorContainer else colores.onTertiaryContainer
    Surface(
        onClick = pulsar, enabled = habilitado, modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(19.dp),
        color = if (habilitado) fondo else colores.surfaceVariant,
        contentColor = if (habilitado) tinta else colores.onSurfaceVariant,
        border = BorderStroke(1.dp, tinta.copy(alpha = if (habilitado) .26f else .12f)),
        shadowElevation = if (confirmar || !habilitado) 0.dp else 2.dp,
    ) {
        Row(
            Modifier.heightIn(min = 54.dp).padding(horizontal = 12.dp, vertical = 7.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp, if (confirmar) Alignment.CenterHorizontally else Alignment.Start),
        ) {
            Box(
                Modifier.size(35.dp).background(tinta.copy(alpha = .10f), RoundedCornerShape(11.dp)),
                contentAlignment = Alignment.Center,
            ) {
                IconoKusi(R.drawable.ic_sign_out, modifier = Modifier.size(23.dp))
            }
            Text(texto, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun ConfirmarCierreDeSesion(
    apariencia: AparienciaCuy,
    quieto: Boolean,
    salidaHabilitada: Boolean,
    seguir: () -> Unit,
    salir: () -> Unit,
) {
    val colores = MaterialTheme.colorScheme
    val entrada = entradaDeLogros(quieto)
    Dialog(onDismissRequest = seguir, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Surface(
            Modifier.padding(horizontal = 23.dp).widthIn(max = 388.dp).fillMaxWidth(),
            shape = RoundedCornerShape(28.dp),
            color = colores.surface,
            contentColor = colores.onSurface,
            border = BorderStroke(1.dp, colores.outlineVariant),
        ) {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Box(
                    Modifier.fillMaxWidth().height(132.dp).background(
                        Brush.verticalGradient(listOf(Color(0xFFFFE2AB), Color(0xFFFFF0D3))),
                    ),
                    contentAlignment = Alignment.BottomCenter,
                ) {
                    Canvas(Modifier.matchParentSize()) {
                        drawCircle(Color(0xFFFFF7E3), size.height * .43f, Offset(size.width * .50f, size.height * .55f))
                        drawOval(
                            Color(0xFFB9754C).copy(alpha = .18f),
                            Offset(size.width * .38f, size.height * .91f),
                            Size(size.width * .24f, size.height * .060f),
                        )
                        destelloLogros(Offset(size.width * .26f, size.height * .45f), 8.dp.toPx(), Color(0xFFB76342))
                        destelloLogros(Offset(size.width * .71f, size.height * .29f), 7.dp.toPx(), Color(0xFFB76342))
                        destelloLogros(Offset(size.width * .77f, size.height * .58f), 4.dp.toPx(), Color(0xFF7E6CA4))
                    }
                    CuerpoMiCuy(
                        apariencia,
                        Modifier.padding(bottom = 2.dp).size(124.dp).clearAndSetSemantics {}.graphicsLayer {
                            val avance = entrada.value
                            alpha = .65f + .35f * avance
                            scaleX = .89f + .11f * avance
                            scaleY = scaleX
                            translationY = (1f - avance) * 9.dp.toPx()
                            rotationZ = (1f - avance) * -7f
                        },
                        saludando = true,
                    )
                }
                Column(
                    Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 15.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(9.dp),
                ) {
                    Text(
                        "¿Cerrar sesión?", Modifier.semantics { heading() },
                        style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center,
                    )
                    Text(
                        "Para volver a jugar, tendrás que iniciar sesión otra vez.",
                        color = colores.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium,
                        textAlign = TextAlign.Center,
                    )
                    BotonKusi(
                        "Seguir jugando", seguir, Modifier.fillMaxWidth().padding(top = 4.dp),
                        icono = R.drawable.ic_kusi_play, compacto = true,
                    )
                    BotonDeSalida("Sí, cerrar sesión", salidaHabilitada, confirmar = true, pulsar = salir)
                }
            }
        }
    }
}

@Composable
private fun RincónDelCuy(apariencia: AparienciaCuy, modifier: Modifier, quieto: Boolean, saludar: () -> Unit) {
    var pulso by remember { mutableIntStateOf(0) }
    val fase = faseDeFiesta(pulso, quieto, duracion = 820)
    val reloj = relojDeFiesta(quieto, "Gestos de mi cuy", duracion = 4500)
    val saludando by saludoDeCuy(fase, reloj)
    val forma = RoundedCornerShape(27.dp)
    Surface(
        modifier, shape = forma, color = Color(0xFFE1EBC4),
        border = BorderStroke(1.dp, Color(0xFFAC8A57)),
    ) {
        BoxWithConstraints(Modifier.fillMaxSize(), contentAlignment = Alignment.BottomCenter) {
            Image(
                painterResource(R.drawable.cuy_taller_vestidor), null, Modifier.matchParentSize(),
                contentScale = ContentScale.Crop, alignment = Alignment.BottomCenter,
            )
            val lado = minOf(maxWidth * .74f, maxHeight * .88f, 254.dp)
            Canvas(Modifier.matchParentSize()) {
                val salto = sin(PI * fase.value).toFloat().coerceAtLeast(0f)
                val ancho = lado.toPx() * (.48f - .10f * salto)
                drawOval(
                    Color(0xFF835731).copy(alpha = .29f - .11f * salto),
                    Offset((size.width - ancho) / 2f, size.height - 26.dp.toPx()),
                    Size(ancho, 12.dp.toPx()),
                )
                val ciclo = reloj?.value
                if (ciclo != null) {
                    for (i in 0..3) {
                        val p = (ciclo + i * .237f) % 1f
                        val luz = sin(PI * p).toFloat().coerceAtLeast(0f)
                        val x = if (i % 2 == 0) .27f + .08f * p else .74f - .06f * p
                        val y = .68f - .34f * p + (i / 2) * .10f
                        destelloLogros(
                            Offset(size.width * x, size.height * y), (4f + luz * 4f).dp.toPx(),
                            Color(0xFFA65B29).copy(alpha = .70f * luz),
                        )
                    }
                }
            }
            Box(
                Modifier.padding(bottom = 14.dp).size(lado).clip(forma)
                    .toqueLogros(quieto, "Saludar a mi cuy") {
                        pulso++
                        saludar()
                    },
            ) {
                CuerpoMiCuy(
                    apariencia,
                    Modifier.fillMaxSize().graphicsLayer {
                        val salto = sin(PI * fase.value).toFloat().coerceAtLeast(0f)
                        val giro = reloj?.let { sin(2 * PI * it.value).toFloat() } ?: 0f
                        translationY = -(.16f * salto + .014f * giro) * size.height
                        rotationZ = giro * 3f - salto * 8f
                        scaleX = 1f - .045f * salto
                        scaleY = 1f + .072f * salto
                        transformOrigin = TransformOrigin(.5f, .92f)
                    },
                    saludando = saludando,
                )
            }
            EstallidoLogros(fase, Modifier.matchParentSize(), origenY = .59f)
        }
    }
}
