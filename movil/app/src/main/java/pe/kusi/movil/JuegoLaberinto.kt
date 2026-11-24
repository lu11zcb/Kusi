package pe.kusi.movil

import android.Manifest
import android.annotation.SuppressLint
import android.content.pm.PackageManager
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.io.ByteArrayInputStream
import java.net.URI
import kotlinx.coroutines.launch
import org.json.JSONObject

/** El mismo contenedor abre las familias de la biblioteca y los juegos del taller. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun JuegoLaberinto(
    aventura: AventuraInfantil, registrar: (String, JSONObject) -> Unit, finalizar: () -> Unit, volver: () -> Unit,
    preparar: suspend (AventuraInfantil) -> InicioJuego = { InicioJuego(it) },
    guardarPausa: suspend (String, PuntoPausa) -> Unit = { _, _ -> error("El guardado no está conectado.") }
) {
    val voz = recordarVozKusi { }
    val registrarActual by rememberUpdatedState(registrar)
    val finalizarActual by rememberUpdatedState(finalizar)
    val hablarActual by rememberUpdatedState(voz.hablar)
    val callarActual by rememberUpdatedState(voz.callar)
    var error by remember { mutableStateOf<String?>(null) }
    var recarga by remember { mutableIntStateOf(0) }
    var inicio by remember(aventura.id) { mutableStateOf<InicioJuego?>(null) }
    var vistaActual by remember { mutableStateOf<WebView?>(null) }
    var cargado by remember { mutableStateOf(false) }
    var solicitaPausa by remember { mutableStateOf(false) }
    var pausado by remember { mutableStateOf(false) }
    var punto by remember { mutableStateOf<PuntoPausa?>(null) }
    var guardando by remember { mutableStateOf(false) }
    var guardado by remember { mutableStateOf(false) }
    var errorGuardado by remember { mutableStateOf<String?>(null) }
    val scope = rememberCoroutineScope()
    val hiloPrincipal = remember { Handler(Looper.getMainLooper()) }

    fun guardar(pausa: PuntoPausa) {
        if (guardando) return
        val juegoId = inicio?.aventura?.id ?: return
        guardando = true; guardado = false; errorGuardado = null
        scope.launch {
            try { guardarPausa(juegoId, pausa); guardado = true }
            catch (_: Exception) { errorGuardado = "No pudimos confirmar tu avance. Sigue en pausa; puedes volver a guardarlo." }
            finally { guardando = false }
        }
    }
    fun pedirPausa() {
        if (!cargado || solicitaPausa) return
        solicitaPausa = true; pausado = false; punto = null; guardado = false; errorGuardado = null
        callarActual()
        vistaActual?.evaluateJavascript("window.postMessage({tipo:'pausar'}, '*');", null)
        hiloPrincipal.postDelayed({
            if (solicitaPausa && !pausado) errorGuardado = "No pudimos confirmar la pausa. Inténtalo otra vez."
        }, 5000)
    }
    BackHandler { if (cargado) pedirPausa() else volver() }
    val ciclo = LocalLifecycleOwner.current.lifecycle
    val pausarActual by rememberUpdatedState(::pedirPausa)
    DisposableEffect(ciclo) {
        val observador = LifecycleEventObserver { _, evento -> if (evento == Lifecycle.Event.ON_PAUSE) pausarActual() }
        ciclo.addObserver(observador)
        onDispose { ciclo.removeObserver(observador) }
    }
    LaunchedEffect(aventura.id, recarga) {
        inicio = null; cargado = false; error = null
        solicitaPausa = false; pausado = false; punto = null
        guardado = false; errorGuardado = null
        callarActual()
        try { inicio = preparar(aventura) }
        catch (_: Exception) { error = "No pudimos recuperar tu aventura. Vamos a intentarlo otra vez." }
    }
    Column(Modifier.fillMaxSize()) {
        Surface(color = MaterialTheme.colorScheme.background) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                BotonIconoKusi(R.drawable.ic_arrow_left, "Pausar y volver", { if (cargado) pedirPausa() else volver() })
                Text(inicio?.aventura?.titulo ?: aventura.titulo, style = MaterialTheme.typography.titleSmall,
                    maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.weight(1f).padding(end = 12.dp))
                TextButton(onClick = ::pedirPausa, enabled = cargado && !solicitaPausa) { Text("Pausa") }
            }
        }
        if (error != null) Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            AvisoKusi(error!!)
            BotonKusi("Intentar otra vez", { recarga += 1 }, icono = R.drawable.ic_kusi_replay)
            TextButton(onClick = volver) { Text("Volver a la misión") }
        } else if (inicio == null) {
            LinearProgressIndicator(Modifier.fillMaxWidth())
            Text("Buscando tu avance…", Modifier.padding(20.dp))
        }
        inicio?.let { preparado -> key(preparado.aventura.id, recarga) {
            AndroidView(modifier = Modifier.weight(1f).fillMaxWidth(), factory = { contexto ->
                WebView(contexto).apply {
                    val vista = this
                    vistaActual = vista
                    var activa = true
                    val puente = object {
                        @JavascriptInterface fun emitir(texto: String) {
                            val mensaje = leerMensajeJuego(texto) ?: return
                            hiloPrincipal.post {
                                if (!activa) return@post
                                when (mensaje.tipo) {
                                    "listo" -> preparado.aventura.paquete?.let { paquete ->
                                        vista.evaluateJavascript(mensajePaqueteJuego(paquete, preparado.partida), null)
                                    }
                                    "cargado" -> { error = null; cargado = true }
                                    "error" -> error = "No se pudo abrir la aventura."
                                    "pausado" -> mensaje.pausa?.let {
                                        pausado = true; punto = it; callarActual(); guardar(it)
                                    }
                                    "aviso" -> mensaje.aviso?.let { aviso ->
                                        registrarActual(preparado.aventura.id, aviso)
                                        if (aviso.optString("tipo") == "fin") finalizarActual()
                                    }
                                }
                            }
                        }
                        @JavascriptInterface fun decir(texto: String) {
                            if (texto.isNotBlank() && texto.length <= 500) hiloPrincipal.post {
                                if (activa && !solicitaPausa) hablarActual(texto)
                            }
                        }
                        fun cerrar() { activa = false }
                    }
                    tag = { puente.cerrar() }
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccess = false
                    settings.allowContentAccess = false
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.setSupportMultipleWindows(false)
                    // WebView identifica el origen por su protocolo, servidor y puerto, sin la ruta del juego.
                    val origenJuego = URI(BuildConfig.JUEGO_URL).resolve("/").toString()
                    webChromeClient = object : WebChromeClient() {
                        override fun onPermissionRequest(solicitud: PermissionRequest) {
                            val permisoMicrofono = contexto.checkSelfPermission(Manifest.permission.RECORD_AUDIO) ==
                                PackageManager.PERMISSION_GRANTED
                            val recursos = recursosPermitidosJuego(
                                solicitud.resources,
                                permisoMicrofono,
                                direccionJuegoPermitida(origenJuego, solicitud.origin.toString())
                            )
                            if (recursos.isEmpty()) solicitud.deny() else solicitud.grant(recursos)
                        }
                    }
                    webViewClient = object : WebViewClient() {
                        override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?) =
                            request == null || !direccionJuegoPermitida(BuildConfig.JUEGO_URL, request.url.toString())
                        @Deprecated("Compatibilidad con WebView antiguo")
                        override fun shouldOverrideUrlLoading(view: WebView?, url: String?) =
                            url == null || !direccionJuegoPermitida(BuildConfig.JUEGO_URL, url)
                        override fun shouldInterceptRequest(view: WebView?, request: WebResourceRequest?): WebResourceResponse? {
                            if (request == null || direccionJuegoPermitida(BuildConfig.JUEGO_URL, request.url.toString())) return null
                            return WebResourceResponse("text/plain", "UTF-8", 403, "Recurso fuera del juego", emptyMap(), ByteArrayInputStream(ByteArray(0)))
                        }
                        override fun onReceivedError(view: WebView?, request: WebResourceRequest?, fallo: android.webkit.WebResourceError?) {
                            if (request?.isForMainFrame == true) hiloPrincipal.post { if (activa) error = "No se pudo conectar con la aventura. Pide ayuda a tu profe." }
                        }
                    }
                    addJavascriptInterface(puente, "KusiPuente")
                    loadUrl(direccionJuego(BuildConfig.JUEGO_URL, preparado.aventura.paquete != null, preparado.nivel))
                }
            }, onRelease = { vista ->
                @Suppress("UNCHECKED_CAST")
                (vista.tag as? (() -> Unit))?.invoke()
                if (vistaActual === vista) vistaActual = null
                vista.removeJavascriptInterface("KusiPuente")
                vista.stopLoading(); vista.destroy()
            })
        } }
    }
    if (solicitaPausa) AlertDialog(onDismissRequest = {}, title = { Text(if (pausado) "Tu aventura está en pausa" else "Pausando…") }, text = {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            when {
                guardando -> Text("Guardando tu reto…")
                guardado -> Text("Tu avance quedó guardado. Al volver abrirás este reto y la misma aventura.")
                errorGuardado != null -> Text(errorGuardado!!)
                else -> Text("Esperando que la aventura se detenga…")
            }
            Text("Los retos terminados se conservan. Si cierras la aventura, el reto pendiente empieza desde su inicio.", style = MaterialTheme.typography.bodySmall)
        }
    }, confirmButton = {
        TextButton(enabled = !guardando, onClick = {
            vistaActual?.evaluateJavascript("window.postMessage({tipo:'reanudar'}, '*');", null)
            solicitaPausa = false; pausado = false; errorGuardado = null
        }) { Text("Seguir jugando") }
    }, dismissButton = {
        if (guardado) TextButton(onClick = { solicitaPausa = false; volver() }) { Text("Volver a la misión") }
        else if (errorGuardado != null) TextButton(enabled = !guardando, onClick = {
            val confirmado = punto
            if (pausado && confirmado != null) guardar(confirmado)
            else { solicitaPausa = false; pedirPausa() }
        }) { Text("Guardar otra vez") }
    })
}

internal fun recursosPermitidosJuego(
    solicitados: Array<String>, permisoMicrofono: Boolean, origenPermitido: Boolean
): Array<String> {
    // La lista explícita evita conceder la cámara u otros recursos que WebView añada en el futuro.
    val audio = PermissionRequest.RESOURCE_AUDIO_CAPTURE
    return if (permisoMicrofono && origenPermitido && audio in solicitados) arrayOf(audio) else emptyArray()
}
