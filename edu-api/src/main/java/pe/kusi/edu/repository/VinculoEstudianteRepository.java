package pe.kusi.edu.repository;
import pe.kusi.edu.model.VinculoEstudiante; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface VinculoEstudianteRepository extends JpaRepository<VinculoEstudiante, UUID> { boolean existsByEstudianteIdAndSeccion_IdAndAnioEscolar(UUID estudianteId, UUID seccionId, int anioEscolar); List<VinculoEstudiante> findAllByEstudianteId(UUID estudianteId); }
