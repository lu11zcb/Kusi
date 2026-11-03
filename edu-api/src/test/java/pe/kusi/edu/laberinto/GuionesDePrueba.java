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
// ejemplo del juego (juego/kit/recursos/paquete-laberinto-ejemplo.json); de él salen las
// «respuestas de la IA» (con la forma que pide el esquema estricto de la llamada 2) y
// las versiones dañadas, cada una con un solo defecto para saber qué debe señalar el
// validador.
public final class GuionesDePrueba {
    private static final ObjectMapper JSON = new ObjectMapper();

    private GuionesDePrueba() {}

    // El proyecto es un repositorio con carpetas hermanas: se sube desde la carpeta de
    // trabajo (edu-api) hasta encontrar el archivo dentro de juego/. Si no está, la
    // prueba falla con un aviso claro.
    private static Path buscarEnJuego(String rutaEnJuego) {
        Path carpeta = Path.of("").toAbsolutePath();
        while (carpeta != null) {
            Path candidato = carpeta.resolve("juego/" + rutaEnJuego);
            if (Files.exists(candidato)) return candidato;
            carpeta = carpeta.getParent();
        }
        throw new IllegalStateException("No se encontró juego/" + rutaEnJuego
                + " subiendo desde " + Path.of("").toAbsolutePath() + ". Ejecuta las pruebas dentro del repositorio.");
    }

    // El guion de ejemplo tal como lo lee el juego. Cada llamada devuelve una copia nueva.
    public static ObjectNode ejemplo() throws IOException {
        return leerEnJuego("kit/recursos/paquete-laberinto-ejemplo.json");
    }

    // Un guion de prueba del juego (juego/pruebas/fixtures/<nombre>): el que sus pruebas del
    // navegador cargan por mensaje. Cada llamada devuelve una copia nueva.
    public static ObjectNode guionDelJuego(String nombre) throws IOException {
        return leerEnJuego("pruebas/fixtures/" + nombre);
    }

    private static ObjectNode leerEnJuego(String rutaEnJuego) throws IOException {
        return (ObjectNode) JSON.readTree(Files.readString(buscarEnJuego(rutaEnJuego), StandardCharsets.UTF_8));
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

    // Una respuesta buena en la que los tres niveles se juegan con la misma regla, cada
    // una con su barra y sus trampas. Con «orden» el niño sigue un patrón de frutas y las
    // trampas son lo que no va en el patrón; con «solo_clase» recoge solo una clase
    // (frutas, verduras, frutas) y las trampas son los objetos de la otra clase.
    public static ObjectNode respuestaConLaRegla(String regla) throws IOException {
        ObjectNode respuesta = respuestaBuena();
        ArrayNode retos = (ArrayNode) respuesta.get("retos");
        if (CatalogoLaberinto.REGLA_ORDEN.equals(regla)) {
            // Los niveles 1 y 2 del ejemplo ya son de «orden». El 3 pasa a un patrón de tres
            // frutas que se repite, con una verdura de trampa.
            cambiarNivel(retos.get(2), reglaDeLaIa("orden", List.of("fresa", "mango", "pina", "fresa", "mango", "pina"), "", 0),
                "Sigue el patrón de tres frutas. ¡Después ve a la puerta!",
                List.of("Mira la fila de arriba. Busca la fruta que sigue.", "Son tres que se repiten. Cuando terminan, empiezan otra vez."),
                "fresa:1:4", "mango:3:6", "pina:5:11", "fresa:7:9", "mango:1:10", "pina:5:5", "zanahoria:7:3");
        } else if (CatalogoLaberinto.REGLA_SOLO_CLASE.equals(regla)) {
            // El nivel 3 del ejemplo ya es de «solo_clase» con frutas. Los niveles 1 y 2 pasan a
            // recoger tres frutas y tres verduras, cada uno con un objeto de la otra clase de trampa.
            cambiarNivel(retos.get(0), reglaDeLaIa("solo_clase", List.of(), "fruta", 3),
                "Recoge tres frutas. Deja las verduras en el camino y busca la puerta.",
                List.of("Las frutas son dulces y jugosas. Busca solo esas.", "Las verduras crecen en la huerta. Déjalas donde están."),
                "fresa:1:3", "mango:1:7", "pina:3:7", "zanahoria:5:7");
            cambiarNivel(retos.get(1), reglaDeLaIa("solo_clase", List.of(), "verdura", 3),
                "Recoge tres verduras. Deja las frutas en el camino y busca la puerta.",
                List.of("Las verduras crecen bajo la tierra o en la huerta. Busca solo esas.", "Las frutas son dulces. Déjalas donde están."),
                "zanahoria:1:4", "papa:1:10", "choclo:3:10", "fresa:5:10");
        } else {
            throw new IllegalArgumentException("Regla desconocida: " + regla);
        }
        return respuesta;
    }

    private static ObjectNode reglaDeLaIa(String tipo, List<String> secuencia, String clase, int meta) {
        ObjectNode regla = JSON.createObjectNode();
        regla.put("tipo", tipo);
        ArrayNode lista = regla.putArray("secuencia");
        secuencia.forEach(lista::add);
        regla.put("clase", clase);
        regla.put("meta", meta);
        return regla;
    }

    // Cambia la regla, la consigna, las ayudas y los objetos de un nivel, sin tocar su mapa
    // ni sus enemigos. Cada objeto se escribe «tipo:fila:columna».
    private static void cambiarNivel(JsonNode nivel, ObjectNode regla, String consigna, List<String> ayudas, String... objetos) {
        ObjectNode cambiado = (ObjectNode) nivel;
        cambiado.set("regla", regla);
        cambiado.put("consigna", consigna);
        ArrayNode textos = cambiado.putArray("ayudas");
        ayudas.forEach(textos::add);
        ArrayNode lista = cambiado.putArray("objetos");
        for (String objeto : objetos) {
            String[] partes = objeto.split(":");
            lista.addObject().put("tipo", partes[0]).put("fila", Integer.parseInt(partes[1])).put("columna", Integer.parseInt(partes[2]));
        }
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
