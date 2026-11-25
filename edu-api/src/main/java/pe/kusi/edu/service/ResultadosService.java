package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.Duration;
import java.time.Instant;
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
    static final String ALCANCE = " from edu.solicitudes_propuesta s join edu.secciones sec on sec.id = s.seccion_id "
            + "where s.docente_id = ? and exists (select 1 from edu.asignaciones_docente a where a.docente_id = ? "
            + "and a.curso_id = s.curso_id and a.seccion_id = s.seccion_id and a.anio_escolar = sec.anio_escolar) "
            + "and exists (select 1 from edu.generaciones g where g.solicitud_id = s.id and g.publicada = true) ";

    public List<Map<String, Object>> actividades(UUID docente) {
        // curso_id: el panel muestra el ícono y el nombre del curso, como en «Mis juegos».
        return jdbc.query("select s.id, " + TituloJuego.SQL + ", sec.nombre, s.retirada_en, s.curso_id " + ALCANCE + "order by s.creado_en desc, s.id",
                (fila, indice) -> Map.<String, Object>of("id", fila.getObject(1, UUID.class), "titulo", fila.getString(2), "seccion", fila.getString(3),
                        "retirada", fila.getTimestamp(4) != null, "curso_id", fila.getObject(5, UUID.class)), docente, docente);
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
            String estado = estadoDe(jugadas);
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

    // Un estudiante es «de este docente» si está vinculado este año a una sección donde el
    // docente tiene una asignación vigente. Conocer su identificador no concede acceso.
    private static final String ESTUDIANTE_DEL_DOCENTE = "select 1 from edu.vinculos_estudiante v "
            + "join edu.secciones sec on sec.id = v.seccion_id where v.estudiante_id = ? and v.retirado_en is null "
            + "and v.anio_escolar = sec.anio_escolar and exists (select 1 from edu.asignaciones_docente a "
            + "where a.docente_id = ? and a.seccion_id = v.seccion_id and a.anio_escolar = sec.anio_escolar)";

    // La ficha de un estudiante para su docente: cada juego que le envió, si lo jugó, cómo le
    // fue (errores, ayudas y puntos) y cuándo jugó por última vez. Los nombres los pone el
    // panel con su propia lista; aquí solo van identificadores y números.
    public Map<String, Object> fichaEstudiante(UUID docente, UUID estudiante) {
        if (jdbc.queryForList(ESTUDIANTE_DEL_DOCENTE, Integer.class, estudiante, docente).isEmpty())
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró este estudiante en tus secciones.");
        List<Map<String, Object>> juegos = new ArrayList<>();
        int puntosTotales = 0, completadas = 0, errores = 0, ayudas = 0;
        for (Map<String, Object> actividad : actividades(docente)) {
            UUID id = (UUID) actividad.get("id");
            if (!destinatarios(docente, id).contains(estudiante)) continue;
            List<Map<String, Object>> jugadas = partidas(id, estudiante).getOrDefault(estudiante, List.of());
            String estado = estadoDe(jugadas);
            int erroresJuego = jugadas.stream().mapToInt(ResultadosService::errores).sum();
            int ayudasJuego = jugadas.stream().mapToInt(p -> (Integer) p.get("ayudas_usadas")).sum();
            Integer puntos = jdbc.queryForObject("select coalesce(sum(puntos), 0) from edu.puntos_reto where estudiante_id = ? and actividad_id = ?",
                    Integer.class, estudiante, id);
            List<java.sql.Timestamp> ultima = jdbc.queryForList("select actualizado_en from edu.avances_actividad where estudiante_id = ? and actividad_id = ?",
                    java.sql.Timestamp.class, estudiante, id);
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("id", id);
            fila.put("titulo", actividad.get("titulo"));
            fila.put("seccion", actividad.get("seccion"));
            // Para el ícono y el nombre del curso, como en «Mis juegos».
            fila.put("curso_id", actividad.get("curso_id"));
            fila.put("estado", estado);
            fila.put("partidas", jugadas.size());
            fila.put("errores", erroresJuego);
            fila.put("ayudas_usadas", ayudasJuego);
            fila.put("puntos", puntos == null ? 0 : puntos);
            fila.put("ultima_vez", ultima.isEmpty() || ultima.get(0) == null ? null : ultima.get(0).toInstant());
            juegos.add(fila);
            puntosTotales += puntos == null ? 0 : puntos;
            if (estado.equals("completada")) completadas++;
            errores += erroresJuego;
            ayudas += ayudasJuego;
        }
        Map<String, Object> totales = new LinkedHashMap<>();
        totales.put("juegos", juegos.size());
        totales.put("completados", completadas);
        totales.put("puntos", puntosTotales);
        totales.put("errores", errores);
        totales.put("ayudas_usadas", ayudas);
        return Map.of("estudiante", estudiante, "totales", totales, "juegos", juegos);
    }

    // Quién va mejor en cada sección del docente: los puntos que ganó cada estudiante en los
    // juegos de este docente y cuántos terminó. Pedir ayuda no resta puntos (HU67).
    public List<Map<String, Object>> ranking(UUID docente) {
        Map<UUID, Map<String, Object>> secciones = new LinkedHashMap<>();
        jdbc.query("select v.seccion_id, sec.nombre, sec.anio_escolar, v.estudiante_id, "
                + "coalesce((select sum(pr.puntos) from edu.puntos_reto pr join edu.solicitudes_propuesta s on s.id = pr.actividad_id "
                + "where pr.estudiante_id = v.estudiante_id and s.docente_id = ? and s.seccion_id = v.seccion_id), 0), "
                + "(select count(*) from edu.avances_actividad av join edu.solicitudes_propuesta s on s.id = av.actividad_id "
                + "where av.estudiante_id = v.estudiante_id and s.docente_id = ? and s.seccion_id = v.seccion_id and av.completada = true), "
                + "(select max(pr.creado_en) from edu.puntos_reto pr join edu.solicitudes_propuesta s on s.id = pr.actividad_id "
                + "where pr.estudiante_id = v.estudiante_id and s.docente_id = ? and s.seccion_id = v.seccion_id) "
                + "from edu.vinculos_estudiante v join edu.secciones sec on sec.id = v.seccion_id "
                + "where v.retirado_en is null and v.anio_escolar = sec.anio_escolar and exists (select 1 from edu.asignaciones_docente a "
                + "where a.docente_id = ? and a.seccion_id = v.seccion_id and a.anio_escolar = sec.anio_escolar) "
                + "order by sec.anio_escolar desc, sec.grado, sec.nombre, v.estudiante_id", fila -> {
            UUID seccion = fila.getObject(1, UUID.class);
            Map<String, Object> grupo = secciones.computeIfAbsent(seccion, clave -> {
                Map<String, Object> nuevo = new LinkedHashMap<>();
                nuevo.put("id", clave);
                try { nuevo.put("nombre", fila.getString(2)); nuevo.put("anio_escolar", fila.getInt(3)); }
                catch (java.sql.SQLException error) { throw new IllegalStateException(error); }
                nuevo.put("estudiantes", new ArrayList<Map<String, Object>>());
                return nuevo;
            });
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> estudiantes = (List<Map<String, Object>>) grupo.get("estudiantes");
            // puntos_hasta: cuándo ganó su último punto, es decir, cuándo llegó a sus puntos. Con
            // los mismos puntos va primero el que llegó antes (null: todavía sin puntos).
            Map<String, Object> puesto = new LinkedHashMap<>();
            puesto.put("id", fila.getObject(4, UUID.class));
            puesto.put("puntos", fila.getInt(5));
            puesto.put("completados", fila.getInt(6));
            puesto.put("puntos_hasta", fila.getTimestamp(7) == null ? null : fila.getTimestamp(7).toInstant());
            estudiantes.add(puesto);
        }, docente, docente, docente, docente);
        for (Map<String, Object> grupo : secciones.values()) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> estudiantes = (List<Map<String, Object>>) grupo.get("estudiantes");
            // Más puntos primero; con los mismos puntos, el que llegó antes.
            estudiantes.sort(Comparator.comparing((Map<String, Object> e) -> (Integer) e.get("puntos")).reversed()
                    .thenComparing(e -> (Instant) e.get("puntos_hasta"), Comparator.nullsLast(Comparator.naturalOrder())));
        }
        return List.copyOf(secciones.values());
    }

    private static String estadoDe(List<Map<String, Object>> jugadas) {
        return jugadas.stream().anyMatch(p -> p.get("estado").equals("completada")) ? "completada"
                : jugadas.stream().anyMatch(p -> p.get("estado").equals("en_curso")) ? "en_curso" : "sin_iniciar";
    }

    // Respuestas incorrectas de una partida (las comprobadas como «correcto: false»).
    @SuppressWarnings("unchecked")
    private static int errores(Map<String, Object> partida) {
        int total = 0;
        for (Object reto : (List<Object>) partida.getOrDefault("retos", List.of())) {
            for (Object respuesta : (List<Object>) ((Map<String, Object>) reto).getOrDefault("respuestas", List.of())) {
                if (Boolean.FALSE.equals(((Map<String, Object>) respuesta).get("correcto"))) total++;
            }
        }
        return total;
    }

    private static final Duration VENTANA_ACTIVIDAD = Duration.ofSeconds(90);

    public List<Map<String, Object>> enVivo(UUID docente, UUID actividad) {
        UUID seccion = seccion(docente, actividad);
        Map<String, Integer> nivelesPorJuego = new HashMap<>();
        jdbc.query("select id, paquete from edu.generaciones where solicitud_id = ? and publicada = true", fila -> {
            String paquete = fila.getString(2);
            nivelesPorJuego.put(fila.getString(1), paquete == null ? 0 : leer(paquete).path("retos").size());
        }, actividad);
        nivelesPorJuego.keySet().forEach(juego -> actividades.materializar(UUID.fromString(juego)));

        // El envío exacto y el vínculo vigente determinan quién aparece en el seguimiento.
        Map<UUID, Set<String>> envios = new HashMap<>();
        jdbc.query("select d.estudiante_id, g.id from edu.generaciones g join edu.destinatarios_actividad d on d.generacion_id = g.id "
                + "where g.solicitud_id = ? and g.publicada = true and exists (select 1 from edu.vinculos_estudiante v "
                + "join edu.secciones sec on sec.id = v.seccion_id where v.seccion_id = ? and v.anio_escolar = sec.anio_escolar "
                + "and v.retirado_en is null and v.estudiante_id = d.estudiante_id)", fila -> {
            envios.computeIfAbsent(fila.getObject(1, UUID.class), id -> new HashSet<>()).add(fila.getString(2));
        }, actividad, seccion);
        if (envios.isEmpty()) return List.of();

        Map<UUID, List<SeguimientoPartida>> jugadas = jugadasEnVivo(actividad, envios, nivelesPorJuego);
        Map<UUID, Integer> puntos = new HashMap<>();
        jdbc.query("select r.estudiante_id, sum(r.puntos) from edu.puntos_reto r join edu.partidas p on p.id = r.partida_id "
                + "where r.actividad_id = ? and p.prueba_docente = false and p.usuario_id = r.estudiante_id group by r.estudiante_id",
                fila -> { puntos.put(fila.getObject(1, UUID.class), fila.getInt(2)); }, actividad);

        Instant ahora = Instant.now();
        List<Map<String, Object>> filas = new ArrayList<>();
        envios.keySet().forEach(estudiante -> {
            List<SeguimientoPartida> partidas = jugadas.getOrDefault(estudiante, List.of());
            SeguimientoPartida actual = partidas.stream().max(Comparator.comparing(partida -> partida.ultimoAviso)).orElse(null);
            Map<String, Object> cuenta = django.validarCuenta(estudiante, "estudiante");
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("id", estudiante);
            fila.put("nombre", cuenta.getOrDefault("nombre", "Estudiante"));
            fila.put("estado", actual == null ? "sin_iniciar" : actual.estado(ahora));
            fila.put("pausa_guardada", actual != null && actual.pausaGuardada());
            int nivel = actual == null ? 0 : actual.nivelActual();
            fila.put("nivel", nivel == 0 ? null : nivel);
            fila.put("errores_nivel", nivel == 0 ? 0 : actual.erroresPorNivel.getOrDefault(nivel, 0));
            fila.put("errores_total", partidas.stream().mapToInt(partida -> partida.errores).sum());
            fila.put("ayudas_usadas", partidas.stream().mapToInt(partida -> partida.ayudas).sum());
            fila.put("incidencias_tecnicas", partidas.stream().mapToInt(partida -> partida.incidencias).sum());
            fila.put("puntos", puntos.getOrDefault(estudiante, 0));
            fila.put("segundos_desde_ultimo_aviso", actual == null ? null : Math.max(0, Duration.between(actual.ultimoAviso, ahora).getSeconds()));
            filas.add(fila);
        });
        filas.sort(Comparator.comparing(fila -> fila.get("nombre").toString(), String.CASE_INSENSITIVE_ORDER));
        return filas;
    }

    private Map<UUID, List<SeguimientoPartida>> jugadasEnVivo(UUID actividad, Map<UUID, Set<String>> envios,
                                                            Map<String, Integer> nivelesPorJuego) {
        Map<UUID, List<SeguimientoPartida>> resultado = new HashMap<>();
        Map<String, Optional<SeguimientoPartida>> porPartida = new LinkedHashMap<>();
        String estudiantes = String.join(", ", Collections.nCopies(envios.size(), "?"));
        List<Object> parametros = new ArrayList<>();
        parametros.add(actividad);
        parametros.addAll(envios.keySet());
        jdbc.query("select p.id, p.usuario_id, a.orden, a.tipo, a.nivel, a.contenido, a.creado_en, av.ultimo_orden, av.nivel "
                + "from edu.partidas p join edu.avisos_partida a on a.partida_id = p.id left join edu.avances_actividad av "
                + "on av.partida_id = p.id and av.estudiante_id = p.usuario_id and av.actividad_id = ? and av.completada = false "
                + "where p.prueba_docente = false and p.usuario_id in (" + estudiantes + ") order by p.creado_en desc, p.id, a.orden", fila -> {
            String id = fila.getString(1);
            UUID estudiante = fila.getObject(2, UUID.class);
            String contenido = fila.getString(6);
            if (!porPartida.containsKey(id)) {
                // El primer aviso fija el juego. Los avisos antiguos sin esa relación
                // no sirven para identificar en qué actividad estaba jugando el estudiante.
                String juego = leer(contenido).path("juego_id").asText();
                if (envios.get(estudiante).contains(juego)) {
                    SeguimientoPartida partida = new SeguimientoPartida(nivelesPorJuego.getOrDefault(juego, 0), fila.getInt(8), fila.getInt(9));
                    porPartida.put(id, Optional.of(partida));
                    resultado.computeIfAbsent(estudiante, clave -> new ArrayList<>()).add(partida);
                } else {
                    porPartida.put(id, Optional.empty());
                }
            }
            SeguimientoPartida partida = porPartida.get(id).orElse(null);
            if (partida == null) return;
            String tipo = fila.getString(4);
            JsonNode correcto = tipo.equals("accion") ? leer(contenido).path("correcto") : null;
            partida.registrar(fila.getInt(3), tipo, fila.getInt(5), correcto != null && correcto.isBoolean() && !correcto.booleanValue(),
                    fila.getTimestamp(7).toInstant());
        }, parametros.toArray());
        return resultado;
    }

    private static final class SeguimientoPartida {
        private final int niveles, ordenPausa, nivelPausa;
        private final Map<Integer, Integer> erroresPorNivel = new HashMap<>();
        private Instant ultimoAviso = Instant.MIN;
        private int orden, nivel, errores, ayudas, incidencias;
        private boolean completada, fallo;

        private SeguimientoPartida(int niveles, int ordenPausa, int nivelPausa) {
            this.niveles = niveles;
            this.ordenPausa = ordenPausa;
            this.nivelPausa = nivelPausa;
        }

        private void registrar(int orden, String tipo, int nivel, boolean error, Instant recibido) {
            this.orden = orden;
            // La recepción mide presencia. El orden del juego mide avance, incluso
            // si una acción de un nivel anterior llega tarde por la red.
            if (recibido.isAfter(ultimoAviso)) ultimoAviso = recibido;
            switch (tipo) {
                case "incidencia" -> incidencias++;
                case "fallo" -> { fallo = true; incidencias++; }
                case "fin" -> completada = true;
                case "ayuda" -> ayudas++;
                case "accion" -> {
                    if (error) {
                        errores++;
                        erroresPorNivel.merge(nivel, 1, Integer::sum);
                    }
                }
            }
            if (!tipo.equals("incidencia") && !tipo.equals("fallo") && nivel > 0) {
                // El reproductor no siempre emite un aviso al abrir el nivel siguiente.
                this.nivel = tipo.equals("reto_completado") && nivel < niveles ? nivel + 1 : nivel;
            }
        }

        private boolean pausaGuardada() { return !completada && !fallo && ordenPausa > 0 && orden <= ordenPausa; }

        private int nivelActual() { return pausaGuardada() ? nivelPausa : nivel; }

        private String estado(Instant ahora) {
            if (completada) return "completada";
            if (pausaGuardada() || fallo || ultimoAviso.isBefore(ahora.minus(VENTANA_ACTIVIDAD))) return "en_pausa";
            return "jugando";
        }
    }

    private JsonNode leer(String contenido) {
        try { return json.readTree(contenido); }
        catch (JsonProcessingException error) { throw new IllegalStateException("No se pudo leer el contenido guardado.", error); }
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
            JsonNode aviso = leer(fila.getString(3));
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
