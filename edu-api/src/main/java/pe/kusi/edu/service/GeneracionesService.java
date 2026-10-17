
package pe.kusi.edu.service;

import pe.kusi.edu.model.EtapaGeneracion;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class GeneracionesService {

    private final PropuestasService propuestasService;
    private final PropuestaRepository propuestaRepository;
    private final GeneracionRepository generacionRepository;
    private final EtapaGeneracionRepository etapaRepository;

    public GeneracionesService(
            PropuestasService propuestasService,
            PropuestaRepository propuestaRepository,
            GeneracionRepository generacionRepository,
            EtapaGeneracionRepository etapaRepository) {
        this.propuestasService = propuestasService;
        this.propuestaRepository = propuestaRepository;
        this.generacionRepository = generacionRepository;
        this.etapaRepository = etapaRepository;
    }

    @Transactional
    public Generacion iniciar(UUID docenteId, UUID solicitudId, int version) {
        // Verifica que la solicitud pertenezca al docente.
        propuestasService.consultar(docenteId, solicitudId);

        if (version < 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "La versión debe ser mayor que cero");
        }

        Propuesta ultima = propuestaRepository
                .findFirstBySolicitudIdOrderByVersionDesc(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No existe una propuesta para esta solicitud"));

        if (ultima.getVersion() != version) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Solo se puede generar el juego desde la última versión de la propuesta");
        }

        if (!"aprobada".equals(ultima.getEstadoRevision())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "La propuesta debe estar aprobada antes de generar el juego");
        }

        Generacion generacion = generacionRepository.save(
                new Generacion(solicitudId, ultima.getId(), ultima.getVersion()));

        etapaRepository.save(new EtapaGeneracion(
                generacion.getId(),
                "solicitud",
                "completada",
                "Solicitud de generación registrada; pendiente de procesamiento"));

        return generacion;
    }

    @Transactional(readOnly = true)
    public Generacion consultar(UUID docenteId, UUID generacionId) {
        Generacion generacion = generacionRepository.findById(generacionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "No existe la generación solicitada"));

        // Evita que un docente consulte generaciones de otro docente.
        propuestasService.consultar(docenteId, generacion.getSolicitudId());

        return generacion;
    }

    @Transactional(readOnly = true)
    public List<Generacion> listar(UUID docenteId, UUID solicitudId) {
        // Comprueba los permisos antes de devolver el historial.
        propuestasService.consultar(docenteId, solicitudId);

        return generacionRepository
                .findAllBySolicitudIdOrderByCreadoEnDesc(solicitudId);
    }

    @Transactional(readOnly = true)
    public List<EtapaGeneracion> listarEtapas(UUID generacionId) {
        return etapaRepository
                .findAllByGeneracionIdOrderByCreadoEnAsc(generacionId);
    }
}
