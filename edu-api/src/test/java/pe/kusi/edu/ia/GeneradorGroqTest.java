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
        return new GeneradorGroq("clave-de-prueba", "modelo-prueba", "http://127.0.0.1:" + servidor.getAddress().getPort() + "/chat", json);
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
