package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/** La asignación, el regreso confirmado y los puntos usan siempre el mismo juego. */
@Service
public class ActividadesEstudianteService {
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransactionTemplate transaccion;
    private final DjangoInternoClient django;

    public ActividadesEstudianteService(JdbcTemplate jdbc, ObjectMapper json, TransactionTemplate transaccion, DjangoInternoClient django) {
        this.jdbc = jdbc; this.json = json; this.transaccion = transaccion; this.django = django;
    }

    private record Juego(UUID id, UUID actividad, String paquete, UUID seccion) {}

    /** Conserva también los envíos anteriores a la V11. Cada envío se fija una sola vez. */
    public void materializarPendientes() {
        for (UUID juego : jdbc.query("select id from edu.generaciones where publicada = true and destinatarios_fijados = false order by publicada_en, id",
                (fila, indice) -> fila.getObject(1, UUID.class))) materializar(juego);
    }

    public void materializar(UUID juego) {
        List<Boolean> actuales = jdbc.query("select destinatarios_fijados from edu.generaciones where id = ? and publicada = true",
                (fila, indice) -> fila.getBoolean(1), juego);
        if (actuales.isEmpty() || actuales.get(0)) return;
        transaccion.executeWithoutResult(estado -> {
            List<Boolean> fijados = jdbc.query("select destinatarios_fijados from edu.generaciones where id = ? and publicada = true for update",
                    (fila, indice) -> fila.getBoolean(1), juego);
            if (fijados.isEmpty() || fijados.get(0)) return;
            List<UUID> anteriores = jdbc.query("select anterior.id from edu.generaciones anterior join edu.generaciones actual "
                    + "on actual.solicitud_id = anterior.solicitud_id where actual.id = ? and anterior.publicada = true "
                    + "and (anterior.publicada_en < actual.publicada_en or (anterior.publicada_en = actual.publicada_en and anterior.id < actual.id)) "
                    + "order by anterior.publicada_en desc, anterior.id desc fetch first 1 rows only",
                    (fila, indice) -> fila.getObject(1, UUID.class), juego);
            String base = "insert into edu.destinatarios_actividad(generacion_id, estudiante_id, asignado_por, asignado_en) "
                    + "select g.id, v.estudiante_id, s.docente_id, g.publicada_en from edu.generaciones g "
                    + "join edu.solicitudes_propuesta s on s.id = g.solicitud_id join edu.secciones sec on sec.id = s.seccion_id "
                    + "join edu.vinculos_estudiante v on v.seccion_id = s.seccion_id and v.anio_escolar = sec.anio_escolar ";
            if (anteriores.isEmpty()) {
                jdbc.update(base + "where g.id = ? and v.creado_en <= g.publicada_en and not exists (select 1 from edu.destinatarios_actividad d "
                        + "where d.generacion_id = g.id and d.estudiante_id = v.estudiante_id)", juego);
            } else {
                // Corregir la misma actividad no asigna sus versiones a un vínculo
                // posterior. Se hereda el envío anterior, incluida su selección explícita.
                UUID anterior = anteriores.get(0);
                materializar(anterior);
                jdbc.update(base + "where g.id = ? and exists (select 1 from edu.destinatarios_actividad d "
                        + "where d.generacion_id = ? and d.estudiante_id = v.estudiante_id) "
                        + "and not exists (select 1 from edu.destinatarios_actividad d where d.generacion_id = g.id and d.estudiante_id = v.estudiante_id)",
                        juego, anterior);
            }
            jdbc.update("update edu.generaciones set destinatarios_fijados = true where id = ?", juego);
        });
    }

    private Juego juego(UUID id) {
        List<Juego> juegos = jdbc.query("select g.id, g.solicitud_id, g.paquete, s.seccion_id from edu.generaciones g "
                + "join edu.solicitudes_propuesta s on s.id = g.solicitud_id where g.id = ? and g.publicada = true and g.estado = 'lista'",
                (fila, indice) -> new Juego(fila.getObject(1, UUID.class), fila.getObject(2, UUID.class), fila.getString(3), fila.getObject(4, UUID.class)), id);
        if (juegos.isEmpty()) throw noEncontrado();
        return juegos.get(0);
    }

