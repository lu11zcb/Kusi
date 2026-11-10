package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.*;

/** Lee el contrato de avisos, sin consultar mapas, objetos ni reglas de un juego. */
public final class RespuestasPartida {
    private RespuestasPartida() {}

    public static Map<String, Object> resumir(List<JsonNode> avisos) {
        boolean iniciada = false, completada = false;
        Map<String, List<Map<String, Object>>> respuestas = new LinkedHashMap<>();
        Map<String, SortedSet<Integer>> ayudas = new HashMap<>();
        Set<Integer> ordenes = new HashSet<>();
        int cantidadAyudas = 0;
        // El orden del emisor es la cronología: la red puede entregar un aviso tarde.
        for (JsonNode aviso : avisos.stream().sorted(Comparator.comparingInt(a -> a.path("orden").asInt())).toList()) {
            if (!ordenes.add(aviso.path("orden").asInt())) continue;
            String tipo = aviso.path("tipo").asText();
            String reto = aviso.hasNonNull("reto") ? texto(aviso.path("reto")) : aviso.has("nivel") ? aviso.path("nivel").asText() : "";
            if (List.of("inicio", "accion", "ayuda", "reto_completado", "fin").contains(tipo)) iniciada = true;
            // Un fallo o cargar la pantalla nunca acreditan completar la actividad.
            if (tipo.equals("fin")) completada = true;
            SortedSet<Integer> usadas = ayudas.computeIfAbsent(reto, clave -> new TreeSet<>());
            if (tipo.equals("ayuda")) { usadas.add(aviso.path("ayuda").asInt()); cantidadAyudas++; }
            if (!tipo.equals("accion") || reto.isBlank()) continue;
            JsonNode respuesta = aviso.hasNonNull("respuesta") ? aviso.path("respuesta") : aviso.path("objeto");
            if (respuesta.isMissingNode() || respuesta.isNull()) continue;
            List<Map<String, Object>> intentos = respuestas.computeIfAbsent(reto, clave -> new ArrayList<>());
            Map<String, Object> intento = new LinkedHashMap<>();
            intento.put("respuesta", texto(respuesta));
            intento.put("correcto", aviso.path("correcto").isBoolean() ? aviso.path("correcto").booleanValue() : null);
            intento.put("tipo", intentos.isEmpty() ? "primera" : Boolean.FALSE.equals(intentos.get(intentos.size() - 1).get("correcto")) ? "correccion" : "siguiente");
            SortedSet<Integer> apoyos = new TreeSet<>(usadas);
            if (aviso.has("ayuda")) apoyos.add(aviso.path("ayuda").asInt());
            intento.put("ayudas", List.copyOf(apoyos));
            intentos.add(intento);
        }
        List<Map<String, Object>> retos = respuestas.entrySet().stream().map(entrada -> Map.<String, Object>of(
                "reto", entrada.getKey(), "respuestas", entrada.getValue())).toList();
        return Map.of("estado", completada ? "completada" : iniciada ? "en_curso" : "sin_iniciar",
                "ayudas_usadas", cantidadAyudas, "retos", retos);
    }

    private static String texto(JsonNode valor) {
        String texto = valor.isValueNode() ? valor.asText() : valor.toString();
        if (texto.isBlank()) return "Sin respuesta";
        return texto.length() > 300 ? texto.substring(0, 300) + "…" : texto;
    }
}
