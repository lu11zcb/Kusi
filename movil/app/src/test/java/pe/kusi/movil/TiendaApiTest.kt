package pe.kusi.movil

import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Transporte SIMULADO: el saldo y las compras los decide el servidor, nunca la app. */
class TiendaApiTest {
    @Test fun leeElSaldoYCompraConLaPruebaDeSeguridadDeSpring() {
        var saldo = 25L
        var comprada = false
        val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        servidor.createContext("/") { intercambio ->
            val ruta = intercambio.requestURI.path
            var estado = 200
            val respuesta = when (ruta) {
                "/api/edu/acceso/csrf/" -> JSONObject().put("csrf_token", "csrf-simulado")
                "/api/edu/estudiante/monedas/" -> JSONObject().put("saldo", saldo)
                "/api/edu/estudiante/tienda/" -> JSONObject().put("prendas", JSONArray()
                    .put(JSONObject().put("id", "lentes_estrellas").put("nombre", "Lentes estrella").put("precio", 20).put("comprada", comprada))
                    .put(JSONObject().put("id", "chaleco").put("nombre", "Chaleco coral").put("precio", 60).put("comprada", false)))
                "/api/edu/estudiante/tienda/compras/" -> {
                    assertEquals("POST", intercambio.requestMethod)
                    assertEquals("csrf-simulado", intercambio.requestHeaders.getFirst("X-XSRF-TOKEN"))
                    val prenda = JSONObject(String(intercambio.requestBody.readAllBytes())).getString("prenda_id")
                    if (prenda == "chaleco") {
                        estado = 409
                        JSONObject().put("mensaje", "Todavía no tienes suficientes monedas.")
                    } else {
                        saldo -= 20; comprada = true
                        JSONObject().put("prenda_id", prenda).put("saldo", saldo)
                    }
                }
                else -> error("Ruta no prevista: " + ruta)
            }
            val bytes = respuesta.toString().toByteArray()
            intercambio.sendResponseHeaders(estado, bytes.size.toLong())
            intercambio.responseBody.use { it.write(bytes) }; intercambio.close()
        }
        servidor.start()
        try {
            val base = "http://127.0.0.1:" + servidor.address.port
            val api = AccesoApi(base, base)
            val tienda = api.tiendaEstudiante()
            assertEquals(25L, tienda.saldo)
            assertEquals(listOf(20, 60), tienda.prendas.map { it.precio })
            assertTrue(piezasCompradas(tienda).isEmpty())

            assertEquals(5L, api.comprarPrenda("lentes_estrellas"))
            val falla = assertThrows(FalloAcceso::class.java) { api.comprarPrenda("chaleco") }
            assertEquals(409, falla.estado)
            assertEquals("Todavía no tienes suficientes monedas.", falla.message)
            assertEquals(setOf(PiezaCuy.LENTES_ESTRELLAS), piezasCompradas(api.tiendaEstudiante()))
        } finally { servidor.stop(0) }
    }

    @Test fun lasPrendasDeLaTiendaSoloSePonenDespuesDeComprarlas() {
        val tienda = PiezaCuy.entries.filter { it.deTienda }
        assertEquals(listOf(PiezaCuy.GORRA, PiezaCuy.LENTES_ESTRELLAS, PiezaCuy.CHALECO, PiezaCuy.MOCHILA_MENTA), tienda)
        // Los ids son los del catálogo de Spring (MonedasEstudianteService).
        assertEquals(listOf("gorra", "lentes_estrellas", "chaleco", "mochila_menta"), tienda.map { it.idTienda })
        assertEquals(PiezaCuy.CHALECO, piezaDeTienda("chaleco"))
        assertNull(piezaDeTienda("POLO"))

        val inicial = AparienciaCuy()
        assertTrue(inicial.vestir(CategoriaCuy.ROPA, PiezaCuy.CHALECO).piezas.isEmpty())
        assertEquals(PiezaCuy.CHALECO, inicial.vestir(CategoriaCuy.ROPA, PiezaCuy.CHALECO, setOf(PiezaCuy.CHALECO)).piezas[CategoriaCuy.ROPA])
        assertEquals(PiezaCuy.POLO, inicial.vestir(CategoriaCuy.ROPA, PiezaCuy.POLO).piezas[CategoriaCuy.ROPA])
    }

    @Test fun sinElDibujoDeUnaCombinacionSeMuestraElCuySinLasPrendasDeLaTienda() {
        val vestido = AparienciaCuy(piezas = mapOf(CategoriaCuy.CABEZA to PiezaCuy.SOMBRERO, CategoriaCuy.ROPA to PiezaCuy.CHALECO))
        assertEquals("SOMBRERO-0-CHALECO-0", vestido.archivo)
        assertEquals("SOMBRERO-0-CHALECO-0", vestido.hojaDisponible(setOf("SOMBRERO-0-CHALECO-0.webp")))
        assertEquals("SOMBRERO-0-0-0", vestido.hojaDisponible(setOf("SOMBRERO-0-0-0.webp")))
    }
}
