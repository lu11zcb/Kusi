package pe.kusi.edu.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class MonedasEstudianteService {
    private record Prenda(String id, String nombre, int precio) {}
    private record Premios(int terminadas, int puntosConvertidos) {}

    // Solo se enumeran prendas que se pueden comprar. Las de logros se obtienen fuera de la tienda.
    private static final List<Prenda> PRENDAS = List.of(
            new Prenda("chalina", "Chalina", 20), new Prenda("lentes", "Lentes", 20),
            new Prenda("sombrero", "Sombrero", 40), new Prenda("chullo", "Chullo", 40),
            new Prenda("poncho", "Poncho", 60), new Prenda("traje", "Traje", 60));

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaccion;

    public MonedasEstudianteService(JdbcTemplate jdbc, TransactionTemplate transaccion) {
        this.jdbc = jdbc;
        this.transaccion = transaccion;
    }

    public long saldo(UUID estudiante) {
        return jdbc.queryForObject("select coalesce(sum(cantidad), 0) from edu.movimientos_monedas where estudiante_id = ?",
                Long.class, estudiante);
    }

    public List<Map<String, Object>> tienda(UUID estudiante) {
        Set<String> compradas = new HashSet<>(jdbc.queryForList("select prenda_id from edu.movimientos_monedas "
                + "where estudiante_id = ? and prenda_id is not null", String.class, estudiante));
        return PRENDAS.stream().map(prenda -> Map.<String, Object>of("id", prenda.id(), "nombre", prenda.nombre(),
                "precio", prenda.precio(), "comprada", compradas.contains(prenda.id()))).toList();
    }

    public Map<String, Object> comprar(UUID estudiante, String id) {
        Prenda prenda = PRENDAS.stream().filter(disponible -> disponible.id().equals(id)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esta prenda en la tienda."));
        return transaccion.execute(estado -> {
            bloquearCuenta(estudiante);
            int compradas = jdbc.queryForObject("select count(*) from edu.movimientos_monedas where estudiante_id = ? and prenda_id = ?",
                    Integer.class, estudiante, prenda.id());
            if (compradas > 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya tienes esta prenda.");
            long saldoActual = saldo(estudiante);
            if (saldoActual < prenda.precio()) throw new ResponseStatusException(HttpStatus.CONFLICT, "Todavía no tienes suficientes monedas.");
            jdbc.update("insert into edu.movimientos_monedas(estudiante_id, prenda_id, cantidad) values (?, ?, ?)",
                    estudiante, prenda.id(), -prenda.precio());
            return Map.of("prenda_id", prenda.id(), "saldo", saldoActual - prenda.precio());
        });
    }

    /** Se llama al confirmar el fin, con la partida y la actividad ya bloqueadas. */
    void premiarFin(UUID estudiante, UUID actividad, String partida, int puntos) {
        bloquearCuenta(estudiante);
        Premios premios = jdbc.queryForObject("select count(*), coalesce(sum(puntos_convertidos), 0) "
                        + "from edu.movimientos_monedas where estudiante_id = ? and actividad_id = ?",
                (fila, indice) -> new Premios(fila.getInt(1), fila.getInt(2)), estudiante, actividad);
        int turno = premios.terminadas();
        if (turno > 3) return;
        // El mejor acumulado puede venir de varios intentos. Cada punto se convierte una sola vez.
        int nuevos = Math.max(0, puntos - premios.puntosConvertidos());
        int cantidad = nuevos + (turno == 0 ? 5 : 2);
        jdbc.update("insert into edu.movimientos_monedas(estudiante_id, actividad_id, partida_id, turno, puntos_convertidos, cantidad) "
                + "values (?, ?, ?, ?, ?, ?)", estudiante, actividad, partida, turno, nuevos, cantidad);
    }

    int ganadasEnPartida(UUID estudiante, String partida) {
        return jdbc.queryForObject("select coalesce(sum(cantidad), 0) from edu.movimientos_monedas "
                + "where estudiante_id = ? and partida_id = ?", Integer.class, estudiante, partida);
    }

    private void bloquearCuenta(UUID estudiante) {
        // Una compra debe comprobar el saldo y descontarlo bajo el mismo bloqueo,
        // incluso si otra solicitud acaba de crear la cuenta o de ganar monedas.
        jdbc.update("insert into edu.cuentas_monedas(estudiante_id) values (?) on conflict do nothing", estudiante);
        jdbc.query("select estudiante_id from edu.cuentas_monedas where estudiante_id = ? for update", fila -> {}, estudiante);
    }
}
