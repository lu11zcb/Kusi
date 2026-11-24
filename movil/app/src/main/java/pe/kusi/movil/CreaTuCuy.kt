package pe.kusi.movil

import android.graphics.BitmapFactory
import androidx.activity.compose.BackHandler
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.saveable.rememberSaveableStateHolder
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.TransformOrigin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin

// Los códigos también identifican el pelaje de cuentas que ya personalizaron su cuy.
internal enum class PelajeCuy(val codigo: Int, val etiqueta: String, val fondo: Color) {
    CAFE(0, "Café", Color(0xFFFFE5D0)),
    CREMA(1, "Crema", Color(0xFFFFF0C6)),
    GRIS(2, "Gris", Color(0xFFE9E4F7)),
    CARAMELO(3, "Caramelo", Color(0xFFFFDDB2)),
}

internal fun pelajeCuyGuardado(codigo: Int): PelajeCuy = PelajeCuy.entries.getOrElse(codigo) { PelajeCuy.CAFE }

private enum class ReaccionMascota(val codigo: Int, val duracion: Int) {
    REPOSO(0, 0), SALUDO(1, 490), CELEBRA(2, 620),
}

private val TintaVestidor = Color(0xFF563428)
private val VerdeVestidor = Color(0xFF286843)
private val TintaMonedas = Color(0xFF775016)
private val FondoMonedas = Color(0xFFFFEAB3)
private const val GuiaVestidor = "Elige su pelaje y combina los accesorios que más te gusten. Toca a tu cuy para que te salude."
private const val LadoCuadroMascota = 224
private const val ApoyoMascotaRive = 210f
private const val EscalaEscenaVestidor = 1.14f
private const val ApoyoEnEscena = 0.95f
private val MedidaMascota = IntSize(LadoCuadroMascota, LadoCuadroMascota)
private const val LadoMuestraPelaje = 384
private const val RutaChalecoPuesto = "vestidor_vistas/chaleco.webp"
private fun rutaVestidor(archivo: String) = "vestidor/$archivo.webp"

@Composable
private fun arteCompleto(ruta: String): ImageBitmap {
    val assets = LocalContext.current.assets
    return remember(assets, ruta) {
        assets.open(ruta).use { BitmapFactory.decodeStream(it).asImageBitmap() }
    }
}

