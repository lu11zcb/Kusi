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
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch

private fun Context.actividad(): Activity? = when (this) { is Activity -> this; is ContextWrapper -> baseContext.actividad(); else -> null }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AplicacionInfantil(
    estado: EstadoEntradaKusi, ingresar: (String, String, Boolean) -> Unit, cambiarClave: (String, String, String) -> Unit, comprobar: () -> Unit, salir: () -> Unit,
    biblioteca: EstadoBibliotecaInfantil = EstadoBibliotecaInfantil(), reintentarBiblioteca: (() -> Unit)? = null,
    cierre: EstadoCierreInfantil = EstadoCierreInfantil(), reintentarGuardado: () -> Unit = {},
    contenidoJuego: @Composable (AventuraInfantil, () -> Unit, () -> Unit) -> Unit = { _, _, volver -> JuegoSinConectar(volver) }, presentacion: Boolean = false
) {
    var entrada by rememberSaveable(estado.cuenta?.id) { mutableStateOf("bienvenida") }
    var aventuraId by rememberSaveable(estado.cuenta?.id) { mutableStateOf<String?>(null) }
    var paso by rememberSaveable(estado.cuenta?.id) { mutableStateOf("mision") }
    var ayuda by rememberSaveable { mutableStateOf(false) }
    var confirmarSalida by remember { mutableStateOf(false) }
    val snackbar = remember { SnackbarHostState() }; val scope = rememberCoroutineScope()
    val voz = recordarVozKusi { scope.launch { snackbar.showSnackbar(it) } }
    val aventura = biblioteca.aventuras.find { it.id == aventuraId }
    fun volver() { if (ayuda) ayuda = false else if (aventura != null) { if (paso == "juego") paso = "mision" else aventuraId = null } else entrada = "bienvenida" }
    BackHandler(ayuda || aventura != null || (estado.cuenta == null && entrada == "ingreso")) { volver() }
    val actividad = LocalContext.current.actividad()
    val orienta = actividad?.javaClass?.packageName == "pe.kusi.movil"
    val horizontal = aventura != null
    DisposableEffect(actividad) { val anterior = actividad?.requestedOrientation; onDispose { if (orienta && anterior != null) actividad?.requestedOrientation = anterior } }
    LaunchedEffect(horizontal) { if (orienta) actividad?.requestedOrientation = if (horizontal) ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE else ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT }
    val destino = when { estado.iniciando -> "arranque"; estado.cuenta == null -> entrada; estado.cuenta.temporal -> "clave"; !estado.cuenta.roles.contains("estudiante") -> "adulto"; aventura != null -> paso; else -> "inicio" }
    Scaffold(containerColor = MaterialTheme.colorScheme.background, snackbarHost = { SnackbarHost(snackbar) }, topBar = {
        if (destino != "juego" && destino != "arranque") TopAppBar(title = { MarcaKusi() },
            navigationIcon = { if (destino == "ingreso" || aventura != null) BotonIconoKusi(R.drawable.ic_arrow_left, "Volver") { volver() } },
            actions = { BotonIconoKusi(R.drawable.ic_question, "Necesito ayuda") { ayuda = true } },
            colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.background))
    }) { margen ->
        Box(Modifier.fillMaxSize().padding(margen), contentAlignment = Alignment.TopCenter) {
            Column(Modifier.widthIn(max = 1040.dp).fillMaxSize()) {
                if (presentacion) Surface(color = MaterialTheme.colorScheme.tertiaryContainer, modifier = Modifier.fillMaxWidth()) { Text("Vista de presentación · datos de ejemplo", style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center, modifier = Modifier.padding(6.dp)) }
                AnimatedContent(destino, transitionSpec = { (fadeIn(tween(220)) + slideInHorizontally(tween(260)) { it / 14 }).togetherWith(fadeOut(tween(120))) }, label = "cambio-pantalla", modifier = Modifier.weight(1f)) { pantalla ->
                    when (pantalla) {
                        "arranque" -> ArranqueInfantil(voz)
                        "bienvenida" -> BienvenidaInfantil(voz) { entrada = "ingreso" }
                        "ingreso" -> IngresoInfantil(estado, ingresar) { ayuda = true }
                        "clave" -> NuevaClaveInfantil(estado, cambiarClave) { confirmarSalida = true }
                        "adulto" -> Column(Modifier.padding(24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) { AvisoKusi("Esta app es para estudiantes. Para enseñar o administrar, entra desde la web."); BotonKusi("Salir de Kusi", salir, habilitado = !estado.ocupado) }
                        "mision" -> aventura?.let { MisionInfantil(it, voz) { paso = "juego" } }
                        "juego" -> aventura?.let { contenidoJuego(it, { paso = "cierre" }, { paso = "mision" }) }
                        "cierre" -> aventura?.let { CierreInfantil(it, cierre, voz, { aventuraId = null }, { paso = "juego" }, reintentarGuardado) }
                        else -> estado.cuenta?.let { InicioAventurasInfantil(it, estado, biblioteca, voz, { aventuraId = it.id; paso = "mision" }, reintentarBiblioteca, comprobar) { confirmarSalida = true } }
                    }
                }
            }
        }
    }
    if (ayuda) AlertDialog(onDismissRequest = { ayuda = false }, icon = { IconoKusi(R.drawable.ic_question) }, title = { Text("Pide una mano a tu profe") }, text = { Text("Tu profe te da tu cuenta. Si olvidaste tu contraseña, pídele una nueva. Un adulto puede ayudarte a entrar.") },
        confirmButton = { TextButton(onClick = { ayuda = false }) { Text("¡Entendido!") } }, dismissButton = { TextButton(onClick = { voz.hablar("Si olvidaste tu contraseña, pídele una nueva a tu profe. Un adulto puede ayudarte a entrar.") }) { IconoKusi(R.drawable.ic_speaker_high); Text("Escuchar") } })
    if (confirmarSalida) AlertDialog(onDismissRequest = { confirmarSalida = false }, title = { Text("¿Salimos por ahora?") }, text = { Text("Para volver necesitarás tu DNI y contraseña.") }, confirmButton = { TextButton(onClick = { confirmarSalida = false; salir() }, enabled = !estado.ocupado) { Text("Sí, salir") } }, dismissButton = { TextButton(onClick = { confirmarSalida = false }) { Text("Seguir aquí") } })
}

