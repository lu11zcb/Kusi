package pe.kusi.movil

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.lerp
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.currentStateAsState
import kotlinx.coroutines.delay

internal enum class Curso(
    val titulo: String,
    val dibujo: Int,
    val papel: Color,
    val acento: Color,
    val duracionAnimacion: Int,
    val gestoDeKusi: String,
    val dibujoEnCursos: Int = dibujo,
) {
    MATEMATICA(
        "Matemática", R.drawable.kusi_pila_numeros, Color(0xFFEBDDF8), Color(0xFF714696),
        1570, "Cuenta con el ábaco", R.drawable.kusi_matematica_abaco,
    ),
    COMUNICACION("Comunicación", R.drawable.kusi_nav_cursos, Color(0xFFFFE7AE), Color(0xFF8B4C20), 1810, "Sigue la lectura"),
    PERSONAL_SOCIAL(
        "Personal Social", R.drawable.kusi_personal_comunidad, Color(0xFFFFDBD2), Color(0xFFA2444D),
        1740, "Saluda a sus amigos", R.drawable.kusi_personal_amigos,
    ),
    CIENCIA("Ciencia y Tecnología", R.drawable.kusi_curso_ciencia, Color(0xFFDFEEBD), Color(0xFF427040), 1650, "Observa el experimento"),
    ARTE("Arte y Cultura", R.drawable.kusi_curso_arte, Color(0xFFFFE0C8), Color(0xFFAD522B), 1630, "Juega con los colores"),
    RELIGION("Educación Religiosa", R.drawable.kusi_curso_religion, Color(0xFFF7EAC6), Color(0xFF795129), 1930, "Hace una reverencia"),
    INGLES(
        "Inglés", R.drawable.kusi_curso_ingles, Color(0xFFCBEEE8), Color(0xFF206A68),
        1490, "Practica un saludo", R.drawable.kusi_ingles_saludo,
    ),
}

private val filasDeCursos = Curso.entries.dropLast(1).chunked(2)

