package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.model.SolicitudPropuesta;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;
import pe.kusi.edu.repository.SolicitudPropuestaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

// Todo lo que pasó con un juego, para el administrador: lo que escribió el docente, cada
// versión de la propuesta con las correcciones que pidió, y cada guion con sus
// comprobaciones y arreglos. El docente no ve nada de esto (solo ve su juego); por dentro
// se guarda para poder revisarlo. No trae datos de estudiantes.
@Service
public class DetalleJuegoAdministracionService {
    private final SolicitudPropuestaRepository solicitudes;
    private final PropuestaRepository propuestas;
    private final GeneracionRepository generaciones;
    private final EtapaGeneracionRepository etapas;
    private final PropuestasService propuestasService;
    private final JuegosAdministracionService juegos;
    private final ObjectMapper json;

    public DetalleJuegoAdministracionService(SolicitudPropuestaRepository solicitudes, PropuestaRepository propuestas,
                                             GeneracionRepository generaciones, EtapaGeneracionRepository etapas,
                                             PropuestasService propuestasService, JuegosAdministracionService juegos, ObjectMapper json) {
        this.solicitudes = solicitudes;
        this.propuestas = propuestas;
        this.generaciones = generaciones;
        this.etapas = etapas;
        this.propuestasService = propuestasService;
        this.juegos = juegos;
        this.json = json;
    }

    // tema: lo que el docente quiere enseñar; objetivo_docente: qué deben aprender (si lo
    // escribió); instrucciones: lo que Kusi debe saber además.
    public record Pedido(String tema, String objetivo_docente, String instrucciones, String proposito, Instant creado_en) {}
    // origen «ia»: la escribió Kusi (autor dice quién: el taller o la IA directa); origen
    // «docente»: la editó el docente a mano. observaciones: la corrección que pidió el docente.
    public record Version(int version, String titulo, String origen, String autor, Integer version_base, String observaciones,
                          String estado_revision, Instant revisada_en, Instant creado_en, Map<String, Object> contenido,
                          JsonNode fuentes) {}
    public record Etapa(String etapa, String estado, String mensaje, Instant creado_en) {}
    // guion: el paquete que recibe el reproductor (null mientras se genera o si falló).
    public record GeneracionDetalle(UUID id, int version_propuesta, String estado, boolean taller, boolean publicada,
                                    Instant publicada_en, Instant creado_en, String ultimo_error, List<Etapa> etapas,
                                    JsonNode guion) {}
    public record Detalle(JuegosAdministracionService.Juego juego, UUID docente_id, Pedido pedido,
                          List<Version> versiones, List<GeneracionDetalle> generaciones) {}

    public Detalle detalle(UUID juego) {
        SolicitudPropuesta solicitud = solicitudes.findById(juego)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró ese juego."));
        // La ficha de la lista (título, curso, sección y estado) se calcula igual que en el listado.
        JuegosAdministracionService.Juego ficha = juegos.juegosDe(solicitud.getDocenteId()).stream()
                .filter(item -> item.id().equals(juego)).findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ese juego todavía no tiene una generación."));
        Pedido pedido = new Pedido(solicitud.getTema(), solicitud.getObjetivoDocente(), solicitud.getInstrucciones(),
                solicitud.getProposito(), solicitud.getCreadoEn());
        List<Version> versiones = propuestas.findAllBySolicitudIdOrderByVersionDesc(juego).stream().map(this::version).toList();
        List<GeneracionDetalle> intentos = generaciones.findAllBySolicitudIdOrderByCreadoEnDesc(juego).stream().map(this::generacion).toList();
        return new Detalle(ficha, solicitud.getDocenteId(), pedido, versiones, intentos);
    }

    private Version version(Propuesta p) {
        String autor = "docente".equals(p.getOrigen()) ? "docente" : p.getProveedor();
        return new Version(p.getVersion(), p.getTitulo(), p.getOrigen(), autor, p.getVersionBase(), p.getObservaciones(),
                p.getEstadoRevision(), p.getRevisadaEn(), p.getCreadoEn(), propuestasService.contenido(p), leer(p.getFuentes()));
    }

    private GeneracionDetalle generacion(Generacion g) {
        List<Etapa> pasos = etapas.findAllByGeneracionIdOrderByCreadoEnAsc(g.getId()).stream()
                .map(etapa -> new Etapa(etapa.getEtapa(), etapa.getEstado(), etapa.getMensaje(), etapa.getCreadoEn())).toList();
        return new GeneracionDetalle(g.getId(), g.getVersionPropuesta(), g.getEstado(), g.isTaller(), g.isPublicada(),
                g.getPublicadaEn(), g.getCreadoEn(), g.getUltimoError(), pasos, leer(g.getPaquete()));
    }

    // Un texto guardado que no se puede leer no impide ver lo demás del juego.
    private JsonNode leer(String guardado) {
        if (guardado == null || guardado.isBlank()) return null;
        try {
            return json.readTree(guardado);
        } catch (JsonProcessingException ex) {
            return json.getNodeFactory().textNode(guardado);
        }
    }
}
