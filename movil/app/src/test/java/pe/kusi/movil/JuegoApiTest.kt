package pe.kusi.movil

import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Transporte simulado: comprueba cookies y los dos CSRF sin cuentas reales. */
class JuegoApiTest {
    @Test fun bibliotecaYAvanceUsanLaSesionDelAlumnoYElCsrfDeSpring() {
        val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        val cuenta = JSONObject().put("id", "alumno-de-prueba").put("nombre", "Alumno")
            .put("roles", org.json.JSONArray().put("estudiante")).put("debe_cambiar_contrasena", false)
        val paquete = JSONObject().put("formato", "kusi-paquete/0").put("familia", "laberinto")
            .put("retos", org.json.JSONArray().put(JSONObject())).toString()
        var registros = 0
        servidor.createContext("/") { intercambio ->
            val ruta = intercambio.requestURI.path
            val respuesta = when (ruta) {
                "/api/acceso/sesion/" -> JSONObject().put("csrf_token", "django-de-prueba")
                "/api/acceso/ingreso/" -> {
                    intercambio.responseHeaders.add("Set-Cookie", "sessionid=alumno-simulado; Path=/; HttpOnly")
                    JSONObject().put("usuario", cuenta)
                }
                "/api/edu/estudiante/juegos/" -> {
                    assertTrue(intercambio.requestHeaders.getFirst("Cookie").contains("sessionid=alumno-simulado"))
                    JSONObject().put("juegos", org.json.JSONArray().put(JSONObject().put("id", "generacion-simulada").put("titulo", "Patrones").put("paquete", paquete)))
                }
                "/api/edu/acceso/csrf/" -> {
                    intercambio.responseHeaders.add("Set-Cookie", "kusi_edu_csrf=spring-de-prueba; Path=/api/edu/; HttpOnly")
                    JSONObject().put("csrf_token", "spring-de-prueba")
                }
                "/api/edu/partidas/avisos/" -> {
                    assertEquals("POST", intercambio.requestMethod)
                    assertEquals("spring-de-prueba", intercambio.requestHeaders.getFirst("X-XSRF-TOKEN"))
                    assertNull(intercambio.requestHeaders.getFirst("X-CSRFToken"))
                    assertTrue(intercambio.requestHeaders.getFirst("Cookie").contains("sessionid=alumno-simulado"))
                    assertTrue(intercambio.requestHeaders.getFirst("Cookie").contains("kusi_edu_csrf=spring-de-prueba"))
                    val aviso = JSONObject(String(intercambio.requestBody.readAllBytes())).getJSONObject("aviso")
                    registros++
                    JSONObject().put("guardado", true).put("duplicado", false).put("resumen", JSONObject().put("partida", aviso.getString("partida"))
                        .put("ayudas_usadas", 1).put("niveles_completados", 0).put("prueba_docente", false).put("termino", false))
                }
                else -> error("Ruta no prevista: " + ruta)
            }
            val bytes = respuesta.toString().toByteArray()
            intercambio.sendResponseHeaders(200, bytes.size.toLong())
            intercambio.responseBody.use { it.write(bytes) }
            intercambio.close()
        }
        servidor.start()
        try {
            val base = "http://127.0.0.1:" + servidor.address.port
            val api = AccesoApi(base, base)
            api.ingresar("70000001", "solo-prueba")
            assertEquals("Patrones", api.juegosDePrueba().single().titulo)
            val registro = RegistroAvisosJuego()
            val aviso = JSONObject().put("tipo", "ayuda").put("partida", "prueba").put("orden", 1)
                .put("momento", "2026-10-26T20:00:00Z").put("nivel", 1).put("ayuda", 1)
            registro.agregar(aviso)
            registro.vaciar(api::guardarAvisoJuego)
            registro.agregar(aviso)
            registro.vaciar(api::guardarAvisoJuego)
            assertEquals(1, registros)
        } finally { servidor.stop(0) }
    }
}
