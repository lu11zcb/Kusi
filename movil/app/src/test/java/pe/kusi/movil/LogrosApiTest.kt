package pe.kusi.movil

import com.sun.net.httpserver.HttpServer
import java.net.InetSocketAddress
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

/** Transporte SIMULADO: el podio y la meta del salón los calcula el servidor; la app solo los muestra. */
class LogrosApiTest {
    private fun conServidor(respuestas: (String, String) -> JSONObject, prueba: (AccesoApi) -> Unit) {
        val servidor = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        servidor.createContext("/") { intercambio ->
            val cuerpo = if (intercambio.requestMethod == "POST") String(intercambio.requestBody.readAllBytes()) else ""
            val bytes = respuestas(intercambio.requestURI.path, cuerpo).toString().toByteArray()
            intercambio.sendResponseHeaders(200, bytes.size.toLong())
            intercambio.responseBody.use { it.write(bytes) }; intercambio.close()
        }
        servidor.start()
        try {
            val base = "http://127.0.0.1:" + servidor.address.port
            prueba(AccesoApi(base, base))
        } finally { servidor.stop(0) }
    }

    @Test fun leeElPodioYLaMetaDelSalon() {
        val logros = JSONObject().put("puntos", 13).put("retos", 2).put("cursos", JSONArray())
            .put("ranking", JSONObject().put("mis_puntos", 13).put("podio", JSONArray()
                .put(JSONObject().put("nombre_corto", "Ana Pérez").put("puntos", 20).put("es_mi_puesto", false)
                    .put("pelaje", 2).put("accesorios", JSONArray().put("SOMBRERO").put("POLO")))
                .put(JSONObject().put("nombre_corto", "Luis Cucho").put("puntos", 13).put("es_mi_puesto", true)
                    .put("pelaje", 0).put("accesorios", JSONArray()))))
            .put("meta_salon", JSONObject().put("puntos_del_salon", 33).put("objetivo", 60))
        conServidor({ ruta, _ -> assertEquals("/api/edu/estudiante/logros/", ruta); logros }) { api ->
            val estado = api.logrosEstudiante()
            assertEquals(13L, estado.resumen?.puntos)
            assertEquals(listOf("Ana Pérez", "Luis Cucho"), estado.ranking?.podio?.map { it.nombreCorto })
            assertEquals(listOf("SOMBRERO", "POLO"), estado.ranking?.podio?.first()?.accesorios)
            assertTrue(estado.ranking!!.podio[1].esMiPuesto)
            assertEquals(MetaSalonInfantil(33, 60), estado.metaSalon)
        }
    }

    @Test fun sinSeccionNoHayPodioNiMeta() {
        val logros = JSONObject().put("puntos", 0).put("retos", 0).put("cursos", JSONArray())
        conServidor({ _, _ -> logros }) { api ->
            val estado = api.logrosEstudiante()
            assertNull(estado.ranking)
            assertNull(estado.metaSalon)
        }
    }

    @Test fun guardaElCuyEnElServidor() {
        var enviado: JSONObject? = null
        conServidor({ ruta, cuerpo ->
            when (ruta) {
                "/api/edu/acceso/csrf/" -> JSONObject().put("csrf_token", "csrf-simulado")
                "/api/edu/estudiante/apariencia/" -> { enviado = JSONObject(cuerpo); JSONObject().put("guardado", true) }
                else -> error("Ruta no prevista: " + ruta)
            }
        }) { api ->
            api.guardarApariencia(3, listOf("GORRO", "MOCHILA"))
            assertEquals(3, enviado!!.getInt("pelaje"))
            assertEquals(listOf("GORRO", "MOCHILA"), List(2) { enviado!!.getJSONArray("accesorios").getString(it) })
        }
    }
}