@Composable
internal fun CreaTuCuy(
    aparienciaInicial: AparienciaCuy,
    voz: VozKusi,
    vozActiva: Boolean,
    editando: Boolean,
    volver: () -> Unit,
    guardar: (AparienciaCuy) -> Unit,
) {
    var elegido by rememberSaveable(aparienciaInicial, stateSaver = AparienciaCuySaver) { mutableStateOf(aparienciaInicial) }
    var categoria by rememberSaveable { mutableStateOf<CategoriaCuy?>(null) }
    var viendoChaleco by rememberSaveable { mutableStateOf(false) }
    var pulso by remember { mutableIntStateOf(0) }
    var saludando by remember { mutableStateOf(false) }
    var celebrando by remember { mutableStateOf(false) }
    val contexto = LocalContext.current
    val quieto = remember(contexto) { animacionesDesactivadas(contexto) }
    val papel = MaterialTheme.colorScheme.background
    val tinta = MaterialTheme.colorScheme.onBackground
    val oscuro = papel.luminance() < 0.30f
    val colorSuave = if (oscuro) Color(0xFF213D3C) else Color(0xFFF0F3D8)
    val desplazamientos = rememberSaveableStateHolder()

    LaunchedEffect(pulso) {
        if (pulso > 0) {
            saludando = true
            delay(ReaccionMascota.SALUDO.duracion.toLong())
            saludando = false
        }
    }
    LaunchedEffect(celebrando) {
        if (celebrando) {
            delay(ReaccionMascota.CELEBRA.duracion.toLong())
            guardar(elegido)
        }
    }
    BackHandler(celebrando) {}
    val reaccion = when {
        celebrando -> ReaccionMascota.CELEBRA
        saludando -> ReaccionMascota.SALUDO
        else -> ReaccionMascota.REPOSO
    }

    BoxWithConstraints(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(colorSuave, papel, papel))),
        contentAlignment = Alignment.TopCenter) {
        val dosPaneles = maxWidth >= 600.dp
        Column(Modifier.widthIn(max = if (dosPaneles) 1040.dp else 530.dp).fillMaxSize().padding(horizontal = 16.dp)) {
            Row(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 10.dp),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BotonVestidor(R.drawable.ic_ingreso_atras, "Volver", !celebrando) {
                    voz.callar()
                    volver()
                }
                Text(if (editando) "Edita tu cuy" else "Crea tu cuy",
                    Modifier.weight(1f).semantics { heading() },
                    color = tinta, style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center)
                BotonVestidor(
                    if (voz.hablando) R.drawable.ic_ingreso_silenciar else R.drawable.ic_ingreso_voz,
                    if (voz.hablando) "Dejar de escuchar a Kusi" else "Escuchar a Kusi",
                    vozActiva && !celebrando,
                ) {
                    if (voz.hablando) voz.callar() else voz.hablar(GuiaVestidor)
                }
            }
            val escena: @Composable (Modifier) -> Unit = { modifier ->
                VestidorCuy(modifier, elegido, reaccion, pulso, quieto, !celebrando) {
                    if (!saludando) pulso++
                }
            }
            val botonGuardar: @Composable (Modifier) -> Unit = { modifier ->
                BotonAventura(
                    habilitado = !celebrando,
                    celebrando = celebrando,
                    movimientoReducido = quieto,
                    entrar = { voz.callar(); if (quieto) guardar(elegido) else celebrando = true },
                    modifier = modifier,
                    texto = if (editando) "Guardar cambios" else "¡Listo!",
                )
            }
            val catalogo: @Composable (Modifier) -> Unit = { modifier ->
                Column(modifier, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    PestañasVestidor(categoria, elegido, !celebrando, oscuro) { categoria = it }
                    Surface(
                        Modifier.weight(1f).fillMaxWidth(),
                        shape = RoundedCornerShape(26.dp),
                        color = MaterialTheme.colorScheme.surface,
                        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                        shadowElevation = 2.dp,
                    ) {
                        val activa = categoria
                        desplazamientos.SaveableStateProvider(activa?.name ?: "pelaje") {
                            val panel = Modifier.fillMaxWidth().verticalScroll(rememberScrollState())
                                .padding(horizontal = 11.dp, vertical = 10.dp)
                            if (activa == null) {
                                SelectorPelaje(panel, elegido.pelaje, !celebrando, tinta) {
                                    elegido = elegido.copy(pelaje = it)
                                    pulso++
                                }
                            } else {
                                SelectorPiezas(
                                    panel, activa, elegido.piezas[activa], !celebrando, oscuro,
                                    verChaleco = { viendoChaleco = true },
                                ) {
                                    elegido = elegido.vestir(activa, it)
                                    pulso++
                                }
                            }
                        }
                    }
                }
            }
            BoxWithConstraints(Modifier.fillMaxWidth().weight(1f)) {
                if (dosPaneles) {
                    Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                        Column(Modifier.weight(0.46f).fillMaxHeight().padding(bottom = 9.dp)) {
                            BoxWithConstraints(Modifier.fillMaxWidth().weight(1f, fill = false)) {
                                escena(Modifier.height(minOf(maxHeight, maxWidth * 0.9f, 420.dp)))
                            }
                            botonGuardar(Modifier.fillMaxWidth().padding(top = 8.dp))
                        }
                        catalogo(Modifier.weight(0.54f).fillMaxHeight().padding(bottom = 9.dp))
                    }
                } else {
                    val altoEscena = (maxHeight * (if (maxHeight < 435.dp) 0.37f else 0.43f)).coerceAtMost(290.dp)
                    Column(Modifier.fillMaxSize(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        escena(Modifier.height(altoEscena))
                        catalogo(Modifier.weight(1f).fillMaxWidth())
                    }
                }
            }
            if (!dosPaneles) {
                Box(Modifier.fillMaxWidth().padding(vertical = 9.dp), contentAlignment = Alignment.Center) {
                    botonGuardar(Modifier.widthIn(max = 505.dp).fillMaxWidth())
                }
            }
        }
    }
    if (viendoChaleco) {
        val chaleco = PiezaCuy.CHALECO
        AlertDialog(
            onDismissRequest = { viendoChaleco = false },
            title = { Text(chaleco.etiqueta) },
            shape = RoundedCornerShape(28.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    VestidorCuy(
                        Modifier.weight(1f, fill = false).height(184.dp),
                        AparienciaCuy(elegido.pelaje, mapOf(CategoriaCuy.ROPA to chaleco)),
                        reaccion, pulso, quieto, habilitado = true, ruta = RutaChalecoPuesto,
                    ) { if (!saludando) pulso++ }
                    PrecioDePieza("Bloqueado · ${chaleco.monedas} monedas")
                }
            },
            confirmButton = {
                TextButton(onClick = { viendoChaleco = false }) { Text("Volver al vestidor") }
            },
        )
    }
}

