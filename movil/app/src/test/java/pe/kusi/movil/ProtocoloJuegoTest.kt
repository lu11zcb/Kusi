package pe.kusi.movil

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ProtocoloJuegoTest {
    private fun aviso(orden: Int = 1) = JSONObject().put("tipo", "ayuda").put("partida", "prueba-1").put("orden", orden)
        .put("momento", "2026-10-26T20:00:00Z").put("nivel", 1).put("ayuda", 2)

    @Test fun interpretaLosAvisosYRechazaMensajesFueraDelContrato() {
        assertEquals("listo", leerMensajeJuego("{\"tipo\":\"listo\"}")?.tipo)
        val mensaje = JSONObject().put("tipo", "aviso").put("aviso", aviso()).toString()
        assertEquals(1, leerMensajeJuego(mensaje)?.aviso?.getInt("orden"))
        assertNull(leerMensajeJuego("no es JSON"))
        assertFalse(avisoJuegoValido(aviso(0)))
        assertFalse(avisoJuegoValido(aviso().put("ayuda", 3)))
        assertFalse(avisoJuegoValido(aviso().put("tipo", "otro")))
        assertNull(leerMensajeJuego("x".repeat(9001)))
    }
    @Test fun elPaqueteViajaComoTextoSinConvertirLaConsignaEnCodigo() {
        val paquete = JSONObject().put("formato", "kusi-paquete/0").put("familia", "laberinto")
            .put("retos", org.json.JSONArray().put(JSONObject().put("consigna", "Comillas: \"; alert(1); //"))).toString()
        val codigo = mensajePaqueteJuego(paquete)
        val datos = JSONObject(codigo.removePrefix("window.postMessage(").removeSuffix(", '*');"))
        assertEquals("paquete", datos.getString("tipo"))
        assertEquals(paquete, datos.getString("paquete"))
    }
    @Test fun restringeLaNavegacionYConservaLosParametrosDelJuego() {
        val base = "http://10.0.2.2:5174/"
        assertTrue(direccionJuegoPermitida(base, base + "src/main.js"))
        for (url in listOf("http://otro.example/", "file:///tmp/juego", "http://10.0.2.2:8000/", "javascript:alert(1)")) assertFalse(direccionJuegoPermitida(base, url))
        assertFalse(direccionJuegoPermitida(base + "juego/", base + "juego/../otro/"))
        assertFalse(direccionJuegoPermitida(base + "juego/", base + "juego/%2e%2e/otro/"))
        assertEquals(base + "?paquete=mensaje", direccionJuego(base, true))
        assertEquals(base, direccionJuego(base, false))
    }
    @Test fun reenviarTrasUnaRespuestaPerdidaNoCambiaElAvisoNiDuplicaConfirmados() {
        val registro = RegistroAvisosJuego()
        val original = aviso()
        registro.agregar(original)
        registro.agregar(original)
        var envios = 0
        try { registro.vaciar { envios++; throw IllegalStateException("respuesta perdida") } } catch (_: IllegalStateException) { }
        assertEquals(1, registro.cantidadPendientes())
        registro.vaciar { enviado -> envios++; assertEquals(original.toString(), enviado.toString()); JSONObject().put("partida", "prueba-1") }
        registro.agregar(original)
        registro.vaciar { fail("No debe enviar un confirmado"); JSONObject() }
        assertEquals(2, envios)
        assertEquals(0, registro.cantidadPendientes())
    }
}
