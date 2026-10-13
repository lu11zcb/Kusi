package pe.kusi.edu.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.kusi.edu.model.SolicitudPropuesta;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SolicitudPropuestaRepository extends JpaRepository<SolicitudPropuesta, UUID> {
    List<SolicitudPropuesta> findAllByDocenteIdOrderByCreadoEnDesc(UUID docenteId);

    // Serializa aprobar/rechazar/modificar de una misma solicitud.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from SolicitudPropuesta s where s.id=:id")
    Optional<SolicitudPropuesta> bloquear(@Param("id") UUID id);

    // HU22/HU24: solo una nueva versión con IA a la vez por solicitud.
    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query("update SolicitudPropuesta s set s.estado='generando', s.intentos=s.intentos+1, s.ultimoError=null, s.actualizadoEn=:ahora where s.id=:id and s.estado='generada'")
    int iniciarNuevaVersion(@Param("id") UUID id, @Param("ahora") Instant ahora);

    // Transición atómica: solo un proceso puede pasar una solicitud a "generando".
    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query("update SolicitudPropuesta s set s.estado='generando', s.intentos=s.intentos+1, s.ultimoError=null, s.actualizadoEn=:ahora where s.id=:id and s.estado in ('pendiente','fallida')")
    int iniciarGeneracion(@Param("id") UUID id, @Param("ahora") Instant ahora);

    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query("update SolicitudPropuesta s set s.estado=:estado, s.ultimoError=:error, s.actualizadoEn=:ahora where s.id=:id and s.estado='generando'")
    int terminarGeneracion(@Param("id") UUID id, @Param("estado") String estado, @Param("error") String error, @Param("ahora") Instant ahora);
}
