package pe.kusi.edu.laberinto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static pe.kusi.edu.laberinto.CatalogoLaberinto.*;

// Arma el guion que lee el juego (formato kusi-paquete/0) a partir de lo que respondió
// la IA. Es código puro. Hace dos cosas:
//  - desdeLaIa: pasa la respuesta de la IA, que describe la regla siempre con los
//    cuatro campos (tipo, secuencia, clase y meta) para que el esquema estricto
//    funcione con todos los proveedores, a la forma del juego: «orden» solo lleva su
//    secuencia y «solo_clase», su clase y su meta.
//  - conMapasBase: el respaldo. Cambia los mapas de la IA por los mapas base y
//    recoloca los objetos donde el cuy sí puede alcanzarlos.
// Ninguna de las dos valida: eso lo hace ValidadorLaberinto.
public final class ConstructorGuion {
    private ConstructorGuion() {}

    private static final JsonNodeFactory NODOS = JsonNodeFactory.instance;
    private static final String TITULO_POR_OMISION = "Los caminos de Kusi";

    // Los objetos no se colocan pegados al inicio: dejan al cuy empezar tranquilo.
    private static final int DISTANCIA_MINIMA_OBJETO = 2;

    // Devuelve null si la respuesta de la IA no es un objeto JSON.
    public static ObjectNode desdeLaIa(JsonNode respuesta, String curso) {
        if (respuesta == null || !respuesta.isObject()) return null;
        ObjectNode guion = NODOS.objectNode();
        guion.put("formato", FORMATO);
        guion.put("titulo", textoOVacio(respuesta.path("titulo")));
        if (curso != null) guion.put("curso", curso);
        guion.put("familia", FAMILIA);
        guion.put("orientacion", "horizontal");
        copiarTexto(respuesta, guion, "meta");
        copiarTexto(respuesta, guion, "consigna");
        copiarTexto(respuesta, guion, "historia");
        ArrayNode retos = guion.putArray("retos");
        JsonNode retosIa = respuesta.path("retos");
        if (retosIa.isArray()) {
            int numero = 1;
            for (JsonNode retoIa : retosIa) retos.add(nivelDesdeLaIa(numero++, retoIa));
        }
        String cierre = textoOVacio(respuesta.path("cierre"));
        if (!cierre.isBlank()) guion.putObject("cierre").put("mensaje", cierre);
        return guion;
    }

    private static JsonNode nivelDesdeLaIa(int numero, JsonNode retoIa) {
        // Algo que no es un nivel se deja tal cual: el validador lo señalará.
        if (!retoIa.isObject()) return retoIa.deepCopy();
        ObjectNode nivel = NODOS.objectNode();
        nivel.put("id", "laberinto-" + numero);
        copiarSiExiste(retoIa, nivel, "mapa");
        if (retoIa.has("regla")) nivel.set("regla", reglaDelJuego(retoIa.get("regla")));
        copiarSiExiste(retoIa, nivel, "objetos");
        copiarSiExiste(retoIa, nivel, "enemigos");
        copiarSiExiste(retoIa, nivel, "consigna");
        copiarSiExiste(retoIa, nivel, "ayudas");
        return nivel;
    }

    // La regla como la lee el juego: «orden» con su secuencia, «solo_clase» con su
    // clase y su meta. Lo que no aplica (clase y meta vacías en «orden») se quita.
    static JsonNode reglaDelJuego(JsonNode reglaIa) {
        if (!reglaIa.isObject()) return reglaIa.deepCopy();
        String tipo = reglaIa.path("tipo").isTextual() ? reglaIa.get("tipo").asText() : null;
        ObjectNode regla = NODOS.objectNode();
        if (REGLA_ORDEN.equals(tipo)) {
            regla.put("tipo", tipo);
            copiarSiExiste(reglaIa, regla, "secuencia");
        } else if (REGLA_SOLO_CLASE.equals(tipo)) {
            regla.put("tipo", tipo);
            copiarSiExiste(reglaIa, regla, "clase");
            copiarSiExiste(reglaIa, regla, "meta");
        } else {
            return reglaIa.deepCopy();
        }
        return regla;
    }

