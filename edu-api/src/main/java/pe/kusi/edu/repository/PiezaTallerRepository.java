package pe.kusi.edu.repository;

import pe.kusi.edu.model.PiezaTaller;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Las piezas nuevas que entregó el taller, con su estado.
 */
@Repository
public interface PiezaTallerRepository extends JpaRepository<PiezaTaller, UUID> {

    List<PiezaTaller> findAllByTrabajoIdOrderByPiezaAsc(UUID trabajoId);
}
