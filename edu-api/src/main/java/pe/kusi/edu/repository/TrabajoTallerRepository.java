package pe.kusi.edu.repository;

import pe.kusi.edu.model.TrabajoTaller;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Acceso a los trabajos pendientes del buzón del taller.
 */
@Repository
public interface TrabajoTallerRepository extends JpaRepository<TrabajoTaller, UUID> {

    /**
     * Comprueba si una generación ya tiene un trabajo registrado.
     */
    boolean existsByGeneracionId(UUID generacionId);

    // El procesador actual y el trabajador del taller comparten la misma tarea.
    // Bloquear su fila impide que ambos la reclamen al mismo tiempo.
    @Query(value = "select * from edu.trabajos_taller where generacion_id = :generacion "
            + "order by creado_en asc, id asc limit 1 for update", nativeQuery = true)
    Optional<TrabajoTaller> bloquearTrabajo(@Param("generacion") UUID generacion);

    /**
     * Reclama el trabajo pendiente más antiguo.
     * SKIP LOCKED evita que dos trabajadores recojan el mismo trabajo.
     */
    @Query(value = """
        SELECT *
        FROM edu.trabajos_taller
        WHERE estado = 'pendiente'
        ORDER BY creado_en ASC, id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<TrabajoTaller> tomarSiguientePendiente();
}