    // El respaldo: los tres primeros niveles de la IA con los mapas base. De la IA se
    // conservan la regla, los objetos (recolocados), la consigna y las ayudas; los
    // enemigos vienen del mapa base, ya colocados lejos del inicio. Devuelve vacío si
    // la IA no entregó tres niveles que se puedan aprovechar.
    public static Optional<ObjectNode> conMapasBase(JsonNode respuesta, String curso, List<JsonNode> mapasBase) {
        ObjectNode guion = desdeLaIa(respuesta, curso);
        if (guion == null || guion.get("retos").size() < MIN_NIVELES || mapasBase.size() < MIN_NIVELES) {
            return Optional.empty();
        }
        if (guion.get("titulo").asText().isBlank()) guion.put("titulo", TITULO_POR_OMISION);
        ArrayNode retos = NODOS.arrayNode();
        for (int posicion = 0; posicion < MIN_NIVELES; posicion++) {
            JsonNode nivelIa = guion.get("retos").get(posicion);
            if (!nivelIa.isObject()) return Optional.empty();
            JsonNode base = mapasBase.get(posicion);
            ObjectNode nivel = NODOS.objectNode();
            nivel.put("id", "laberinto-" + (posicion + 1));
            nivel.set("mapa", base.get("mapa").deepCopy());
            if (nivelIa.has("regla")) nivel.set("regla", nivelIa.get("regla").deepCopy());
            nivel.set("objetos", recolocarObjetos(nivelIa.path("objetos"), nivelIa.path("regla"), base));
            nivel.set("enemigos", base.get("enemigos").deepCopy());
            copiarSiExiste(nivelIa, nivel, "consigna");
            copiarSiExiste(nivelIa, nivel, "ayudas");
            retos.add(nivel);
        }
        guion.set("retos", retos);
        return Optional.of(guion);
    }

    // Pone los objetos de la IA en casillas del mapa base a las que el cuy sí puede
    // llegar, repartidas de cerca a lejos del inicio. Con la regla «orden» van primero
    // los de la secuencia, en su orden, y después los demás (las trampas).
    static ArrayNode recolocarObjetos(JsonNode objetosIa, JsonNode regla, JsonNode base) {
        List<String> tipos = new ArrayList<>();
        if (objetosIa.isArray()) {
            for (JsonNode objeto : objetosIa) {
                if (objeto.path("tipo").isTextual()) tipos.add(objeto.get("tipo").asText());
            }
        }
        List<String> ordenados = ordenarParaColocar(tipos, regla);

        List<String> filas = new ArrayList<>();
        base.get("mapa").forEach(fila -> filas.add(fila.asText()));
        MapaLaberinto mapa = new MapaLaberinto(filas);
        Set<String> conEnemigo = new HashSet<>();
        base.get("enemigos").forEach(enemigo -> conEnemigo.add(enemigo.get("fila").asInt() + "," + enemigo.get("columna").asInt()));

        List<int[]> candidatas = new ArrayList<>();
        for (int fila = 0; fila < mapa.filas(); fila++) {
            for (int columna = 0; columna < mapa.columnas(); columna++) {
                boolean sirve = mapa.esCamino(fila, columna) && mapa.distancia(fila, columna) >= DISTANCIA_MINIMA_OBJETO
                        && !conEnemigo.contains(fila + "," + columna);
                if (sirve) candidatas.add(new int[] {fila, columna});
            }
        }
        candidatas.sort(Comparator.<int[]>comparingInt(casilla -> mapa.distancia(casilla[0], casilla[1]))
                .thenComparingInt(casilla -> casilla[0]).thenComparingInt(casilla -> casilla[1]));

        ArrayNode objetos = NODOS.arrayNode();
        int cantidad = Math.min(ordenados.size(), candidatas.size());
        for (int posicion = 0; posicion < cantidad; posicion++) {
            // Casillas repartidas por igual en toda la lista, de la más cercana a la más lejana.
            int[] casilla = candidatas.get((int) ((posicion + 0.5) * candidatas.size() / cantidad));
            ObjectNode objeto = objetos.addObject();
            objeto.put("tipo", ordenados.get(posicion)).put("fila", casilla[0]).put("columna", casilla[1]);
        }
        return objetos;
    }

    private static List<String> ordenarParaColocar(List<String> tipos, JsonNode regla) {
        List<String> pendientes = new ArrayList<>(tipos);
        List<String> ordenados = new ArrayList<>();
        if (regla.isObject() && REGLA_ORDEN.equals(regla.path("tipo").asText(null)) && regla.path("secuencia").isArray()) {
            for (JsonNode elemento : regla.get("secuencia")) {
                if (pendientes.remove(elemento.asText())) ordenados.add(elemento.asText());
            }
        }
        ordenados.addAll(pendientes);
        return ordenados;
    }

    // «procedencia» va junto al guion: quién lo generó, con qué modelo, en cuántos
    // intentos y si hubo que usar los mapas base (para la HU30).
    public static void ponerProcedencia(ObjectNode guion, String proveedor, String modelo, int intentos, boolean mapaBase) {
        ObjectNode procedencia = guion.putObject("procedencia");
        procedencia.put("proveedor", proveedor);
        procedencia.put("modelo", modelo);
        procedencia.put("intentos", intentos);
        procedencia.put("mapa_base", mapaBase);
    }

    private static String textoOVacio(JsonNode nodo) {
        return nodo.isTextual() ? nodo.asText() : "";
    }

    private static void copiarTexto(JsonNode origen, ObjectNode destino, String campo) {
        String texto = textoOVacio(origen.path(campo));
        if (!texto.isBlank()) destino.put(campo, texto);
    }

    private static void copiarSiExiste(JsonNode origen, ObjectNode destino, String campo) {
        if (origen.has(campo)) destino.set(campo, origen.get(campo).deepCopy());
    }
}
