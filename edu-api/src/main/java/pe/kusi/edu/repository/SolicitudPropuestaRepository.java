package pe.kusi.edu.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.kusi.edu.model.SolicitudPropuesta;
import java.time.Instant;
import java.util.UUID;

public interface SolicitudPropuestaRepository extends JpaRepository<SolicitudPropuesta, UUID> {
    // Transición atómica: solo un proceso puede pasar una solicitud a "generando".
    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query("update SolicitudPropuesta s set s.estado='generando', s.intentos=s.intentos+1, s.ultimoError=null, s.actualizadoEn=:ahora where s.id=:id and s.estado in ('pendiente','fallida')")
    int iniciarGeneracion(@Param("id") UUID id, @Param("ahora") Instant ahora);

    @Modifying(clearAutomatically=true, flushAutomatically=true)
    @Query("update SolicitudPropuesta s set s.estado=:estado, s.ultimoError=:error, s.actualizadoEn=:ahora where s.id=:id and s.estado='generando'")
    int terminarGeneracion(@Param("id") UUID id, @Param("estado") String estado, @Param("error") String error, @Param("ahora") Instant ahora);
}
