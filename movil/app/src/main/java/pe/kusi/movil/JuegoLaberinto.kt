package pe.kusi.movil

import android.annotation.SuppressLint
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import java.io.ByteArrayInputStream

/** Solo el servidor del juego puede navegar o cargar recursos en este WebView. */
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun JuegoLaberinto(aventura: AventuraInfantil, registrar: (org.json.JSONObject) -> Unit, finalizar: () -> Unit, volver: () -> Unit) {
    val voz = recordarVozKusi { }
    val registrarActual by rememberUpdatedState(registrar)
    val finalizarActual by rememberUpdatedState(finalizar)
    val hablarActual by rememberUpdatedState(voz.hablar)
    var error by remember { mutableStateOf<String?>(null) }
    val hiloPrincipal = remember { Handler(Looper.getMainLooper()) }
    Column(Modifier.fillMaxSize()) {
        TextButton(onClick = volver) { Text("Volver a la misión") }
        error?.let { Text(it) }
        key(aventura.id) {
            AndroidView(modifier = Modifier.weight(1f).fillMaxWidth(), factory = { contexto ->
                WebView(contexto).apply {
                    val vista = this
                    var activa = true
                    // Los callbacks del puente vienen de otro hilo. Toda operación
                    // de pantalla, voz y evaluateJavascript vuelve al hilo principal.
                    val puente = object {
                        @JavascriptInterface fun emitir(texto: String) {
                            val mensaje = leerMensajeJuego(texto) ?: return
                            hiloPrincipal.post {
                                if (!activa) return@post
                                when (mensaje.tipo) {
                                    "listo" -> aventura.paquete?.let { paquete -> vista.evaluateJavascript(mensajePaqueteJuego(paquete), null) }
                                    "error" -> error = mensaje.motivo ?: "No se pudo abrir el juego."
                                    "aviso" -> mensaje.aviso?.let { aviso ->
                                        registrarActual(aviso)
                                        if (aviso.optString("tipo") == "fin") finalizarActual()
                                    }
                                }
                            }
                        }
                        @JavascriptInterface fun decir(texto: String) {
                            if (texto.isNotBlank() && texto.length <= 500) hiloPrincipal.post { if (activa) hablarActual(texto) }
                        }
                        // Se elimina junto con el WebView: ningún callback tardío
                        // puede cambiar la pantalla de otra aventura.
                        fun cerrar() { activa = false }
                    }
                    tag = { puente.cerrar() }
                    settings.javaScriptEnabled = true
                    settings.domStorageEnabled = true
                    settings.allowFileAccess = false
                    settings.allowContentAccess = false
                    settings.mediaPlaybackRequiresUserGesture = false
                    settings.setSupportMultipleWindows(false)
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
                            if (request?.isForMainFrame == true) hiloPrincipal.post { if (activa) error = "No se pudo conectar con el laberinto. Pide ayuda a tu profe." }
                        }
                    }
                    addJavascriptInterface(puente, "KusiPuente")
                    loadUrl(direccionJuego(BuildConfig.JUEGO_URL, aventura.paquete != null))
                }
            }, onRelease = { vista ->
                @Suppress("UNCHECKED_CAST")
                (vista.tag as? (() -> Unit))?.invoke()
                vista.removeJavascriptInterface("KusiPuente")
                vista.stopLoading()
                vista.destroy()
            })
        }
    }
}
