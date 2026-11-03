package pe.kusi.movil

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.unit.dp

/** Solo debug, segundo icono. Ni consulta ni modifica cuentas/resultados reales. */
class PresentacionInfantilActivity : ComponentActivity() {
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            var cuenta by remember { mutableStateOf<Cuenta?>(null) }
            val aventuras = remember { listOf(
                AventuraInfantil("ejemplo-feria", "La feria de las cantidades", "Matemática", "Ayuda a la casera a juntar lo que pide cada cliente.", "Escucha el pedido, busca los productos y cuenta cuántos necesitas."),
                AventuraInfantil("ejemplo-palabras", "El jardín de las palabras", "Comunicación", "Descubre las palabras que se esconden en el jardín.", "Mira, escucha y encuentra las palabras con Kusi.", portada = R.drawable.kusi_palabras_v2)
            ) }
            TemaKusi {
                AplicacionInfantil(EstadoEntradaKusi(cuenta, validado = true, claveTemporalDisponible = true),
                    ingresar = { _,_,_ -> cuenta = Cuenta("solo-presentacion", "Mateo", setOf("estudiante"), true) },
                    cambiarClave = { _,_,_ -> cuenta = cuenta?.copy(temporal = false) }, comprobar = {}, salir = { cuenta = null },
                    biblioteca = EstadoBibliotecaInfantil(aventuras), cierre = EstadoCierreInfantil(1,1), presentacion = true,
                    contenidoJuego = { _, finalizar, volver ->
                        val finActual by rememberUpdatedState(finalizar)
                        Column(Modifier.fillMaxSize()) {
                            TextButton(onClick = volver, modifier = Modifier.heightIn(min = 48.dp)) { Text("Volver a la misión") }
                            AndroidView(modifier = Modifier.weight(1f).fillMaxWidth(), factory = { contexto ->
                                WebView(contexto).apply {
                                    settings.javaScriptEnabled = true
                                    settings.allowFileAccess = false; settings.allowContentAccess = false
                                    settings.blockNetworkLoads = true
                                    webViewClient = object : WebViewClient() {
                                        override fun shouldOverrideUrlLoading(view: WebView?, request: android.webkit.WebResourceRequest?) = true
                                    }
                                    // Únicamente HTML fijo incluido en src/debug. Nunca URLs o datos externos.
                                    addJavascriptInterface(object { @JavascriptInterface fun emitir(tipo: String) { if (tipo == "fin") runOnUiThread { finActual() } } }, "KusiPuente")
                                    val html = contexto.assets.open("presentacion.html").bufferedReader().use { it.readText() }
                                    loadDataWithBaseURL("https://kusi.presentacion.local/", html, "text/html", "UTF-8", null)
                                }
                            }, onRelease = { it.removeJavascriptInterface("KusiPuente"); it.destroy() })
                        }
                    })
            }
        }
    }
}
