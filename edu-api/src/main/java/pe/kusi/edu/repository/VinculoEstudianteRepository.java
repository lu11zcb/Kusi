package pe.kusi.edu.repository;

import pe.kusi.edu.model.VinculoEstudiante;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VinculoEstudianteRepository extends JpaRepository<VinculoEstudiante, UUID> {
    boolean existsByEstudianteIdAndSeccion_IdAndAnioEscolar(UUID estudianteId, UUID seccionId, int anioEscolar);

    List<VinculoEstudiante> findAllByEstudianteId(UUID estudianteId);

    @Query("""
        select distinct v
        from VinculoEstudiante v
        where exists (
            select a.id
            from AsignacionDocente a
            where a.docenteId = :docenteId
              and a.seccion = v.seccion
              and a.anioEscolar = v.anioEscolar
        )
        """)
    List<VinculoEstudiante> findEstudiantesDeSeccionesAsignadas(@Param("docenteId") UUID docenteId);
}
