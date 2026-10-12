package pe.kusi.edu.repository;
import pe.kusi.edu.model.Seccion; import java.util.UUID; import org.springframework.data.jpa.repository.JpaRepository;
public interface SeccionRepository extends JpaRepository<Seccion, UUID> { boolean existsByNombreClaveAndAnioEscolar(String nombreClave, int anioEscolar); }