    /** La pertenencia actual y la asignación del envío son necesarias en todas las rutas. */
    public boolean permitido(UUID estudiante, UUID juego) {
        materializar(juego);
        Integer cantidad = jdbc.queryForObject("select count(*) from edu.generaciones g join edu.solicitudes_propuesta s on s.id = g.solicitud_id "
                + "where g.id = ? and g.publicada = true and g.estado = 'lista' "
                + "and exists (select 1 from edu.destinatarios_actividad d where d.generacion_id = g.id and d.estudiante_id = ?) "
                + "and exists (select 1 from edu.vinculos_estudiante v join edu.secciones sec on sec.id = v.seccion_id "
                + "where v.estudiante_id = ? and v.seccion_id = s.seccion_id and v.anio_escolar = sec.anio_escolar)",
                Integer.class, juego, estudiante, estudiante);
        return cantidad != null && cantidad > 0;
    }

    private Juego comprobar(UUID estudiante, UUID id) {
        if (!permitido(estudiante, id)) throw noEncontrado();
        return juego(id);
    }

    public List<Map<String, Object>> juegos(UUID estudiante) {
        materializarPendientes();
        // Una pausa pendiente conserva la versión exacta. Sin pausa, se muestra el
        // último envío de esta actividad que fue asignado a este estudiante.
        return jdbc.query("select g.id, s.tema, g.paquete, d.vista_en from edu.generaciones g "
                + "join edu.solicitudes_propuesta s on s.id = g.solicitud_id "
                + "join edu.destinatarios_actividad d on d.generacion_id = g.id and d.estudiante_id = ? "
                + "where g.publicada = true and g.estado = 'lista' and exists (select 1 from edu.vinculos_estudiante v "
                + "join edu.secciones sec on sec.id = v.seccion_id where v.estudiante_id = ? and v.seccion_id = s.seccion_id "
                + "and v.anio_escolar = sec.anio_escolar) and (exists (select 1 from edu.avances_actividad a "
                + "where a.estudiante_id = ? and a.actividad_id = s.id and a.generacion_id = g.id and a.completada = false) "
                + "or (not exists (select 1 from edu.avances_actividad a where a.estudiante_id = ? and a.actividad_id = s.id and a.completada = false) "
                + "and not exists (select 1 from edu.generaciones nueva join edu.destinatarios_actividad dn on dn.generacion_id = nueva.id "
                + "where nueva.solicitud_id = s.id and nueva.publicada = true and nueva.estado = 'lista' and dn.estudiante_id = ? "
                + "and (nueva.publicada_en > g.publicada_en or (nueva.publicada_en = g.publicada_en and nueva.id > g.id))))) "
                + "order by g.publicada_en desc, g.id desc fetch first 5 rows only",
                (fila, indice) -> Map.<String, Object>of("id", fila.getObject(1, UUID.class), "titulo", fila.getString(2),
                        "paquete", fila.getString(3), "nuevo", fila.getTimestamp(4) == null), estudiante, estudiante, estudiante, estudiante, estudiante);
    }

    public void visto(UUID estudiante, UUID juego) {
        comprobar(estudiante, juego);
        jdbc.update("update edu.destinatarios_actividad set vista_en = ? where generacion_id = ? and estudiante_id = ? and vista_en is null",
                Timestamp.from(Instant.now()), juego, estudiante);
    }

    private JsonNode leer(String contenido) {
        try { return json.readTree(contenido); }
        catch (Exception error) { throw new IllegalStateException("No se pudo leer el contenido guardado."); }
    }

    private int retos(Juego juego) {
        JsonNode retos = leer(juego.paquete()).path("retos");
        if (!retos.isArray() || retos.size() < 1 || retos.size() > 5)
            throw new ResponseStatusException(HttpStatus.CONFLICT, "El juego no tiene una cantidad válida de retos.");
        return retos.size();
    }

