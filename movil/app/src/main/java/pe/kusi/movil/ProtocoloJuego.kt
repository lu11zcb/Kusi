package pe.kusi.movil

import java.net.URI
import java.time.Instant
import org.json.JSONObject

/** Contrato puro del puente; se prueba sin WebView ni credenciales reales. */
data class MensajeJuego(val tipo: String, val aviso: JSONObject? = null, val motivo: String? = null)
data class JuegoDisponible(val id: String, val titulo: String, val paquete: String)

fun leerMensajeJuego(texto: String): MensajeJuego? = try {
    if (texto.length > 9000) null else {
        val datos = JSONObject(texto)
        when (val tipo = datos.optString("tipo")) {
            "listo", "cargado" -> MensajeJuego(tipo)
            "error" -> MensajeJuego(tipo, motivo = datos.optString("motivo").take(1000))
            "aviso" -> datos.optJSONObject("aviso")?.takeIf(::avisoJuegoValido)?.let { MensajeJuego(tipo, it) }
            else -> null
        }
    }
} catch (_: Exception) { null }

fun avisoJuegoValido(aviso: JSONObject): Boolean = try {
    val tipo = aviso.optString("tipo")
    val orden = aviso.opt("orden")
    val nivel = aviso.opt("nivel")
    val ayuda = aviso.opt("ayuda")
    aviso.toString().length <= 8192 && aviso.optString("partida").matches(Regex("[A-Za-z0-9-]{1,120}")) &&
        orden is Number && orden.toDouble() == orden.toInt().toDouble() && orden.toInt() in 1..100000 &&
        tipo in listOf("listo", "inicio", "accion", "ayuda", "reto_completado", "fin", "fallo") &&
        Instant.parse(aviso.getString("momento")) != null &&
        ((!aviso.has("nivel") && tipo !in listOf("ayuda", "reto_completado")) ||
            (nivel is Number && nivel.toDouble() == nivel.toInt().toDouble() && nivel.toInt() in 1..5)) &&
        ((!aviso.has("ayuda") && tipo != "ayuda") || (ayuda is Number && ayuda.toDouble() == ayuda.toInt().toDouble() && ayuda.toInt() in 1..2))
} catch (_: Exception) { false }

fun mensajePaqueteJuego(paquete: String): String {
    val datos = JSONObject(paquete)
    require(datos.optString("formato") == "kusi-paquete/0" && datos.optString("familia") == "laberinto" && datos.getJSONArray("retos").length() > 0)
    // JSONObject escapa comillas y barras: el texto del paquete nunca se concatena
    // como código ejecutable, aunque una consigna contenga comillas o saltos.
    return "window.postMessage(" + JSONObject().put("tipo", "paquete").put("paquete", paquete).toString() + ", '*');"
}

fun direccionJuego(base: String, generado: Boolean): String {
    val uri = URI(base)
    require(uri.scheme in listOf("http", "https") && uri.host != null && uri.userInfo == null)
    val parametros = uri.rawQuery?.split('&')?.filterNot { it.substringBefore('=') == "paquete" }?.toMutableList() ?: mutableListOf()
    if (generado) parametros.add("paquete=mensaje")
    return URI(uri.scheme + "://" + uri.rawAuthority + (uri.rawPath.ifEmpty { "/" }) +
        (if (parametros.isEmpty()) "" else "?" + parametros.joinToString("&"))).toString()
}

fun direccionJuegoPermitida(base: String, destino: String): Boolean = try {
    val origen = URI(base)
    val uri = URI(destino)
    fun puerto(valor: URI) = if (valor.port >= 0) valor.port else if (valor.scheme == "https") 443 else 80
    val ruta = URI(null, null, origen.path.ifEmpty { "/" }, null).normalize().path
    val camino = URI(null, null, uri.path.ifEmpty { "/" }, null).normalize().path
    uri.scheme in listOf("http", "https") && uri.userInfo == null && uri.scheme == origen.scheme &&
        uri.host == origen.host && puerto(uri) == puerto(origen) &&
        (camino == ruta || camino.startsWith(if (ruta.endsWith('/')) ruta else ruta + "/"))
} catch (_: Exception) { false }

/** La cola vive en el modelo, para que pasar al cierre no cancele el aviso fin. */
class RegistroAvisosJuego {
    private val pendientes = linkedMapOf<String, JSONObject>()
    private val confirmados = mutableSetOf<String>()
    private val envios = Any()
    @Synchronized fun agregar(aviso: JSONObject) {
        require(avisoJuegoValido(aviso))
        val clave = aviso.getString("partida") + ":" + aviso.getInt("orden")
        if (clave !in confirmados && clave !in pendientes) pendientes[clave] = JSONObject(aviso.toString())
    }
    fun vaciar(enviar: (JSONObject) -> JSONObject): JSONObject? = synchronized(envios) {
        var ultimo: JSONObject? = null
        val lote = synchronized(this) { pendientes.toMap() }
        for ((clave, aviso) in lote) {
            ultimo = enviar(aviso)
            synchronized(this) { confirmados.add(clave); pendientes.remove(clave) }
        }
        ultimo
    }
    @Synchronized fun cantidadPendientes() = pendientes.size
    @Synchronized fun limpiar() { pendientes.clear(); confirmados.clear() }
}
