
package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import pe.kusi.edu.model.EtapaGeneracion;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.model.TrabajoTaller;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;
import pe.kusi.edu.repository.TrabajoTallerRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.Map;
import java.util.LinkedHashMap;

@Service
public class GeneracionesService {
    private static final String TRABAJADOR_LABERINTO = "laberinto_interno";

    private final PropuestasService propuestasService;
    private final PropuestaRepository propuestaRepository;
    private final GeneracionRepository generacionRepository;
    private final EtapaGeneracionRepository etapaRepository;
    private final TrabajoTallerRepository trabajoRepository;
    private final ProcesoGeneracionLaberinto proceso;
    private final TransactionTemplate transaccion;
    private final ObjectMapper json;

    public GeneracionesService(
            PropuestasService propuestasService,
            PropuestaRepository propuestaRepository,
            GeneracionRepository generacionRepository,
            EtapaGeneracionRepository etapaRepository,
            TrabajoTallerRepository trabajoRepository,
            ProcesoGeneracionLaberinto proceso,
            TransactionTemplate transaccion,
            ObjectMapper json) {
        this.propuestasService = propuestasService;
        this.propuestaRepository = propuestaRepository;
        this.generacionRepository = generacionRepository;
        this.etapaRepository = etapaRepository;
        this.trabajoRepository = trabajoRepository;
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

        // El buzón recibe los datos completos, pero el reproductor disponible
        // sigue siendo el laberinto. Conservar esta comprobación evita preparar
        // un juego de frutas para una idea que necesita otros objetos o acciones.
        if (!ultima.sePuedeGenerar()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Por ahora Kusi solo crea juegos de laberinto con frutas y verduras. "
                            + "Esta propuesta queda guardada para cuando Kusi tenga este tipo de juego.");
        }

        Generacion generacion = generacionRepository.save(
                new Generacion(
                        solicitudId,
                        ultima.getId(),
                        ultima.getVersion()));

        PropuestasService.ContextoSolicitud contexto =
                propuestasService.contextoDe(docenteId, solicitudId);

        Map<String, Object> datosSolicitud = new LinkedHashMap<>();
        datosSolicitud.put("curso", contexto.cursoNombre());
        datosSolicitud.put("grado", contexto.grado());
        datosSolicitud.put("tema", contexto.tema());
        datosSolicitud.put("proposito", contexto.proposito());
        datosSolicitud.put("instrucciones", contexto.instrucciones());

        Map<String, Object> datosEntrada = new LinkedHashMap<>();
        datosEntrada.put("tipo", "crear_juego");
        datosEntrada.put("solicitud", datosSolicitud);
        datosEntrada.put("propuesta", propuestasService.contenido(ultima));

        String contenidoEntrada;
        try {
            contenidoEntrada = json.writeValueAsString(datosEntrada);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(
                    "No se pudieron preparar los datos del trabajo del taller", ex);
        }

        trabajoRepository.save(new TrabajoTaller(
                generacion.getId(),
                "crear_juego",
                contenidoEntrada));


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
        Integer tomada = transaccion.execute(estado -> {
            int cantidad = generacionRepository.tomarParaProcesar(generacionId, Instant.now());
            if (cantidad == 0) return 0;
            // La misma transacción reclama la generación y su trabajo del buzón.
            // Si otro trabajador ya lo recogió, se deshacen ambos cambios. Las
            // generaciones anteriores al buzón siguen funcionando sin esa fila.
            trabajoRepository.bloquearTrabajo(generacionId).ifPresent(trabajo -> {
                if (!"pendiente".equals(trabajo.getEstado())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Este juego ya se está preparando");
                }
                trabajo.tomar(TRABAJADOR_LABERINTO);
                trabajoRepository.save(trabajo);
            });
            return cantidad;
        });
        if (tomada == null || tomada == 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Esta generación ya se está procesando");
        }

        Generacion resultado = proceso.procesar(
                docenteId, generacionRepository.findById(generacionId).orElseThrow());
        // Mientras se incorpora el trabajador externo, el procesador existente
        // termina también la tarea del buzón. Así no queda pendiente un paquete
        // que ya se preparó ni se genera otra vez al arrancar el taller.
        transaccion.executeWithoutResult(estado ->
                trabajoRepository.bloquearTrabajo(generacionId).ifPresent(trabajo -> {
                    if (!TRABAJADOR_LABERINTO.equals(trabajo.getTomadoPor()) || !"en_proceso".equals(trabajo.getEstado())) return;
                    if ("lista".equals(resultado.getEstado())) trabajo.registrarResultado(resultado.getPaquete());
                    else trabajo.registrarFallo(resultado.getUltimoError());
                    trabajoRepository.save(trabajo);
                }));
        return resultado;
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

    // El trabajo del taller puede terminar antes de la revisión docente.
    // Solo esta acción explícita permite que el juego aparezca en la app.
    public Generacion publicar(UUID docenteId, UUID generacionId) {
        Generacion generacion = consultar(docenteId, generacionId);
        if (!"lista".equals(generacion.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Solo se puede enviar a los estudiantes un juego listo");
        }
        generacion.publicar();
        return generacionRepository.save(generacion);
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