    public Map<String, Object> avance(UUID estudiante, UUID id) {
        Juego pedido = comprobar(estudiante, id);
        record Punto(UUID juego, String partida, int orden, int nivel) {}
        String consulta = "select generacion_id, partida_id, ultimo_orden, nivel from edu.avances_actividad "
                + "where estudiante_id = ? and actividad_id = ? and completada = false";
        List<String> pendientes = jdbc.query("select partida_id from edu.avances_actividad where estudiante_id = ? and actividad_id = ? and completada = false",
                (fila, indice) -> fila.getString(1), estudiante, pedido.actividad());
        if (pendientes.isEmpty()) return null;
        String partida = pendientes.get(0);
        return transaccion.execute(estado -> {
            // El orden de los bloqueos es el mismo que al guardar avisos o pausa:
            // partida y después actividad. No puede entrar un aviso mientras se
            // calcula la semilla, ni se devuelve una posición anterior a un fin.
            jdbc.query("select id from edu.partidas where id = ? and usuario_id = ? for update", fila -> {}, partida, estudiante);
            jdbc.query("select id from edu.solicitudes_propuesta where id = ? for update", fila -> {}, pedido.actividad());
            List<Punto> guardados = jdbc.query(consulta,
                    (fila, indice) -> new Punto(fila.getObject(1, UUID.class), fila.getString(2), fila.getInt(3), fila.getInt(4)),
                    estudiante, pedido.actividad());
            if (guardados.isEmpty()) return null;
            Punto punto = guardados.get(0);
            if (!partida.equals(punto.partida())) throw conflicto("Tu avance cambió en otra partida. Vuelve a consultarlo.");
            Juego exacto = comprobar(estudiante, punto.juego());
            List<JsonNode> confirmados = jdbc.query("select contenido from edu.avisos_partida where partida_id = ? order by orden",
                    (fila, indice) -> leer(fila.getString(1)), partida);
            if (confirmados.isEmpty()) throw conflicto("No pudimos confirmar el avance de esta partida. Vuelve a intentarlo.");
            for (JsonNode aviso : confirmados) {
                if (!aviso.path("juego_id").asText().equals(exacto.id().toString()))
                    throw conflicto("El avance no coincide con la partida confirmada.");
            }
            if (confirmados.stream().anyMatch(aviso -> List.of("fin", "fallo").contains(aviso.path("tipo").asText()))) {
                jdbc.update("delete from edu.avances_actividad where estudiante_id = ? and actividad_id = ? and partida_id = ?",
                        estudiante, exacto.actividad(), partida);
                return null;
            }
            Set<Integer> completados = new HashSet<>();
            int orden = 0;
            for (JsonNode aviso : confirmados) {
                if (aviso.path("orden").asInt() != ++orden)
                    throw conflicto("Hay avisos pendientes de confirmar. Vuelve a enviarlos antes de retomar.");
                if (aviso.path("tipo").asText().equals("reto_completado")) completados.add(aviso.path("nivel").asInt());
            }
            int nivel = 1;
            while (completados.contains(nivel) && nivel < retos(exacto)) nivel++;
            if (orden < punto.orden()) throw conflicto("El avance guardado todavía no se pudo confirmar.");
            // Seguir jugando después de una pausa puede haber confirmado más
            // acciones. La semilla debe continuar tras ellas, no volver a usar su orden.
            if (orden != punto.orden() || nivel != punto.nivel())
                jdbc.update("update edu.avances_actividad set ultimo_orden = ?, nivel = ?, actualizado_en = ? "
                        + "where estudiante_id = ? and actividad_id = ? and partida_id = ?",
                        orden, nivel, Timestamp.from(Instant.now()), estudiante, exacto.actividad(), partida);
            return dtoAvance(estudiante, exacto.id(), partida, orden, nivel);
        });
    }

