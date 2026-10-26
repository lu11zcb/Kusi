package pe.kusi.edu.laberinto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.fasterxml.jackson.databind.node.TextNode;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

// Los guiones que usan las pruebas de la generación. El caso bueno es el paquete de
// ejemplo del juego (juego/public/paquete-laberinto-ejemplo.json); de él salen las
// «respuestas de la IA» (con la forma que pide el esquema estricto de la llamada 2) y
// las versiones dañadas, cada una con un solo defecto para saber qué debe señalar el
// validador.
public final class GuionesDePrueba {
    private static final ObjectMapper JSON = new ObjectMapper();

    private GuionesDePrueba() {}

    // El proyecto es un repositorio con carpetas hermanas: se sube desde la carpeta de
    // trabajo (edu-api) hasta encontrar juego/. Si no está, la prueba falla con un aviso claro.
    private static Path buscarEjemplo() {
        Path carpeta = Path.of("").toAbsolutePath();
        while (carpeta != null) {
            Path candidato = carpeta.resolve("juego/public/paquete-laberinto-ejemplo.json");
            if (Files.exists(candidato)) return candidato;
            carpeta = carpeta.getParent();
        }
        throw new IllegalStateException("No se encontró juego/public/paquete-laberinto-ejemplo.json "
                + "subiendo desde " + Path.of("").toAbsolutePath() + ". Ejecuta las pruebas dentro del repositorio.");
    }

    // El guion de ejemplo tal como lo lee el juego. Cada llamada devuelve una copia nueva.
    public static ObjectNode ejemplo() throws IOException {
        return (ObjectNode) JSON.readTree(Files.readString(buscarEjemplo(), StandardCharsets.UTF_8));
    }

    // Lo que respondería la IA para ese guion: sin las claves que pone el servidor
    // (formato, curso, familia, orientación, id de cada nivel), el cierre como texto y
    // la regla siempre con sus cuatro campos (lo que no aplica va vacío).
    public static ObjectNode respuestaDeLaIa(ObjectNode guion) {
        ObjectNode respuesta = JSON.createObjectNode();
        for (String campo : List.of("titulo", "meta", "consigna", "historia")) {
            respuesta.set(campo, guion.get(campo).deepCopy());
        }
        respuesta.put("cierre", guion.path("cierre").path("mensaje").asText());
        ArrayNode retos = respuesta.putArray("retos");
        for (JsonNode reto : guion.get("retos")) {
            ObjectNode nivel = retos.addObject();
            nivel.set("mapa", reto.get("mapa").deepCopy());
            nivel.set("regla", reglaConLosCuatroCampos(reto.get("regla")));
            nivel.set("objetos", reto.get("objetos").deepCopy());
            nivel.set("enemigos", reto.get("enemigos").deepCopy());
            nivel.set("consigna", reto.get("consigna").deepCopy());
            nivel.set("ayudas", reto.get("ayudas").deepCopy());
        }
        return respuesta;
    }

    private static ObjectNode reglaConLosCuatroCampos(JsonNode regla) {
        ObjectNode completa = JSON.createObjectNode();
        completa.put("tipo", regla.get("tipo").asText());
        ArrayNode secuencia = completa.putArray("secuencia");
        if (regla.has("secuencia")) regla.get("secuencia").forEach(secuencia::add);
        completa.put("clase", regla.path("clase").asText(""));
        completa.put("meta", regla.path("meta").asInt(0));
        return completa;
    }

    // Una respuesta de la IA que, convertida en guion, pasa todas las comprobaciones.
    public static ObjectNode respuestaBuena() throws IOException {
        return respuestaDeLaIa(ejemplo());
    }

    // Igual que la buena, pero un objeto del nivel 2 está sobre un muro: es el defecto
    // que corrige la IA en la segunda vuelta de las pruebas.
    public static ObjectNode respuestaConUnObjetoEnUnMuro() throws IOException {
        ObjectNode respuesta = respuestaBuena();
        ObjectNode objeto = (ObjectNode) respuesta.get("retos").get(1).get("objetos").get(0);
        objeto.put("fila", 0).put("columna", 0);
        return respuesta;
    }

    // Los tres mapas están mal hechos (sin puerta, con una fila más corta y con un
    // símbolo que no existe), así que ningún intento puede pasar, pero la regla, los
    // objetos, las consignas y las ayudas son buenos: es lo que el respaldo aprovecha.
    public static ObjectNode respuestaConMapasRotos() throws IOException {
        ObjectNode respuesta = respuestaBuena();
        ArrayNode retos = (ArrayNode) respuesta.get("retos");
        ArrayNode sinPuerta = JSON.createArrayNode();
        retos.get(0).get("mapa").forEach(fila -> sinPuerta.add(fila.asText().replace('P', '.')));
        ((ObjectNode) retos.get(0)).set("mapa", sinPuerta);

        ArrayNode filaCorta = (ArrayNode) retos.get(1).get("mapa");
        filaCorta.set(0, TextNode.valueOf(filaCorta.get(0).asText().substring(1)));

        ArrayNode conSimboloRaro = (ArrayNode) retos.get(2).get("mapa");
        conSimboloRaro.set(1, TextNode.valueOf(conSimboloRaro.get(1).asText().replace("C.", "C?")));
        return respuesta;
    }
}
