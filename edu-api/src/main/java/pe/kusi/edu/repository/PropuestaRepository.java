package pe.kusi.edu.repository;
import pe.kusi.edu.model.Propuesta; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface PropuestaRepository extends JpaRepository<Propuesta, UUID> {
    Optional<Propuesta> findFirstBySolicitudIdOrderByVersionDesc(UUID solicitudId);
    Optional<Propuesta> findBySolicitudIdAndVersion(UUID solicitudId, int version);
    List<Propuesta> findAllBySolicitudIdOrderByVersionDesc(UUID solicitudId);
}
