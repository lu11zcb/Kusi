package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

// Groq simulado en un servidor local: no usa la clave ni la red reales.
class GeneradorGroqTest {
    private HttpServer servidor;
    private final ObjectMapper json = new ObjectMapper();
    private final EntradaGeneracion entrada = new EntradaGeneracion("Matemática", 1, "A", 2026, "Sumas hasta 20", null,
        "Practicar sumas", null, "nueva", null, null);

    private GeneradorGroq groq(int estado, String cuerpo, AtomicReference<String> recibido) throws Exception {
        return groq(estado, cuerpo, recibido, "modelo-prueba");
    }

    private GeneradorGroq groq(int estado, String cuerpo, AtomicReference<String> recibido, String modelo) throws Exception {
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/chat", intercambio -> {
            recibido.set(intercambio.getRequestHeaders().getFirst("Authorization") + "\n"
                + new String(intercambio.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = cuerpo.getBytes(StandardCharsets.UTF_8);
            intercambio.sendResponseHeaders(estado, bytes.length);
            intercambio.getResponseBody().write(bytes);
            intercambio.close();
        });
        servidor.start();
        return new GeneradorGroq("clave-de-prueba", modelo, "http://127.0.0.1:" + servidor.getAddress().getPort() + "/chat", json);
    }

    @AfterEach void apagar() { if (servidor != null) servidor.stop(0); }

    @Test void convierteLaRespuestaEnPropuesta() throws Exception {
        String propuesta = json.writeValueAsString(Map.of("objetivo", "Sumar hasta 20", "historia", "Kusi junta maíz."));
        String cuerpo = json.writeValueAsString(Map.of("choices", java.util.List.of(Map.of("message", Map.of("content", propuesta)))));
        AtomicReference<String> recibido = new AtomicReference<>();
        Map<String,Object> resultado = groq(200, cuerpo, recibido).generar(entrada);
        assertEquals("Sumar hasta 20", resultado.get("objetivo"));
        assertTrue(recibido.get().startsWith("Bearer clave-de-prueba"));
        assertTrue(recibido.get().contains("Sumas hasta 20"));
        assertTrue(recibido.get().contains("modelo-prueba"));
        assertEquals("json_object", json.readTree(recibido.get().split("\n", 2)[1]).path("response_format").path("type").asText());
    }

    @Test void pideHistoriaComoTextoYListasConElModeloConfigurado() throws Exception {
        Map<String,Object> propuesta = new java.util.LinkedHashMap<>();
        propuesta.put("objetivo", "Los niños aprenderán a sumar hasta diez.");
        propuesta.put("historia", "Kusi va al mercado. Cuenta los productos.");
        for (String campo : java.util.List.of("acciones", "reglas", "retos", "ayudas", "recursos"))
            propuesta.put(campo, java.util.List.of("Contar productos", "Comparar cantidades"));
        String cuerpo = json.writeValueAsString(Map.of("choices", java.util.List.of(Map.of("message", Map.of("content", json.writeValueAsString(propuesta))))));
        AtomicReference<String> recibido = new AtomicReference<>();
        Map<String,Object> respuesta = groq(200, cuerpo, recibido, "openai/gpt-oss-120b").generar(entrada);
        var formato = json.readTree(recibido.get().split("\n", 2)[1]).path("response_format");
        assertEquals("json_schema", formato.path("type").asText());
        assertTrue(formato.path("json_schema").path("strict").asBoolean());
        var esquema = formato.path("json_schema").path("schema");
        assertFalse(esquema.path("additionalProperties").asBoolean());
        assertEquals(7, esquema.path("required").size());
        assertEquals("string", esquema.path("properties").path("historia").path("type").asText());
        assertEquals("array", esquema.path("properties").path("acciones").path("type").asText());
        assertEquals("string", esquema.path("properties").path("acciones").path("items").path("type").asText());
        assertEquals("Kusi va al mercado. Cuenta los productos.", new ValidadorPropuesta().validar(respuesta, null).historia());
    }

    @Test void conservaElRechazoLocalDeUnaHistoriaConTipoIncorrecto() throws Exception {
        String propuesta = json.writeValueAsString(Map.of("objetivo", "Sumar", "historia", java.util.List.of("Una frase", "Otra frase")));
        String cuerpo = json.writeValueAsString(Map.of("choices", java.util.List.of(Map.of("message", Map.of("content", propuesta)))));
        Map<String,Object> respuesta = groq(200, cuerpo, new AtomicReference<>(), "openai/gpt-oss-120b").generar(entrada);
        assertThrows(FalloGeneracion.class, () -> new ValidadorPropuesta().validar(respuesta, null));
    }

    @Test void avisaSiLaClaveNoEsValida() throws Exception {
        FalloGeneracion fallo = assertThrows(FalloGeneracion.class, () -> groq(401, "{}", new AtomicReference<>()).generar(entrada));
        assertTrue(fallo.getMessage().contains("GROQ_API_KEY"));
    }

    @Test void rechazaUnaRespuestaQueNoEsJson() throws Exception {
        String cuerpo = json.writeValueAsString(Map.of("choices", java.util.List.of(Map.of("message", Map.of("content", "hola")))));
        assertThrows(FalloGeneracion.class, () -> groq(200, cuerpo, new AtomicReference<>()).generar(entrada));
    }
}