@Composable
internal fun CursosEstudiante(
    cursoSeleccionado: String?,
    abrirCurso: (String?) -> Unit,
    estado: EstadoEntradaKusi,
    biblioteca: EstadoBibliotecaInfantil,
    elegir: (AventuraInfantil) -> Unit,
    recargar: (() -> Unit)?,
    comprobar: () -> Unit,
    voz: VozKusi,
    vozActiva: Boolean,
    ayuda: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val curso = Curso.entries.find { it.titulo == cursoSeleccionado }
    val aventuras = remember(curso, biblioteca.aventuras) {
        biblioteca.aventuras.filter { it.curso.equals(curso?.titulo, ignoreCase = true) }
            .sortedByDescending { it.enPausa }
    }
    val buscando = biblioteca.cargando || (!estado.validado && estado.ocupado)
    val error = if (estado.validado) biblioteca.error else estado.mensaje
    val mensaje = when {
        curso == null -> "Elige una materia para ver tus aventuras."
        buscando -> "Estoy buscando tus aventuras."
        error != null -> error
        !estado.validado -> "Vamos a comprobar tu acceso."
        aventuras.isEmpty() -> "Pronto habrá aventuras aquí. Tu profe te avisará."
        else -> "Estas son tus aventuras de ${curso.titulo}."
    }
    val contexto = LocalContext.current
    val cicloDeVida by LocalLifecycleOwner.current.lifecycle.currentStateAsState()
    val quieto = !cicloDeVida.isAtLeast(Lifecycle.State.STARTED) ||
        remember(contexto, cicloDeVida) { animacionesDesactivadas(contexto) }
    val desplazamientoCuadricula = rememberScrollState()

    val escuchar: (() -> Unit)? = if (vozActiva) ({ voz.hablar(mensaje) }) else null
    Column(
        modifier.widthIn(max = 560.dp).fillMaxWidth()
            .padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (curso == null) {
            val reloj = relojDeFiesta(quieto, "Materiales de Mis cursos", duracion = 4800)
            Column(
                Modifier.weight(1f).verticalScroll(desplazamientoCuadricula)
                    .padding(top = 8.dp, bottom = 12.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                PortadaDeCursos(escuchar, ayuda, reloj)
                for (fila in filasDeCursos) {
                    Row(
                        Modifier.fillMaxWidth().height(IntrinsicSize.Min),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                    ) {
                        for (materia in fila) {
                            TarjetaCurso(materia, quieto, reloj, Modifier.weight(1f).fillMaxHeight()) {
                                abrirCurso(materia.titulo)
                            }
                        }
                    }
                }
                TarjetaCurso(Curso.INGLES, quieto, reloj, Modifier.fillMaxWidth(), horizontal = true) {
                    abrirCurso(Curso.INGLES.titulo)
                }
            }
        } else {
            Row(
                Modifier.fillMaxWidth().padding(top = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                MandoIngreso(R.drawable.ic_ingreso_atras, "Volver a Mis cursos", Color(0xFFFFF2CD), Color(0xFF985327)) {
                    abrirCurso(null)
                }
                Spacer(Modifier.weight(1f))
                AccionesDeCursos(escuchar, ayuda)
            }
            key(curso) {
                Column(
                    Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(bottom = 12.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    PortadaDelCurso(curso, quieto)
                    when {
                        buscando -> Column(
                            Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite },
                            verticalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            LinearProgressIndicator(Modifier.fillMaxWidth())
                            Text("Buscando tus aventuras", style = MaterialTheme.typography.bodyMedium)
                        }
                        !estado.validado -> {
                            AvisoKusi(error ?: "Comprobemos tu acceso para ver tus aventuras.", error != null)
                            BotonKusi(
                                "Volver a comprobar", comprobar, Modifier.fillMaxWidth(),
                                habilitado = !estado.ocupado, icono = R.drawable.ic_kusi_replay,
                            )
                        }
                        error != null -> {
                            AvisoKusi(error, error = true)
                            if (recargar != null) BotonKusi(
                                "Intentar otra vez", recargar, Modifier.fillMaxWidth(),
                                habilitado = !estado.ocupado, icono = R.drawable.ic_kusi_replay,
                            )
                        }
                        aventuras.isEmpty() -> CursoEnEspera(curso, quieto) { abrirCurso(null) }
                        else -> for (aventura in aventuras) {
                            key(aventura.id) {
                                FichaDeAventura(
                                    aventura, destacada = false, habilitada = !estado.ocupado,
                                    modifier = Modifier, temaCurso = curso,
                                ) { elegir(aventura) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PortadaDeCursos(escuchar: (() -> Unit)?, ayuda: () -> Unit, reloj: State<Float>?) {
    val tinta = Color(0xFFFFF1CF)
    val forma = RoundedCornerShape(27.dp)
    Box(
        Modifier.fillMaxWidth().heightIn(min = 151.dp).clip(forma).background(
            Brush.horizontalGradient(listOf(Color(0xFF205E56), Color(0xFF34816D))),
        ).border(1.dp, Color(0xFF1B5147), forma),
    ) {
        Canvas(Modifier.matchParentSize()) {
            val centro = Offset(size.width * .76f, size.height * .72f)
            drawOval(
                Color(0xFF428F77),
                Offset(centro.x - size.width * .24f, centro.y - size.height * .35f),
                Size(size.width * .49f, size.height * .73f),
            )
            drawCircle(Color(0xFF69AB88).copy(alpha = .50f), 4.dp.toPx(), Offset(size.width * .53f, size.height * .22f))
        }
        MochilaDeCursos(
            reloj,
            Modifier.align(Alignment.BottomEnd).fillMaxWidth(.47f).height(111.dp)
                .padding(end = 8.dp, bottom = 5.dp),
        )
        Column(
            Modifier.align(Alignment.CenterStart).fillMaxWidth(.55f).padding(start = 16.dp, top = 20.dp, bottom = 16.dp),
        ) {
            Text(
                "Mis cursos", Modifier.semantics { heading() }, color = tinta,
                style = MaterialTheme.typography.displaySmall,
            )
            Text("Elige una materia", color = tinta, style = MaterialTheme.typography.bodyMedium)
        }
        Row(
            Modifier.align(Alignment.TopEnd).padding(top = 6.dp, end = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) { AccionesDeCursos(escuchar, ayuda) }
    }
}


@Composable
private fun AccionesDeCursos(escuchar: (() -> Unit)?, ayuda: () -> Unit) {
    if (escuchar != null) BotonIconoKusi(R.drawable.ic_ingreso_voz, "Escuchar a Kusi", escuchar)
    BotonIconoKusi(R.drawable.ic_question, "Necesito ayuda", ayuda)
}

@Composable
private fun TarjetaCurso(
    curso: Curso,
    quieto: Boolean,
    reloj: State<Float>?,
    modifier: Modifier,
    horizontal: Boolean = false,
    abrir: () -> Unit,
) {
    val interacciones = remember { MutableInteractionSource() }
    val pulsada by interacciones.collectIsPressedAsState()
    val presion = animateFloatAsState(
        if (pulsada && !quieto) 1f else 0f, tween(140, easing = SalidaPlaza), label = "Presionar ilustración del curso",
    )
    val colores = MaterialTheme.colorScheme
    val oscuro = colores.background.luminance() < .30f
    val papel = if (oscuro) lerp(colores.surface, curso.papel, .20f) else curso.papel
    val tinta = if (oscuro) curso.papel else curso.acento
    val forma = RoundedCornerShape(22.dp)
    Box(
        modifier.clip(forma).clickable(
            interacciones, ripple(), role = Role.Button, onClickLabel = "Abrir materia", onClick = abrir,
        ),
    ) {
        Surface(
            Modifier.fillMaxWidth().graphicsLayer {
                val escala = 1f - .025f * presion.value
                scaleX = escala
                scaleY = escala
            },
            shape = forma,
            color = if (quieto && pulsada) lerp(colores.surface, papel, .48f) else colores.surface,
            contentColor = colores.onSurface,
            border = BorderStroke(1.dp, tinta.copy(alpha = .22f)),
        ) {
            if (horizontal) {
                Row(
                    Modifier.fillMaxWidth().height(IntrinsicSize.Min),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    IlustracionDelCurso(curso, papel, tinta, reloj, Modifier.width(134.dp).heightIn(min = 88.dp).fillMaxHeight())
                    EtiquetaDelCurso(curso, tinta, Modifier.weight(1f))
                }
            } else {
                Column(Modifier.fillMaxSize()) {
                    IlustracionDelCurso(curso, papel, tinta, reloj, Modifier.fillMaxWidth().height(101.dp))
                    EtiquetaDelCurso(curso, tinta, Modifier.weight(1f).fillMaxWidth())
                }
            }
        }
    }
}

@Composable
private fun IlustracionDelCurso(curso: Curso, papel: Color, tinta: Color, reloj: State<Float>?, modifier: Modifier) {
    Box(modifier.clip(RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp)), contentAlignment = Alignment.Center) {
        Canvas(Modifier.matchParentSize()) {
            val ancho = size.width
            val alto = size.height
            val borde = Path().apply {
                moveTo(0f, 0f)
                lineTo(ancho, 0f)
                lineTo(ancho, alto * .88f)
                cubicTo(ancho * .70f, alto * .76f, ancho * .34f, alto * 1.13f, 0f, alto * .94f)
                close()
            }
            drawPath(borde, papel)
            drawOval(tinta.copy(alpha = .12f), Offset(ancho * .27f, alto * .78f), Size(ancho * .46f, alto * .13f))
            drawCircle(tinta.copy(alpha = .18f), 3.dp.toPx(), Offset(ancho * .15f, alto * .34f))
            drawCircle(tinta.copy(alpha = .17f), 5.dp.toPx(), Offset(ancho * .85f, alto * .54f))
        }
        IlustracionAnimadaDelCurso(curso, reloj, Modifier.fillMaxWidth(.93f).height(96.dp))
    }
}

@Composable
private fun EtiquetaDelCurso(curso: Curso, tinta: Color, modifier: Modifier) {
    Row(
        modifier.heightIn(min = 52.dp).padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(5.dp),
    ) {
        Text(
            curso.titulo, Modifier.weight(1f),
            style = MaterialTheme.typography.titleLarge.copy(fontSize = 19.sp, lineHeight = 20.sp),
        )
        Box(Modifier.size(24.dp).background(tinta.copy(alpha = .11f), CircleShape), contentAlignment = Alignment.Center) {
            Icon(painterResource(R.drawable.ic_arrow_right), null, Modifier.size(15.dp), tint = tinta)
        }
    }
}

@Composable
private fun PortadaDelCurso(curso: Curso, quieto: Boolean) {
    val colores = MaterialTheme.colorScheme
    val oscuro = colores.background.luminance() < .30f
    val papel = if (oscuro) lerp(colores.surface, curso.papel, .18f) else lerp(curso.papel, Color(0xFFFFF8E9), .27f)
    val tinta = if (oscuro) curso.papel else curso.acento
    var pulso by remember { mutableIntStateOf(0) }
    val reloj = relojDeFiesta(quieto, "Ilustración de ${curso.titulo}", duracion = 5100)
    val accion = faseDeFiesta(pulso, quieto, duracion = curso.duracionAnimacion)
    LaunchedEffect(quieto, pulso) {
        if (!quieto) {
            delay(if (pulso == 0) 640L else 5100L)
            pulso++
        }
    }
    Surface(
        Modifier.fillMaxWidth(), shape = RoundedCornerShape(26.dp), color = papel,
        contentColor = colores.onBackground, border = BorderStroke(1.dp, tinta.copy(alpha = .30f)),
    ) {
        Column(Modifier.fillMaxWidth()) {
            Text(
                curso.titulo,
                Modifier.fillMaxWidth().padding(start = 17.dp, end = 17.dp, top = 13.dp).semantics { heading() },
                style = MaterialTheme.typography.headlineMedium,
            )
            BoxWithConstraints(Modifier.fillMaxWidth().height(145.dp).clipToBounds()) {
                Canvas(Modifier.matchParentSize()) {
                    val w = size.width
                    val h = size.height
                    val mesa = Path().apply {
                        moveTo(0f, h * .86f)
                        cubicTo(w * .35f, h * .98f, w * .55f, h * .55f, w, h * .75f)
                        lineTo(w, h)
                        lineTo(0f, h)
                        close()
                    }
                    drawPath(mesa, tinta.copy(alpha = .14f))
                    drawCircle(tinta.copy(alpha = .095f), h * .45f, Offset(w * .70f, h * .48f))
                    drawOval(tinta.copy(alpha = .15f), Offset(w * .17f, h * .83f), Size(w * .33f, h * .10f))
                    val luz = oscilacionLogros(reloj?.value ?: .1f)
                    destelloLogros(Offset(w * .15f, h * .27f), (5f + 2f * luz).dp.toPx(), tinta.copy(alpha = .49f))
                    destelloLogros(Offset(w * .89f, h * .37f), 5.dp.toPx(), tinta.copy(alpha = .48f + .18f * luz))
                }
                val centroKusi = when (curso) {
                    Curso.COMUNICACION, Curso.ARTE -> .66f
                    Curso.MATEMATICA, Curso.CIENCIA -> .72f
                    else -> .71f
                }
                val ladoKusi = minOf(maxWidth * .46f, 130.dp)
                KusiDeLaPlaza(
                    Modifier.offset(
                        x = maxWidth * centroKusi - ladoKusi / 2,
                        y = maxHeight * .94f - ladoKusi * ApoyoCuadroKusi.y,
                    ).size(ladoKusi),
                    gesto = null, pulso = pulso, quieto = quieto, brisa = null,
                    descripcion = "Kusi en ${curso.titulo}", materia = curso,
                ) { pulso++ }
                val anchoArte = minOf(maxWidth * .43f, 172.dp)
                val centroArte = if (curso == Curso.COMUNICACION) .37f else .32f
                val alturaArte = when (curso) {
                    Curso.INGLES -> 6.dp
                    Curso.COMUNICACION, Curso.ARTE -> 26.dp
                    else -> 17.dp
                }
                IlustracionAnimadaDelCurso(
                    curso, reloj,
                    Modifier.offset(x = maxWidth * centroArte - anchoArte / 2, y = alturaArte)
                        .width(anchoArte).height(103.dp).clip(RoundedCornerShape(20.dp))
                        .toqueLogros(quieto, "Mover la ilustración") { pulso++ },
                    accion = accion,
                )
            }
        }
    }
}


@Composable
private fun CursoEnEspera(curso: Curso, quieto: Boolean, volver: () -> Unit) {
    val colores = MaterialTheme.colorScheme
    val fondoIcono = if (colores.background.luminance() < .30f) lerp(colores.surface, curso.papel, .18f) else curso.papel
    Surface(
        Modifier.fillMaxWidth(), shape = RoundedCornerShape(24.dp),
        color = colores.surface, contentColor = colores.onSurface,
        border = BorderStroke(1.dp, colores.outlineVariant),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(
                Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier.size(57.dp).background(fondoIcono, RoundedCornerShape(17.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Image(painterResource(R.drawable.kusi_libro_aventura), null, Modifier.size(42.dp))
                }
                Text(
                    "Pronto habrá aventuras aquí", Modifier.weight(1f).semantics { heading() },
                    style = MaterialTheme.typography.titleLarge,
                )
            }
            val oscuro = colores.background.luminance() < .30f
            val fondo = if (oscuro) Color(0xFF24574B) else Color(0xFFDDF2BC)
            val tinta = if (oscuro) Color(0xFFE5F8DA) else Color(0xFF31553A)
            val forma = RoundedCornerShape(18.dp)
            Box(Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
                Box(Modifier.matchParentSize().offset(y = 4.dp).background(tinta.copy(alpha = .46f), forma))
                Row(
                    Modifier.fillMaxWidth().heightIn(min = 60.dp).clip(forma).background(fondo)
                        .border(1.dp, tinta.copy(alpha = .32f), forma)
                        .toqueLogros(quieto, "Volver a la lista de materias", volver)
                        .padding(horizontal = 9.dp, vertical = 5.dp),
                    horizontalArrangement = Arrangement.spacedBy(9.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Image(painterResource(R.drawable.kusi_mochila_aventura), null, Modifier.size(41.dp))
                    Text(
                        "Explorar materias", Modifier.weight(1f), color = tinta,
                        style = MaterialTheme.typography.titleLarge,
                    )
                    Box(Modifier.size(31.dp).background(tinta.copy(alpha = .12f), CircleShape), contentAlignment = Alignment.Center) {
                        Icon(painterResource(R.drawable.ic_arrow_right), null, Modifier.size(18.dp), tint = tinta)
                    }
                }
            }
        }
    }
}