    private Map<String, Object> dtoAvance(UUID estudiante, UUID id, String partida, int orden, int nivel) {
        Juego juego = comprobar(estudiante, id);
        List<String> avisados = new ArrayList<>();
        jdbc.query("select tipo, nivel from edu.avisos_partida where partida_id = ? and orden <= ? order by orden", fila -> {
            String tipo = fila.getString(1);
            String unico = List.of("listo", "inicio", "fin", "fallo").contains(tipo) ? tipo
                    : tipo.equals("reto_completado") ? tipo + ":" + fila.getInt(2) : null;
            if (unico != null && !avisados.contains(unico)) avisados.add(unico);
        }, partida, orden);
        return Map.of("juego_id", juego.id(), "paquete", juego.paquete(), "nivel", nivel,
                "partida", Map.of("id", partida, "orden", orden, "avisados", avisados, "cerrada", false));
    }

    public Map<String, Object> guardarAvance(UUID estudiante, UUID id, JsonNode datos) {
        Juego juego = comprobar(estudiante, id);
        if (datos == null || !datos.isObject() || !datos.path("partida").isTextual()
                || !datos.path("partida").asText().matches("[A-Za-z0-9-]{1,120}")
                || !datos.path("orden").isIntegralNumber() || !datos.path("orden").canConvertToInt()
                || datos.path("orden").asInt() < 1 || datos.path("orden").asInt() > 100000
                || !datos.path("nivel").isIntegralNumber() || !datos.path("nivel").canConvertToInt()
                || datos.path("nivel").asInt() < 1 || datos.path("nivel").asInt() > retos(juego))
            throw new IllegalArgumentException("El avance recibido no es válido.");
        String partida = datos.path("partida").asText();
        int orden = datos.path("orden").asInt(), nivel = datos.path("nivel").asInt();
        return transaccion.execute(estado -> {
            List<UUID> propietarios = jdbc.query("select usuario_id from edu.partidas where id = ? and prueba_docente = false for update",
                    (fila, indice) -> fila.getObject(1, UUID.class), partida);
            if (propietarios.isEmpty() || !propietarios.get(0).equals(estudiante)) throw noEncontrado();
            jdbc.query("select id from edu.solicitudes_propuesta where id = ? for update", fila -> {}, juego.actividad());
            List<String> confirmados = jdbc.query("select contenido from edu.avisos_partida where partida_id = ? and orden <= ? order by orden",
                    (fila, indice) -> fila.getString(1), partida, orden);
            if (confirmados.size() != orden) throw conflicto("Hay avance pendiente de confirmar. Vuelve a enviarlo.");
            Integer ultimo = jdbc.queryForObject("select max(orden) from edu.avisos_partida where partida_id = ?", Integer.class, partida);
            if (ultimo == null || ultimo != orden) throw conflicto("Ya existe un avance confirmado más reciente de esta partida.");
            Set<Integer> completados = new HashSet<>();
            int esperado = 1;
            for (String contenido : confirmados) {
                JsonNode aviso = leer(contenido);
                if (aviso.path("orden").asInt() != esperado++ || !aviso.path("juego_id").asText().equals(id.toString()))
                    throw conflicto("El avance no coincide con la partida confirmada.");
                if (List.of("fin", "fallo").contains(aviso.path("tipo").asText()))
                    throw conflicto("Esta partida ya terminó. Puedes empezar otra vez.");
                if (aviso.path("tipo").asText().equals("reto_completado")) completados.add(aviso.path("nivel").asInt());
            }
            int pendiente = 1;
            while (completados.contains(pendiente) && pendiente < retos(juego)) pendiente++;
            if (nivel != pendiente) throw conflicto("El reto no coincide con el avance confirmado.");
            List<Integer> anteriores = jdbc.query("select ultimo_orden from edu.avances_actividad where estudiante_id = ? and actividad_id = ? "
                    + "and partida_id = ?", (fila, indice) -> fila.getInt(1), estudiante, juego.actividad(), partida);
            if (!anteriores.isEmpty() && anteriores.get(0) > orden) throw conflicto("Ya existe un avance más reciente de esta partida.");
            List<String> otras = jdbc.query("select partida_id from edu.avances_actividad where estudiante_id = ? and actividad_id = ? "
                    + "and partida_id <> ? and completada = false", (fila, indice) -> fila.getString(1), estudiante, juego.actividad(), partida);
            for (String otra : otras) {
                Integer cerrada = jdbc.queryForObject("select count(*) from edu.avisos_partida where partida_id = ? and tipo in ('fin', 'fallo')",
                        Integer.class, otra);
                if (cerrada == null || cerrada == 0)
                    throw conflicto("Ya hay avance confirmado en otra partida de esta actividad. Retómala antes de guardar otra.");
            }
            jdbc.update("delete from edu.avances_actividad where estudiante_id = ? and actividad_id = ?", estudiante, juego.actividad());
            jdbc.update("insert into edu.avances_actividad(estudiante_id, actividad_id, generacion_id, partida_id, ultimo_orden, nivel) values (?, ?, ?, ?, ?, ?)",
                    estudiante, juego.actividad(), id, partida, orden, nivel);
            return dtoAvance(estudiante, id, partida, orden, nivel);
        });
    }