@Composable
private fun BotonVestidor(icono: Int, descripcion: String, habilitado: Boolean, pulsar: () -> Unit) {
    Surface(
        onClick = pulsar, enabled = habilitado, modifier = Modifier.size(48.dp),
        shape = RoundedCornerShape(19.dp), color = Color(0xFFFCEAC4), contentColor = TintaVestidor,
        border = BorderStroke(1.5.dp, Color(0xFFC28B45)),
    ) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Icon(painterResource(icono), descripcion, Modifier.size(25.dp),
                tint = if (habilitado) TintaVestidor else TintaVestidor.copy(alpha = 0.58f))
        }
    }
}

@Composable
private fun VestidorCuy(
    modifier: Modifier,
    apariencia: AparienciaCuy,
    reaccion: ReaccionMascota,
    pulso: Int,
    quieto: Boolean,
    habilitado: Boolean,
    ruta: String = rutaVestidor(apariencia.archivo),
    alTocar: () -> Unit,
) {
    val arte = arteCompleto(ruta)
    val forma = RoundedCornerShape(28.dp)
    BoxWithConstraints(
        modifier.fillMaxWidth().clip(forma).border(1.5.dp, Color(0xFFB99360), forma),
        contentAlignment = Alignment.BottomCenter,
    ) {
        Image(painterResource(R.drawable.cuy_taller_vestidor), null, Modifier.matchParentSize(),
            contentScale = ContentScale.Crop, alignment = Alignment.BottomCenter)
        val lado = minOf(maxWidth, maxHeight * 0.88f)
        val avance = remember(reaccion, pulso) { Animatable(0f) }
        LaunchedEffect(avance, quieto) {
            if (!quieto && reaccion != ReaccionMascota.REPOSO) {
                avance.animateTo(1f, tween(reaccion.duracion, easing = LinearEasing))
            }
        }
        val silueta = remember { SiluetaKusi() }
        Box(Modifier.padding(bottom = maxHeight * 0.114f).size(lado)
            .tocarSiluetaKusi(silueta, "Tu cuy", "Saludar a tu cuy", habilitado = habilitado) { alTocar() }
            .semantics {
                stateDescription = apariencia.descripcion
            }) {
            val riveListo = !quieto && EscenaRiveLocal(
                "kusi_vestidor", "Vestidor", "MiCuy", Modifier.fillMaxSize().graphicsLayer {
                    scaleX = EscalaEscenaVestidor
                    scaleY = EscalaEscenaVestidor
                    transformOrigin = TransformOrigin(0.5f, ApoyoEnEscena)
                },
                atlas = ruta,
            ) { modelo ->
                LaunchedEffect(modelo, apariencia.pelaje) {
                    modelo.setNumber("pelajeX", -LadoCuadroMascota * (0.5f + apariencia.pelaje.codigo))
                }
                LaunchedEffect(modelo, reaccion, pulso) {
                    modelo.setNumber("reaccion", reaccion.codigo.toFloat())
                    modelo.setNumber("poseY", -ApoyoMascotaRive)
                    if (reaccion != ReaccionMascota.REPOSO) {
                        delay((reaccion.duracion * 0.08f).toLong())
                        modelo.setNumber("poseY", -ApoyoMascotaRive - LadoCuadroMascota)
                        delay((reaccion.duracion * 0.73f).toLong())
                        modelo.setNumber("poseY", -ApoyoMascotaRive)
                    }
                }
            }
            Canvas(Modifier.fillMaxSize()) {
                val fase = avance.value
                val arco = sin(fase * PI).toFloat().coerceAtLeast(0f)
                val saluda = reaccion != ReaccionMascota.REPOSO && (quieto || fase in 0.08f..0.81f)
                val celebrando = reaccion == ReaccionMascota.CELEBRA
                val salto = if (celebrando) arco * 0.10f else arco * 0.026f
                val giro = sin(fase * 4 * PI).toFloat() * arco * if (celebrando) 6f else 3.3f
                val medida = Size(size.width * 0.80f * EscalaEscenaVestidor, size.height * 0.80f * EscalaEscenaVestidor)
                val esquina = IntOffset(((size.width - medida.width) / 2f).roundToInt(),
                    (size.height * ApoyoEnEscena - medida.height * (ApoyoCuadroKusi.y + salto)).roundToInt())
                val apoyo = Offset(esquina.x + medida.width * ApoyoCuadroKusi.x, esquina.y + medida.height * ApoyoCuadroKusi.y)
                val origen = IntOffset(apariencia.pelaje.codigo * LadoCuadroMascota, if (saluda) LadoCuadroMascota else 0)
                silueta.actualizar(arte, origen, MedidaMascota, apoyo, medida, giro * PI.toFloat() / 180f)
                if (!riveListo) rotate(giro, pivot = apoyo) {
                    drawImage(arte, origen, MedidaMascota, esquina,
                        IntSize(medida.width.roundToInt(), medida.height.roundToInt()), filterQuality = FilterQuality.High)
                }
                if (celebrando && !quieto) {
                    estrellaDelCuy(Offset(size.width * 0.15f, size.height * (0.46f - fase * 0.17f)), 7.dp.toPx(), arco)
                    estrellaDelCuy(Offset(size.width * 0.88f, size.height * (0.40f - fase * 0.14f)), 8.dp.toPx(), arco)
                }
            }
        }
    }
}

