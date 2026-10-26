
package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import pe.kusi.edu.model.EtapaGeneracion;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class GeneracionesService {

    private final PropuestasService propuestasService;
    private final PropuestaRepository propuestaRepository;
    private final GeneracionRepository generacionRepository;
    private final EtapaGeneracionRepository etapaRepository;
    private final ProcesoGeneracionLaberinto proceso;
    private final TransactionTemplate transaccion;
    private final ObjectMapper json;

    public GeneracionesService(
            PropuestasService propuestasService,
            PropuestaRepository propuestaRepository,
            GeneracionRepository generacionRepository,
            EtapaGeneracionRepository etapaRepository,
            ProcesoGeneracionLaberinto proceso,
            TransactionTemplate transaccion,
            ObjectMapper json) {
        this.propuestasService = propuestasService;
        this.propuestaRepository = propuestaRepository;
        this.generacionRepository = generacionRepository;
        this.etapaRepository = etapaRepository;
        this.proceso = proceso;
        this.transaccion = transaccion;
        this.json = json;
    }

    @Transactional
    public Generacion iniciar(UUID docenteId, UUID solicitudId, int version) {
        propuestasService.consultar(docenteId, solicitudId);

        if (version < 1) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La versión debe ser mayor que cero");
        }

        Propuesta ultima = propuestaRepository
                .findFirstBySolicitudIdOrderByVersionDesc(solicitudId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No existe una propuesta para esta solicitud"));

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
                new Generacion(
                        solicitudId,
                        ultima.getId(),
                        ultima.getVersion()));

        etapaRepository.save(new EtapaGeneracion(
                generacion.getId(),
                "solicitud",
                "completada",
                "Solicitud de generación registrada; pendiente de procesamiento"));

        return generacion;
    }

    // HU26: procesa una generación pendiente con la IA. No es transaccional a
    // propósito: la llamada a la IA puede tardar y cada paso se guarda por separado
    // (ver ProcesoGeneracionLaberinto). Devuelve la generación ya «lista» o «fallida».
    public Generacion procesar(UUID docenteId, UUID generacionId) {
        Generacion generacion = consultar(docenteId, generacionId);

        if (!"pendiente".equals(generacion.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Solo se pueden procesar generaciones pendientes");
        }

        // Sin IA la generación sigue pendiente: no se inventa ningún juego.
        if (!proceso.iaConfigurada()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "La generación con IA aún no está configurada. La generación sigue pendiente para procesarla después.");
        }

        // Solo un proceso puede tomar la generación: si otro llegó antes, se rechaza.
        Integer tomada = transaccion.execute(
                estado -> generacionRepository.tomarParaProcesar(generacionId, Instant.now()));
        if (tomada == null || tomada == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Esta generación ya se está procesando");
        }

        return proceso.procesar(
                docenteId, generacionRepository.findById(generacionId).orElseThrow());
    }

    // El bloque «procedencia» del paquete (proveedor, modelo, intentos y si se usó un
    // mapa base), o null si la generación todavía no tiene paquete.
    public JsonNode procedencia(Generacion generacion) {
        if (generacion.getPaquete() == null || generacion.getPaquete().isBlank()) {
            return null;
        }

        try {
            JsonNode procedencia = json.readTree(generacion.getPaquete()).path("procedencia");
            return procedencia.isObject() ? procedencia : null;
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @Transactional(readOnly = true)
    public Generacion consultar(UUID docenteId, UUID generacionId) {
        Generacion generacion = generacionRepository
                .findById(generacionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No existe la generación solicitada"));

        propuestasService.consultar(
                docenteId, generacion.getSolicitudId());

        return generacion;
    }

    @Transactional(readOnly = true)
    public List<Generacion> listar(
            UUID docenteId, UUID solicitudId) {

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