    /** Se llama dentro de la transacción del aviso. El bloqueo serializa partidas simultáneas de la actividad. */
    public void registrarPuntos(UUID estudiante, boolean pruebaDocente, JsonNode aviso) {
        if (pruebaDocente || !aviso.hasNonNull("juego_id")) return;
        String tipo = aviso.path("tipo").asText();
        if (!tipo.equals("reto_completado") && !tipo.equals("fin")) return;
        Juego juego = juego(UUID.fromString(aviso.path("juego_id").asText()));
        jdbc.query("select id from edu.solicitudes_propuesta where id = ? for update", fila -> {}, juego.actividad());
        if (tipo.equals("fin")) {
            jdbc.update("update edu.avances_actividad set completada = true where estudiante_id = ? and actividad_id = ? and partida_id = ?",
                    estudiante, juego.actividad(), aviso.path("partida").asText());
            return;
        }
        int totalRetos = retos(juego), nivel = aviso.path("nivel").asInt();
        if (nivel < 1 || nivel > totalRetos) throw new IllegalArgumentException("El reto completado no pertenece a este juego.");
        Integer existente = jdbc.queryForObject("select count(*) from edu.puntos_reto where estudiante_id = ? and actividad_id = ? and nivel = ?",
                Integer.class, estudiante, juego.actividad(), nivel);
        if (existente != null && existente > 0) return;
        int puntos = (int) Math.round(20.0 * nivel / totalRetos) - (int) Math.round(20.0 * (nivel - 1) / totalRetos);
        puntos = Math.min(puntos, Math.max(0, 20 - puntos(estudiante, juego.actividad())));
        jdbc.update("insert into edu.puntos_reto(estudiante_id, actividad_id, nivel, puntos, generacion_id, partida_id) values (?, ?, ?, ?, ?, ?)",
                estudiante, juego.actividad(), nivel, puntos, juego.id(), aviso.path("partida").asText());
    }

    private int puntos(UUID estudiante, UUID actividad) {
        Integer total = jdbc.queryForObject("select coalesce(sum(puntos), 0) from edu.puntos_reto where estudiante_id = ? and actividad_id = ?",
                Integer.class, estudiante, actividad);
        return total == null ? 0 : total;
    }

    public int puntosPartida(UUID estudiante, String partida) {
        List<String> contenido = jdbc.query("select contenido from edu.avisos_partida where partida_id = ? order by orden fetch first 1 rows only",
                (fila, indice) -> fila.getString(1), partida);
        if (contenido.isEmpty() || !leer(contenido.get(0)).hasNonNull("juego_id")) return 0;
        Juego juego = juego(UUID.fromString(leer(contenido.get(0)).path("juego_id").asText()));
        return puntos(estudiante, juego.actividad());
    }

