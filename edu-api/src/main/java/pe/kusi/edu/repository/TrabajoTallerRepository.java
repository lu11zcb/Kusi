package pe.kusi.edu.repository;

import pe.kusi.edu.model.TrabajoTaller;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
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

    Optional<TrabajoTaller> findFirstByGeneracionIdOrderByCreadoEnDesc(UUID generacionId);

    // El trabajador entrega un resultado o un fallo de un trabajo. Bloquear su fila evita
    // que el mismo trabajo se cierre dos veces o que se venza mientras se guarda.
    @Query(value = "select * from edu.trabajos_taller where id = :id for update", nativeQuery = true)
    Optional<TrabajoTaller> bloquearPorId(@Param("id") UUID id);

    /**
     * Los trabajos que llevan «en proceso» desde antes del límite: el trabajador se
     * cayó o se colgó. SKIP LOCKED no espera a un trabajo que otro está cerrando.
     */
    @Query(value = """
        SELECT *
        FROM edu.trabajos_taller
        WHERE estado = 'en_proceso' AND tomado_en < :limite AND tipo <> 'proponer'
        ORDER BY tomado_en ASC, id ASC
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    List<TrabajoTaller> bloquearVencidos(@Param("limite") Instant limite);

    /**
     * Las propuestas que nadie del taller tomó desde antes del límite (el taller está
     * apagado o ocupado): el docente no puede esperar, entra el respaldo. Las propuestas
     * en pausa ya tienen un trabajador y quedan fuera del respaldo hasta que se retomen.
     */
    @Query(value = """
        SELECT *
        FROM edu.trabajos_taller
        WHERE estado = 'pendiente' AND tipo = 'proponer' AND disponible_desde IS NULL AND creado_en < :limite
        ORDER BY creado_en ASC, id ASC
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    List<TrabajoTaller> bloquearPropuestasSinTomar(@Param("limite") Instant limite);

    /**
     * Las propuestas que el taller tomó y no entregó desde antes del límite. Se vencen
     * mucho antes que un juego: una propuesta tarda minutos, no media hora.
     */
    @Query(value = """
        SELECT *
        FROM edu.trabajos_taller
        WHERE estado = 'en_proceso' AND tipo = 'proponer' AND tomado_en < :limite
        ORDER BY tomado_en ASC, id ASC
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    List<TrabajoTaller> bloquearPropuestasVencidas(@Param("limite") Instant limite);

    Optional<TrabajoTaller> findFirstBySolicitudIdOrderByCreadoEnDesc(UUID solicitudId);

    /**
     * Reclama el trabajo pendiente más antiguo que ya esté disponible.
     * SKIP LOCKED evita que dos trabajadores recojan el mismo trabajo.
     */
    @Query(value = """
        SELECT *
        FROM edu.trabajos_taller
        WHERE estado = 'pendiente' AND (disponible_desde IS NULL OR disponible_desde <= :ahora)
        ORDER BY creado_en ASC, id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
        """, nativeQuery = true)
    Optional<TrabajoTaller> tomarSiguientePendiente(@Param("ahora") Instant ahora);
}
