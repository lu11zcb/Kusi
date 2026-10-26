package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import pe.kusi.edu.laberinto.CatalogoLaberinto;
import pe.kusi.edu.laberinto.GuionesDePrueba;
import pe.kusi.edu.laberinto.ProblemaLaberinto;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;

// HU26: la llamada 2. La IA se simula con un servidor local: no usa la clave ni la red
// reales. Se comprueba lo que se le pide (la propuesta completa, el esquema estricto
// sin anyOf, la regla, el plan de variación, la corrección) y lo que se hace con lo
// que responde.
class GeneradorGuionIaTest {
    // Lo único que admiten todos los proveedores de esquema estricto.
    private static final Set<String> PALABRAS_DEL_ESQUEMA =
            Set.of("type", "properties", "required", "additionalProperties", "items", "enum");
    private static final List<String> ESQUINAS = List.of(
            "arriba a la izquierda", "arriba a la derecha", "abajo a la izquierda", "abajo a la derecha");

    private final ObjectMapper json = new ObjectMapper();
    private HttpServer servidor;

    @AfterEach
    void apagar() {
        if (servidor != null) servidor.stop(0);
    }

    // ---------- Ayudas de las pruebas ----------

    // Un servidor que guarda lo que recibe y responde, como una IA, con un guion bueno.
    private GeneradorGuionIa generador(AtomicReference<String> recibido, boolean esquemaEstricto) throws Exception {
        String contenido = json.writeValueAsString(GuionesDePrueba.respuestaBuena());
        String cuerpo = json.writeValueAsString(Map.of("choices", List.of(Map.of("message", Map.of("content", contenido)))));
        servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        servidor.createContext("/chat", intercambio -> {
            recibido.set(new String(intercambio.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] bytes = cuerpo.getBytes(StandardCharsets.UTF_8);
            intercambio.sendResponseHeaders(200, bytes.length);
            intercambio.getResponseBody().write(bytes);
            intercambio.close();
        });
        servidor.start();
        String url = "http://127.0.0.1:" + servidor.getAddress().getPort() + "/chat";
        return new GeneradorGuionIa(
                new ClienteIa("clave-de-prueba", "modelo-prueba", url, esquemaEstricto, "prueba", json), json, new Random(1));
    }

    // Para lo que no sale a la red: el pedido y el plan se arman sin llamar a nadie.
    private GeneradorGuionIa sinRed(long semilla) {
        return new GeneradorGuionIa(
                new ClienteIa("clave", "modelo", "http://127.0.0.1:1/chat", false, "prueba", json), json, new Random(semilla));
    }

    private static EntradaGuion entrada(String reglaJuego, int intento, JsonNode guionAnterior, List<ProblemaLaberinto> problemas) {
        Map<String, Object> propuesta = new LinkedHashMap<>();
        propuesta.put("objetivo", "Reconocer patrones con frutas");
        propuesta.put("historia", "Kusi recorre la chacra y junta frutas en orden.");
        propuesta.put("acciones", List.of("Mover al cuy", "Recoger frutas"));
        propuesta.put("reglas", List.of("Se recoge en el orden del patrón"));
        propuesta.put("retos", List.of("Completar el patrón"));
        propuesta.put("ayudas", List.of("Mira lo que se repite"));
        propuesta.put("recursos", List.of("fresa", "platano"));
        return new EntradaGuion("Matemática", 1, "Patrones con frutas", "refuerzo", "Que sea corto",
                propuesta, reglaJuego, intento, 3, guionAnterior, problemas);
    }

    private static EntradaGuion primerIntento(String reglaJuego) {
        return entrada(reglaJuego, 1, null, List.of());
    }

    private JsonNode cuerpoRecibido(AtomicReference<String> recibido) throws Exception {
        return json.readTree(recibido.get());
    }

    // El mensaje 0 son las instrucciones («system») y el 1, el pedido («user»).
    private String mensaje(AtomicReference<String> recibido, int posicion) throws Exception {
        return cuerpoRecibido(recibido).path("messages").get(posicion).path("content").asText();
    }

    private static int contar(String texto, String parte) {
        int veces = 0;
        for (int desde = texto.indexOf(parte); desde >= 0; desde = texto.indexOf(parte, desde + 1)) veces++;
        return veces;
    }

    private static List<String> textos(JsonNode lista) {
        List<String> textos = new ArrayList<>();
        lista.forEach(elemento -> textos.add(elemento.asText()));
        return textos;
    }

    // Cada objeto del esquema cierra sus propiedades y las exige todas, y solo usa
    // palabras que entienden todos los proveedores.
    private void revisarEsquema(JsonNode esquema, String ruta) {
        esquema.fieldNames().forEachRemaining(palabra -> assertTrue(PALABRAS_DEL_ESQUEMA.contains(palabra),
                ruta + " usa «" + palabra + "», que no admiten todos los proveedores."));
        if (esquema.has("properties")) {
            assertFalse(esquema.path("additionalProperties").asBoolean(true), ruta + " debe cerrar additionalProperties.");
            Set<String> propiedades = new HashSet<>();
            esquema.get("properties").fieldNames().forEachRemaining(propiedades::add);
            assertEquals(propiedades, new HashSet<>(textos(esquema.get("required"))), ruta + " debe exigir todas sus propiedades.");
            esquema.get("properties").properties()
                    .forEach(propiedad -> revisarEsquema(propiedad.getValue(), ruta + "." + propiedad.getKey()));
        }
        if (esquema.has("items")) revisarEsquema(esquema.get("items"), ruta + "[]");
    }

    // ---------- Lo que se pide y lo que se devuelve ----------

    @Test
    void pideElGuionConEsquemaEstrictoYDevuelveLaRespuestaDeLaIaTalCual() throws Exception {
        AtomicReference<String> recibido = new AtomicReference<>();

        JsonNode guion = generador(recibido, true).generarGuion(primerIntento(null));

        assertEquals(GuionesDePrueba.respuestaBuena(), guion);
        assertEquals("modelo-prueba", cuerpoRecibido(recibido).path("model").asText());
        JsonNode formato = cuerpoRecibido(recibido).path("response_format");
        assertEquals("json_schema", formato.path("type").asText());
        assertTrue(formato.path("json_schema").path("strict").asBoolean());
    }

    @Test
    void sinEsquemaEstrictoSePideSoloUnObjetoJson() throws Exception {
        AtomicReference<String> recibido = new AtomicReference<>();

        generador(recibido, false).generarGuion(primerIntento(null));

        assertEquals("json_object", cuerpoRecibido(recibido).path("response_format").path("type").asText());
    }

    @Test
    void elEsquemaNoUsaAnyOfYLaReglaEsUnSoloObjetoConCuatroCampos() {
        JsonNode esquema = json.valueToTree(GeneradorGuionIa.esquema());
        String texto = esquema.toString();

        for (String prohibida : List.of("anyOf", "oneOf", "allOf", "$ref", "minItems", "maxItems", "pattern")) {
            assertFalse(texto.contains(prohibida), "El esquema no debe usar " + prohibida);
        }
        revisarEsquema(esquema, "guion");

        JsonNode regla = esquema.at("/properties/retos/items/properties/regla");
        assertEquals(List.of("tipo", "secuencia", "clase", "meta"), textos(regla.get("required")));
        assertEquals(List.of("orden", "solo_clase"), textos(regla.at("/properties/tipo/enum")));
        assertEquals("array", regla.at("/properties/secuencia/type").asText());
        assertEquals(CatalogoLaberinto.TIPOS_OBJETO, textos(regla.at("/properties/secuencia/items/enum")));
        // La clase puede ir vacía (en «orden») y la meta es un entero (0 en «orden»).
        assertEquals(List.of("fruta", "verdura", ""), textos(regla.at("/properties/clase/enum")));
        assertEquals("integer", regla.at("/properties/meta/type").asText());
    }

    @Test
    void elPedidoLlevaLaPropuestaAprobadaCompletaPorqueLaIaNoRecuerdaLaLlamadaUno() throws Exception {
        AtomicReference<String> recibido = new AtomicReference<>();

        generador(recibido, true).generarGuion(primerIntento(null));

        String pedido = mensaje(recibido, 1);
        for (String dato : List.of("Matemática", "1° de primaria", "Patrones con frutas", "refuerzo", "Que sea corto",
                "Reconocer patrones con frutas", "Kusi recorre la chacra y junta frutas en orden.", "Mover al cuy",
                "Recoger frutas", "Se recoge en el orden del patrón", "Completar el patrón", "Mira lo que se repite", "- fresa")) {
            assertTrue(pedido.contains(dato), "El pedido debe llevar: " + dato);
        }
    }

    @Test
    void laReglaQueEligioLaPropuestaSeIndicaYSiNoEligioSeLeDejaElegir() throws Exception {
        GeneradorGuionIa generador = sinRed(1);

        String conOrden = generador.pedido(primerIntento("orden"));
        assertTrue(conOrden.contains("Usa «orden» en todos los niveles"));
        assertFalse(conOrden.contains("Usa «solo_clase»"));

        String conClase = generador.pedido(primerIntento("solo_clase"));
        assertTrue(conClase.contains("Usa «solo_clase» en todos los niveles"));
        assertFalse(conClase.contains("Usa «orden»"));

        assertTrue(generador.pedido(primerIntento(null)).contains("no eligió una"));
    }

    // ---------- Variedad ----------

    @Test
    void elServidorSortealaCadaNivelLasCuatroEsquinasSinRepetir() {
        String plan = sinRed(7).planDeVariacion();

        List<String> niveles = plan.lines().filter(linea -> linea.startsWith("Nivel ")).toList();
        assertEquals(3, niveles.size());
        for (String nivel : niveles) {
            for (String esquina : ESQUINAS) {
                assertEquals(1, contar(nivel, esquina), "«" + esquina + "» debe aparecer una vez en: " + nivel);
            }
        }
    }

    @Test
    void conLaMismaSemillaElPlanEsElMismoYConOtrasSemillasCambia() {
        assertEquals(sinRed(7).planDeVariacion(), sinRed(7).planDeVariacion());

        Set<String> planes = new HashSet<>();
        for (long semilla = 1; semilla <= 10; semilla++) planes.add(sinRed(semilla).planDeVariacion());
        assertTrue(planes.size() > 1, "Con semillas distintas el plan debe cambiar.");
    }

    @Test
    void elPrimerPedidoLlevaElPlanDeVariacionYNoHayGuionAnterior() throws Exception {
        String pedido = sinRed(3).pedido(primerIntento(null));

        assertTrue(pedido.contains("Plan de variación"));
        assertFalse(pedido.contains("Problemas:"));
        assertFalse(pedido.contains("Guion anterior"));
    }

    // ---------- La corrección ----------

    @Test
    void enUnaCorreccionVanLosProblemasElGuionAnteriorYLaPropuestaOtraVez() throws Exception {
        JsonNode guionAnterior = GuionesDePrueba.respuestaConUnObjetoEnUnMuro();
        List<ProblemaLaberinto> problemas = List.of(
                new ProblemaLaberinto("OBJETO_FUERA_DEL_CAMINO", "Nivel 2: el objeto 1 está sobre un muro."),
                new ProblemaLaberinto("DIFICULTAD_MAPA", "Nivel 3: el mapa es más chico que el del nivel anterior."));

        String pedido = sinRed(1).pedido(entrada("orden", 2, guionAnterior, problemas));

        assertTrue(pedido.contains("intento 2 de 3"));
        assertTrue(pedido.contains("OBJETO_FUERA_DEL_CAMINO: Nivel 2: el objeto 1 está sobre un muro."));
        assertTrue(pedido.contains("DIFICULTAD_MAPA: Nivel 3: el mapa es más chico que el del nivel anterior."));
        assertTrue(pedido.contains(json.writeValueAsString(guionAnterior)));
        assertFalse(pedido.contains("Plan de variación"));
        // La IA no recuerda nada: la propuesta y la regla van completas también en la corrección.
        assertTrue(pedido.contains("Reconocer patrones con frutas"));
        assertTrue(pedido.contains("Usa «orden» en todos los niveles"));
    }

    // ---------- Las instrucciones ----------

    @Test
    void lasInstruccionesNoLlevanEjemplosConValoresRealesQueLaIaCopiaria() throws Exception {
        AtomicReference<String> recibido = new AtomicReference<>();

        generador(recibido, true).generarGuion(primerIntento(null));

        String instrucciones = mensaje(recibido, 0);
        // Ninguna fila de mapa de muestra ni un objeto JSON de muestra.
        assertFalse(Pattern.compile("[#.CP]{8,}").matcher(instrucciones).find(), "No debe haber filas de mapa de muestra.");
        assertFalse(Pattern.compile("\"fila\"\\s*:\\s*\\d").matcher(instrucciones).find(), "No debe haber objetos de muestra.");
        // Pide variar de verdad y seguir el plan del servidor.
        assertTrue(instrucciones.contains("Variedad"));
        assertTrue(instrucciones.contains("plan de variación"));
    }

    @Test
    void lasInstruccionesUsanSoloLosObjetosYEnemigosDeLaFase1() throws Exception {
        AtomicReference<String> recibido = new AtomicReference<>();

        generador(recibido, true).generarGuion(primerIntento(null));

        String instrucciones = mensaje(recibido, 0);
        for (String tipo : CatalogoLaberinto.TIPOS_OBJETO) {
            assertTrue(instrucciones.contains(tipo), "Falta el objeto «" + tipo + "».");
        }
        for (String fueraDelCatalogo : List.of("tomate", "palta", "mercado")) {
            assertFalse(instrucciones.contains(fueraDelCatalogo), "No debe aparecer «" + fueraDelCatalogo + "».");
        }
        assertTrue(instrucciones.contains("zorro"));
        assertTrue(instrucciones.contains("patrulla") && instrucciones.contains("persigue_cerca"));
        assertTrue(instrucciones.contains("nombres de niños"), "Debe prohibir nombres y datos de niños.");
    }
}
