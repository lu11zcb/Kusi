package pe.kusi.edu.repository;

import pe.kusi.edu.model.TrabajoTaller;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
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

    /**
     * Reclama el trabajo pendiente más antiguo.
     * SKIP LOCKED evita que dos trabajadores recojan el mismo trabajo.
     */
    @Query(value = """
        SELECT *
        FROM trabajos_taller
        WHERE estado = 'pendiente'
        ORDER BY creado_en ASC, id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<TrabajoTaller> tomarSiguientePendiente();
}