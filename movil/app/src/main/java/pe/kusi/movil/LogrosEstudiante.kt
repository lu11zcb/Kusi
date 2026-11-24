package pe.kusi.movil

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.currentStateAsState

private enum class Medalla(
    val titulo: String,
    val meta: Int,
    val dibujo: Int,
    val luz: Color,
    val color: Color,
    val borde: Color,
) {
    PRIMERA_AVENTURA("Primera aventura", 1, R.drawable.kusi_libro_aventura, Color(0xFFFFEC99), Color(0xFFFFBF4E), Color(0xFFB76525)),
    CINCO_RETOS("Cinco retos", 5, R.drawable.kusi_jardin_flor, Color(0xFFDFF299), Color(0xFF9BD381), Color(0xFF4A8D5B)),
    DIEZ_RETOS("Diez retos", 10, R.drawable.kusi_nav_logros, Color(0xFFF3D8FF), Color(0xFFC7A0F3), Color(0xFF7948A5)),
}

@Composable
internal fun LogrosEstudiante(
    estado: EstadoEntradaKusi,
    logros: EstadoLogrosInfantil,
    voz: VozKusi,
    vozActiva: Boolean,
    ayuda: () -> Unit,
    comprobar: () -> Unit,
    recargar: (() -> Unit)?,
    abrirCursos: () -> Unit,
    apariencia: AparienciaCuy,
    modifier: Modifier = Modifier,
) {
    val resumen = logros.resumen?.takeIf { estado.validado }
    val ranking = logros.ranking?.takeIf { estado.validado }
    val meta = logros.metaSalon?.takeIf { estado.validado }
    val contexto = LocalContext.current
    val ciclo by LocalLifecycleOwner.current.lifecycle.currentStateAsState()
    val quieto = !ciclo.isAtLeast(Lifecycle.State.STARTED) || remember(contexto, ciclo) { animacionesDesactivadas(contexto) }
    var avanceAbierto by rememberSaveable { mutableStateOf(false) }
    var medallaAbierta by rememberSaveable { mutableStateOf<Medalla?>(null) }
    val escuchar = voz.hablar.takeIf { vozActiva }
    val saludo = when {
        resumen == null -> "Aquí verás tus puntos y tus medallas."
        resumen.puntos == 0L -> "¡Vamos por tu primera medalla!"
        else -> "¡Tienes ${resumen.puntos} puntos!"
    }
    val escala = LocalDensity.current.fontScale

    BoxWithConstraints(modifier.widthIn(max = 760.dp).fillMaxSize()) {
        val ancho = maxWidth >= 618.dp
        val fueraDelPodio = ranking?.podio?.let { puestos -> puestos.isNotEmpty() && puestos.take(3).none { it.esMiPuesto } } == true
        val alturaBase = if (fueraDelPodio) 665.dp else 635.dp
        val compacto = maxHeight < alturaBase && escala <= 1.3f
        val espacioExtra = if (!ancho && constraints.hasBoundedHeight && escala <= 1.3f && resumen != null) {
            (maxHeight - alturaBase).coerceIn(0.dp, 320.dp)
        } else 0.dp
        val altoPortada = when {
            escala > 1.7f -> 240.dp
            escala > 1.3f -> 190.dp
            ancho && maxHeight < 500.dp -> 121.dp
            compacto -> 126.dp
            else -> 169.dp + espacioExtra * .33f
        }
        val espacio = if (compacto) 7.dp else 11.dp + espacioExtra * .025f
        val ladoMedalla = if (compacto) 65.dp else {
            minOf(76.dp + espacioExtra * .21f, (maxWidth - 60.dp) / 3f).coerceAtLeast(60.dp)
        }
        val mostrarJugar = resumen?.retos == 0L && ranking?.podio?.isEmpty() != true
        val portada: @Composable () -> Unit = {
            PortadaFiesta(
                resumen, altoPortada, apariencia, quieto,
                celebrar = { escuchar?.invoke(saludo) },
                verAvance = resumen?.let { { avanceAbierto = true } },
            )
        }
        val medallas: @Composable () -> Unit = {
            resumen?.let {
                ColeccionDeMedallas(it.retos, quieto, compacto, ladoMedalla) { medallaAbierta = it }
            }
        }
        val salon: @Composable () -> Unit = {
            ranking?.let { PodioDelSalon(it, abrirCursos, apariencia, compacto, quieto, escuchar, espacioExtra) }
        }
        val objetivo: @Composable () -> Unit = {
            meta?.let { SenderoDelSalon(it, quieto, escuchar, espacioExtra) }
        }
        val jugar: @Composable () -> Unit = {
            if (mostrarJugar) {
                BotonKusi("Jugar", abrirCursos, Modifier.fillMaxWidth(), icono = R.drawable.ic_kusi_play, compacto = true)
            }
        }
        Column(
            Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = 13.dp, vertical = 4.dp),
            verticalArrangement = Arrangement.spacedBy(espacio),
        ) {
            EncabezadoLogros(escuchar?.let { { it(saludo) } }, ayuda)
            when {
                ancho && (ranking != null || meta != null) -> {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(13.dp)) {
                        Column(Modifier.weight(1.1f), verticalArrangement = Arrangement.spacedBy(espacio)) {
                            portada()
                            medallas()
                            jugar()
                        }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(espacio)) {
                            salon()
                            objetivo()
                        }
                    }
                }
                else -> {
                    portada()
                    salon()
                    medallas()
                    objetivo()
                    jugar()
                }
            }
            when {
                !estado.validado -> {
                    AvisoKusi(estado.mensaje ?: "Comprobemos tu acceso.", error = estado.mensaje != null)
                    BotonKusi("Comprobar", comprobar, Modifier.fillMaxWidth(), habilitado = !estado.ocupado, compacto = true)
                }
                logros.error != null -> {
                    AvisoKusi(logros.error, error = true)
                    if (recargar != null) {
                        BotonKusi("Intentar otra vez", recargar, Modifier.fillMaxWidth(), compacto = true)
                    }
                }
                resumen == null && (recargar != null || logros.cargando) -> {
                    LinearProgressIndicator(Modifier.fillMaxWidth().semantics {
                        liveRegion = LiveRegionMode.Polite
                        contentDescription = "Buscando tus logros"
                    })
                }
            }
        }
    }
    medallaAbierta?.let { medalla ->
        if (resumen != null) DetalleDeMedalla(medalla, resumen.retos, quieto) { medallaAbierta = null }
    }
    if (avanceAbierto && resumen != null) AvanceDeLogros(resumen) { avanceAbierto = false }
}

