package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;

// La IA simulada en un servidor local: no usa la clave ni la red reales. Prueba la
// llamada 1 (la propuesta) y el adaptador compartido ClienteIa.
class GeneradorPropuestasIaTest {
    private HttpServer servidor;
    private final ObjectMapper json = new ObjectMapper();
    private final EntradaGeneracion entrada = new EntradaGeneracion("Matemática", 1, "A", 2026, "Sumas hasta 20", null,
        "Practicar sumas", null, "nueva", null, null);

    private GeneradorPropuestasIa generador(int estado, String cuerpo, AtomicReference<String> recibido) throws Exception {
        return generador(estado, cuerpo, recibido, "modelo-prueba", false);
    }

    private GeneradorPropuestasIa generador(int estado, String cuerpo, AtomicReference<String> recibido, String modelo,
                                            boolean esquemaEstricto) throws Exception {
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
        String url = "http://127.0.0.1:" + servidor.getAddress().getPort() + "/chat";
        return new GeneradorPropuestasIa(new ClienteIa("clave-de-prueba", modelo, url, esquemaEstricto, "prueba", json), json);
    }

    private String respuestaConContenido(String contenido) throws Exception {
        return json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", contenido)))));
    }

    @AfterEach void apagar() { if (servidor != null) servidor.stop(0); }

    @Test void convierteLaRespuestaEnPropuesta() throws Exception {
        String propuesta = json.writeValueAsString(Map.of("objetivo", "Sumar hasta 20", "historia", "Kusi junta maíz."));
        AtomicReference<String> recibido = new AtomicReference<>();
        Map<String,Object> resultado = generador(200, respuestaConContenido(propuesta), recibido).generar(entrada);
        assertEquals("Sumar hasta 20", resultado.get("objetivo"));
        assertTrue(recibido.get().startsWith("Bearer clave-de-prueba"));
        assertTrue(recibido.get().contains("Sumas hasta 20"));
        assertTrue(recibido.get().contains("modelo-prueba"));
        assertEquals("json_object", json.readTree(recibido.get().split("\n", 2)[1]).path("response_format").path("type").asText());
    }

    @Test void pideHistoriaComoTextoYListasConElModeloConfigurado() throws Exception {
        Map<String,Object> propuesta = new java.util.LinkedHashMap<>();
        propuesta.put("regla_juego", "orden");
        propuesta.put("objetivo", "Los niños aprenderán a sumar hasta diez.");
        propuesta.put("historia", "Kusi va al mercado. Cuenta los productos.");
        for (String campo : List.of("acciones", "reglas", "retos", "ayudas", "recursos"))
            propuesta.put(campo, List.of("Contar productos", "Comparar cantidades"));
        AtomicReference<String> recibido = new AtomicReference<>();
        String modelo = "openai/gpt-oss-120b";
        Map<String,Object> respuesta = generador(200, respuestaConContenido(json.writeValueAsString(propuesta)), recibido,
            modelo, ClienteIa.esquemaEstrictoPorDefecto(modelo)).generar(entrada);
        var formato = json.readTree(recibido.get().split("\n", 2)[1]).path("response_format");
        assertEquals("json_schema", formato.path("type").asText());
        assertTrue(formato.path("json_schema").path("strict").asBoolean());
        var esquema = formato.path("json_schema").path("schema");
        assertFalse(esquema.path("additionalProperties").asBoolean());
        assertEquals(8, esquema.path("required").size());
        assertEquals("string", esquema.path("properties").path("historia").path("type").asText());
        assertEquals("array", esquema.path("properties").path("acciones").path("type").asText());
        assertEquals("string", esquema.path("properties").path("acciones").path("items").path("type").asText());
        ValidadorPropuesta.Resultado validada = new ValidadorPropuesta().validar(respuesta, null);
        assertEquals("Kusi va al mercado. Cuenta los productos.", validada.historia());
        assertEquals("orden", validada.reglaJuego());
    }

    private static List<String> textos(JsonNode lista) {
        List<String> textos = new java.util.ArrayList<>();
        lista.forEach(elemento -> textos.add(elemento.asText()));
        return textos;
    }

    // HU28: la propuesta elige la regla del juego, y la elige antes de escribir el resto.
    @Test void elEsquemaPideLaReglaDelJuegoComoUnaDeLasDosYLaPoneAntesQueElResto() throws Exception {
        JsonNode esquema = json.valueToTree(GeneradorPropuestasIa.esquema());

        assertEquals(List.of("regla_juego", "objetivo", "historia", "acciones", "reglas", "retos", "ayudas", "recursos"),
            textos(esquema.get("required")));
        assertEquals("string", esquema.at("/properties/regla_juego/type").asText());
        assertEquals(List.of("orden", "solo_clase"), textos(esquema.at("/properties/regla_juego/enum")));
        assertFalse(esquema.toString().contains("anyOf"));
    }

