
package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import pe.kusi.edu.model.EtapaGeneracion;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;
import org.springframework.core.io.ClassPathResource;
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

    @Transactional
    public Generacion procesarPaquetePrueba(
            UUID docenteId, UUID generacionId) {

        Generacion generacion = consultar(docenteId, generacionId);

        if (!"pendiente".equals(generacion.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Solo se pueden procesar generaciones pendientes");
        }

        etapaRepository.save(new EtapaGeneracion(
                generacionId,
                "generacion",
                "en_progreso",
                "Procesando el paquete de prueba"));

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode paquete;

            try (var entrada = new ClassPathResource(
                    "paquete-ejemplo.json").getInputStream()) {
                paquete = mapper.readTree(entrada);
            }

            validarPaquetePrueba(paquete);

            generacion.guardarPaquete(
                    mapper.writeValueAsString(paquete));
            generacion.registrarEstado("completada", null);

            etapaRepository.save(new EtapaGeneracion(
                    generacionId,
                    "generacion",
                    "completada",
                    "Paquete de prueba generado y validado"));

        } catch (Exception e) {
            generacion.registrarEstado(
                    "fallida",
                    "Error al generar el paquete: " + mensajeError(e));

            etapaRepository.save(new EtapaGeneracion(
                    generacionId,
                    "generacion",
                    "fallida",
                    "Falló la generación del paquete de prueba"));
        }

        return generacionRepository.save(generacion);
    }

    private void validarPaquetePrueba(JsonNode paquete) {
        if (paquete == null
                || !"kusi-paquete/0".equals(
                        paquete.path("formato").asText())
                || paquete.path("titulo").asText().isBlank()
                || paquete.path("historia").asText().isBlank()
                || !paquete.path("cartera").isArray()
                || paquete.path("cartera").isEmpty()
                || !paquete.path("lista").isArray()
                || paquete.path("lista").isEmpty()
                || !paquete.path("puestos").isArray()
                || paquete.path("puestos").isEmpty()) {
            throw new IllegalArgumentException(
                    "El paquete no cumple la estructura mínima requerida");
        }
    }

    private String mensajeError(Exception e) {
        String mensaje = e.getMessage();

        if (mensaje == null || mensaje.isBlank()) {
            mensaje = e.getClass().getSimpleName();
        }

        return mensaje.length() > 800
                ? mensaje.substring(0, 800)
                : mensaje;
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