@Composable
private fun EncabezadoLogros(escuchar: (() -> Unit)?, ayuda: () -> Unit) {
    val colores = MaterialTheme.colorScheme
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        Text(
            "Mis logros", Modifier.weight(1f).padding(start = 3.dp).semantics { heading() },
            style = MaterialTheme.typography.headlineLarge, color = colores.onBackground,
        )
        escuchar?.let {
            IconButton(it, Modifier.size(48.dp)) {
                IconoKusi(R.drawable.ic_ingreso_voz, "Escuchar a Kusi", color = colores.onBackground)
            }
        }
        IconButton(ayuda, Modifier.size(48.dp)) {
            IconoKusi(R.drawable.ic_question, "Necesito ayuda", color = colores.onBackground)
        }
    }
}

@Composable
private fun ColeccionDeMedallas(retos: Long, quieto: Boolean, compacto: Boolean, lado: Dp, abrir: (Medalla) -> Unit) {
    val colores = MaterialTheme.colorScheme
    val oscuro = colores.background.luminance() < .30f
    val papel = if (oscuro) colores.surface else Color(0xFFFFEDD3)
    val borde = if (oscuro) colores.outlineVariant else Color(0xFFE7C593)
    val reloj = relojDeFiesta(quieto || retos < 1L, "Luz de las medallas")
    Surface(
        Modifier.fillMaxWidth(), color = papel, contentColor = colores.onSurface,
        shape = RoundedCornerShape(25.dp), border = BorderStroke(1.dp, borde),
    ) {
        val ficha: @Composable RowScope.() -> Unit = {
            for (medalla in Medalla.entries) {
                val ganada = retos >= medalla.meta
                val entrada = entradaDeLogros(quieto, 160 + medalla.ordinal * 70)
                Box(
                    Modifier.weight(1f).height(lado + 6.dp).clip(RoundedCornerShape(18.dp))
                        .toqueLogros(quieto, "Ver medalla") { abrir(medalla) }
                        .semantics {
                            contentDescription = medalla.titulo
                            stateDescription = if (ganada) "Conseguida" else "Por ganar"
                        },
                    contentAlignment = Alignment.Center,
                ) {
                    DibujoDeMedalla(
                        medalla, ganada, lado,
                        Modifier.graphicsLayer {
                            val luz = if (ganada && reloj != null) oscilacionLogros(reloj.value + medalla.ordinal * .24f) else 0f
                            translationY = ((1f - entrada.value) * 13f - luz * 3.5f).dp.toPx()
                            scaleX = .88f + .12f * entrada.value
                            scaleY = scaleX
                            alpha = .35f + .65f * entrada.value
                        },
                        reloj = reloj,
                    )
                }
            }
        }
        val marco = Modifier.padding(horizontal = 11.dp, vertical = if (lado >= 105.dp) 11.dp else 7.dp)
        if (compacto) {
            Row(
                marco.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(3.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Medallas", Modifier.semantics { heading() }, style = MaterialTheme.typography.titleSmall)
                ficha()
            }
        } else {
            Column(marco) {
                Text("Medallas", Modifier.padding(start = 4.dp).semantics { heading() }, style = MaterialTheme.typography.titleLarge)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp), content = ficha)
            }
        }
    }
}