@Composable
private fun FondoAventura(modifier: Modifier = Modifier, contenido: @Composable BoxScope.() -> Unit) {
    Box(modifier.clip(MaterialTheme.shapes.extraLarge).background(MaterialTheme.colorScheme.tertiaryContainer)) { Image(painterResource(R.drawable.kusi_bienvenida_v2), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop); contenido() }
}
@Composable
private fun ArranqueInfantil(voz: VozKusi) {
    Column(Modifier.fillMaxSize().padding(28.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) { CuyInteractivo(voz, Modifier.size(190.dp)); Text("Kusi", style = MaterialTheme.typography.displayLarge); Spacer(Modifier.height(24.dp)); CircularProgressIndicator(); Spacer(Modifier.height(16.dp)); Text("Revisando tu sesión…") }
}
@Composable
private fun BienvenidaInfantil(voz: VozKusi, entrar: () -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Box(Modifier.fillMaxWidth().height(350.dp).clip(androidx.compose.foundation.shape.RoundedCornerShape(32.dp,32.dp,64.dp,24.dp))) {
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
private fun IngresoInfantil(estado: EstadoEntradaKusi, ingresar: (String, String, Boolean) -> Unit, ayuda: () -> Unit) {
    var dni by rememberSaveable { mutableStateOf("") }; var clave by remember { mutableStateOf("") }; var recordar by rememberSaveable { mutableStateOf(true) }
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(18.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) { InsigniaKusi(R.drawable.ic_kusi_key, Modifier.size(72.dp)); Column(Modifier.weight(1f)) { Text("¡Ya casi!", style = MaterialTheme.typography.headlineLarge); Text("Entra con tu cuenta", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) } }
        TarjetaKusi(Modifier.fillMaxWidth()) {
            OutlinedTextField(dni, { dni = it.filter { c -> c in '0'..'9' }.take(8) }, label = { Text("Mi DNI") }, supportingText = { Text("Los 8 números de tu DNI") }, singleLine = true, enabled = !estado.ocupado, shape = MaterialTheme.shapes.medium, colors = coloresCampoKusi(), textStyle = MaterialTheme.typography.titleMedium, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next), modifier = Modifier.fillMaxWidth())
            CampoClaveKusi(clave, { clave = it }, "Mi contraseña", !estado.ocupado)
            Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).toggleable(recordar, role = Role.Checkbox, enabled = !estado.ocupado, onValueChange = { recordar = it }), verticalAlignment = Alignment.CenterVertically) { Checkbox(recordar, null, enabled = !estado.ocupado); Text("Recordarme en este celular", style = MaterialTheme.typography.bodySmall) }
            estado.mensaje?.let { AvisoKusi(it, true) }
            BotonKusi(if (estado.ocupado) "Entrando…" else "Entrar", { ingresar(dni, clave, recordar); clave = "" }, Modifier.fillMaxWidth(), !estado.ocupado && dni.length == 8 && clave.isNotEmpty(), R.drawable.ic_arrow_right)
            if (estado.ocupado) LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        TextButton(onClick = ayuda, modifier = Modifier.heightIn(min = 48.dp)) { Text("Olvidé mi contraseña") }
    }
}
@Composable
private fun NuevaClaveInfantil(estado: EstadoEntradaKusi, cambiar: (String, String, String) -> Unit, salir: () -> Unit) {
    var actual by remember { mutableStateOf("") }; var nueva by remember { mutableStateOf("") }; var repetir by remember { mutableStateOf("") }
    val coincide = repetir.isEmpty() || repetir == nueva
    Column(Modifier.fillMaxSize().imePadding().verticalScroll(rememberScrollState()).padding(22.dp), verticalArrangement = Arrangement.spacedBy(18.dp)) {
        InsigniaKusi(R.drawable.ic_kusi_key, Modifier.size(64.dp))
        Text("Crea tu contraseña", style = MaterialTheme.typography.headlineLarge)
        Text("Un adulto puede ayudarte. Guarda tu nueva contraseña en un lugar seguro.", style = MaterialTheme.typography.bodyMedium)
        TarjetaKusi(Modifier.fillMaxWidth()) {
            if (!estado.claveTemporalDisponible) { Text("Vuelve a escribir la contraseña que te dio tu profe.", style = MaterialTheme.typography.bodySmall); CampoClaveKusi(actual, { actual = it }, "Contraseña actual", !estado.ocupado) }
            CampoClaveKusi(nueva, { nueva = it }, "Nueva contraseña", !estado.ocupado)
            Text("Usa 8 caracteres o más. Evita solo números, tu nombre y palabras fáciles de adivinar.", style = MaterialTheme.typography.bodySmall)
            CampoClaveKusi(repetir, { repetir = it }, "Repite tu contraseña", !estado.ocupado)
            if (!coincide) AvisoKusi("Las dos contraseñas deben ser iguales.", true)
            estado.mensaje?.let { AvisoKusi(it, true) }
            BotonKusi(if (estado.ocupado) "Guardando…" else "Guardar y continuar", { cambiar(actual, nueva, repetir); actual = ""; nueva = ""; repetir = "" }, Modifier.fillMaxWidth(), !estado.ocupado && (estado.claveTemporalDisponible || actual.isNotEmpty()) && nueva.length >= 8 && repetir == nueva, R.drawable.ic_check)
            if (estado.ocupado) LinearProgressIndicator(Modifier.fillMaxWidth())
        }
        TextButton(onClick = salir, enabled = !estado.ocupado, modifier = Modifier.heightIn(min = 48.dp)) { Text("Salir de Kusi") }
    }
}
@Composable
private fun InicioAventurasInfantil(cuenta: Cuenta, estado: EstadoEntradaKusi, biblioteca: EstadoBibliotecaInfantil, voz: VozKusi, elegir: (AventuraInfantil) -> Unit, recargar: (() -> Unit)?, comprobar: () -> Unit, salir: () -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(22.dp), verticalArrangement = Arrangement.spacedBy(20.dp)) {
        item { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Text("¡Hola, ${cuenta.nombre.trim().substringBefore(' ')}!", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.weight(1f)); TextButton(onClick = salir, enabled = !estado.ocupado, modifier = Modifier.heightIn(min = 48.dp)) { IconoKusi(R.drawable.ic_sign_out); Text("Salir") } } }
        item { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(18.dp)) { Column(Modifier.weight(1f)) { Text("Elige una\naventura", style = MaterialTheme.typography.displaySmall); Text("Un mundo por descubrir", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant) }; InsigniaKusi(R.drawable.ic_kusi_compass, Modifier.size(72.dp)) } }
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
            }
        }
        // El ejemplo sigue al final incluso si falla la consulta de la biblioteca.
        // Conserva la autorización de estudiante, pero no depende de una generación.
        if (biblioteca.aventuras.isNotEmpty()) items(biblioteca.aventuras.size, key = { biblioteca.aventuras[it].id }) { indice ->
            val aventura = biblioteca.aventuras[indice]
            AventuraTarjeta(aventura, indice, estado.validado && !estado.ocupado) { elegir(aventura) }
        }
    }
}
@Composable
private fun AventuraTarjeta(aventura: AventuraInfantil, indice: Int, habilitada: Boolean, elegir: () -> Unit) {
    val colores = MaterialTheme.colorScheme
    val fondo = if (indice % 2 == 0) colores.primaryContainer else colores.tertiaryContainer
    val tinta = if (indice % 2 == 0) colores.onPrimaryContainer else colores.onTertiaryContainer
    Card(onClick = elegir, enabled = habilitada, colors = CardDefaults.cardColors(containerColor = colores.surface), border = androidx.compose.foundation.BorderStroke(2.dp, fondo), shape = MaterialTheme.shapes.large, modifier = Modifier.fillMaxWidth()) {
        Column {
            Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f)) {
                Image(painterResource(aventura.portada), null, Modifier.matchParentSize(), contentScale = ContentScale.Crop)
                Surface(color = fondo, contentColor = tinta, shape = MaterialTheme.shapes.medium, shadowElevation = 2.dp, modifier = Modifier.align(Alignment.TopStart).padding(12.dp)) {
                    Row(Modifier.padding(horizontal = 12.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) { IconoKusi(if (indice % 2 == 0) R.drawable.ic_kusi_basket else R.drawable.ic_kusi_book, modifier = Modifier.size(23.dp)); Text(aventura.curso, style = MaterialTheme.typography.labelMedium) }
                }
            }
            Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text(aventura.titulo, style = MaterialTheme.typography.headlineSmall)
                BotonKusi("¡Vamos!", elegir, Modifier.fillMaxWidth(), habilitada, R.drawable.ic_kusi_play, secundario = indice % 2 != 0)
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
    PanelHorizontalInfantil(imagen = { CuyInteractivo(voz, Modifier.fillMaxSize().clip(MaterialTheme.shapes.extraLarge), "¡Terminaste tu aventura! Gracias por explorar conmigo.", R.drawable.kusi_celebracion_v2) }) {
        Text("¡Terminaste tu aventura!", style = MaterialTheme.typography.headlineMedium); Text(aventura.titulo, style = MaterialTheme.typography.titleLarge)
        if (estado.completados != null && estado.total != null) Text("Retos completados: ${estado.completados} de ${estado.total}")
        when { estado.guardando -> { LinearProgressIndicator(Modifier.fillMaxWidth()); Text("Guardando…") }; estado.error != null -> { AvisoKusi(estado.error, true); TextButton(onClick = reintentar) { Text("Reintentar guardado") } }; estado.guardado -> Text("Tu recorrido se guardó.", color = MaterialTheme.colorScheme.primary) }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            BotonKusi("Volver al inicio", inicio, Modifier.weight(1f), icono = R.drawable.ic_house, compacto = true)
            BotonKusi("Jugar otra vez", otraVez, Modifier.weight(1f), icono = R.drawable.ic_kusi_replay, secundario = true, compacto = true)
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
