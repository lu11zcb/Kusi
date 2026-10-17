
package pe.kusi.edu.repository;

import pe.kusi.edu.model.EtapaGeneracion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface EtapaGeneracionRepository extends JpaRepository<EtapaGeneracion, UUID> {

    List<EtapaGeneracion> findAllByGeneracionIdOrderByCreadoEnAsc(UUID generacionId);
}