private fun DrawScope.estrellaDelCuy(centro: Offset, radio: Float, alpha: Float) {
    val oro = Color(0xFFE89629)
    val horizontal = Offset(radio, 0f)
    val vertical = Offset(0f, radio)
    drawLine(oro, centro - horizontal, centro + horizontal, 2.5.dp.toPx(), StrokeCap.Round, alpha = alpha)
    drawLine(oro, centro - vertical, centro + vertical, 2.5.dp.toPx(), StrokeCap.Round, alpha = alpha)
}

@Composable
private fun SelectorPelaje(
    modifier: Modifier,
    elegido: PelajeCuy,
    habilitado: Boolean,
    tinta: Color,
    seleccionar: (PelajeCuy) -> Unit,
) {
    val arte = ImageBitmap.imageResource(R.drawable.cuy_pelajes)
    val esquema = MaterialTheme.colorScheme
    Column(modifier, verticalArrangement = Arrangement.spacedBy(7.dp)) {
        Text("Elige su pelaje", Modifier.semantics { heading() }.padding(start = 4.dp),
            color = tinta, style = MaterialTheme.typography.titleLarge)
        CuadriculaVestidor(PelajeCuy.entries, columnasAmplias = 4) { pelaje, tarjeta ->
            val seleccionado = pelaje == elegido
            val forma = RoundedCornerShape(20.dp)
            Box(
                tarjeta.clip(forma).background(pelaje.fondo)
                    .border(if (seleccionado) 3.dp else 1.dp,
                        if (seleccionado) VerdeVestidor else esquema.outline, forma)
                    .selectable(seleccionado, enabled = habilitado, role = Role.RadioButton) { seleccionar(pelaje) },
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(horizontal = 6.dp, vertical = 8.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(3.dp),
                ) {
                    Canvas(Modifier.size(80.dp, 66.dp)) {
                        drawImage(
                            arte, srcOffset = IntOffset(pelaje.codigo * LadoMuestraPelaje + 58, 19),
                            srcSize = IntSize(268, 221), dstSize = IntSize(size.width.roundToInt(), size.height.roundToInt()),
                            filterQuality = FilterQuality.High,
                        )
                    }
                    Text(pelaje.etiqueta, color = TintaVestidor, style = MaterialTheme.typography.titleSmall,
                        textAlign = TextAlign.Center)
                }
                if (seleccionado) MarcaOpcion(Modifier.align(Alignment.TopEnd).padding(6.dp), bloqueada = false)
            }
        }
    }
}

private fun colorCategoria(categoria: CategoriaCuy?): Color = when (categoria) {
    null -> Color(0xFFE4EFD1)
    CategoriaCuy.CABEZA -> Color(0xFFFFEACE)
    CategoriaCuy.LENTES -> Color(0xFFF0E8FB)
    CategoriaCuy.ROPA -> Color(0xFFFFE5D9)
    CategoriaCuy.MOCHILA -> Color(0xFFE0EFFB)
}

