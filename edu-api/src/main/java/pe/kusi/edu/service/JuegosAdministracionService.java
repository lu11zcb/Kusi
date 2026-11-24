package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class JuegosAdministracionService {
    // La solicitud identifica al juego. Reintentar o preparar una corrección no crea
    // otro juego ni desplaza un envío que la clase todavía puede abrir.
    private static final String JUEGOS = """
            with intentos as (
                select s.id, s.docente_id, s.curso_id, s.seccion_id, s.tema, s.retirada_en,
                    g.estado,
                    row_number() over juego_reciente as intento,
                    min(g.creado_en) over (partition by s.id) as fecha,
                    first_value(g.id) over (partition by s.id
                        order by case when g.publicada and g.estado = 'lista' then 0 else 1 end,
                        g.publicada_en desc nulls last, g.creado_en desc, g.id desc) as visible_id,
                    max(case when g.publicada and g.estado = 'lista' then 1 else 0 end)
                        over (partition by s.id) as tiene_publicacion
                from edu.solicitudes_propuesta s
                join edu.generaciones g on g.solicitud_id = s.id
                %s
                window juego_reciente as (partition by s.id order by g.creado_en desc, g.id desc)
            ), juegos as (
                select id, docente_id, curso_id, seccion_id, tema, fecha, visible_id,
                    case when retirada_en is not null then 'retirado'
                         when tiene_publicacion = 1 then 'publicado'
                         when estado = 'lista' then 'listo_para_probar'
                         when estado = 'fallida' then 'fallido'
                         else 'generando' end as estado,
                    estado = 'fallida' as fallo_generacion
                from intentos where intento = 1
            )
            """;

    private final JdbcTemplate jdbc;
    private final DjangoInternoClient django;
    private final ObjectMapper json;

    public JuegosAdministracionService(JdbcTemplate jdbc, DjangoInternoClient django, ObjectMapper json) {
        this.jdbc = jdbc;
        this.django = django;
        this.json = json;
    }

    public record Docente(UUID id, String nombre, long juegos_creados) {}
    public record Totales(long creados, long publicados, long en_preparacion) {}
    public record Resumen(Totales totales, List<Docente> docentes) {}
    public record Juego(UUID id, String titulo, String curso, String seccion, Integer anio_escolar,
                        String estado, Instant creado_en, boolean fallo_generacion) {}
    private record ConteoDocente(UUID id, long creados, long publicados, long enPreparacion) {}

    public Resumen resumen() {
        // El listado incluye docentes con asignación que todavía no empezaron un juego.
        // La consulta no pasa por matrículas, destinatarios, partidas ni resultados.
        List<ConteoDocente> conteos = jdbc.query(JUEGOS.formatted("") + """
                , docentes as (
                    select docente_id from edu.asignaciones_docente
                    union select docente_id from juegos
                )
                select d.docente_id, count(j.id) as creados,
                    count(case when j.estado = 'publicado' then 1 end) as publicados,
                    count(case when j.estado in ('generando', 'listo_para_probar') then 1 end) as en_preparacion
                from docentes d left join juegos j on j.docente_id = d.docente_id
                group by d.docente_id
                """, (fila, indice) -> new ConteoDocente(fila.getObject("docente_id", UUID.class),
                fila.getLong("creados"), fila.getLong("publicados"), fila.getLong("en_preparacion")));

        Totales totales = new Totales(conteos.stream().mapToLong(ConteoDocente::creados).sum(),
                conteos.stream().mapToLong(ConteoDocente::publicados).sum(),
                conteos.stream().mapToLong(ConteoDocente::enPreparacion).sum());
        List<Docente> docentes = conteos.stream()
                .map(conteo -> new Docente(conteo.id(), django.nombreDocenteHistorico(conteo.id()), conteo.creados()))
                .sorted(Comparator.comparing(Docente::nombre, String.CASE_INSENSITIVE_ORDER).thenComparing(Docente::id))
                .toList();
        return new Resumen(totales, docentes);
    }

    public List<Juego> juegosDe(UUID docente) {
        record Fila(UUID id, String titulo, UUID curso, String seccion, Integer anio, String estado,
                    Instant creadoEn, boolean fallo) {}
        List<Fila> juegos = jdbc.query(JUEGOS.formatted("where s.docente_id = ?") + """
                select j.id, j.tema, j.curso_id, sec.nombre as seccion, sec.anio_escolar,
                    j.estado, j.fecha, j.fallo_generacion, g.paquete
                from juegos j
                join edu.generaciones g on g.id = j.visible_id
                left join edu.secciones sec on sec.id = j.seccion_id
                order by j.fecha desc, j.id
                """, (fila, indice) -> new Fila(fila.getObject("id", UUID.class),
                titulo(fila.getString("paquete"), fila.getString("tema")), fila.getObject("curso_id", UUID.class),
                fila.getString("seccion"), fila.getObject("anio_escolar", Integer.class), fila.getString("estado"),
                fila.getTimestamp("fecha").toInstant(), fila.getBoolean("fallo_generacion")), docente);

        // El catálogo puede renombrar un curso. Se consulta una vez por curso y
        // fuera de la lectura de base, para no retener su conexión durante la llamada.
        Map<UUID, String> cursos = new HashMap<>();
        return juegos.stream().map(juego -> new Juego(juego.id(), juego.titulo(),
                cursos.computeIfAbsent(juego.curso(), this::nombreCurso), juego.seccion(), juego.anio(), juego.estado(),
                juego.creadoEn(), juego.fallo())).toList();
    }

    private String nombreCurso(UUID curso) {
        try {
            return django.nombreCurso(curso);
        } catch (IllegalArgumentException ex) {
            return "Curso no disponible";
        }
    }

    private String titulo(String paquete, String tema) {
        // Para una generación en curso o un paquete antiguo, el tema sigue identificando el juego.
        if (paquete != null) {
            try {
                JsonNode contenido = json.readTree(paquete);
                JsonNode titulo = contenido == null ? null : contenido.get("titulo");
                if (titulo != null && titulo.isTextual() && !titulo.asText().isBlank()) return titulo.asText();
            } catch (JsonProcessingException ex) {
                // Un paquete ilegible no impide consultar los demás juegos.
            }
        }
        return tema;
    }
}
