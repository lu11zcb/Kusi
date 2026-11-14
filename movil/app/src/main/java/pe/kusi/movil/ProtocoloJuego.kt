package pe.kusi.movil

import java.net.URI
import java.time.Instant
import org.json.JSONObject

/** Contrato puro del puente; se prueba sin WebView ni credenciales reales. */
data class MensajeJuego(val tipo: String, val aviso: JSONObject? = null, val motivo: String? = null, val pausa: PuntoPausa? = null)
data class JuegoDisponible(val id: String, val titulo: String, val paquete: String, val nuevo: Boolean = false)
data class PuntoPausa(val partida: String, val orden: Int, val nivel: Int)
data class AvanceJuego(val juegoId: String, val paquete: String, val nivel: Int, val partida: JSONObject)
data class InicioJuego(val aventura: AventuraInfantil, val nivel: Int = 1, val partida: JSONObject? = null)
private val identificadorJuego = Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")

/** El anfitrión adjunta el juego que realmente abrió; no cambia el aviso original. */
fun avisoDelJuego(aviso: JSONObject, juegoId: String): JSONObject {
    require(identificadorJuego.matches(juegoId))
    require(avisoJuegoValido(aviso))
    return JSONObject(aviso.toString()).put("juego_id", juegoId)
}

fun leerAvanceJuego(datos: JSONObject): AvanceJuego {
    val id = datos.getString("juego_id")
    val paquete = datos.getString("paquete")
    val nivel = datos.getInt("nivel")
    val partida = datos.getJSONObject("partida")
    require(identificadorJuego.matches(id) && nivel in 1..JSONObject(paquete).getJSONArray("retos").length())
    require(partida.getString("id").matches(Regex("[A-Za-z0-9-]{1,120}")) && partida.getInt("orden") in 0..100000 &&
        partida.opt("cerrada") == false)
    val avisados = partida.getJSONArray("avisados")
    require((0 until avisados.length()).all { avisados.getString(it).matches(Regex("listo|inicio|reto_completado:[1-5]")) })
    mensajePaqueteJuego(paquete)
    return AvanceJuego(id, paquete, nivel, JSONObject(partida.toString()))
}

data class PresentacionJuego(val titulo: String, val mision: String, val consigna: String, val clasificacion: Boolean, val curso: String)

/** El niño recibe la consigna comprobada del juego, sin inventar objetivos ni
 * usar el tema del docente como una instrucción. No cambia el paquete recibido. */
fun presentacionJuego(juego: JuegoDisponible): PresentacionJuego {
    val paquete = JSONObject(juego.paquete)
    val primerReto = paquete.getJSONArray("retos").getJSONObject(0)
    val esDelTaller = paquete.has("trabajo")
    val clasificacion = !esDelTaller && primerReto.optJSONObject("regla")?.optString("tipo") == "solo_clase"
    val consigna = primerReto.optString("consigna").takeIf { it.isNotBlank() } ?: "Escucha a Kusi al entrar."
    return PresentacionJuego(
        paquete.optString("titulo").takeIf { it.isNotBlank() } ?: juego.titulo,
        paquete.optString("meta").takeIf { it.isNotBlank() && it.length <= 180 }
            ?: if (esDelTaller) consigna else if (clasificacion) "Busca los alimentos que te pide Kusi." else "Recoge los alimentos siguiendo el orden que ves arriba.",
        consigna, clasificacion,
        paquete.optString("curso").takeIf { it.isNotBlank() }
            ?: if (esDelTaller) "Tu actividad" else if (clasificacion) "Frutas y verduras" else "Patrones con alimentos"
    )
}

fun leerMensajeJuego(texto: String): MensajeJuego? = try {
    if (texto.length > 9000) null else {
        val datos = JSONObject(texto)
        when (val tipo = datos.optString("tipo")) {
            "listo", "cargado" -> MensajeJuego(tipo)
            "reanudado" -> MensajeJuego(tipo)
            "pausado" -> {
                val partida = datos.getString("partida")
                val orden = datos.getInt("orden")
                val nivel = datos.getInt("nivel")
                if (partida.matches(Regex("[A-Za-z0-9-]{1,120}")) && orden in 1..100000 && nivel in 1..5)
                    MensajeJuego(tipo, pausa = PuntoPausa(partida, orden, nivel)) else null
            }
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

fun mensajePaqueteJuego(paquete: String, partida: JSONObject? = null): String {
    val datos = JSONObject(paquete)
    val familia = datos.optString("familia")
    val deLaBiblioteca = familia == "laberinto" && !datos.has("trabajo")
    // El trabajo elige una carpeta del taller. Se exige el UUID canónico que
    // escribe Spring: nunca se permite una ruta ni una dirección como identificador.
    val delTaller = familia != "laberinto" && familia.matches(Regex("[a-z][a-z0-9_]{2,40}")) &&
        (datos.opt("trabajo") as? String)?.matches(
            Regex("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")
        ) == true
    require(datos.optString("formato") == "kusi-paquete/0" && (deLaBiblioteca || delTaller) &&
        datos.getJSONArray("retos").length() in 1..5)
    // JSONObject escapa comillas y barras: el texto del paquete nunca se concatena
    // como código ejecutable, aunque una consigna contenga comillas o saltos.
    val mensaje = JSONObject().put("tipo", "paquete").put("paquete", paquete)
    if (partida != null) mensaje.put("partida", JSONObject(partida.toString()))
    return "window.postMessage(" + mensaje.toString() + ", '*');"
}

fun direccionJuego(base: String, generado: Boolean, nivel: Int? = null): String {
    val uri = URI(base)
    require(uri.scheme in listOf("http", "https") && uri.host != null && uri.userInfo == null)
    require(nivel == null || nivel in 1..5)
    val parametros = uri.rawQuery?.split('&')?.filterNot { it.substringBefore('=') in listOf("paquete", "nivel") }?.toMutableList() ?: mutableListOf()
    if (generado) parametros.add("paquete=mensaje")
    if (nivel != null) parametros.add("nivel=" + nivel)
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
