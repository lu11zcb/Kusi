package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

class RespuestasPartidaTest {
    private final ObjectMapper json = new ObjectMapper();
    private JsonNode aviso(String contenido) throws Exception { return json.readTree(contenido); }

    @Test
    @SuppressWarnings("unchecked")
    void reconstruyeAyudasPorRetoEnOrdenDelEmisorYConservaPrimerasRespuestasYCorrecciones() throws Exception {
        JsonNode ayuda = aviso("{\"orden\":2,\"tipo\":\"ayuda\",\"reto\":\"formas\",\"ayuda\":1}");
        var resumen = RespuestasPartida.resumir(List.of(
                aviso("{\"orden\":6,\"tipo\":\"accion\",\"reto\":\"sumas\",\"respuesta\":4,\"correcto\":true}"),
                aviso("{\"orden\":5,\"tipo\":\"accion\",\"reto\":\"formas\",\"respuesta\":\"Círculo\",\"correcto\":true}"),
                aviso("{\"orden\":3,\"tipo\":\"accion\",\"reto\":\"formas\",\"respuesta\":\"Cuadrado\",\"correcto\":false}"),
                ayuda, ayuda, aviso("{\"orden\":4,\"tipo\":\"ayuda\",\"reto\":\"formas\",\"ayuda\":2}")));
        assertEquals(2, resumen.get("ayudas_usadas"));
        List<Map<String, Object>> retos = (List<Map<String, Object>>) resumen.get("retos");
        var respuestas = (List<Map<String, Object>>) retos.get(0).get("respuestas");
        assertEquals("Cuadrado", respuestas.get(0).get("respuesta"));
        assertEquals(List.of(1), respuestas.get(0).get("ayudas"));
        assertEquals("correccion", respuestas.get(1).get("tipo"));
        assertEquals(List.of(1, 2), respuestas.get(1).get("ayudas"));
        assertEquals(List.of(), ((List<Map<String, Object>>) retos.get(1).get("respuestas")).get(0).get("ayudas"));
    }

    @Test
    void cargarNoIniciaYFallarNoCompletaNiInventaRespuestasPorMovimiento() throws Exception {
        assertEquals("sin_iniciar", RespuestasPartida.resumir(List.of(aviso("{\"orden\":1,\"tipo\":\"listo\"}"))).get("estado"));
        var resumen = RespuestasPartida.resumir(List.of(aviso("{\"orden\":1,\"tipo\":\"accion\",\"nivel\":1,\"atrapado\":true}"),
                aviso("{\"orden\":2,\"tipo\":\"fallo\"}")));
        assertEquals("en_curso", resumen.get("estado"));
        assertEquals(List.of(), resumen.get("retos"));
        assertEquals("completada", RespuestasPartida.resumir(List.of(aviso("{\"orden\":1,\"tipo\":\"fin\"}"))).get("estado"));
    }
}
