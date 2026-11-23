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
public class ResultadosService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final DjangoInternoClient django;
    private final ActividadesEstudianteService actividades;

    public ResultadosService(JdbcTemplate jdbc, ObjectMapper json, DjangoInternoClient django, ActividadesEstudianteService actividades) {
        this.jdbc = jdbc; this.json = json; this.django = django; this.actividades = actividades;
    }

    // Se comprueba el curso, la sección y el año vigentes en TODAS las lecturas.
    // Conocer un identificador o haber creado antes el juego no concede acceso.
    private static final String ALCANCE = " from edu.solicitudes_propuesta s join edu.secciones sec on sec.id = s.seccion_id "
            + "where s.docente_id = ? and exists (select 1 from edu.asignaciones_docente a where a.docente_id = ? "
            + "and a.curso_id = s.curso_id and a.seccion_id = s.seccion_id and a.anio_escolar = sec.anio_escolar) "
            + "and exists (select 1 from edu.generaciones g where g.solicitud_id = s.id and g.publicada = true) ";

    public List<Map<String, Object>> actividades(UUID docente) {
        return jdbc.query("select s.id, s.tema, sec.nombre, s.retirada_en " + ALCANCE + "order by s.creado_en desc, s.id",
                (fila, indice) -> Map.<String, Object>of("id", fila.getObject(1, UUID.class), "titulo", fila.getString(2), "seccion", fila.getString(3), "retirada", fila.getTimestamp(4) != null), docente, docente);
    }

    private UUID seccion(UUID docente, UUID actividad) {
        List<UUID> secciones = jdbc.query("select s.seccion_id " + ALCANCE + "and s.id = ?",
                (fila, indice) -> fila.getObject(1, UUID.class), docente, docente, actividad);
        if (secciones.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esta actividad en tus secciones.");
        return secciones.get(0);
    }

    private List<UUID> destinatarios(UUID docente, UUID actividad) {
        actividades.materializarPendientes();
        UUID seccion = seccion(docente, actividad);
        // Los vínculos posteriores al envío no se añaden a la lista por accidente.
        return jdbc.query("select distinct v.estudiante_id from edu.vinculos_estudiante v join edu.secciones sec on sec.id = v.seccion_id "
                + "where v.seccion_id = ? and v.anio_escolar = sec.anio_escolar and exists (select 1 from edu.generaciones g "
                + "join edu.destinatarios_actividad d on d.generacion_id = g.id and d.estudiante_id = v.estudiante_id "
                + "where g.solicitud_id = ? and g.publicada = true)",
                (fila, indice) -> fila.getObject(1, UUID.class), seccion, actividad);
    }

    public List<Map<String, Object>> estudiantes(UUID docente, UUID actividad) {
        List<UUID> estudiantes = destinatarios(docente, actividad);
        Map<UUID, List<Map<String, Object>>> partidas = partidas(actividad);
        List<Map<String, Object>> filas = new ArrayList<>();
        for (UUID estudiante : estudiantes) {
            List<Map<String, Object>> jugadas = partidas.getOrDefault(estudiante, List.of());
            String estado = jugadas.stream().anyMatch(p -> p.get("estado").equals("completada")) ? "completada"
                    : jugadas.stream().anyMatch(p -> p.get("estado").equals("en_curso")) ? "en_curso" : "sin_iniciar";
            Map<String, Object> cuenta = django.validarCuenta(estudiante, "estudiante");
            filas.add(Map.of("id", estudiante, "nombre", cuenta.getOrDefault("nombre", "Estudiante"), "estado", estado,
                    "partidas", jugadas.size(), "ayudas_usadas", jugadas.stream().mapToInt(p -> (Integer) p.get("ayudas_usadas")).sum()));
        }
        filas.sort(Comparator.comparing(fila -> fila.get("nombre").toString(), String.CASE_INSENSITIVE_ORDER));
        return filas;
    }

    public List<Map<String, Object>> respuestas(UUID docente, UUID actividad, UUID estudiante) {
        if (!destinatarios(docente, actividad).contains(estudiante))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró este estudiante en la actividad.");
        return partidas(actividad, estudiante).getOrDefault(estudiante, List.of());
    }

    private Map<UUID, List<Map<String, Object>>> partidas(UUID actividad) {
        return partidas(actividad, null);
    }

    private Map<UUID, List<Map<String, Object>>> partidas(UUID actividad, UUID estudiante) {
        // El vínculo exacto se lee del contexto que validó Spring al guardar. Los
        // avisos antiguos sin contexto se conservan, pero nunca se atribuyen por azar.
        record Envio(java.time.Instant fecha, int numero) {}
        Map<UUID, Envio> envios = new LinkedHashMap<>();
        jdbc.query("select id, publicada_en from edu.generaciones where solicitud_id = ? and publicada = true order by publicada_en, id", fila -> {
            envios.put(fila.getObject(1, UUID.class), new Envio(fila.getTimestamp(2).toInstant(), envios.size() + 1));
        }, actividad);
        record Avisos(UUID estudiante, List<JsonNode> contenido) {}
        Map<String, Avisos> agrupadas = new LinkedHashMap<>();
        String filtro = estudiante == null ? "" : "and p.usuario_id = ? ";
        Object[] parametros = estudiante == null ? new Object[] { actividad } : new Object[] { actividad, estudiante };
        jdbc.query("select p.id, p.usuario_id, a.contenido from edu.partidas p join edu.avisos_partida a on a.partida_id = p.id "
                + "where p.prueba_docente = false and exists (select 1 from edu.vinculos_estudiante v "
                + "join edu.solicitudes_propuesta s on s.seccion_id = v.seccion_id join edu.secciones sec on sec.id = v.seccion_id "
                + "where s.id = ? and v.estudiante_id = p.usuario_id and v.anio_escolar = sec.anio_escolar) "
                + filtro + "order by p.creado_en, p.id, a.orden", fila -> {
            JsonNode aviso;
            try { aviso = json.readTree(fila.getString(3)); }
            catch (JsonProcessingException error) { throw new IllegalStateException("No se pudo leer un aviso guardado."); }
            UUID propietario = fila.getObject(2, UUID.class);
            agrupadas.computeIfAbsent(fila.getString(1), clave -> new Avisos(propietario, new ArrayList<>())).contenido().add(aviso);
        }, parametros);
        Map<UUID, List<Map<String, Object>>> resultado = new HashMap<>();
        for (Avisos grupo : agrupadas.values()) {
            UUID juego;
            try { juego = UUID.fromString(grupo.contenido().get(0).path("juego_id").asText()); }
            catch (IllegalArgumentException error) { continue; }
            if (!envios.containsKey(juego)) continue;
            Map<String, Object> resumen = new LinkedHashMap<>(RespuestasPartida.resumir(grupo.contenido()));
            // La identidad exacta queda interna; la pantalla utiliza la fecha del envío.
            resumen.put("juego_id", juego);
            resumen.put("enviado_en", envios.get(juego).fecha());
            resumen.put("envio", envios.get(juego).numero());
            resultado.computeIfAbsent(grupo.estudiante(), clave -> new ArrayList<>()).add(resumen);
        }
        return resultado;
    }

}
