
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
    private final PropuestasService propuestasService;
    private final PropuestaRepository propuestaRepository;
    private final GeneracionRepository generacionRepository;
    private final EtapaGeneracionRepository etapaRepository;
    private final TrabajoTallerRepository trabajoRepository;
    private final ProcesoGeneracionLaberinto proceso;
    private final TallerService taller;
    private final TransactionTemplate transaccion;
    private final ObjectMapper json;

    public GeneracionesService(
            PropuestasService propuestasService,
            PropuestaRepository propuestaRepository,
            GeneracionRepository generacionRepository,
            EtapaGeneracionRepository etapaRepository,
            TrabajoTallerRepository trabajoRepository,
            ProcesoGeneracionLaberinto proceso,
            TallerService taller,
            TransactionTemplate transaccion,
            ObjectMapper json) {
        this.propuestasService = propuestasService;
        this.propuestaRepository = propuestaRepository;
        this.generacionRepository = generacionRepository;
        this.etapaRepository = etapaRepository;
        this.trabajoRepository = trabajoRepository;
        this.proceso = proceso;
        this.taller = taller;
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

        // Dos caminos. Un laberinto lo arma Spring con la IA cuando el panel pide
        // «procesar», sin pasar por el buzón. Un juego nuevo (propuesta «otro») lo crea
        // el taller: queda un trabajo en el buzón y el trabajador de la Mac lo toma.
        boolean taller = ultima.vaAlTaller();
        if (taller && generacionRepository.existsBySolicitudIdAndTallerTrueAndEstadoIn(
                solicitudId, List.of("pendiente", "generando"))) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Kusi ya está creando este juego. Espera a que termine.");
        }

        Generacion generacion = generacionRepository.save(
                new Generacion(
                        solicitudId,
                        ultima.getId(),
                        ultima.getVersion(),
                        taller));

        if (!taller) {
            etapaRepository.save(new EtapaGeneracion(
                    generacion.getId(),
                    "solicitud",
                    "completada",
                    "Solicitud de generación registrada; pendiente de procesamiento"));
            return generacion;
        }

        PropuestasService.ContextoSolicitud contexto =
                propuestasService.contextoDe(docenteId, solicitudId);

        Map<String, Object> datosSolicitud = new LinkedHashMap<>();
        datosSolicitud.put("curso", contexto.cursoNombre());
        datosSolicitud.put("grado", contexto.grado());
        datosSolicitud.put("tema", contexto.tema());
        datosSolicitud.put("proposito", contexto.proposito());
        datosSolicitud.put("instrucciones", contexto.instrucciones());

        // Si el docente pidió un cambio (una versión nueva de la propuesta) sobre un juego
        // que el taller ya terminó, el taller corrige ese juego en vez de empezar otro.
        // La versión nueva no hereda la aprobación ni el envío: es otra generación, que
        // vuelve a pasar las comprobaciones y espera la aprobación del docente.
        Map<String, Object> anterior = juegoAnteriorDelTaller(solicitudId, ultima.getVersion());
        String tipo = anterior == null ? "crear_juego" : "corregir_juego";

        Map<String, Object> datosEntrada = new LinkedHashMap<>();
        datosEntrada.put("tipo", tipo);
        datosEntrada.put("solicitud", datosSolicitud);
        datosEntrada.put("propuesta", propuestasService.contenido(ultima));
        if (anterior != null) {
            // Lo que el docente escribió en el chat. Es dato, no orden (reglas.md, regla 1).
            datosEntrada.put("pedido", ultima.getObservaciones() != null
                    ? ultima.getObservaciones()
                    : "El docente editó la propuesta: el juego debe seguir la versión nueva.");
            datosEntrada.put("anterior", anterior);
        }

        String contenidoEntrada;
        try {
            contenidoEntrada = json.writeValueAsString(datosEntrada);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException(
                    "No se pudieron preparar los datos del trabajo del taller", ex);
        }

        trabajoRepository.save(new TrabajoTaller(
                generacion.getId(),
                tipo,
                contenidoEntrada));

        etapaRepository.save(new EtapaGeneracion(
                generacion.getId(),
                "solicitud",
                "completada",
                anterior == null
                        ? "Solicitud registrada; el taller creará el juego"
                        : "Solicitud registrada; el taller corregirá el juego anterior"));

        return generacion;
    }

    // El juego del taller que se corrige: su trabajo (la carpeta con su código y sus
    // piezas), la versión de la propuesta con que se hizo y su guion. Null si no hay.
    private Map<String, Object> juegoAnteriorDelTaller(UUID solicitudId, int version) {
        return generacionRepository
                .findFirstBySolicitudIdAndTallerTrueAndEstadoAndVersionPropuestaLessThanOrderByCreadoEnDesc(
                        solicitudId, "lista", version)
                .flatMap(generacion -> trabajoRepository
                        .findFirstByGeneracionIdOrderByCreadoEnDesc(generacion.getId())
                        .map(trabajo -> {
                            Map<String, Object> datos = new LinkedHashMap<>();
                            datos.put("trabajo", trabajo.getId());
                            datos.put("version_propuesta", generacion.getVersionPropuesta());
                            try {
                                datos.put("paquete", json.readTree(generacion.getPaquete()));
                            } catch (JsonProcessingException ex) {
                                throw new IllegalStateException("El juego anterior no se pudo leer", ex);
                            }
                            return datos;
                        }))
                .orElse(null);
    }

    // HU26: procesa una generación pendiente con la IA. No es transaccional a
    // propósito: la llamada a la IA puede tardar y cada paso se guarda por separado
    // (ver ProcesoGeneracionLaberinto). Devuelve la generación ya «lista» o «fallida».
    public Generacion procesar(UUID docenteId, UUID generacionId) {
        Generacion generacion = consultar(docenteId, generacionId);

        // Un juego del taller no se procesa aquí: lo toma el trabajador desde el buzón.
        if (generacion.isTaller()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Kusi ya está creando este juego; no hace falta procesarlo.");
        }

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
        Integer tomada = transaccion.execute(estado ->
                generacionRepository.tomarParaProcesar(generacionId, Instant.now()));
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
        Generacion enviada = generacionRepository.save(generacion);
        // Al enviar un juego del taller, el docente aprueba sus piezas nuevas.
        if (enviada.isTaller()) taller.aprobarPiezas(enviada);
        return enviada;
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