    @Test void lasInstruccionesOfrecenSoloElLaberintoConSusDosReglasYSusObjetos() throws Exception {
        AtomicReference<String> recibido = new AtomicReference<>();
        String propuesta = json.writeValueAsString(Map.of("regla_juego", "orden", "objetivo", "Sumar", "historia", "Kusi cuenta."));

        generador(200, respuestaConContenido(propuesta), recibido).generar(entrada);

        String instrucciones = json.readTree(recibido.get().split("\n", 2)[1]).path("messages").get(0).path("content").asText();
        // El laberinto con sus dos reglas, y la IA elige según el tema; si no encaja, lo dice.
        for (String texto : List.of("laberinto", "\"orden\"", "\"solo_clase\"", "patrones", "clasificar", "\"regla_juego\"",
                "Si el tema no encaja", "dilo con claridad en la historia")) {
            assertTrue(instrucciones.contains(texto), "Las instrucciones deben decir: " + texto);
        }
        // Solo los objetos de la fase 1, con el zorro como único enemigo.
        for (String objeto : List.of("fresa", "plátano", "mango", "mandarina", "piña", "zanahoria", "papa", "choclo", "zorro", "cuy")) {
            assertTrue(instrucciones.contains(objeto), "Falta el objeto: " + objeto);
        }
        // Ni el mercado ni el juego de ordenar, ni productos que el laberinto no tiene.
        for (String fuera : List.of("mercado", "puesto", "soles", "plaza", "vuelto", "ordenar", "tomate", "palta", "camote")) {
            assertFalse(instrucciones.contains(fuera), "No debe aparecer: " + fuera);
        }
    }

    @Test void alAjustarUnaPropuestaSeConservaLaReglaQueYaTenia() throws Exception {
        AtomicReference<String> recibido = new AtomicReference<>();
        String propuesta = json.writeValueAsString(Map.of("regla_juego", "solo_clase", "objetivo", "Sumar", "historia", "Kusi cuenta."));
        EntradaGeneracion ajuste = new EntradaGeneracion("Matemática", 1, "A", 2026, "Clasificar frutas", null, null, null,
            "observaciones", Map.of("regla_juego", "solo_clase", "objetivo", "Clasificar"), "Más corto, por favor");

        generador(200, respuestaConContenido(propuesta), recibido).generar(ajuste);

        String pedido = json.readTree(recibido.get().split("\n", 2)[1]).path("messages").get(1).path("content").asText();
        assertTrue(pedido.contains("\"regla_juego\":\"solo_clase\""));
        assertTrue(pedido.contains("conserva en «regla_juego» la que ya tiene"));
        assertTrue(pedido.contains("Más corto, por favor"));
    }

    @Test void elEsquemaEstrictoSePuedePedirConCualquierModelo() throws Exception {
        // El modelo de Tecsup no está en la lista de Groq: se activa con IA_ESQUEMA_ESTRICTO=true.
        assertFalse(ClienteIa.esquemaEstrictoPorDefecto("Qwen/Qwen3.6-35B-A3B-FP8"));
        AtomicReference<String> recibido = new AtomicReference<>();
        String propuesta = json.writeValueAsString(Map.of("objetivo", "Sumar", "historia", "Kusi cuenta."));
        generador(200, respuestaConContenido(propuesta), recibido, "Qwen/Qwen3.6-35B-A3B-FP8", true).generar(entrada);
        JsonNode formato = json.readTree(recibido.get().split("\n", 2)[1]).path("response_format");
        assertEquals("json_schema", formato.path("type").asText());
        assertTrue(formato.path("json_schema").path("strict").asBoolean());
        // Y con la bandera apagada, un modelo de la lista de Groq recibe solo «un objeto JSON».
        AtomicReference<String> sinEsquema = new AtomicReference<>();
        servidor.stop(0);
        generador(200, respuestaConContenido(propuesta), sinEsquema, "openai/gpt-oss-120b", false).generar(entrada);
        assertEquals("json_object", json.readTree(sinEsquema.get().split("\n", 2)[1]).path("response_format").path("type").asText());
    }

    @Test void conservaElRechazoLocalDeUnaHistoriaConTipoIncorrecto() throws Exception {
        String propuesta = json.writeValueAsString(Map.of("objetivo", "Sumar", "historia", List.of("Una frase", "Otra frase")));
        String modelo = "openai/gpt-oss-120b";
        Map<String,Object> respuesta = generador(200, respuestaConContenido(propuesta), new AtomicReference<>(), modelo,
            ClienteIa.esquemaEstrictoPorDefecto(modelo)).generar(entrada);
        assertThrows(FalloGeneracion.class, () -> new ValidadorPropuesta().validar(respuesta, null));
    }

    @Test void avisaSiLaClaveNoEsValida() throws Exception {
        FalloGeneracion fallo = assertThrows(FalloGeneracion.class, () -> generador(401, "{}", new AtomicReference<>()).generar(entrada));
        assertTrue(fallo.getMessage().contains("GROQ_API_KEY"));
        assertTrue(fallo.getMessage().contains("IA_CLAVE"));
    }

    @Test void sugiereApagarElEsquemaSiElModeloLoRechaza() throws Exception {
        FalloGeneracion fallo = assertThrows(FalloGeneracion.class,
            () -> generador(400, "{}", new AtomicReference<>(), "modelo-prueba", true).generar(entrada));
        assertTrue(fallo.getMessage().contains("IA_ESQUEMA_ESTRICTO=false"));
    }

    @Test void rechazaUnaRespuestaQueNoEsJson() throws Exception {
        assertThrows(FalloGeneracion.class, () -> generador(200, respuestaConContenido("hola"), new AtomicReference<>()).generar(entrada));
    }

    @Test void rescataElObjetoSiElModeloLoEnvuelveEnTexto() throws Exception {
        String contenido = "Aquí está:\n```json\n{\"objetivo\": \"Sumar\", \"historia\": \"Kusi cuenta.\"}\n```";
        Map<String,Object> resultado = generador(200, respuestaConContenido(contenido), new AtomicReference<>()).generar(entrada);
        assertEquals("Sumar", resultado.get("objetivo"));
    }
}
