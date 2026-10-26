
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

    // La sección se resuelve en el servidor a partir de vínculos vigentes. No se
    // acepta una lista de secciones enviada por la app ni una generación ajena.
    @Query("select g from Generacion g where g.estado = 'lista' and exists ("
            + "select s.id from SolicitudPropuesta s where s.id = g.solicitudId and exists ("
            + "select v.id from VinculoEstudiante v where v.estudianteId = :estudiante "
            + "and v.seccion.id = s.seccionId and v.anioEscolar = v.seccion.anioEscolar)) "
            + "order by g.creadoEn desc, g.id desc")
    List<Generacion> juegosDelEstudiante(@Param("estudiante") UUID estudiante, org.springframework.data.domain.Pageable pagina);

    // Transición atómica: solo un proceso puede pasar una generación de "pendiente"
    // a "generando". Si dos docentes pulsan «procesar» a la vez, uno recibe 0 filas.
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Generacion g set g.estado = 'generando', g.ultimoError = null, g.actualizadoEn = :ahora "
            + "where g.id = :id and g.estado = 'pendiente'")
    int tomarParaProcesar(@Param("id") UUID id, @Param("ahora") Instant ahora);
}
