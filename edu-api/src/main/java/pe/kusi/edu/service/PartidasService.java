package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// HU48/HU49: eventos inmutables. La clave (partida, orden) permite reenviar una
// respuesta perdida sin contar dos ayudas ni completar dos veces el mismo nivel.
@Service
public class PartidasService {
    private static final List<String> TIPOS = List.of("listo", "inicio", "accion", "ayuda", "reto_completado", "fin", "fallo");
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public PartidasService(JdbcTemplate jdbc, ObjectMapper json) { this.jdbc = jdbc; this.json = json; }

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
        comprobarPropietario(usuario, partida);
        boolean duplicado = false;
        try {
            jdbc.update("insert into edu.avisos_partida(partida_id, orden, tipo, nivel, ayuda, contenido) values (?, ?, ?, ?, ?, ?)",
                    partida, aviso.path("orden").asInt(), aviso.path("tipo").asText(),
                    aviso.has("nivel") ? aviso.path("nivel").asInt() : null,
                    aviso.has("ayuda") ? aviso.path("ayuda").asInt() : null, aviso.toString());
        } catch (DuplicateKeyException existente) {
            String guardado = jdbc.queryForObject("select contenido from edu.avisos_partida where partida_id = ? and orden = ?", String.class,
                    partida, aviso.path("orden").asInt());
            try {
                if (!json.readTree(guardado).equals(aviso)) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ese orden ya pertenece a otro aviso.");
            } catch (com.fasterxml.jackson.core.JsonProcessingException error) { throw new IllegalStateException("No se pudo leer el aviso guardado."); }
            duplicado = true;
        }
        return Map.of("guardado", true, "duplicado", duplicado, "resumen", resumen(usuario, partida));
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
                "niveles_completados", niveles, "termino", finales > 0);
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
        if ((aviso.has("nivel") || tipo.equals("ayuda") || tipo.equals("reto_completado")) && !entero(aviso.path("nivel"), 1, 5)) {
            throw new IllegalArgumentException("El nivel del aviso no es válido.");
        }
        if ((aviso.has("ayuda") || tipo.equals("ayuda")) && !entero(aviso.path("ayuda"), 1, 2)) throw new IllegalArgumentException("La ayuda del aviso no es válida.");
    }

    private static boolean entero(JsonNode valor, int minimo, int maximo) {
        return valor.isIntegralNumber() && valor.canConvertToInt() && valor.intValue() >= minimo && valor.intValue() <= maximo;
    }
}