@Composable
private fun DetalleDeMedalla(medalla: Medalla, retos: Long, quieto: Boolean, cerrar: () -> Unit) {
    val ganada = retos >= medalla.meta
    val fase = faseDeFiesta(if (ganada) 1 else 0, quieto)
    val entrada = entradaDeLogros(quieto)
    val reloj = relojDeFiesta(quieto || !ganada, "Medalla ganada")
    val colores = MaterialTheme.colorScheme
    Dialog(
        onDismissRequest = cerrar,
        properties = DialogProperties(usePlatformDefaultWidth = false),
    ) {
        Surface(
            Modifier.widthIn(max = 380.dp).fillMaxWidth(.88f).graphicsLayer {
                alpha = .45f + .55f * entrada.value
                translationY = (1f - entrada.value) * 14.dp.toPx()
            },
            shape = RoundedCornerShape(29.dp),
            color = colores.surface,
            contentColor = colores.onSurface,
        ) {
            Column(Modifier.verticalScroll(rememberScrollState())) {
                Box(
                    Modifier.fillMaxWidth().height(188.dp).clip(RoundedCornerShape(topStart = 29.dp, topEnd = 29.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Canvas(Modifier.matchParentSize()) {
                        val centro = Offset(size.width * .5f, size.height * .49f)
                        val acento = if (ganada) medalla.luz else Color(0xFFD9C7EB)
                        drawRect(Brush.verticalGradient(listOf(Color(0xFF51376D), Color(0xFF38254F))))
                        drawCircle(
                            Brush.radialGradient(listOf(acento.copy(alpha = .47f), Color.Transparent), centro, size.height * .62f),
                            radius = size.height * .62f, center = centro,
                        )
                        drawCircle(acento.copy(alpha = .36f), size.height * .41f, centro, style = Stroke(1.5.dp.toPx()))
                        drawCircle(acento.copy(alpha = .20f), size.height * .49f, centro, style = Stroke(1.dp.toPx()))
                        val luz = oscilacionLogros(reloj?.value ?: .2f)
                        destelloLogros(Offset(size.width * .21f, size.height * .33f), 8.dp.toPx(), acento.copy(alpha = .52f + .45f * luz))
                        destelloLogros(Offset(size.width * .79f, size.height * .63f), 10.dp.toPx(), acento.copy(alpha = .96f - .37f * luz))
                        destelloLogros(Offset(size.width * .78f, size.height * .22f), 5.dp.toPx(), acento)
                    }
                    DibujoDeMedalla(
                        medalla, ganada, 142.dp,
                        Modifier.graphicsLayer {
                            val p = entrada.value
                            val arco = 4f * p * (1f - p)
                            scaleX = .81f + .19f * p + .11f * arco
                            scaleY = scaleX
                            rotationZ = -12f * (1f - p)
                            translationY = 20.dp.toPx() * (1f - p)
                        },
                        reloj = reloj,
                        mostrarPremio = true,
                    )
                    EstallidoLogros(fase, Modifier.matchParentSize(), origenY = .53f)
                }
                Column(
                    Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 17.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(9.dp),
                ) {
                    Text(
                        medalla.titulo, Modifier.semantics { heading() },
                        style = MaterialTheme.typography.headlineMedium, textAlign = TextAlign.Center,
                    )
                    Text(
                        when {
                            ganada -> "¡Medalla ganada!"
                            medalla.meta == 1 -> "Termina tu primera aventura."
                            else -> "$retos de ${medalla.meta} retos"
                        },
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center,
                    )
                    if (!ganada) {
                        LinearProgressIndicator(
                            progress = { (retos.toFloat() / medalla.meta).coerceIn(0f, 1f) * entrada.value },
                            modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
                            gapSize = 0.dp, drawStopIndicator = {},
                        )
                    }
                    BotonKusi("Cerrar", cerrar, Modifier.fillMaxWidth().padding(top = 2.dp), compacto = true)
                }
            }
        }
    }
}

@Composable
private fun DibujoDeMedalla(
    medalla: Medalla,
    ganada: Boolean,
    lado: Dp,
    modifier: Modifier = Modifier,
    reloj: State<Float>? = null,
    mostrarPremio: Boolean = false,
) {
    val claro = if (ganada) medalla.luz else Color(0xFFF3ECF5)
    val fondo = if (ganada) medalla.color else Color(0xFFCCC0D6)
    val borde = if (ganada) medalla.borde else Color(0xFF867494)
    Box(modifier.size(lado), contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            fun escudo(margen: Float, abajo: Float) = Path().apply {
                val x = size.width
                val y = size.height
                moveTo(x * .5f, y * (margen + abajo))
                lineTo(x * (.89f - margen), y * (.17f + margen + abajo))
                quadraticTo(x * (.94f - margen), y * (.21f + abajo), x * (.94f - margen), y * (.32f + abajo))
                lineTo(x * (.91f - margen), y * (.67f - margen + abajo))
                quadraticTo(x * (.89f - margen), y * (.79f - margen + abajo), x * .5f, y * (.93f - margen + abajo))
                quadraticTo(x * (.11f + margen), y * (.79f - margen + abajo), x * (.09f + margen), y * (.67f - margen + abajo))
                lineTo(x * (.06f + margen), y * (.32f + abajo))
                quadraticTo(x * (.06f + margen), y * (.21f + abajo), x * (.11f + margen), y * (.17f + margen + abajo))
                close()
            }
            drawPath(escudo(0f, .055f), borde.copy(alpha = .36f))
            drawPath(escudo(0f, 0f), borde)
            drawPath(escudo(.035f, .015f), Brush.verticalGradient(listOf(claro, fondo)))
            drawPath(escudo(.105f, .010f), Brush.verticalGradient(listOf(Color.White.copy(alpha = .57f), Color.Transparent)))
            if (ganada) {
                val ciclo = ((reloj?.value ?: .27f) + medalla.ordinal * .34f) % 1f
                val barrido = ((ciclo - .27f) * 3.8f).coerceIn(0f, 1f)
                if (reloj != null && barrido in 0.01f..0.99f) {
                    val x = size.width * (barrido * 1.45f - .28f)
                    clipPath(escudo(.043f, .015f)) {
                        drawRect(Brush.linearGradient(
                            listOf(Color.Transparent, Color(0xFFFFFDEE).copy(alpha = .74f), Color.Transparent),
                            start = Offset(x - size.width * .16f, size.height * .38f),
                            end = Offset(x + size.width * .16f, size.height * .53f),
                        ))
                    }
                }
                destelloLogros(
                    Offset(size.width * .83f, size.height * .26f),
                    (4f + oscilacionLogros(ciclo) * 2.5f).dp.toPx(), Color(0xFFFFFDDF),
                )
            }
        }
        if (ganada || mostrarPremio) {
            Image(
                painterResource(medalla.dibujo), null,
                Modifier.size(lado * .58f).offset(y = -(lado * .02f)),
                alpha = if (ganada) 1f else .55f,
            )
        }
        if (!ganada) {
            val ubicacion = if (mostrarPremio) Modifier.align(Alignment.BottomEnd).padding(end = lado * .08f, bottom = lado * .10f) else Modifier
            Box(
                ubicacion.size(lado * if (mostrarPremio) .34f else .47f).background(Color(0xFFE9E0EF), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                IconoKusi(
                    R.drawable.ic_cuy_bloqueado, modifier = Modifier.size(lado * if (mostrarPremio) .21f else .31f),
                    color = Color(0xFF645670),
                )
            }
        }
    }
}

@Composable
private fun AvanceDeLogros(resumen: ResumenLogrosInfantil, cerrar: () -> Unit) {
    AlertDialog(
        onDismissRequest = cerrar,
        title = { Text("Mi avance") },
        text = {
            Column(Modifier.heightIn(max = 340.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Text(
                    if (resumen.retos == 1L) "1 reto superado" else "${resumen.retos} retos superados",
                    style = MaterialTheme.typography.titleMedium,
                )
                for (curso in resumen.cursos) {
                    val arte = Curso.entries.find { it.titulo.equals(curso.nombre, ignoreCase = true) }
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Image(painterResource(arte?.dibujo ?: R.drawable.kusi_nav_cursos), null, Modifier.size(35.dp))
                        Text(curso.nombre, Modifier.weight(1f), style = MaterialTheme.typography.bodyMedium)
                        Text(curso.puntos.toString(), style = MaterialTheme.typography.titleMedium, textAlign = TextAlign.End)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = cerrar) { Text("Cerrar") } },
    )
}