    public List<Map<String, Object>> asignaciones(UUID docente, UUID actividad) {
        materializarPendientes();
        Juego juego = ultimoDelDocente(docente, actividad);
        List<Map<String, Object>> estudiantes = jdbc.query("select v.estudiante_id, case when d.estudiante_id is null then false else true end "
                + "from edu.vinculos_estudiante v join edu.secciones sec on sec.id = v.seccion_id "
                + "left join edu.destinatarios_actividad d on d.estudiante_id = v.estudiante_id and d.generacion_id = ? "
                + "where v.seccion_id = ? and v.anio_escolar = sec.anio_escolar", (fila, indice) -> {
            UUID estudiante = fila.getObject(1, UUID.class);
            return Map.<String, Object>of("id", estudiante, "nombre", django.validarCuenta(estudiante, "estudiante").getOrDefault("nombre", "Estudiante"),
                    "asignado", fila.getBoolean(2));
        }, juego.id(), juego.seccion());
        estudiantes.sort(Comparator.comparing(fila -> fila.get("nombre").toString(), String.CASE_INSENSITIVE_ORDER));
        return estudiantes;
    }

    public void asignar(UUID docente, UUID actividad, JsonNode datos) {
        if (datos == null || !datos.path("estudiantes").isArray() || datos.path("estudiantes").size() > 1000)
            throw new IllegalArgumentException("Indica la lista de estudiantes que recibirán la actividad.");
        Set<UUID> seleccionados = new LinkedHashSet<>();
        for (JsonNode valor : datos.path("estudiantes")) {
            if (!valor.isTextual() || !valor.asText().matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"))
                throw new IllegalArgumentException("El estudiante no tiene un identificador válido.");
            seleccionados.add(UUID.fromString(valor.asText()));
        }
        materializarPendientes();
        transaccion.executeWithoutResult(estado -> {
            Juego juego = ultimoDelDocente(docente, actividad);
            jdbc.query("select id from edu.generaciones where id = ? for update", fila -> {}, juego.id());
            for (UUID estudiante : seleccionados) {
                Integer vinculado = jdbc.queryForObject("select count(*) from edu.vinculos_estudiante v join edu.secciones sec on sec.id = v.seccion_id "
                        + "where v.estudiante_id = ? and v.seccion_id = ? and v.anio_escolar = sec.anio_escolar", Integer.class, estudiante, juego.seccion());
                if (vinculado == null || vinculado == 0) throw noEncontrado();
            }
            for (UUID estudiante : seleccionados) jdbc.update("insert into edu.destinatarios_actividad(generacion_id, estudiante_id, asignado_por) "
                    + "select ?, ?, ? where not exists (select 1 from edu.destinatarios_actividad where generacion_id = ? and estudiante_id = ?)",
                    juego.id(), estudiante, docente, juego.id(), estudiante);
        });
    }

    private Juego ultimoDelDocente(UUID docente, UUID actividad) {
        List<UUID> juegos = jdbc.query("select g.id from edu.generaciones g join edu.solicitudes_propuesta s on s.id = g.solicitud_id "
                + "join edu.secciones sec on sec.id = s.seccion_id where s.id = ? and s.docente_id = ? and g.publicada = true and g.estado = 'lista' "
                + "and exists (select 1 from edu.asignaciones_docente a where a.docente_id = ? and a.curso_id = s.curso_id "
                + "and a.seccion_id = s.seccion_id and a.anio_escolar = sec.anio_escolar) order by g.publicada_en desc, g.id desc fetch first 1 rows only",
                (fila, indice) -> fila.getObject(1, UUID.class), actividad, docente, docente);
        if (juegos.isEmpty()) throw noEncontrado();
        return juego(juegos.get(0));
    }

    private static ResponseStatusException noEncontrado() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esta actividad entre tus actividades."); }
    private static ResponseStatusException conflicto(String mensaje) { return new ResponseStatusException(HttpStatus.CONFLICT, mensaje); }
}
