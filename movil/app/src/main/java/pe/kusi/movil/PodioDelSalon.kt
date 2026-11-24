package pe.kusi.movil

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.isTraversalGroup
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.traversalIndex
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.PI
import kotlin.math.sin

private val Marfil = Color(0xFFFFF3D6)
private val Ciruela = Color(0xFF35234F)
private val Oro = Color(0xFFFFD26B)
private val ColoresDelPodio = listOf(Oro, Color(0xFFF9A895), Color(0xFFD2C0FF), Color(0xFF8FE4C8))
private val OrdenDelPodio = listOf(2, 1, 3)

private data class SaludoEnPodio(val primero: Int, val segundo: Int, val saludando: Int) {
    fun vecino(lugar: Int): Int? = when (lugar) {
        primero -> segundo
        segundo -> primero
        else -> null
    }
}

@Composable
internal fun PodioDelSalon(
    ranking: RankingSalonInfantil,
    abrirCursos: () -> Unit,
    miCuy: AparienciaCuy? = null,
    compacto: Boolean = false,
    quieto: Boolean = false,
    escuchar: ((String) -> Unit)? = null,
    espacioExtra: Dp = 0.dp,
) {
    val podio = ranking.podio.take(3)
    val reloj = relojDeFiesta(quieto, "Saludos del podio", duracion = 5200)
    var inicio by remember { mutableIntStateOf(1) }
    var encuentro by remember { mutableIntStateOf(0) }
    val faseEncuentro = faseDeFiesta(encuentro, quieto, duracion = 1850)
    val saludo = remember(podio.size, reloj, faseEncuentro) {
        derivedStateOf {
            if (reloj == null || podio.size < 2) return@derivedStateOf null
            val tocado = faseEncuentro.value < 1f
            val ciclo = reloj.value
            val (primero, segundo) = when {
                tocado && inicio != 1 -> inicio to 1
                tocado -> 1 to if (podio.size == 3 && encuentro % 2 == 0) 3 else 2
                ciclo < .5f || podio.size == 2 -> 2 to 1
                else -> 1 to 3
            }
            val fase = if (tocado) faseEncuentro.value else (ciclo * 2f) % 1f
            val turno = when (fase) {
                in 0.15f..0.34f -> primero
                in 0.43f..0.66f -> segundo
                else -> 0
            }
            SaludoEnPodio(primero, segundo, turno)
        }
    }
    Box(
        Modifier.fillMaxWidth().clip(RoundedCornerShape(25.dp))
            .background(Brush.verticalGradient(listOf(Color(0xFF5C427D), Ciruela)))
            .semantics { if (compacto) contentDescription = "Podio del salón" },
    ) {
        PaisajeDelPodio(Modifier.matchParentSize(), reloj)
        Column(
            Modifier.fillMaxWidth().padding(horizontal = 11.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(3.dp),
        ) {
            if (!compacto) Row(
                Modifier.padding(start = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(7.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Image(painterResource(R.drawable.kusi_nav_logros), null, Modifier.size(27.dp))
                Text(
                    "Podio", Modifier.semantics { heading() },
                    style = MaterialTheme.typography.titleLarge, color = Marfil,
                )
            }
            if (podio.isEmpty()) {
                Row(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(15.dp))
                        .background(Color(0xFF382751)).heightIn(min = 69.dp)
                        .toqueLogros(quieto, "Elegir una aventura", abrirCursos)
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Image(painterResource(R.drawable.kusi_libro_aventura), null, Modifier.size(52.dp))
                    Text(
                        "¡Sé el primero en ganar puntos!", Modifier.weight(1f),
                        style = MaterialTheme.typography.titleMedium, color = Marfil,
                    )
                    IconoKusi(R.drawable.ic_kusi_play, modifier = Modifier.size(24.dp), color = Oro)
                }
            } else {
                Row(
                    Modifier.fillMaxWidth().semantics { isTraversalGroup = true },
                    horizontalArrangement = Arrangement.spacedBy(5.dp),
                    verticalAlignment = Alignment.Bottom,
                ) {
                    for (lugar in OrdenDelPodio) {
                        val puesto = podio.getOrNull(lugar - 1)
                        if (puesto == null) {
                            Spacer(Modifier.weight(1f))
                        } else {
                            EscalonDelPodio(
                                lugar, puesto, miCuy, compacto, quieto, escuchar,
                                espacioExtra, reloj, saludo, Modifier.weight(1f),
                            ) {
                                inicio = lugar
                                encuentro++
                            }
                        }
                    }
                }
                if (podio.none { it.esMiPuesto }) {
                    Text(
                        "Tú: ${ranking.misPuntos} puntos. ¡Sigue jugando!",
                        Modifier.fillMaxWidth().padding(top = 4.dp),
                        style = MaterialTheme.typography.titleSmall, textAlign = TextAlign.Center, color = Marfil,
                    )
                }
            }
        }
    }
}

@Composable
private fun EscalonDelPodio(
    lugar: Int,
    puesto: PuestoSalonInfantil,
    miCuy: AparienciaCuy?,
    compacto: Boolean,
    quieto: Boolean,
    escuchar: ((String) -> Unit)?,
    espacioExtra: Dp,
    reloj: State<Float>?,
    saludo: State<SaludoEnPodio?>,
    modifier: Modifier,
    iniciarSaludo: () -> Unit,
) {
    val remoto = remember(puesto.pelaje, puesto.accesorios) {
        AparienciaCuy(pelajeCuyGuardado(puesto.pelaje), piezasGuardadas(puesto.accesorios))
    }
    val apariencia = if (puesto.esMiPuesto) miCuy ?: remoto else remoto
    val tono = when (lugar) {
        1 -> Oro
        2 -> Color(0xFFC9C3F9)
        else -> Color(0xFFFFAE88)
    }
    val base = when (lugar) {
        1 -> Color(0xFFE59838)
        2 -> Color(0xFF8E7DC6)
        else -> Color(0xFFC46951)
    }
    val rostro = if (compacto) 56.dp else 66.dp + espacioExtra * .14f
    val alto = when (lugar) {
        1 -> 51.dp + espacioExtra * .08f
        2 -> 43.dp + espacioExtra * .065f
        else -> 36.dp + espacioExtra * .045f
    } - if (compacto) 7.dp else 0.dp
    val nombre = if (puesto.esMiPuesto) "¡Tú!" else puesto.nombreCorto
    var pulso by remember { mutableIntStateOf(0) }
    val fase = faseDeFiesta(pulso, quieto)
    val saludoSolo = saludoDeCuy(fase, reloj, lugar * .24f)
    val vecino = saludo.value?.vecino(lugar)
    val miraDerecha = if (vecino != null) {
        OrdenDelPodio.indexOf(vecino) > OrdenDelPodio.indexOf(lugar)
    } else lugar == 2
    val giro = animateFloatAsState(
        if (quieto || vecino == null) 0f else if (miraDerecha) 1f else -1f,
        if (quieto) snap() else tween(180, easing = SalidaPlaza), label = "Acercarse al otro cuy",
    )
    val saludando = saludo.value?.let { it.saludando == lugar } ?: saludoSolo.value
    val entrada = entradaDeLogros(quieto, (lugar - 1) * 85)
    val tarjeta = RoundedCornerShape(13.dp)
    Column(
        modifier.clip(tarjeta)
            .toqueLogros(quieto, "Saludar a $nombre") {
                pulso++
                iniciarSaludo()
                escuchar?.invoke(if (puesto.esMiPuesto) "Tú. ${puesto.puntos} puntos." else "$nombre. ${puesto.puntos} puntos.")
            }
            .semantics { traversalIndex = lugar.toFloat() },
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            Modifier.fillMaxWidth().height(rostro + 4.dp),
            contentAlignment = Alignment.BottomCenter,
        ) {
            val marco = RoundedCornerShape(percent = 30)
            Box(
                Modifier.size(if (lugar == 1) rostro + 3.dp else rostro)
                    .graphicsLayer {
                        val toca = sin(PI * fase.value).toFloat().coerceAtLeast(0f)
                        val respiro = reloj?.let { oscilacionLogros(it.value + lugar * .16f) } ?: 0f
                        translationY = (1f - entrada.value) * 18.dp.toPx() - (toca * 16f + respiro * 4f).dp.toPx()
                        translationX = 3.dp.toPx() * giro.value
                        rotationZ = (6f + toca * 4f) * giro.value
                        scaleX = .88f + entrada.value * .12f + toca * .1f
                        scaleY = scaleX
                        alpha = .25f + .75f * entrada.value
                    }
                    .background(Brush.verticalGradient(listOf(Marfil, tono)), marco)
                    .border(if (puesto.esMiPuesto) 2.5.dp else 1.5.dp, tono, marco)
                    .clip(marco),
                contentAlignment = Alignment.Center,
            ) {
                RetratoMiCuy(
                    apariencia,
                    Modifier.fillMaxSize().graphicsLayer { rotationY = -17f * giro.value },
                    saludando = saludando,
                    reflejado = miraDerecha,
                )
            }
            EstallidoLogros(fase, Modifier.matchParentSize())
        }
        Text(
            nombre, Modifier.padding(horizontal = 2.dp),
            style = if (espacioExtra >= 80.dp) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleSmall,
            color = if (puesto.esMiPuesto) Oro else Marfil,
            maxLines = 1, overflow = TextOverflow.Ellipsis, textAlign = TextAlign.Center,
        )
        Row(
            Modifier.fillMaxWidth().heightIn(min = alto).clip(tarjeta).background(base)
                .padding(bottom = 4.dp)
                .background(Brush.verticalGradient(listOf(Marfil, tono)), tarjeta)
                .padding(horizontal = 4.dp, vertical = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(5.dp, Alignment.CenterHorizontally),
        ) {
            Box(
                Modifier.size(if (espacioExtra >= 80.dp) 26.dp else 22.dp).background(base.copy(alpha = .30f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Text("$lugar", Modifier.clearAndSetSemantics { contentDescription = "Puesto $lugar" },
                    style = MaterialTheme.typography.titleSmall, color = Ciruela)
            }
            Text(
                puesto.puntos.toString(),
                Modifier.clearAndSetSemantics { contentDescription = "${puesto.puntos} puntos" },
                style = if (espacioExtra >= 80.dp) MaterialTheme.typography.headlineMedium else MaterialTheme.typography.headlineSmall,
                textAlign = TextAlign.Center, color = Ciruela,
            )
        }
    }
}

@Composable
private fun PaisajeDelPodio(modifier: Modifier, reloj: State<Float>?) {
    Canvas(modifier) {
        val sol = Offset(size.width * .81f, size.height * .37f)
        drawCircle(Oro.copy(alpha = .13f), size.height * .29f, sol)
        drawCircle(Oro.copy(alpha = .17f), size.height * .23f, sol)
        val cerros = Path().apply {
            moveTo(0f, size.height * .76f)
            lineTo(size.width * .19f, size.height * .42f)
            lineTo(size.width * .42f, size.height * .76f)
            lineTo(size.width * .61f, size.height * .52f)
            lineTo(size.width * .87f, size.height * .86f)
            lineTo(size.width, size.height * .63f)
            lineTo(size.width, size.height)
            lineTo(0f, size.height)
            close()
        }
        drawPath(cerros, Color(0xFF2A1B43).copy(alpha = .55f))
        val luz = oscilacionLogros(reloj?.value ?: .16f)
        if (reloj != null) papelDelPodio(reloj.value)
        destelloLogros(Offset(size.width * .38f, size.height * .24f), (5f + luz * 2f).dp.toPx(), Marfil.copy(alpha = .52f + luz * .40f))
        destelloLogros(Offset(size.width * .66f, size.height * .19f), (4f + (1f - luz) * 2f).dp.toPx(), Oro)
        destelloLogros(Offset(size.width * .92f, size.height * .20f), 6.dp.toPx(), Marfil.copy(alpha = .87f - luz * .47f))
    }
}

private fun DrawScope.papelDelPodio(ciclo: Float) {
    for (i in 0 until 15) {
        val avance = (ciclo + i * .173f) % 1f
        val columna = .04f + ((i * .381f) % 1f) * .92f
        val vaiven = sin(2 * PI * (avance + i * .17f)).toFloat() * .037f
        val punto = Offset(size.width * (columna + vaiven), size.height * (.13f + .79f * avance))
        val color = ColoresDelPodio[i % ColoresDelPodio.size].copy(
            alpha = sin(PI * avance).toFloat() * .82f,
        )
        if (i % 3 == 0) {
            destelloLogros(punto, (4 + i % 3).dp.toPx(), color)
        } else {
            val lado = (2.5f + i % 3).dp.toPx()
            rotate(45f * i + 190f * avance, punto) {
                drawRect(color, punto - Offset(lado / 2f, lado), Size(lado, lado * 2f))
            }
        }
    }
}

internal fun DrawScope.destelloLogros(centro: Offset, radio: Float, color: Color) {
    val punta = Path().apply {
        moveTo(centro.x, centro.y - radio)
        lineTo(centro.x + radio * .23f, centro.y - radio * .23f)
        lineTo(centro.x + radio, centro.y)
        lineTo(centro.x + radio * .23f, centro.y + radio * .23f)
        lineTo(centro.x, centro.y + radio)
        lineTo(centro.x - radio * .23f, centro.y + radio * .23f)
        lineTo(centro.x - radio, centro.y)
        lineTo(centro.x - radio * .23f, centro.y - radio * .23f)
        close()
    }
    drawPath(punta, color)
}

@Composable
internal fun SenderoDelSalon(meta: MetaSalonInfantil, quieto: Boolean, escuchar: ((String) -> Unit)?, espacioExtra: Dp) {
    if (meta.objetivo <= 0) return
    val colores = MaterialTheme.colorScheme
    val proporcion = (meta.puntosDelSalon.toDouble() / meta.objetivo).coerceIn(0.0, 1.0).toFloat()
    val avance = remember { Animatable(if (quieto) proporcion else 0f) }
    LaunchedEffect(proporcion, quieto) {
        if (quieto) avance.snapTo(proporcion)
        else avance.animateTo(proporcion, tween(640, delayMillis = 120, easing = SalidaPlaza))
    }
    val forma = RoundedCornerShape(18.dp)
    val mensaje = "Meta del salón. ${meta.puntosDelSalon} de ${meta.objetivo} puntos."
    val grande = espacioExtra >= 80.dp
    val letra = if (grande) MaterialTheme.typography.titleMedium else MaterialTheme.typography.titleSmall
    var pulso by remember { mutableIntStateOf(0) }
    val fase = faseDeFiesta(pulso, quieto)
    val reloj = relojDeFiesta(quieto, "Bandera de la meta")
    Row(
        Modifier.fillMaxWidth().clip(forma).background(colores.secondaryContainer)
            .toqueLogros(quieto, "Celebrar la meta") {
                pulso++
                escuchar?.invoke(mensaje)
            }
            .semantics { contentDescription = mensaje }
            .heightIn(min = 50.dp + espacioExtra * .08f).padding(horizontal = 12.dp, vertical = 5.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.size(if (grande) 47.dp else 37.dp)) {
            Image(
                painterResource(R.drawable.kusi_bandera_meta), null,
                Modifier.fillMaxSize().graphicsLayer {
                    val arco = sin(PI * fase.value).toFloat()
                    val ondea = reloj?.let { oscilacionLogros(it.value) - .5f } ?: 0f
                    translationY = -6.dp.toPx() * arco
                    rotationZ = 14f * arco + ondea * 10f
                },
            )
            if (proporcion == 1f) EstallidoLogros(fase, Modifier.matchParentSize())
        }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text("Meta del salón", style = letra, color = colores.onSecondaryContainer)
            LinearProgressIndicator(
                progress = { avance.value }, modifier = Modifier.fillMaxWidth().height(if (grande) 10.dp else 7.dp).clip(CircleShape),
                color = colores.primary, trackColor = colores.onSecondaryContainer.copy(alpha = .17f),
                gapSize = 0.dp, drawStopIndicator = {},
            )
        }
        Text(
            "${meta.puntosDelSalon} / ${meta.objetivo}", style = letra,
            color = colores.onSecondaryContainer,
        )
    }
}
