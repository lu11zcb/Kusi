package pe.kusi.movil

import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Transporte sintético: una respuesta recibida no significa un avance confirmado. */
class AvanceJuegoApiTest {
    @Test fun conservaLaVersionConfirmadaYNoAceptaUnGuardadoQueElServidorNoConfirma() {
        val juegoNuevo = "11111111-2222-4333-8444-555555555555"
        val juegoAnterior = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
        val paquete = JSONObject().put("formato", "kusi-paquete/0").put("familia", "laberinto")
            .put("retos", JSONArray(List(3) { JSONObject() })).toString()
        val avance = JSONObject().put("juego_id", juegoAnterior).put("paquete", paquete).put("nivel", 2)
            .put("partida", JSONObject().put("id", "partida-confirmada").put("orden", 8).put("cerrada", false)
                .put("avisados", JSONArray(listOf("listo", "inicio", "reto_completado:1"))))
        val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        var guardados = 0
        var visto = false
        servidor.createContext("/") { intercambio ->
            val ruta = intercambio.requestURI.path
            val respuesta = when {
                ruta == "/api/edu/acceso/csrf/" -> JSONObject().put("csrf_token", "csrf-sintetico")
                ruta.endsWith("/avance/") && intercambio.requestMethod == "GET" -> JSONObject().put("avance", avance)
                ruta.endsWith("/avance/") -> {
                    assertEquals("csrf-sintetico", intercambio.requestHeaders.getFirst("X-XSRF-TOKEN"))
                    val punto = JSONObject(String(intercambio.requestBody.readAllBytes()))
                    assertEquals("partida-confirmada", punto.getString("partida"))
                    assertEquals(8, punto.getInt("orden"))
                    guardados++
                    JSONObject().put("guardado", guardados > 1).put("avance", avance)
                }
                ruta.endsWith("/visto/") -> {
                    assertEquals("POST", intercambio.requestMethod)
                    assertEquals("csrf-sintetico", intercambio.requestHeaders.getFirst("X-XSRF-TOKEN"))
                    visto = true
                    JSONObject().put("guardado", true)
                }
                else -> error("Ruta no prevista: " + ruta)
            }
            val bytes = respuesta.toString().toByteArray()
            intercambio.sendResponseHeaders(200, bytes.size.toLong())
            intercambio.responseBody.use { it.write(bytes) }; intercambio.close()
        }
        servidor.start()
        try {
            val base = "http://127.0.0.1:" + servidor.address.port
            val api = AccesoApi(base, base)
            val recuperado = api.consultarAvanceJuego(juegoNuevo)!!
            assertEquals(juegoAnterior, recuperado.juegoId)
            assertEquals(paquete, recuperado.paquete)
            assertThrows(FalloAcceso::class.java) { api.guardarAvanceJuego(juegoAnterior, PuntoPausa("partida-confirmada", 8, 2)) }
            assertEquals(2, api.guardarAvanceJuego(juegoAnterior, PuntoPausa("partida-confirmada", 8, 2)).nivel)
            api.marcarJuegoVisto(juegoNuevo)
            assertTrue(visto)
        } finally { servidor.stop(0) }
    }
}
