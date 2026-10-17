
package pe.kusi.edu.repository;

import pe.kusi.edu.model.Generacion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GeneracionRepository extends JpaRepository<Generacion, UUID> {

    List<Generacion> findAllBySolicitudIdOrderByCreadoEnDesc(UUID solicitudId);

    Optional<Generacion> findByIdAndSolicitudId(UUID id, UUID solicitudId);
}
