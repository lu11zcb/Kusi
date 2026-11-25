package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.*;

final class ProgresoClaseKusi {
    record Confusion(int nivel, String elegida, String esperada) {}
    record ErrorComun(int nivel, String elegida, String esperada, int veces) {}
    record Nivel(int nivel, int errores, int ayudas, Long tiempo_promedio_segundos, int mediciones_tiempo) {}
    record Grupo(int asignados, int jugaron, int terminaron, List<Nivel> niveles, List<ErrorComun> errores_comunes) {}

    private static final Set<String> AVISOS_DE_JUEGO = Set.of("inicio", "accion", "ayuda", "reto_completado", "fin");
    private final Map<Integer, TotalesNivel> niveles = new TreeMap<>();
    private final Map<Confusion, Integer> confusiones = new HashMap<>();
    final Map<UUID, Estudiante> estudiantes = new LinkedHashMap<>();

    void incluir(Set<UUID> destinatarios, int cantidadNiveles) {
        destinatarios.forEach(id -> estudiantes.computeIfAbsent(id, clave -> new Estudiante()));
        for (int nivel = 1; nivel <= cantidadNiveles; nivel++) totales(nivel);
    }

    void registrar(DatosConsultaKusi.Partida partida, PrivacidadConsultaKusi privacidad, Set<String> vocabulario, boolean actual) {
        Estudiante estudiante = estudiantes.get(partida.estudiante());
        Set<Integer> retosCompletados = new HashSet<>();
        Map<Integer, Instant> aperturas = new HashMap<>();
        Map<Integer, Integer> aciertos = new HashMap<>();
        JsonNode paquete = partida.envio().paquete();
        int cantidadNiveles = Math.min(paquete.path("retos").size(), 5);
        for (JsonNode aviso : partida.avisos()) {
            String tipo = aviso.path("tipo").asText();
            if (!AVISOS_DE_JUEGO.contains(tipo)) continue;
            estudiante.jugo = true;
            if (tipo.equals("fin")) estudiante.termino = true;
            int nivel = aviso.path("nivel").asInt();
            if (nivel < 1 || nivel > 5) continue;
            TotalesNivel totales = totales(nivel);
            if (actual && !tipo.equals("fin")) {
                Instant momento = momento(aviso);
                if (momento != null) aperturas.putIfAbsent(nivel, momento);
            }
            switch (tipo) {
                case "accion" -> {
                    if (!actual || aviso.path("atrapado").asBoolean() || !aviso.path("correcto").isBoolean()) continue;
                    if (aviso.path("correcto").booleanValue()) aciertos.merge(nivel, 1, Integer::sum);
                    else {
                        totales.errores++;
                        estudiante.errores.merge(nivel, 1, Integer::sum);
                        registrarConfusion(aviso, nivel, aciertos.getOrDefault(nivel, 0), paquete, privacidad, vocabulario);
                    }
                }
                case "ayuda" -> {
                    totales.ayudas++;
                    estudiante.ayudas++;
                }
                case "reto_completado" -> {
                    if (retosCompletados.add(nivel) && actual)
                        totales.medir(aperturas.get(nivel), momento(aviso));
                }
            }
        }
        // Se compara el mayor avance conseguido en una partida y su propio
        // paquete. Reintentar o jugar otro envío no suma niveles duplicados.
        estudiante.avance = Math.max(estudiante.avance, cantidadNiveles == 0 ? 0
                : (int) Math.round(100.0 * retosCompletados.stream().filter(nivel -> nivel <= cantidadNiveles).count() / cantidadNiveles));
    }

