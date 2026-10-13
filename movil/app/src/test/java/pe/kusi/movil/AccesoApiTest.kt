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
                    // HU12: el ingreso se hace con DNI, no con correo.
                    if (ruta.endsWith("ingreso/")) assertTrue(String(intercambio.requestBody.readAllBytes()).contains("\"dni\":\"70000001\""))
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
            assertTrue(api.ingresar("70000001", "ficticia").roles.contains("estudiante"))
            assertFalse(api.cambiar("ficticia", "otra", "otra").temporal)
            assertEquals("ficticio", api.validarEstudiante().id)
            api.salir(); assertEquals(3, posts.get())
        } finally { servidor.stop(0) }
    }
    /** HU13: la sesión se recuerda en el almacén y se olvida al salir o si no se quiere recordar. */
    @Test fun simulado_recuerda_la_sesion_entre_aperturas_de_la_app() {
        val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val cuenta = "{\"id\":\"ficticio\",\"nombre\":\"Estudiante SIMULADO\",\"roles\":[\"estudiante\"],\"debe_cambiar_contrasena\":false}"
        servidor.createContext("/") { intercambio ->
            val conSesion = intercambio.requestHeaders.getFirst("Cookie")?.contains("sessionid=sesionficticia") == true
            val respuesta = when (intercambio.requestURI.path) {
                "/api/acceso/sesion/" -> {
                    intercambio.responseHeaders.add("Set-Cookie", "csrftoken=ficticio; Path=/")
                    "{\"usuario\":" + (if (conSesion) cuenta else "null") + ",\"csrf_token\":\"token-simulado\"}"
                }
                "/api/acceso/ingreso/" -> {
                    intercambio.responseHeaders.add("Set-Cookie", "sessionid=sesionficticia; Path=/; HttpOnly")
                    "{\"usuario\":$cuenta}"
                }
                "/api/acceso/salida/" -> {
                    intercambio.responseHeaders.add("Set-Cookie", "sessionid=\"\"; Max-Age=0; Path=/")
                    "{\"usuario\":null}"
                }
                else -> error("Ruta SIMULADA no prevista")
            }
            val bytes = respuesta.toByteArray()
            intercambio.sendResponseHeaders(200, bytes.size.toLong()); intercambio.responseBody.use { it.write(bytes) }; intercambio.close()
        }
        servidor.start()
        try {
            val url = "http://127.0.0.1:" + servidor.address.port
            val almacen = object : AlmacenSesion {
                var valor: String? = null
                override fun leer() = valor
                override fun guardar(valor: String?) { this.valor = valor }
            }
            AccesoApi(url, url, almacen).ingresar("70000001", "ficticia")
            assertTrue(almacen.valor!!.contains("sessionid=sesionficticia"))
            // Se cierra y se vuelve a abrir la app: la sesión sigue.
            val reabierta = AccesoApi(url, url, almacen)
            assertEquals("ficticio", reabierta.sesion()?.id)
            reabierta.salir()
            assertNull(almacen.valor)
            assertNull(AccesoApi(url, url, almacen).sesion())
            // Sin "recordar", el celular no guarda la sesión.
            val sinRecordar = AccesoApi(url, url, almacen)
            sinRecordar.recordar = false
            sinRecordar.ingresar("70000001", "ficticia")
            assertNull(almacen.valor)
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
