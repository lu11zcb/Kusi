package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// HU48/HU49: eventos inmutables. La clave (partida, orden) permite reenviar una
// respuesta perdida sin contar dos ayudas ni completar dos veces el mismo nivel.
@Service
public class PartidasService {
    private static final List<String> TIPOS = List.of("listo", "inicio", "accion", "ayuda", "reto_completado", "fin", "fallo", "incidencia");
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final TransactionTemplate transaccion;
    private final ActividadesEstudianteService actividades;
    private final MonedasEstudianteService monedas;

    public PartidasService(JdbcTemplate jdbc, ObjectMapper json, TransactionTemplate transaccion,
                           ActividadesEstudianteService actividades, MonedasEstudianteService monedas) {
        this.jdbc = jdbc; this.json = json; this.transaccion = transaccion; this.actividades = actividades;
        this.monedas = monedas;
    }

    public Map<String, Object> guardar(UUID usuario, boolean pruebaDocente, JsonNode aviso) {
        validar(aviso);
        String partida = aviso.path("partida").asText();
        // Cada sentencia es una transacción corta. Un conflicto de unicidad se
        // resuelve después del rollback de esa sentencia, también con PostgreSQL.
        // JDBC no hereda el default_schema de Hibernate: se nombra edu siempre.
        try {
            jdbc.update("insert into edu.partidas(id, usuario_id, prueba_docente) values (?, ?, ?)", partida, usuario, pruebaDocente);
        } catch (DuplicateKeyException existente) {
            // El propietario de una partida ya creada es inmutable.
        }
        return transaccion.execute(estado -> {
            // El bloqueo protege también el vínculo con el juego frente a dos
            // primeros avisos simultáneos. No se cambia de juego a mitad de partida.
            List<UUID> propietarios = jdbc.query("select usuario_id from edu.partidas where id = ? for update",
                    (fila, indice) -> fila.getObject(1, UUID.class), partida);
            if (propietarios.isEmpty() || !usuario.equals(propietarios.get(0)))
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esta partida de tu cuenta.");
            Boolean pruebaGuardada = jdbc.queryForObject("select prueba_docente from edu.partidas where id = ?", Boolean.class, partida);
            if (!Boolean.valueOf(pruebaDocente).equals(pruebaGuardada))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "El tipo de esta partida no puede cambiar.");
            JsonNode original = conJuego(usuario, pruebaDocente, partida, aviso);
            List<String> existentes = jdbc.query("select contenido from edu.avisos_partida where partida_id = ? and orden = ?",
                    (fila, indice) -> fila.getString(1), partida, aviso.path("orden").asInt());
            boolean duplicado = !existentes.isEmpty();
            if (duplicado) {
                if (!leer(existentes.get(0)).equals(original))
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese orden ya pertenece a otro aviso.");
            } else {
                jdbc.update("insert into edu.avisos_partida(partida_id, orden, tipo, nivel, ayuda, contenido) values (?, ?, ?, ?, ?, ?)",
                        partida, original.path("orden").asInt(), original.path("tipo").asText(),
                        original.has("nivel") ? original.path("nivel").asInt() : null,
                        original.has("ayuda") ? original.path("ayuda").asInt() : null, original.toString());
                actividades.registrarPuntos(usuario, pruebaDocente, original);
            }
            return Map.of("guardado", true, "duplicado", duplicado, "resumen", resumen(usuario, partida));
        });
    }

    private JsonNode conJuego(UUID usuario, boolean pruebaDocente, String partida, JsonNode aviso) {
        List<String> primeros = jdbc.query("select contenido from edu.avisos_partida where partida_id = ? order by orden fetch first 1 rows only",
                (fila, indice) -> fila.getString(1), partida);
        String recibido = aviso.has("juego_id") ? UUID.fromString(aviso.path("juego_id").asText()).toString() : "";
        String guardado = primeros.isEmpty() ? recibido : leer(primeros.get(0)).path("juego_id").asText("");
        if (!recibido.isEmpty() && !recibido.equals(guardado))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta partida ya pertenece a otro juego o no tiene un juego asociado.");
        if (guardado.isEmpty()) return aviso;
        UUID juego;
        try { juego = UUID.fromString(guardado); }
        catch (IllegalArgumentException error) { throw new IllegalArgumentException("El juego del aviso no es válido."); }
        if (!pruebaDocente && !actividades.permitido(usuario, juego))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró este juego entre tus actividades.");
        String acceso = pruebaDocente ? "s.docente_id = ?" : "exists (select 1 from edu.destinatarios_actividad d where d.generacion_id = g.id and d.estudiante_id = ?)";
        Integer permitidos = jdbc.queryForObject("select count(*) from edu.generaciones g join edu.solicitudes_propuesta s on s.id = g.solicitud_id "
                + "where g.id = ? and g.publicada = true and g.estado = 'lista' and s.retirada_en is null and " + acceso, Integer.class, juego, usuario);
        if (permitidos == null || permitidos == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró este juego entre tus actividades.");
        com.fasterxml.jackson.databind.node.ObjectNode completo = aviso.deepCopy();
        completo.put("juego_id", juego.toString());
        return completo;
    }

    private JsonNode leer(String contenido) {
        try { return json.readTree(contenido); }
        catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException("No se pudo leer el aviso guardado."); }
    }

    public Map<String, Object> resumen(UUID usuario, String partida) {
        comprobarPropietario(usuario, partida);
        // Los niveles se cuentan una sola vez aunque un cliente envíe dos avisos
        // distintos de reto_completado. El orden de llegada no afecta al resumen.
        Integer ayudas = jdbc.queryForObject("select count(*) from edu.avisos_partida where partida_id = ? and tipo = 'ayuda'", Integer.class, partida);
        Integer niveles = jdbc.queryForObject("select count(distinct nivel) from edu.avisos_partida where partida_id = ? and tipo = 'reto_completado'", Integer.class, partida);
        Integer finales = jdbc.queryForObject("select count(*) from edu.avisos_partida where partida_id = ? and tipo in ('fin', 'fallo')", Integer.class, partida);
        Boolean docente = jdbc.queryForObject("select prueba_docente from edu.partidas where id = ?", Boolean.class, partida);
        return Map.of("partida", partida, "prueba_docente", Boolean.TRUE.equals(docente), "ayudas_usadas", ayudas,
                "niveles_completados", niveles, "termino", finales > 0,
                "puntos", Boolean.TRUE.equals(docente) ? 0 : actividades.puntosPartida(usuario, partida), "puntos_maximos", 20,
                "monedas_ganadas", Boolean.TRUE.equals(docente) ? 0 : monedas.ganadasEnPartida(usuario, partida));
    }

    private void comprobarPropietario(UUID usuario, String partida) {
        List<UUID> propietarios = jdbc.query("select usuario_id from edu.partidas where id = ?", (fila, indice) -> fila.getObject(1, UUID.class), partida);
        if (propietarios.isEmpty() || !usuario.equals(propietarios.get(0))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esta partida de tu cuenta.");
        }
    }

    private void validar(JsonNode aviso) {
        if (aviso == null || !aviso.isObject() || aviso.toString().length() > 8192
                || !aviso.path("partida").isTextual() || !aviso.path("partida").asText().matches("[A-Za-z0-9-]{1,120}")
                || !aviso.path("tipo").isTextual() || !TIPOS.contains(aviso.path("tipo").asText())
                || !entero(aviso.path("orden"), 1, 100000)) throw new IllegalArgumentException("El aviso de partida no es válido.");
        try { Instant.parse(aviso.path("momento").asText()); }
        catch (RuntimeException error) { throw new IllegalArgumentException("El aviso necesita una fecha válida."); }
        String tipo = aviso.path("tipo").asText();
        if (tipo.equals("incidencia") && (!aviso.path("detalle").isTextual() || aviso.path("detalle").asText().isBlank()
                || aviso.path("detalle").asText().length() > 500 || aviso.has("correcto") || aviso.has("respuesta")))
            throw new IllegalArgumentException("La incidencia necesita un detalle de hasta 500 caracteres y no es una respuesta.");
        if (aviso.has("reto") && !((aviso.path("reto").isTextual() && !aviso.path("reto").asText().isBlank() && aviso.path("reto").asText().length() <= 120)
                || entero(aviso.path("reto"), 1, 100000))) throw new IllegalArgumentException("El reto del aviso no es válido.");
        if (aviso.has("juego_id") && (!aviso.path("juego_id").isTextual()
                || !aviso.path("juego_id").asText().matches("[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}")))
            throw new IllegalArgumentException("El juego del aviso no es válido.");
        if ((aviso.has("nivel") || tipo.equals("ayuda") || tipo.equals("reto_completado")) && !entero(aviso.path("nivel"), 1, 5)) {
            throw new IllegalArgumentException("El nivel del aviso no es válido.");
        }
        if ((aviso.has("ayuda") || tipo.equals("ayuda")) && !entero(aviso.path("ayuda"), 1, 2)) throw new IllegalArgumentException("La ayuda del aviso no es válida.");
    }

    private static boolean entero(JsonNode valor, int minimo, int maximo) {
        return valor.isIntegralNumber() && valor.canConvertToInt() && valor.intValue() >= minimo && valor.intValue() <= maximo;
    }
}