@Composable
private fun PestañasVestidor(
    activa: CategoriaCuy?,
    apariencia: AparienciaCuy,
    habilitado: Boolean,
    oscuro: Boolean,
    elegir: (CategoriaCuy?) -> Unit,
) {
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val anchoCompleto = maxWidth >= 306.dp && LocalDensity.current.fontScale <= 1.25f
        Row(
            Modifier.fillMaxWidth().then(if (anchoCompleto) Modifier else Modifier.horizontalScroll(rememberScrollState()))
                .selectableGroup(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            for (categoria in listOf(null) + CategoriaCuy.entries) {
                val seleccionada = categoria == activa
                val icono = apariencia.piezas[categoria]?.icono ?: when (categoria) {
                    null -> R.drawable.ic_palette
                    CategoriaCuy.CABEZA -> R.drawable.cuy_sombrero_verde
                    CategoriaCuy.LENTES -> R.drawable.cuy_lentes_azules
                    CategoriaCuy.ROPA -> R.drawable.cuy_polo_azul
                    CategoriaCuy.MOCHILA -> R.drawable.cuy_mochila_miel
                }
                val forma = RoundedCornerShape(20.dp)
                val fondo = when {
                    seleccionada -> VerdeVestidor
                    oscuro -> MaterialTheme.colorScheme.surfaceVariant
                    else -> colorCategoria(categoria)
                }
                val texto = when {
                    seleccionada -> Color.White
                    oscuro -> MaterialTheme.colorScheme.onSurfaceVariant
                    else -> TintaVestidor
                }
                Column(
                    (if (anchoCompleto) Modifier.weight(1f) else Modifier.widthIn(min = 71.dp))
                        .heightIn(min = 72.dp).clip(forma).background(fondo)
                        .border(1.dp, if (seleccionada) Color(0xFF1C5937) else MaterialTheme.colorScheme.outlineVariant, forma)
                        .selectable(seleccionada, enabled = habilitado, role = Role.Tab) { elegir(categoria) }
                        .padding(horizontal = 3.dp, vertical = 5.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Box(
                        Modifier.size(48.dp, 40.dp)
                            .background(if (seleccionada) Color(0xFFE5F2D7) else Color.White.copy(alpha = if (oscuro) 0.10f else 0.48f),
                                RoundedCornerShape(14.dp)),
                        contentAlignment = Alignment.Center,
                    ) {
                        if (categoria == null) {
                            Icon(painterResource(icono), null, Modifier.size(29.dp),
                                tint = if (seleccionada) VerdeVestidor else texto)
                        } else {
                            Image(painterResource(icono), null, Modifier.size(39.dp, 34.dp))
                        }
                    }
                    Text(categoria?.etiqueta ?: "Pelaje", style = MaterialTheme.typography.labelSmall,
                        color = texto, textAlign = TextAlign.Center)
                }
            }
        }
    }
}

@Composable
private fun SelectorPiezas(
    modifier: Modifier,
    categoria: CategoriaCuy,
    elegida: PiezaCuy?,
    habilitado: Boolean,
    oscuro: Boolean,
    verChaleco: () -> Unit,
    elegir: (PiezaCuy?) -> Unit,
) {
    val opciones = listOf(null) + PiezaCuy.entries.filter { it.categoria == categoria }
    Column(modifier) {
        CuadriculaVestidor(opciones, columnasAmplias = 3) { pieza, tarjeta ->
            TarjetaPieza(
                tarjeta, pieza, categoria, pieza == elegida, habilitado, oscuro,
                verPuesta = if (pieza == PiezaCuy.CHALECO) verChaleco else null,
            ) { elegir(pieza) }
        }
    }
}

@Composable
private fun <T> CuadriculaVestidor(
    opciones: List<T>,
    columnasAmplias: Int,
    contenido: @Composable (T, Modifier) -> Unit,
) {
    BoxWithConstraints(Modifier.fillMaxWidth()) {
        val fuente = LocalDensity.current.fontScale
        val columnas = when {
            maxWidth < 215.dp || fuente > 1.6f -> 1
            maxWidth >= 425.dp && fuente <= 1.2f -> columnasAmplias
            else -> 2
        }
        Column(Modifier.selectableGroup(), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            for (fila in opciones.chunked(columnas)) {
                Row(Modifier.fillMaxWidth().height(IntrinsicSize.Min), horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    for (opcion in fila) contenido(opcion, Modifier.weight(1f).fillMaxHeight())
                    repeat(columnas - fila.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
private fun TarjetaPieza(
    modifier: Modifier,
    pieza: PiezaCuy?,
    categoria: CategoriaCuy,
    seleccionada: Boolean,
    habilitado: Boolean,
    oscuro: Boolean,
    verPuesta: (() -> Unit)?,
    elegir: () -> Unit,
) {
    val esquema = MaterialTheme.colorScheme
    val bloqueada = pieza?.bloqueada == true
    val forma = RoundedCornerShape(20.dp)
    val fondo = when {
        seleccionada && oscuro -> Color(0xFF294C3B)
        seleccionada -> Color(0xFFECF4DF)
        oscuro -> esquema.surfaceVariant
        bloqueada -> Color(0xFFFFF8E7)
        else -> Color(0xFFFFFCF6)
    }
    val bordeSeleccion = if (oscuro) Color(0xFFA4D7AD) else VerdeVestidor
    Column(
        modifier.clip(forma).background(fondo)
            .border(if (seleccionada) 3.dp else 1.dp, if (seleccionada) bordeSeleccion else esquema.outlineVariant, forma)
            .selectable(seleccionada, enabled = habilitado && !bloqueada, role = Role.RadioButton, onClick = elegir)
            .semantics { if (bloqueada) stateDescription = "Bloqueado" }
            .padding(7.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Box(
            Modifier.fillMaxWidth().height(73.dp)
                .background(if (seleccionada) Color(0xFFDCECC6) else colorCategoria(categoria), RoundedCornerShape(15.dp)),
            contentAlignment = Alignment.Center,
        ) {
            if (pieza == null) {
                Icon(painterResource(R.drawable.ic_cuy_sin_accesorio), null, Modifier.size(32.dp), tint = TintaVestidor)
            } else {
                Image(painterResource(pieza.icono), null, Modifier.size(89.dp, 64.dp).padding(3.dp),
                    alpha = if (bloqueada) 0.83f else 1f)
            }
            if (bloqueada || seleccionada) MarcaOpcion(Modifier.align(Alignment.TopEnd).padding(4.dp), bloqueada)
        }
        Text(pieza?.etiqueta ?: categoria.sinPieza, color = esquema.onSurface,
            style = MaterialTheme.typography.titleSmall, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = 2.dp))
        if (pieza != null && bloqueada) PrecioDePieza("${pieza.monedas} monedas")
        if (verPuesta != null) {
            TextButton(onClick = verPuesta, enabled = habilitado, contentPadding = PaddingValues(horizontal = 7.dp)) {
                Text("Ver puesto", style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center)
            }
        }
    }
}

@Composable
private fun MarcaOpcion(modifier: Modifier, bloqueada: Boolean) {
    Box(
        modifier.size(22.dp).background(if (bloqueada) FondoMonedas else VerdeVestidor, CircleShape),
        contentAlignment = Alignment.Center,
    ) {
        Icon(painterResource(if (bloqueada) R.drawable.ic_cuy_bloqueado else R.drawable.ic_check), null,
            Modifier.size(14.dp), tint = if (bloqueada) TintaMonedas else Color.White)
    }
}

@Composable
private fun PrecioDePieza(texto: String) {
    Surface(color = FondoMonedas, contentColor = TintaMonedas, shape = RoundedCornerShape(12.dp)) {
        Row(
            Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            Icon(painterResource(R.drawable.ic_cuy_moneda), null, Modifier.size(14.dp))
            Text(texto, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center)
        }
    }
}

@Composable
internal fun CuerpoMiCuy(apariencia: AparienciaCuy, modifier: Modifier = Modifier, saludando: Boolean = false) {
    val arte = arteCompleto(rutaVestidor(apariencia.archivo))
    Canvas(modifier.semantics {
        contentDescription = "Mi cuy de ${apariencia.descripcion.replaceFirstChar { it.lowercase() }}"
    }) {
        drawImage(
            arte,
            srcOffset = IntOffset(apariencia.pelaje.codigo * LadoCuadroMascota, if (saludando) LadoCuadroMascota else 0),
            srcSize = MedidaMascota,
            dstSize = IntSize(size.width.roundToInt(), size.height.roundToInt()),
            filterQuality = FilterQuality.High,
        )
    }
}

@Composable
internal fun RetratoMiCuy(
    apariencia: AparienciaCuy,
    modifier: Modifier = Modifier,
    saludando: Boolean = false,
    reflejado: Boolean = false,
) {
    val arte = arteCompleto(rutaVestidor(apariencia.archivo))
    Canvas(modifier) {
        scale(if (reflejado) -1f else 1f, 1f, pivot = center) {
            drawImage(
                arte, srcOffset = IntOffset(
                    apariencia.pelaje.codigo * LadoCuadroMascota + 31,
                    if (saludando) LadoCuadroMascota + 3 else 3,
                ),
                srcSize = IntSize(162, 162), dstSize = IntSize(size.width.roundToInt(), size.height.roundToInt()),
                filterQuality = FilterQuality.High,
            )
        }
    }
}
