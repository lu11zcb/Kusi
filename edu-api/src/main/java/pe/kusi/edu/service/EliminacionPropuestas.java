package pe.kusi.edu.service;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

// El docente elimina una propuesta suya: la solicitud, todas sus versiones, sus juegos y
// las etapas de cada juego. No se puede deshacer, por eso el panel pide confirmación.
// Se borra en orden (etapas, juegos, versiones y solicitud) para respetar las claves
// foráneas, y todo en una sola transacción: o se borra completa o no se borra nada.
@Service
public class EliminacionPropuestas {
    private final PropuestasService propuestas;
    private final JdbcTemplate jdbc;

    public EliminacionPropuestas(PropuestasService propuestas, JdbcTemplate jdbc) {
        this.propuestas = propuestas;
        this.jdbc = jdbc;
    }

    @Transactional
    public void eliminar(UUID docenteId, UUID solicitud) {
        // Comprueba que la propuesta exista y sea del docente (si no, responde 404).
        propuestas.consultar(docenteId, solicitud);
        String estado = jdbc.queryForObject("select estado from edu.solicitudes_propuesta where id = ?", String.class, solicitud);
        if ("generando".equals(estado)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Espera a que la IA termine la propuesta antes de eliminarla.");
        }
        Integer enCurso = jdbc.queryForObject("select count(*) from edu.generaciones where solicitud_id = ? "
                + "and estado in ('generando', 'comprobando', 'correccion')", Integer.class, solicitud);
        if (enCurso != null && enCurso > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Espera a que termine el juego que se está generando antes de eliminar la propuesta.");
        }
        jdbc.update("delete from edu.etapas_generacion where generacion_id in (select id from edu.generaciones where solicitud_id = ?)", solicitud);
        jdbc.update("delete from edu.generaciones where solicitud_id = ?", solicitud);
        jdbc.update("delete from edu.propuestas where solicitud_id = ?", solicitud);
        jdbc.update("delete from edu.solicitudes_propuesta where id = ?", solicitud);
    }
}
