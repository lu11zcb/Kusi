package pe.kusi.movil

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.content.pm.ActivityInfo
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.colorResource
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

private fun Context.actividad(): Activity? = when (this) { is Activity -> this; is ContextWrapper -> baseContext.actividad(); else -> null }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AplicacionInfantil(
    estado: EstadoEntradaKusi, ingresar: (String, String, Boolean) -> Unit, cambiarClave: (String, String, String) -> Unit, comprobar: () -> Unit, salir: () -> Unit,
    biblioteca: EstadoBibliotecaInfantil = EstadoBibliotecaInfantil(), reintentarBiblioteca: (() -> Unit)? = null,
    cierre: EstadoCierreInfantil = EstadoCierreInfantil(), reintentarGuardado: () -> Unit = {},
    alVerMision: (AventuraInfantil) -> Unit = {},
    contenidoJuego: @Composable (AventuraInfantil, () -> Unit, () -> Unit) -> Unit = { _, _, volver -> JuegoSinConectar(volver) },
    logros: EstadoLogrosInfantil = EstadoLogrosInfantil(), recargarLogros: (() -> Unit)? = null,
    tienda: EstadoTiendaInfantil = EstadoTiendaInfantil(), cargarTienda: () -> Unit = {}, comprarPrenda: (String) -> Unit = {},
    guardarCuy: (Int, List<String>) -> Unit = { _, _ -> },
) {
    val idCuenta = estado.cuenta?.id
    val contexto = LocalContext.current
    val preferenciasCuy = remember(contexto) { contexto.getSharedPreferences("kusi_mi_cuy", Context.MODE_PRIVATE) }
    var crearCuy by rememberSaveable(idCuenta) {
        mutableStateOf(idCuenta != null && !preferenciasCuy.getBoolean("creado_$idCuenta", false))
    }
    var seccionInicio by rememberSaveable(idCuenta) { mutableIntStateOf(0) }
    var cursoInicio by rememberSaveable(idCuenta) { mutableStateOf<String?>(null) }
    var apariencia by rememberSaveable(idCuenta, stateSaver = AparienciaCuySaver) {
        mutableStateOf(if (idCuenta == null) AparienciaCuy() else aparienciaGuardada(preferenciasCuy, idCuenta))
    }
    // El cuy también vive en Spring para que los compañeros lo vean en el podio. Se envía al entrar y cada vez que cambia.
    LaunchedEffect(idCuenta, estado.validado, apariencia) {
        if (idCuenta != null && estado.validado && preferenciasCuy.getBoolean("creado_$idCuenta", false)) {
            guardarCuy(apariencia.pelaje.codigo, CategoriaCuy.entries.mapNotNull { apariencia.piezas[it]?.name })
        }
    }
    var entrada by rememberSaveable(estado.cuenta?.id) { mutableStateOf("bienvenida") }
    var aventuraId by rememberSaveable(estado.cuenta?.id) { mutableStateOf<String?>(null) }
    var aventuraElegida by remember(estado.cuenta?.id) { mutableStateOf<AventuraInfantil?>(null) }
    var paso by rememberSaveable(estado.cuenta?.id) { mutableStateOf("mision") }
    var ayuda by rememberSaveable { mutableStateOf(false) }
    var confirmarSalida by remember { mutableStateOf(false) }
    var confirmarRegreso by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }; val scope = rememberCoroutineScope()
    val voz = recordarVozKusi { scope.launch { snackbar.showSnackbar(it) } }
    val aventura = biblioteca.aventuras.find { it.id == aventuraId } ?: aventuraElegida?.takeIf { it.id == aventuraId }
    val destino = when {
        estado.iniciando -> "arranque"
        estado.cuenta == null -> entrada
        estado.cuenta.temporal -> "clave"
        !estado.cuenta.roles.contains("estudiante") -> "adulto"
        aventura != null -> paso
        crearCuy -> "crear-cuy"
        else -> "inicio"
    }
    fun volver() {
        when {
            ayuda -> ayuda = false
            aventura != null && paso == "juego" -> confirmarRegreso = true
            aventura != null -> aventuraId = null
            destino == "crear-cuy" -> { voz.callar(); crearCuy = false }
            destino == "inicio" && seccionInicio == 1 -> cursoInicio = null
            else -> entrada = "bienvenida"
        }
    }
    BackHandler(
        ayuda || aventura != null || destino == "ingreso" || destino == "crear-cuy" ||
            (destino == "inicio" && seccionInicio == 1 && cursoInicio != null),
    ) { volver() }
    val actividad = contexto.actividad()
    val orienta = actividad?.javaClass?.packageName == "pe.kusi.movil"
    val horizontal = aventura != null
    DisposableEffect(actividad) { val anterior = actividad?.requestedOrientation; onDispose { if (orienta && anterior != null) actividad?.requestedOrientation = anterior } }
    LaunchedEffect(horizontal) { if (orienta) actividad?.requestedOrientation = if (horizontal) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT }
    LaunchedEffect(destino, aventuraId) { if (destino == "mision") aventura?.let(alVerMision) }
    val fondo = if (destino == "arranque") colorResource(R.color.kusi_fondo_carga) else MaterialTheme.colorScheme.background
    Scaffold(containerColor = fondo, snackbarHost = { SnackbarHost(snackbar) }, topBar = {
        if (destino !in setOf("juego", "arranque", "bienvenida", "ingreso", "crear-cuy") &&
            destino != "inicio") TopAppBar(title = { MarcaKusi() },
            navigationIcon = { if (aventura != null) BotonIconoKusi(R.drawable.ic_arrow_left, "Volver") { volver() } },
            actions = { BotonIconoKusi(R.drawable.ic_question, "Necesito ayuda") { ayuda = true } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background))
    }) { margen ->
        Box(Modifier.fillMaxSize().padding(margen), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.widthIn(max = 1040.dp).fillMaxSize()) {
                AnimatedContent(destino, transitionSpec = { (fadeIn(tween(220)) + slideInHorizontally(tween(260)) { it / 14 }).togetherWith(fadeOut(tween(120))) }, label = "cambio-pantalla", modifier = Modifier.weight(1f)) { pantalla ->
                    when (pantalla) {
                        "arranque" -> ArranqueInfantil()
                        "bienvenida" -> BienvenidaKusi(voz) { entrada = "ingreso" }
                        "ingreso" -> IngresoInfantil(estado, voz, ingresar, ::volver) { ayuda = true }
                        "crear-cuy" -> if (idCuenta != null) {
                            CreaTuCuy(
                                apariencia, voz, preferenciasCuy.getBoolean("voz", true),
                                preferenciasCuy.getBoolean("creado_$idCuenta", false), ::volver,
                                tienda, cargarTienda, comprarPrenda,
                            ) { elegida ->
                                guardarApariencia(preferenciasCuy, idCuenta, elegida)
                                apariencia = elegida
                                crearCuy = false
                            }
                        }
                        "clave" -> NuevaClaveInfantil(estado, cambiarClave) { confirmarSalida = true }
                        "adulto" -> Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) { AvisoKusi("Esta app es para estudiantes. Para enseñar o administrar, entra desde la web."); BotonKusi("Salir de Kusi", salir, habilitado = !estado.ocupado) }
                        "mision" -> aventura?.let { MisionInfantil(it, voz) { paso = "juego" } }
                        "juego" -> aventura?.let { contenidoJuego(it, { paso = "cierre" }, { paso = "mision" }) }
                        "cierre" -> aventura?.let { CierreInfantil(it, cierre, voz, { aventuraId = null }, { paso = "juego" }, reintentarGuardado) }
                        else -> estado.cuenta?.let {
                            InicioReferencia(
                                it, estado, biblioteca, voz,
                                { aventuraElegida = it; aventuraId = it.id; paso = if (it.enPausa) "juego" else "mision" },
                                reintentarBiblioteca, comprobar, salir, apariencia, seccionInicio, cursoInicio,
                                { seccionInicio = it; cursoInicio = null }, { cursoInicio = it },
                                { crearCuy = true }, { ayuda = true }, logros, recargarLogros,
                            )
                        }
                    }
                }
            }
        }
    }
    // La ayuda corresponde a lo que el niño está intentando hacer ahora.
    val textoAyuda = when (destino) {
        "ingreso", "clave" -> "Tu profe te da tu cuenta. Pide ayuda a un adulto para entrar o cambiar tu contraseña."
        "mision" -> aventura?.consigna ?: "Escucha a Kusi y toca Jugar cuando estés listo."
        "cierre" -> "Puedes jugar otra vez o elegir otra aventura."
        "inicio" -> when {
            seccionInicio == 1 && cursoInicio == null -> "Toca el dibujo de una materia para ver tus aventuras."
            seccionInicio == 2 -> "Supera retos en tus aventuras y aquí verás tus puntos y medallas."
            seccionInicio == 1 -> "Aquí están tus aventuras de $cursoInicio. Toca la flecha para volver a Mis cursos."
            seccionInicio == 3 -> "Toca tu cuy para saludarlo. En Personalizar mi cuy puedes cambiar su pelaje y sus accesorios."
            else -> "Elige una aventura de tu clase. Toca Ver la misión o Continuar si ya guardaste una partida."
        }
        else -> "Soy Kusi. Toca Entrar y pide ayuda a un adulto la primera vez."
    }
    if (ayuda && destino == "ingreso") AyudaDelIngreso(textoAyuda, voz) { ayuda = false }
    else if (ayuda) AlertDialog(onDismissRequest = { ayuda = false }, icon = { IconoKusi(R.drawable.ic_question) }, title = { Text("Kusi te ayuda") }, text = { Text(textoAyuda) },
        confirmButton = { TextButton(onClick = { ayuda = false }) { Text("¡Entendido!") } }, dismissButton = { TextButton(onClick = { voz.hablar(textoAyuda) }) { IconoKusi(R.drawable.ic_speaker_high); Text("Escuchar") } })
    if (confirmarRegreso) AlertDialog(onDismissRequest = { confirmarRegreso = false }, title = { Text("¿Volvemos a la misión?") },
        text = { Text("Usa Pausa dentro del juego para guardar el reto antes de volver.") },
        confirmButton = { TextButton(onClick = { confirmarRegreso = false; paso = "mision" }) { Text("Volver a la misión") } },
        dismissButton = { TextButton(onClick = { confirmarRegreso = false }) { Text("Seguir jugando") } })
    if (confirmarSalida) AlertDialog(onDismissRequest = { confirmarSalida = false }, title = { Text("¿Salimos por ahora?") }, text = { Text("Para volver necesitarás tu DNI y contraseña.") }, confirmButton = { TextButton(onClick = { confirmarSalida = false; salir() }, enabled = !estado.ocupado) { Text("Sí, salir") } }, dismissButton = { TextButton(onClick = { confirmarSalida = false }) { Text("Seguir aquí") } })
}

