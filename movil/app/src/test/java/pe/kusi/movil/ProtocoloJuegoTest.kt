package pe.kusi.movil

import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test

class ProtocoloJuegoTest {
    private fun aviso(orden: Int = 1) = JSONObject().put("tipo", "ayuda").put("partida", "prueba-1").put("orden", orden)
        .put("momento", "2026-10-26T20:00:00Z").put("nivel", 1).put("ayuda", 2)

    // Un juego del taller trae su portada en la carpeta del trabajo; el laberinto no tiene.
    @Test fun laPortadaSaleDeLaCarpetaDelTrabajoYElLaberintoNoTiene() {
        val trabajo = "764bce40-9f31-4592-99c7-818886b65cc4"
        assertEquals("http://localhost:5174/taller/trabajos/" + trabajo + "/portada.png",
            portadaDelJuego("http://localhost:5174", "{\"trabajo\":\"" + trabajo + "\"}"))
        assertNull(portadaDelJuego("http://localhost:5174", "{\"familia\":\"laberinto\"}"))
        assertNull(portadaDelJuego("http://localhost:5174", "{\"trabajo\":\"../../.env\"}"))
        assertNull(portadaDelJuego("http://localhost:5174", "no es json"))
        assertNull(portadaDelJuego("http://localhost:5174", null))
    }

    @Test fun elAnfitrionAdjuntaElJuegoElegidoSinCambiarLaPartidaNiElOrden() {
        val original = aviso(7).put("juego_id", "identificador-recibido-no-autorizado")
        val juego = "11111111-2222-4333-8444-555555555555"
        val completo = avisoDelJuego(original, juego)
        assertEquals(juego, completo.getString("juego_id"))
        assertEquals(7, completo.getInt("orden"))
        assertEquals("prueba-1", completo.getString("partida"))
        assertEquals("identificador-recibido-no-autorizado", original.getString("juego_id"))
        assertThrows(IllegalArgumentException::class.java) { avisoDelJuego(original, "../otro-juego") }
    }

    @Test fun laPausaNoEsUnAvisoEducativoYExigeSuPuntoDeConfirmacion() {
        val pausa = leerMensajeJuego("{\"tipo\":\"pausado\",\"partida\":\"prueba-1\",\"orden\":7,\"nivel\":2}")
        assertEquals(PuntoPausa("prueba-1", 7, 2), pausa?.pausa)
        assertNull(pausa?.aviso)
        assertNull(leerMensajeJuego("{\"tipo\":\"pausado\",\"partida\":\"prueba-1\",\"orden\":7,\"nivel\":6}"))
        assertFalse(avisoJuegoValido(aviso().put("tipo", "pausado")))
    }

    @Test fun elAvanceRestauraLaVersionExactaLaPartidaYElNivelConfirmados() {
        val paquete = paqueteDelTaller().put("retos", org.json.JSONArray(List(3) { JSONObject() })).toString()
        val semilla = JSONObject().put("id", "partida-guardada").put("orden", 8).put("cerrada", false)
            .put("avisados", org.json.JSONArray(listOf("listo", "inicio", "reto_completado:1")))
        val id = "11111111-2222-4333-8444-555555555555"
        val avance = leerAvanceJuego(JSONObject().put("juego_id", id).put("paquete", paquete).put("nivel", 2).put("partida", semilla))
        assertEquals(id, avance.juegoId)
        assertEquals(2, avance.nivel)
        val mensaje = JSONObject(mensajePaqueteJuego(avance.paquete, avance.partida)
            .removePrefix("window.postMessage(").removeSuffix(", '*');"))
        assertEquals(semilla.toString(), mensaje.getJSONObject("partida").toString())
        assertEquals(paquete, mensaje.getString("paquete"))
        assertEquals("http://localhost:5174/?vida=0&paquete=mensaje&nivel=2",
            direccionJuego("http://localhost:5174/?vida=0&nivel=1", true, 2))
        assertThrows(IllegalArgumentException::class.java) { leerAvanceJuego(JSONObject()
            .put("juego_id", id).put("paquete", paquete).put("nivel", 4).put("partida", semilla)) }
    }

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
    private fun paqueteDelTaller() = JSONObject().put("formato", "kusi-paquete/0").put("familia", "escucha_y_toca")
        .put("trabajo", "b9fc0482-dd7d-4764-831c-2ea19493e46c")
        .put("retos", org.json.JSONArray().put(JSONObject().put("consigna", "Busca la vaca.")))

