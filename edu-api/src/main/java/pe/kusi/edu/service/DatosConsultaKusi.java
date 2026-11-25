package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@Service
class DatosConsultaKusi {
    record Actividad(UUID id, UUID seccion, UUID curso, int grado, String titulo) {}
    record Envio(Actividad actividad, String objetivo, String historia, JsonNode retos, JsonNode ayudas, JsonNode paquete) {}
    record Partida(UUID estudiante, Envio envio, List<JsonNode> avisos) {}
    record Clase(Actividad actual, List<Actividad> actividades, Map<UUID, Envio> envios,
                 Map<UUID, Set<UUID>> destinatarios, List<Partida> partidas) {}

    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final ActividadesEstudianteService actividades;

    DatosConsultaKusi(JdbcTemplate jdbc, ObjectMapper json, ActividadesEstudianteService actividades) {
        this.jdbc = jdbc;
        this.json = json;
        this.actividades = actividades;
    }

    Clase cargar(UUID docente, UUID id) {
        String seleccion = "select s.id, sec.id, s.curso_id, sec.grado, s.tema" + ResultadosService.ALCANCE;
        Actividad actual = jdbc.query(seleccion + "and s.id = ?", this::actividad, docente, docente, id).stream()
                .findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No se encontró esta actividad en tus secciones."));
        // La comparación conserva la actividad elegida y hasta siete envíos
        // recientes del mismo docente y sección, incluso si fueron retirados.
        List<Actividad> comparables = new ArrayList<>();
        comparables.add(actual);
        comparables.addAll(jdbc.query(seleccion + "and sec.id = ? and s.id <> ? order by "
                + "(select max(g.publicada_en) from edu.generaciones g where g.solicitud_id = s.id and g.publicada = true) "
                + "desc, s.id fetch first 7 rows only", this::actividad, docente, docente, actual.seccion(), id));

        Map<UUID, Actividad> porActividad = new LinkedHashMap<>();
        comparables.forEach(actividad -> porActividad.put(actividad.id(), actividad));
        Map<UUID, Envio> envios = new LinkedHashMap<>();
        jdbc.query("select g.id, g.solicitud_id, p.objetivo, p.historia, p.retos, p.ayudas, g.paquete "
                + "from edu.generaciones g join edu.propuestas p on p.id = g.propuesta_id and p.solicitud_id = g.solicitud_id "
                + "where g.publicada = true and g.solicitud_id in (" + parametros(porActividad.size()) + ") "
                + "order by g.publicada_en, g.id", fila -> {
            Actividad actividad = porActividad.get(fila.getObject(2, UUID.class));
            boolean actualizada = actividad.id().equals(id);
            envios.put(fila.getObject(1, UUID.class), new Envio(actividad,
                    actualizada ? fila.getString(3) : "", actualizada ? fila.getString(4) : "",
                    actualizada ? leer(fila.getString(5)) : json.missingNode(),
                    actualizada ? leer(fila.getString(6)) : json.missingNode(), leer(fila.getString(7))));
        }, porActividad.keySet().toArray());

        Map<UUID, Set<UUID>> destinatarios = new HashMap<>();
        if (envios.isEmpty()) return new Clase(actual, comparables, envios, destinatarios, List.of());
        envios.keySet().forEach(actividades::materializar);
        // Se conserva el resultado histórico del estudiante que sí recibió ese
        // envío, igual que en Resultados, aunque luego haya salido de la sección.
        jdbc.query("select d.generacion_id, d.estudiante_id from edu.destinatarios_actividad d "
                + "join edu.generaciones g on g.id = d.generacion_id join edu.solicitudes_propuesta s on s.id = g.solicitud_id "
                + "join edu.secciones sec on sec.id = s.seccion_id "
                + "where d.generacion_id in (" + parametros(envios.size()) + ") "
                + "and exists (select 1 from edu.vinculos_estudiante v where v.estudiante_id = d.estudiante_id "
                + "and v.seccion_id = sec.id and v.anio_escolar = sec.anio_escolar)", fila -> {
            destinatarios.computeIfAbsent(fila.getObject(1, UUID.class), clave -> new HashSet<>())
                    .add(fila.getObject(2, UUID.class));
        }, envios.keySet().toArray());
        return new Clase(actual, comparables, envios, destinatarios, partidas(envios, destinatarios));
    }

    private List<Partida> partidas(Map<UUID, Envio> envios, Map<UUID, Set<UUID>> destinatarios) {
        Set<UUID> estudiantes = new HashSet<>();
        destinatarios.values().forEach(estudiantes::addAll);
        if (estudiantes.isEmpty()) return List.of();
        List<Partida> resultado = new ArrayList<>();
        Map<String, Optional<Partida>> porPartida = new HashMap<>();
        jdbc.query("select p.id, p.usuario_id, a.contenido from edu.partidas p "
                + "join edu.avisos_partida a on a.partida_id = p.id "
                + "where p.prueba_docente = false and p.usuario_id in (" + parametros(estudiantes.size()) + ") "
                + "order by p.id, a.orden", fila -> {
            String id = fila.getString(1);
            if (porPartida.containsKey(id) && porPartida.get(id).isEmpty()) return;
            JsonNode aviso = leer(fila.getString(3));
            if (!porPartida.containsKey(id)) {
                // El primer aviso fija el envío validado al guardar. Los avisos
                // previos a ese contrato quedan fuera de cualquier actividad.
                UUID estudiante = fila.getObject(2, UUID.class);
                String juego = aviso.path("juego_id").asText();
                UUID envio;
                try { envio = UUID.fromString(juego); }
                catch (IllegalArgumentException invalido) { envio = null; }
                Partida partida = null;
                if (envio != null && destinatarios.getOrDefault(envio, Set.of()).contains(estudiante)) {
                    partida = new Partida(estudiante, envios.get(envio), new ArrayList<>());
                    resultado.add(partida);
                }
                porPartida.put(id, Optional.ofNullable(partida));
            }
            porPartida.get(id).ifPresent(partida -> partida.avisos().add(aviso));
        }, estudiantes.toArray());
        return resultado;
    }

    private Actividad actividad(java.sql.ResultSet fila, int indice) throws java.sql.SQLException {
        return new Actividad(fila.getObject(1, UUID.class), fila.getObject(2, UUID.class), fila.getObject(3, UUID.class),
                fila.getInt(4), fila.getString(5));
    }

    private JsonNode leer(String contenido) {
        if (contenido == null) return json.missingNode();
        try { return json.readTree(contenido); }
        catch (JsonProcessingException error) { throw new IllegalStateException("No se pudo leer el contenido de la actividad."); }
    }

    private static String parametros(int cantidad) {
        return String.join(", ", Collections.nCopies(cantidad, "?"));
    }
}