@Composable
private fun FondoAventura(modifier: Modifier = Modifier, contenido: @Composable BoxScope.() -> Unit) {
    Box(modifier.clip(MaterialTheme.shapes.extraLarge).background(MaterialTheme.colorScheme.tertiaryContainer)) { Image(painterResource(R.drawable.kusi_bienvenida_v2), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop); contenido() }
}
@Composable
private fun BienvenidaInfantil(voz: VozKusi, entrar: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Box(Modifier.fillMaxWidth().heightIn(min = 180.dp, max = 260.dp).aspectRatio(1.5f).clip(androidx.compose.foundation.shape.RoundedCornerShape(32.dp,32.dp,64.dp,24.dp))) {
            CuyInteractivo(voz, Modifier.fillMaxSize(), recurso = R.drawable.kusi_bienvenida_v2)
            Surface(color = MaterialTheme.colorScheme.surface, shape = MaterialTheme.shapes.medium, shadowElevation = 3.dp, modifier = Modifier.align(Alignment.BottomEnd).padding(14.dp)) {
                Row(Modifier.padding(horizontal = 14.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { StickerKusi(R.drawable.ic_kusi_sparkle, Modifier.size(23.dp)); Text("Tócame para saludar", style = MaterialTheme.typography.labelSmall) }
            }
        }
        Text("¡Hola! Soy Kusi", style = MaterialTheme.typography.displaySmall, textAlign = TextAlign.Center)
        Text("Tu aventura empieza aquí", style = MaterialTheme.typography.bodyLarge, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
        BotonKusi("¡Vamos a entrar!", entrar, Modifier.fillMaxWidth(), icono = R.drawable.ic_kusi_play)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(14.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            MiniSelloInfantil(R.drawable.ic_kusi_compass, "Explora")
            MiniSelloInfantil(R.drawable.ic_kusi_book, "Descubre")
            MiniSelloInfantil(R.drawable.ic_kusi_sparkle, "Juega")
        }
        Text("La primera vez, entra con ayuda de un adulto.", style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(10.dp))
    }
}
@Composable
private fun NuevaClaveInfantil(estado: EstadoEntradaKusi, cambiar: (String, String, String) -> Unit, salir: () -> Unit) {
    var actual by remember { mutableStateOf("") }; var nueva by remember { mutableStateOf("") }; var repetir by remember { mutableStateOf("") }
    val coincide = repetir.isEmpty() || repetir == nueva
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(22.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        InsigniaKusi(R.drawable.ic_kusi_key, Modifier.size(64.dp))
        Text("Crea tu contraseña", style = MaterialTheme.typography.headlineLarge)
        Text("Pide ayuda a un adulto para elegir una contraseña y recordarla.", style = MaterialTheme.typography.bodyMedium)
        TarjetaKusi(Modifier.fillMaxWidth()) {
            if (!estado.claveTemporalDisponible) { Text("Vuelve a escribir la contraseña que te dio tu profe.", style = MaterialTheme.typography.bodySmall); CampoClaveKusi(actual, { actual = it }, "Contraseña actual", !estado.ocupado) }
            CampoClaveKusi(nueva, { nueva = it }, "Nueva contraseña", !estado.ocupado)
            Text("Usa 8 caracteres o más. Evita solo números, tu nombre y palabras fáciles de adivinar.", style = MaterialTheme.typography.bodySmall)
            CampoClaveKusi(repetir, { repetir = it }, "Repite tu contraseña", !estado.ocupado)
            if (!coincide) AvisoKusi("Las dos contraseñas deben ser iguales.", true)
            estado.mensaje?.let { AvisoKusi(it, true) }
            BotonKusi(if (estado.ocupado) "Guardando…" else "Guardar y continuar", { cambiar(actual, nueva, repetir) }, Modifier.fillMaxWidth(), !estado.ocupado && (estado.claveTemporalDisponible || actual.isNotEmpty()) && nueva.length >= 8 && repetir == nueva, R.drawable.ic_check)
            if (estado.ocupado) LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        TextButton(onClick = salir, enabled = !estado.ocupado, modifier = Modifier.heightIn(min = 48.dp)) { Text("Salir de Kusi") }
    }
}
@Composable
private fun InicioAventurasInfantil(cuenta: Cuenta, estado: EstadoEntradaKusi, biblioteca: EstadoBibliotecaInfantil, voz: VozKusi, elegir: (AventuraInfantil) -> Unit, recargar: (() -> Unit)?, comprobar: () -> Unit, salir: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(22.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text("¡Hola, ${cuenta.nombre.trim().substringBefore(' ')}!", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f)); TextButton(onClick = salir, enabled = !estado.ocupado, modifier = Modifier.heightIn(min = 48.dp)) { IconoKusi(R.drawable.ic_sign_out); Text("Salir") } } }
        item { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) { Column(Modifier.weight(1f)) { Text("Mis aventuras", style = MaterialTheme.typography.displaySmall); Text("Tu profe preparó estos juegos para ti", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }; InsigniaKusi(R.drawable.ic_kusi_compass, Modifier.size(72.dp)) } }
        if (biblioteca.aventuras.any { it.nuevo }) item { AvisoKusi("¡Tu profe te dejó aventuras nuevas! Busca la etiqueta Nueva.") }
        if (!estado.validado || estado.mensaje != null) item { AvisoKusi(estado.mensaje ?: "Vamos a comprobar tu acceso.", estado.mensaje != null); TextButton(onClick = comprobar, enabled = !estado.ocupado) { Text(if (estado.ocupado) "Comprobando…" else "Volver a comprobar") } }
        when {
            biblioteca.cargando -> item {
                LinearProgressIndicator(Modifier.fillMaxWidth()); Text("Buscando tus aventuras…", Modifier.padding(vertical = 14.dp))
                repeat(2) { Surface(color = MaterialTheme.colorScheme.surfaceVariant, shape = MaterialTheme.shapes.large, modifier = Modifier.fillMaxWidth().height(150.dp).padding(bottom = 14.dp)) {} }
            }
            biblioteca.error != null -> item { AvisoKusi(biblioteca.error, true); if (recargar != null) BotonKusi("Intentar otra vez", recargar, Modifier.fillMaxWidth()) }
            biblioteca.aventuras.isEmpty() -> item {
                CuyInteractivo(voz, Modifier.fillMaxWidth().height(230.dp).clip(MaterialTheme.shapes.extraLarge), "Tu próxima aventura está por llegar. Tu profe te avisará. ¡Hasta pronto!", R.drawable.kusi_bienvenida_v2)
                Spacer(Modifier.height(20.dp)); Text("Tu próxima aventura\nestá por llegar", style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                Text("Tu profe te avisará cuando puedas jugar.", style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp))
                BotonKusi("Escuchar a Kusi", { voz.hablar("Todavía no tienes juegos. Tu profe te avisará cuando tu aventura esté lista.") }, Modifier.fillMaxWidth(), icono = R.drawable.ic_speaker_high)
                // La biblioteca se carga al entrar. Si el profe genera un juego después,
                // este botón la vuelve a pedir sin tener que salir y entrar otra vez.
                if (recargar != null) BotonKusi("Buscar juegos nuevos", recargar, Modifier.fillMaxWidth().padding(top = 12.dp))
            }
        }
        // Buscar sigue disponible con una biblioteca llena: un juego recién
        // enviado debe poder aparecer sin cerrar la sesión del estudiante.
        if (biblioteca.aventuras.isNotEmpty() && recargar != null) item {
            BotonKusi(if (biblioteca.cargando) "Buscando…" else "Buscar juegos nuevos", recargar,
                Modifier.fillMaxWidth(), habilitado = !biblioteca.cargando && !estado.ocupado, icono = R.drawable.ic_kusi_sparkle, secundario = true)
        }
        // Solo los juegos enviados a la sección del estudiante.
        if (biblioteca.aventuras.isNotEmpty()) items(biblioteca.aventuras.size, key = { biblioteca.aventuras[it].id }) { indice ->
            val aventura = biblioteca.aventuras[indice]
            AventuraTarjeta(aventura, estado.validado && !estado.ocupado && !biblioteca.cargando) { elegir(aventura) }
        }
    }
}
@Composable
private fun AventuraTarjeta(aventura: AventuraInfantil, habilitada: Boolean, elegir: () -> Unit) {
    val colores = MaterialTheme.colorScheme
    val fondo = colores.primaryContainer
    val tinta = colores.onPrimaryContainer
    Card(onClick = elegir, enabled = habilitada, colors = CardDefaults.cardColors(containerColor = colores.surface), border = androidx.compose.foundation.BorderStroke(2.dp, fondo), shape = MaterialTheme.shapes.large, modifier = Modifier.fillMaxWidth()) {
        Column {
            Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
                Image(painterResource(aventura.portada), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop)
                Surface(color = fondo, contentColor = tinta, shape = MaterialTheme.shapes.medium, shadowElevation = 2.dp, modifier = Modifier.align(Alignment.TopStart).padding(12.dp)) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) { IconoKusi(aventura.icono, modifier = Modifier.size(23.dp)); Text(aventura.curso, style = MaterialTheme.typography.labelMedium) }
                }
            }
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                if (aventura.nuevo) Text("Nueva", style = MaterialTheme.typography.labelLarge, color = colores.primary)
                Text(aventura.titulo, style = MaterialTheme.typography.headlineSmall, maxLines = 2, overflow = TextOverflow.Ellipsis)
                BotonKusi("Ver la misión", elegir, Modifier.fillMaxWidth(), habilitada, R.drawable.ic_kusi_play)
            }
        }
    }
}
@Composable
private fun MisionInfantil(aventura: AventuraInfantil, voz: VozKusi, jugar: () -> Unit) {
    val compacto = LocalConfiguration.current.screenHeightDp < 450
    PanelHorizontalInfantil(imagen = { CuyInteractivo(voz, Modifier.fillMaxSize().clip(MaterialTheme.shapes.extraLarge), aventura.consigna, aventura.portada) }) {
        if (!compacto) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) { StickerKusi(R.drawable.ic_kusi_compass, Modifier.size(34.dp)); Text("TU MISIÓN", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary) }
        Text(aventura.titulo, style = MaterialTheme.typography.headlineMedium)
        Text(aventura.meta, style = MaterialTheme.typography.bodyMedium)
        BotonKusi("Escuchar la misión", { voz.hablar(aventura.consigna) }, Modifier.fillMaxWidth(), icono = R.drawable.ic_kusi_sound, secundario = true, compacto = compacto)
        BotonKusi("¡Jugar!", jugar, Modifier.fillMaxWidth(), icono = R.drawable.ic_kusi_play, compacto = compacto)
    }
}
@Composable
private fun CierreInfantil(aventura: AventuraInfantil, estado: EstadoCierreInfantil, voz: VozKusi, inicio: () -> Unit, otraVez: () -> Unit, reintentar: () -> Unit) {
    // Las monedas solo se anuncian cuando Spring confirmó el cierre: así nunca se promete un premio que no quedó guardado.
    val monedas = estado.monedas?.takeIf { estado.guardado && it > 0 }
    val frase = "¡Terminaste tu aventura! Gracias por explorar conmigo." +
        (if (monedas != null) " Ganaste " + monedas + (if (monedas == 1) " moneda" else " monedas") + " para la tienda de tu cuy." else "")
    PanelHorizontalInfantil(imagen = { CuyInteractivo(voz, Modifier.fillMaxSize().clip(MaterialTheme.shapes.extraLarge), frase, R.drawable.kusi_celebracion_v2) }) {
        Text("¡Terminaste tu aventura!", style = MaterialTheme.typography.headlineMedium); Text(aventura.titulo, style = MaterialTheme.typography.titleLarge)
        if (estado.completados != null && estado.total != null) Text("Completaste " + estado.completados + " de " + estado.total + " retos")
        if (estado.puntos != null) Text("Tienes " + estado.puntos + " de 20 puntos en esta actividad.", style = MaterialTheme.typography.titleLarge)
        if (monedas != null) Text("¡Ganaste " + monedas + (if (monedas == 1) " moneda" else " monedas") + " para la tienda de tu cuy!", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.primary)
        Text("Hasta 20 puntos, repartidos entre los retos. Cada error resta 1 punto, sin bajar de la mitad. Pedir ayuda no resta puntos. Al repetir, solo suma lo que mejores.", style = MaterialTheme.typography.bodySmall)
        when { estado.guardando -> Text("Kusi está guardando tu aventura…", style = MaterialTheme.typography.bodySmall); estado.error != null -> { AvisoKusi("Tu aventura terminó. Vamos a guardar tu avance."); TextButton(onClick = reintentar) { Text("Intentar otra vez") } }; estado.guardado -> Text("¡Tu aventura quedó guardada!", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary) }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            BotonKusi("Jugar otra vez", otraVez, Modifier.weight(1f), habilitado = !estado.guardando && estado.guardado, icono = R.drawable.ic_kusi_replay, compacto = true)
            BotonKusi("Elegir otra aventura", inicio, Modifier.weight(1f), icono = R.drawable.ic_house, secundario = true, compacto = true)
        }
    }
}
@Composable
private fun PanelHorizontalInfantil(imagen: @Composable () -> Unit, contenido: @Composable ColumnScope.() -> Unit) {
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val altoPortada = if (maxWidth >= 600.dp) 390.dp else 225.dp
        if (maxWidth >= 600.dp && maxWidth > maxHeight) Row(Modifier.fillMaxSize().padding(14.dp), horizontalArrangement = Arrangement.spacedBy(28.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.weight(.9f).fillMaxHeight()) { imagen() }; Column(Modifier.weight(1.1f).fillMaxHeight().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp), content = contenido) }
        else Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(22.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) { Box(Modifier.widthIn(max = 640.dp).fillMaxWidth().height(altoPortada).align(Alignment.CenterHorizontally)) { imagen() }; Column(Modifier.widthIn(max = 640.dp).fillMaxWidth().align(Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(18.dp), content = contenido) }
    }
}
@Composable
private fun JuegoSinConectar(volver: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) { IconoKusi(R.drawable.ic_game_controller, modifier = Modifier.size(64.dp)); Spacer(Modifier.height(18.dp)); Text("No pudimos abrir esta aventura", style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center); Text("Vuelve al inicio y pídele ayuda a tu profe.", modifier = Modifier.padding(vertical = 18.dp)); BotonKusi("Volver", volver) }
}
