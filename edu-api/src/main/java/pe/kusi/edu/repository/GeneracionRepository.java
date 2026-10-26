
package pe.kusi.edu.repository;

import pe.kusi.edu.model.Generacion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GeneracionRepository extends JpaRepository<Generacion, UUID> {

    List<Generacion> findAllBySolicitudIdOrderByCreadoEnDesc(UUID solicitudId);

    Optional<Generacion> findByIdAndSolicitudId(UUID id, UUID solicitudId);

    // Transición atómica: solo un proceso puede pasar una generación de "pendiente"
    // a "generando". Si dos docentes pulsan «procesar» a la vez, uno recibe 0 filas.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Generacion g set g.estado = 'generando', g.ultimoError = null, g.actualizadoEn = :ahora "
            + "where g.id = :id and g.estado = 'pendiente'")
    int tomarParaProcesar(@Param("id") UUID id, @Param("ahora") Instant ahora);
}