    @Test fun elJuegoDelTallerConservaSuFamiliaSuTrabajoYSusTextosEnElMensaje() {
        val paquete = paqueteDelTaller().put("titulo", "Los animales de la chacra")
        paquete.getJSONArray("retos").getJSONObject(0).put("consigna", "Comillas: \"; alert(1); //\nBusca la vaca.")
        val texto = paquete.toString()
        val codigo = mensajePaqueteJuego(texto)
        val mensaje = JSONObject(codigo.removePrefix("window.postMessage(").removeSuffix(", '*');"))
        assertEquals("paquete", mensaje.getString("tipo"))
        assertEquals(texto, mensaje.getString("paquete"))
        val recibido = JSONObject(mensaje.getString("paquete"))
        assertEquals("escucha_y_toca", recibido.getString("familia"))
        assertEquals(paquete.getString("trabajo"), recibido.getString("trabajo"))
    }

    @Test fun rechazaFamiliasInvalidasYTrabajosQueNoSonIdentificadoresCanonicos() {
        fun rechazar(paquete: JSONObject) {
            assertThrows(IllegalArgumentException::class.java) { mensajePaqueteJuego(paquete.toString()) }
        }
        for (familia in listOf("", "ab", "../juego", "https://otro.example", "Matemática", "j".repeat(42))) {
            rechazar(paqueteDelTaller().put("familia", familia))
        }
        for (trabajo in listOf("", "../otro", "https://otro.example", "no-es-uuid", 123, JSONObject.NULL)) {
            rechazar(paqueteDelTaller().put("trabajo", trabajo))
        }
        val sinTrabajo = paqueteDelTaller().apply { remove("trabajo") }
        rechazar(sinTrabajo)
        rechazar(paqueteDelTaller().put("familia", "laberinto"))
        rechazar(paqueteDelTaller().put("formato", "otro"))
        rechazar(paqueteDelTaller().put("retos", org.json.JSONArray()))
        rechazar(paqueteDelTaller().put("retos", org.json.JSONArray(List(6) { JSONObject() })))
    }

    @Test fun laPresentacionDelTallerUsaSuConsignaSinInventarUnaActividadDeAlimentos() {
        val paquete = paqueteDelTaller().put("titulo", "Los animales de la chacra").toString()
        val presentacion = presentacionJuego(JuegoDisponible("juego-de-prueba", "Animales", paquete))
        assertEquals("Busca la vaca.", presentacion.mision)
        assertEquals("Busca la vaca.", presentacion.consigna)
        assertEquals("Tu actividad", presentacion.curso)
        assertFalse(presentacion.clasificacion)
    }
    @Test fun laMisionUsaLaConsignaDelJuegoYNoModificaElPaquete() {
        val paquete = JSONObject().put("titulo", "La aventura de las frutas").put("curso", "Matemática").put("meta", "Ayuda a Kusi a juntar frutas.")
            .put("retos", org.json.JSONArray().put(JSONObject().put("consigna", "Junta solo las frutas.")
                .put("regla", JSONObject().put("tipo", "solo_clase")))).toString()
        val juego = JuegoDisponible("prueba", "Tema del docente", paquete)
        val presentacion = presentacionJuego(juego)
        assertEquals("La aventura de las frutas", presentacion.titulo)
        assertEquals("Matemática", presentacion.curso)
        assertEquals("Ayuda a Kusi a juntar frutas.", presentacion.mision)
        assertEquals("Junta solo las frutas.", presentacion.consigna)
        assertTrue(presentacion.clasificacion)
        assertEquals(paquete, juego.paquete)
        val patron = presentacionJuego(juego.copy(paquete = JSONObject(paquete).put("retos",
            org.json.JSONArray().put(JSONObject().put("consigna", "Sigue el patrón.")
                .put("regla", JSONObject().put("tipo", "orden")))).toString()))
        assertFalse(patron.clasificacion)
        assertEquals("Sigue el patrón.", patron.consigna)
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