    private void registrarConfusion(JsonNode aviso, int nivel, int aciertos, JsonNode paquete,
                                    PrivacidadConsultaKusi privacidad, Set<String> vocabulario) {
        JsonNode respuesta = aviso.hasNonNull("respuesta") ? aviso.path("respuesta") : aviso.path("objeto");
        String elegida = privacidad.etiqueta(respuesta, vocabulario);
        if (elegida.isEmpty()) return;
        JsonNode valorEsperado = aviso.hasNonNull("esperado") ? aviso.path("esperado") : aviso.path("respuesta_esperada");
        if (valorEsperado.isMissingNode() && paquete.path("familia").asText().equals("laberinto")) {
            // Los laberintos guardan la regla exacta, aunque el aviso histórico
            // solo lleve el objeto elegido. Cada acierto avanza la secuencia.
            JsonNode regla = paquete.path("retos").path(nivel - 1).path("regla");
            if (regla.path("tipo").asText().equals("orden")) {
                JsonNode secuencia = regla.path("secuencia");
                if (aciertos < secuencia.size()) valorEsperado = secuencia.path(aciertos);
            } else if (regla.path("tipo").asText().equals("solo_clase")) {
                valorEsperado = regla.path("clase");
            }
        }
        String esperada = privacidad.etiqueta(valorEsperado, vocabulario);
        if (esperada.equals(elegida)) esperada = "";
        confusiones.merge(new Confusion(nivel, elegida, esperada), 1, Integer::sum);
    }

    Grupo grupo() {
        List<ErrorComun> comunes = confusiones.entrySet().stream()
                .sorted(Map.Entry.<Confusion, Integer>comparingByValue().reversed()
                        .thenComparing(e -> e.getKey().nivel()).thenComparing(e -> e.getKey().elegida())
                        .thenComparing(e -> e.getKey().esperada()))
                .limit(8).map(e -> new ErrorComun(e.getKey().nivel(), e.getKey().elegida(),
                        e.getKey().esperada().isEmpty() ? null : e.getKey().esperada(), e.getValue())).toList();
        return new Grupo(estudiantes.size(), jugaron(), terminaron(),
                niveles.entrySet().stream().map(e -> e.getValue().resumir(e.getKey())).toList(), comunes);
    }

    int jugaron() { return (int) estudiantes.values().stream().filter(e -> e.jugo).count(); }
    int terminaron() { return (int) estudiantes.values().stream().filter(e -> e.termino).count(); }

    private TotalesNivel totales(int nivel) {
        return niveles.computeIfAbsent(nivel, clave -> new TotalesNivel());
    }

    private static Instant momento(JsonNode aviso) {
        try { return Instant.parse(aviso.path("momento").asText()); }
        catch (DateTimeParseException invalida) { return null; }
    }

    static final class Estudiante {
        private final Map<Integer, Integer> errores = new TreeMap<>();
        private int ayudas, avance;
        private boolean jugo, termino;

        int avance() { return termino ? 100 : avance; }
        Map<Integer, Integer> errores() { return Map.copyOf(errores); }
        int ayudas() { return ayudas; }
        String estado() { return termino ? "Completada" : jugo ? "En curso" : "Sin iniciar"; }

        List<String> motivos() {
            List<String> motivos = new ArrayList<>();
            errores.forEach((nivel, cantidad) -> {
                if (cantidad >= 3) motivos.add(cantidad + " errores en el nivel " + nivel);
            });
            if (ayudas >= 3) motivos.add("Usó " + ayudas + " ayudas");
            if (jugo && !termino) motivos.add("Empezó la actividad y aún no la terminó");
            return motivos;
        }
    }

    private static final class TotalesNivel {
        private int errores, ayudas, mediciones;
        private long tiempo;

        private void medir(Instant inicio, Instant fin) {
            if (inicio == null || fin == null) return;
            long segundos = Duration.between(inicio, fin).toSeconds();
            // Es tiempo observado entre avisos, no tiempo activo. Las marcas
            // invertidas y las separadas por más de una hora no estiman una sesión.
            if (segundos < 0 || segundos > 3600 || inicio.equals(fin)) return;
            tiempo += segundos;
            mediciones++;
        }

        Nivel resumir(int nivel) {
            return new Nivel(nivel, errores, ayudas, mediciones == 0 ? null : Math.round((double) tiempo / mediciones), mediciones);
        }
    }
}
