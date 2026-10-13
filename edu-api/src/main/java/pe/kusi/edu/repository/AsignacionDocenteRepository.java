package pe.kusi.edu.repository;
import pe.kusi.edu.model.AsignacionDocente; import java.util.*; import org.springframework.data.jpa.repository.JpaRepository;
public interface AsignacionDocenteRepository extends JpaRepository<AsignacionDocente, UUID> { boolean existsByDocenteIdAndCursoIdAndSeccion_IdAndAnioEscolar(UUID docenteId, UUID cursoId, UUID seccionId, int anioEscolar); List<AsignacionDocente> findAllByDocenteId(UUID docenteId); boolean existsByDocenteIdAndSeccion_IdAndAnioEscolar(UUID docenteId, UUID seccionId, int anioEscolar); }
