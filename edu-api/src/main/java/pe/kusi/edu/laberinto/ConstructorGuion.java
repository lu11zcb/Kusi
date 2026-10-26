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
// HU31 sigue comprobando el resultado completo antes de guardarlo como listo.
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

    // Conserva la firma anterior para lectores y pruebas de guiones antiguos.
    public static Optional<ObjectNode> conMapasBase(JsonNode respuesta, String curso, List<JsonNode> mapasBase) {
        return conMapasBase(respuesta, curso, mapasBase, null);
    }

    // El respaldo repara solo lo que HU31 no puede aceptar. Los mapas de confianza
    // aportan espacio y enemigos; una respuesta incompleta nunca deja sin demo al
    // docente. La comprobación final sigue siendo responsabilidad de HU31.
    public static Optional<ObjectNode> conMapasBase(JsonNode respuesta, String curso, List<JsonNode> mapasBase, String reglaJuego) {
        if (respuesta == null || mapasBase.size() < MIN_NIVELES) return Optional.empty();
        ObjectNode guion = desdeLaIa(respuesta, curso);
        if (guion == null) guion = desdeLaIa(NODOS.objectNode(), curso);
        if (guion.path("titulo").asText().isBlank()) guion.put("titulo", TITULO_POR_OMISION);
        JsonNode originales = guion.path("retos");
        ArrayNode retos = NODOS.arrayNode();
        for (int posicion = 0; posicion < MIN_NIVELES; posicion++) {
            JsonNode original = originales.path(posicion);
            JsonNode base = mapasBase.get(posicion);
            ObjectNode nivel = NODOS.objectNode();
            nivel.put("id", "laberinto-" + (posicion + 1));
            nivel.set("mapa", base.get("mapa").deepCopy());
            ObjectNode regla = repararRegla(original, reglaJuego, posicion);
            nivel.set("regla", regla);
            nivel.set("objetos", recolocarObjetos(completarObjetos(original.path("objetos"), regla), regla, base));
            nivel.set("enemigos", base.get("enemigos").deepCopy());
            copiarSiExiste(original, nivel, "consigna");
            copiarSiExiste(original, nivel, "ayudas");
            if (!regla.equals(original.path("regla")) || textosInvalidos(nivel)) ponerTextosDeRespaldo(nivel, regla);
            retos.add(nivel);
        }
        guion.set("retos", retos);
        return Optional.of(guion);
    }

    private static ObjectNode repararRegla(JsonNode nivel, String elegida, int posicion) {
        JsonNode anterior = nivel.path("regla");
        String tipo = esTipoRegla(elegida) ? elegida : anterior.path("tipo").asText();
        if (!esTipoRegla(tipo)) tipo = REGLA_ORDEN;
        ObjectNode regla = NODOS.objectNode().put("tipo", tipo);
        if (REGLA_ORDEN.equals(tipo)) {
            List<String> secuencia = new ArrayList<>();
            JsonNode lista = anterior.path("secuencia");
            if (lista.isArray()) for (JsonNode elemento : lista) secuencia.add(textoOVacio(elemento));
            boolean valida = lista.isArray() && secuencia.size() >= MIN_SECUENCIA && secuencia.size() <= MAX_SECUENCIA
                    && secuencia.stream().allMatch(TIPOS_OBJETO::contains) && ValidadorLaberinto.esPatronQueSeRepite(secuencia);
            if (!valida) {
                List<String> tipos = new ArrayList<>();
                secuencia.forEach(nombre -> agregarTipoDistinto(tipos, nombre));
                JsonNode objetos = nivel.path("objetos");
                if (objetos.isArray()) objetos.forEach(objeto -> agregarTipoDistinto(tipos, objeto.path("tipo").asText()));
                agregarTipoDistinto(tipos, "fresa");
                agregarTipoDistinto(tipos, "platano");
                String primero = tipos.get(0), segundo = tipos.get(1);
                secuencia = posicion == 0 ? List.of(primero, segundo, primero, segundo)
                        : posicion == 1 ? List.of(primero, segundo, primero, segundo, primero, segundo)
                        : List.of(primero, primero, segundo, primero, primero, segundo);
            }
            ArrayNode resultado = regla.putArray("secuencia");
            secuencia.forEach(resultado::add);
        } else {
            String clase = anterior.path("clase").asText();
            if (!CLASES.containsKey(clase)) clase = "fruta";
            JsonNode meta = anterior.path("meta");
            int cantidad = meta.isIntegralNumber() && meta.canConvertToInt()
                    ? Math.max(MIN_META, Math.min(MAX_META, meta.intValue())) : MIN_META;
            regla.put("clase", clase).put("meta", cantidad);
        }
        return regla;
    }

    private static boolean esTipoRegla(String tipo) {
        return REGLA_ORDEN.equals(tipo) || REGLA_SOLO_CLASE.equals(tipo);
    }

    private static void agregarTipoDistinto(List<String> tipos, String nombre) {
        if (TIPOS_OBJETO.contains(nombre) && !tipos.contains(nombre)) tipos.add(nombre);
    }

    // Primero van los objetos indispensables: incluso una respuesta con cientos de
    // trampas no puede ocupar las casillas que necesita la secuencia o la meta.
    private static ArrayNode completarObjetos(JsonNode originales, ObjectNode regla) {
        List<String> disponibles = new ArrayList<>();
        if (originales.isArray()) originales.forEach(objeto -> {
            String tipo = objeto.path("tipo").asText();
            if (TIPOS_OBJETO.contains(tipo)) disponibles.add(tipo);
        });
        List<String> necesarios = new ArrayList<>();
        if (REGLA_ORDEN.equals(regla.path("tipo").asText())) {
            regla.path("secuencia").forEach(tipo -> necesarios.add(tipo.asText()));
        } else {
            String clase = regla.path("clase").asText();
            List<String> usados = disponibles.stream().filter(tipo -> clase.equals(claseDe(tipo))).toList();
            for (int indice = 0; indice < regla.path("meta").asInt(); indice++) {
                necesarios.add(indice < usados.size() ? usados.get(indice) : CLASES.get(clase).get(indice % CLASES.get(clase).size()));
            }
            String otra = clase.equals("fruta") ? "verdura" : "fruta";
            necesarios.add(disponibles.stream().filter(tipo -> otra.equals(claseDe(tipo))).findFirst().orElse(CLASES.get(otra).get(0)));
        }
        ArrayNode objetos = NODOS.arrayNode();
        for (String tipo : necesarios) {
            objetos.addObject().put("tipo", tipo);
            disponibles.remove(tipo);
        }
        disponibles.forEach(tipo -> objetos.addObject().put("tipo", tipo));
        return objetos;
    }

    private static boolean textosInvalidos(ObjectNode nivel) {
        ObjectNode temporal = NODOS.objectNode().put("formato", FORMATO).put("familia", FAMILIA).put("titulo", TITULO_POR_OMISION);
        temporal.putArray("retos").add(nivel);
        // Reutilizamos los mismos códigos del validador; sus restricciones no se
        // copian ni se aflojan en el constructor de respaldo.
        return new ValidadorLaberinto().validar(temporal).stream().anyMatch(problema ->
                problema.codigo().startsWith("CONSIGNA_") || problema.codigo().startsWith("AYUDA_")
                        || problema.codigo().equals("AYUDAS_CANTIDAD"));
    }

    private static void ponerTextosDeRespaldo(ObjectNode nivel, ObjectNode regla) {
        boolean orden = REGLA_ORDEN.equals(regla.path("tipo").asText());
        nivel.put("consigna", orden ? "Sigue el patrón de la barra. Después busca la puerta."
                : "Recoge " + regla.path("meta").asInt() + (regla.path("clase").asText().equals("fruta") ? " frutas" : " verduras") + ". Después busca la puerta.");
        ArrayNode ayudas = nivel.putArray("ayudas");
        ayudas.add(orden ? "Mira la barra. ¿Cuál sigue en el patrón?" : "Recoge solo las del grupo que pide Kusi.");
        ayudas.add(orden ? "El patrón se repite. Busca dónde vuelve a empezar." : "Deja los del otro grupo. Puedes mirar antes de elegir.");
    }

    // Se comparan los datos normalizados, no los mensajes de las etapas. Los
    // niveles son números desde 1 y permiten acreditar qué quedó de la respuesta
    // y qué tuvo que rehacer Kusi, incluso si cambia la redacción del informe.
    public static ObjectNode reparacionesDelRespaldo(JsonNode respuesta, ObjectNode guion) {
        ObjectNode original = desdeLaIa(respuesta, null);
        ObjectNode reparaciones = NODOS.objectNode();
        ArrayNode reglas = reparaciones.putArray("regla");
        ArrayNode textos = reparaciones.putArray("textos");
        for (int indice = 0; indice < guion.path("retos").size(); indice++) {
            JsonNode antes = original == null ? NODOS.objectNode() : original.path("retos").path(indice);
            JsonNode despues = guion.path("retos").path(indice);
            if (!antes.path("regla").equals(despues.path("regla"))) reglas.add(indice + 1);
            if (!antes.path("consigna").equals(despues.path("consigna")) || !antes.path("ayudas").equals(despues.path("ayudas"))) textos.add(indice + 1);
        }
        return reparaciones;
    }

    public static String cambiosDelRespaldo(JsonNode respuesta, ObjectNode guion) {
        JsonNode reparaciones = reparacionesDelRespaldo(respuesta, guion);
        String mensaje = "Se usaron los mapas base y se recolocaron los objetos.";
        for (int indice = 0; indice < guion.path("retos").size(); indice++) {
            JsonNode numero = NODOS.numberNode(indice + 1);
            boolean regla = contieneNivel(reparaciones.path("regla"), numero);
            boolean textos = contieneNivel(reparaciones.path("textos"), numero);
            if (regla || textos) mensaje += " Nivel " + (indice + 1) + ": se rehízo "
                    + (regla && textos ? "la regla y los textos." : regla ? "la regla." : "los textos.");
        }
        return mensaje;
    }

    private static boolean contieneNivel(JsonNode niveles, JsonNode numero) {
        for (JsonNode nivel : niveles) if (nivel.equals(numero)) return true;
        return false;
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
        ponerProcedencia(guion, proveedor, modelo, intentos, mapaBase, null);
    }

    public static void ponerProcedencia(ObjectNode guion, String proveedor, String modelo, int intentos, boolean mapaBase, JsonNode reparaciones) {
        ObjectNode procedencia = guion.putObject("procedencia");
        procedencia.put("proveedor", proveedor);
        procedencia.put("modelo", modelo);
        procedencia.put("intentos", intentos);
        procedencia.put("mapa_base", mapaBase);
        procedencia.putObject("catalogo").put("nombre", NOMBRE).put("version", VERSION);
        // Un guion aprobado directamente no tuvo reparaciones de respaldo. Los
        // juegos anteriores pueden seguir sin este dato; no se inventa un historial.
        if (mapaBase && reparaciones != null) procedencia.set("reparaciones", reparaciones.deepCopy());
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
