package pe.kusi.movil

import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import java.util.concurrent.atomic.AtomicInteger
import org.junit.Assert.*
import org.junit.Test

/** Transporte HTTP local SIMULADO; no utiliza cuentas ni servicios reales. */
class AccesoApiTest {
    @Test fun simulado_cookies_csrf_rotacion_y_salida() {
        val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val posts = AtomicInteger()
        val cuenta = "{\"id\":\"ficticio\",\"nombre\":\"Estudiante SIMULADO\",\"roles\":[\"estudiante\"],\"debe_cambiar_contrasena\":false}"
        servidor.createContext("/") { intercambio ->
            val ruta = intercambio.requestURI.path
            val respuesta = when (ruta) {
                "/api/acceso/sesion/" -> {
                    intercambio.responseHeaders.add("Set-Cookie", "csrftoken=ficticio; Path=/; HttpOnly")
                    "{\"usuario\":null,\"csrf_token\":\"token-simulado\"}"
                }
                "/api/acceso/ingreso/", "/api/acceso/contrasena/", "/api/acceso/salida/" -> {
                    assertEquals("POST", intercambio.requestMethod)
                    assertEquals("token-simulado", intercambio.requestHeaders.getFirst("X-CSRFToken"))
                    assertTrue(intercambio.requestHeaders.getFirst("Cookie").contains("csrftoken=ficticio"))
                    posts.incrementAndGet()
                    intercambio.responseHeaders.add("Set-Cookie", "sessionid=sesionficticia; Path=/; HttpOnly")
                    if (ruta.endsWith("salida/")) "{\"usuario\":null}" else "{\"usuario\":$cuenta}"
                }
                "/api/edu/acceso/estudiante/" -> {
                    assertTrue(intercambio.requestHeaders.getFirst("Cookie").contains("sessionid=sesionficticia"))
                    "{\"usuario\":$cuenta}"
                }
                else -> error("Ruta SIMULADA no prevista")
            }
            val bytes = respuesta.toByteArray()
            intercambio.sendResponseHeaders(200, bytes.size.toLong()); intercambio.responseBody.use { it.write(bytes) }; intercambio.close()
        }
        servidor.start()
        try {
            val url = "http://127.0.0.1:" + servidor.address.port
            val api = AccesoApi(url, url)
            assertTrue(api.ingresar("qa@example.com", "ficticia").roles.contains("estudiante"))
            assertFalse(api.cambiar("ficticia", "otra", "otra").temporal)
            assertEquals("ficticio", api.validarEstudiante().id)
            api.salir(); assertEquals(3, posts.get())
        } finally { servidor.stop(0) }
    }
    @Test fun simulado_errores_servidor_y_json_invalido_sin_exponer_cuerpo() {
        for ((estado, cuerpo) in listOf(401 to "{\"mensaje\":\"La sesión caducó\"}", 403 to "{\"mensaje\":\"Sin permiso\"}", 200 to "no-json")) {
            val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
            servidor.createContext("/") { intercambio ->
                val bytes = cuerpo.toByteArray(); intercambio.sendResponseHeaders(estado, bytes.size.toLong())
                intercambio.responseBody.use { it.write(bytes) }; intercambio.close()
            }
            servidor.start()
            try {
                val url = "http://127.0.0.1:" + servidor.address.port
                try { AccesoApi(url, url).validarEstudiante(); fail("Debe rechazar el error SIMULADO") }
                catch (fallo: FalloAcceso) { assertEquals(if (estado == 200) 502 else estado, fallo.estado) }
            } finally { servidor.stop(0) }
        }
    }
    @Test fun simulado_no_sigue_redirecciones() {
        val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        servidor.createContext("/") { intercambio ->
            intercambio.responseHeaders.add("Location", "https://example.com"); intercambio.sendResponseHeaders(302, -1); intercambio.close()
        }
        servidor.start()
        try {
            val url = "http://127.0.0.1:" + servidor.address.port
            try { AccesoApi(url, url).sesion(); fail("Redirección no permitida") }
            catch (fallo: FalloAcceso) { assertEquals(302, fallo.estado) }
        } finally { servidor.stop(0) }
    }
}
