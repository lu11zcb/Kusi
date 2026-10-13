package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.ia.*;
import pe.kusi.edu.model.*;
import pe.kusi.edu.repository.*;
import java.time.Instant;
import java.util.*;

// HU18/HU16. La entrada y el estado se guardan antes de llamar al proveedor y
// ninguna transacción queda abierta durante esa llamada HTTP.
@Service
public class PropuestasService {
    public record Respuesta(SolicitudPropuesta solicitud, Propuesta propuesta, boolean creada) {}

    private final SolicitudPropuestaRepository solicitudes;
    private final PropuestaRepository propuestas;
    private final AsignacionDocenteRepository asignaciones;
    private final GeneradorPropuestas generador;
    private final ValidadorPropuesta validador;
    private final DjangoInternoClient django;
    private final TransactionTemplate transaccion;
    private final ObjectMapper json;

    public PropuestasService(SolicitudPropuestaRepository solicitudes, PropuestaRepository propuestas, AsignacionDocenteRepository asignaciones,
                             GeneradorPropuestas generador, ValidadorPropuesta validador, DjangoInternoClient django,
                             TransactionTemplate transaccion, ObjectMapper json) {
        this.solicitudes=solicitudes; this.propuestas=propuestas; this.asignaciones=asignaciones; this.generador=generador;
        this.validador=validador; this.django=django; this.transaccion=transaccion; this.json=json;
    }

    public boolean iaConfigurada() { return generador.configurado(); }

    // Contextos de las asignaciones vigentes del docente autenticado (HU08 de Jesús).
    public List<Map<String,Object>> contextos(UUID docenteId) {
        List<AsignacionDocente> propias=transaccion.execute(estado -> {
            List<AsignacionDocente> lista=asignaciones.findAllByDocenteId(docenteId);
            lista.forEach(a -> a.getSeccion().getNombre());
            return lista;
        });
        Map<UUID,String> nombres=new HashMap<>();
        List<Map<String,Object>> resultado=new ArrayList<>();
        for (AsignacionDocente a : propias) {
            Map<String,Object> contexto=new LinkedHashMap<>();
            contexto.put("curso_id", a.getCursoId());
            contexto.put("curso_nombre", nombres.computeIfAbsent(a.getCursoId(), django::nombreCurso));
            contexto.put("grado", a.getSeccion().getGrado());
            contexto.put("seccion_id", a.getSeccion().getId());
            contexto.put("seccion_nombre", a.getSeccion().getNombre());
            contexto.put("anio_escolar", a.getAnioEscolar());
            resultado.add(contexto);
        }
        return resultado;
    }

    public Respuesta crear(UUID docenteId, UUID id, UUID cursoId, UUID seccionId, String temaRecibido, String objetivoRecibido) {
        if (temaRecibido == null || temaRecibido.isBlank() || temaRecibido.trim().length() > 2000)
            throw new IllegalArgumentException("Indica un tema de hasta 2000 caracteres.");
        if (objetivoRecibido != null && objetivoRecibido.length() > 4000)
            throw new IllegalArgumentException("El objetivo debe tener como máximo 4000 caracteres.");
        String tema=temaRecibido.trim();
        // El objetivo del docente se conserva exacto; solo espacios equivale a no indicarlo.
        String objetivo=objetivoRecibido == null || objetivoRecibido.isBlank() ? null : objetivoRecibido;
        Contexto contexto=autorizar(docenteId, cursoId, seccionId);

        Optional<SolicitudPropuesta> existente=transaccion.execute(estado -> solicitudes.findById(id));
        if (existente.isEmpty()) {
            try {
                transaccion.executeWithoutResult(estado -> solicitudes.saveAndFlush(new SolicitudPropuesta(id, docenteId, cursoId, seccionId, tema, objetivo)));
            } catch (DataIntegrityViolationException carrera) {
                // Otro envío simultáneo con el mismo UUID ganó la inserción.
                existente=transaccion.execute(estado -> solicitudes.findById(id));
                if (existente.isEmpty()) throw carrera;
            }
        }
        if (existente.isPresent()) {
            if (!existente.get().mismaEntrada(docenteId, cursoId, seccionId, tema, objetivo))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una solicitud con ese identificador y datos diferentes.");
            return leer(id, false);
        }
        if (!generador.configurado()) return leer(id, true);
        return generar(id, contexto, true);
    }

    public Respuesta consultar(UUID docenteId, UUID id) {
        Respuesta respuesta=leerPropia(docenteId, id);
        autorizar(docenteId, respuesta.solicitud().getCursoId(), respuesta.solicitud().getSeccionId());
        return respuesta;
    }

    public Respuesta reintentar(UUID docenteId, UUID id) {
        Respuesta actual=leerPropia(docenteId, id);
        SolicitudPropuesta s=actual.solicitud();
        Contexto contexto=autorizar(docenteId, s.getCursoId(), s.getSeccionId());
        if (s.getEstado().equals("generada") || s.getEstado().equals("generando")) return actual;
        if (!generador.configurado())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "La generación con IA aún no está configurada. Tu solicitud sigue guardada para reintentarla después.");
        return generar(id, contexto, false);
    }

    private Respuesta generar(UUID id, Contexto contexto, boolean creada) {
        Integer tomada=transaccion.execute(estado -> solicitudes.iniciarGeneracion(id, Instant.now()));
        if (tomada == null || tomada == 0) return leer(id, creada);
        SolicitudPropuesta s=transaccion.execute(estado -> solicitudes.findById(id).orElseThrow());
        try {
            Map<String,Object> respuestaIa=generador.generar(new EntradaGeneracion(contexto.cursoNombre(), contexto.grado(), contexto.seccionNombre(), contexto.anio(), s.getTema(), s.getObjetivoDocente()));
            ValidadorPropuesta.Resultado r=validador.validar(respuestaIa, s.getObjetivoDocente());
            transaccion.executeWithoutResult(estado -> {
                int version=propuestas.findFirstBySolicitudIdOrderByVersionDesc(id).map(p -> p.getVersion()+1).orElse(1);
                propuestas.saveAndFlush(new Propuesta(id, version, r.objetivo(), r.origenObjetivo(), r.historia(),
                    aJson(r.acciones()), aJson(r.reglas()), aJson(r.retos()), aJson(r.ayudas()), generador.proveedor(), generador.modelo()));
                solicitudes.terminarGeneracion(id, "generada", null, Instant.now());
            });
            return leer(id, creada);
        } catch (FalloGeneracion fallo) {
            marcarFallida(id, fallo.getMessage());
            throw new ResponseStatusException(fallo.isTiempoAgotado() ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                fallo.getMessage() + " Tu solicitud quedó guardada; puedes reintentarla.");
        } catch (RuntimeException fallo) {
            marcarFallida(id, "No se pudo obtener la propuesta de la IA.");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo obtener la propuesta de la IA. Tu solicitud quedó guardada; puedes reintentarla.");
        }
    }

    private void marcarFallida(UUID id, String mensaje) {
        String error=mensaje.length() > 300 ? mensaje.substring(0, 300) : mensaje;
        transaccion.executeWithoutResult(estado -> solicitudes.terminarGeneracion(id, "fallida", error, Instant.now()));
    }

    private record Contexto(String cursoNombre, int grado, String seccionNombre, Integer anio) {}

    // Conocer un UUID no da acceso: se exige asignación vigente al curso (y sección).
    private Contexto autorizar(UUID docenteId, UUID cursoId, UUID seccionId) {
        AsignacionDocente asignacion=transaccion.execute(estado -> {
            Optional<AsignacionDocente> encontrada=asignaciones.findAllByDocenteId(docenteId).stream()
                .filter(a -> a.getCursoId().equals(cursoId) && (seccionId == null || a.getSeccion().getId().equals(seccionId)))
                .findFirst();
            encontrada.ifPresent(a -> a.getSeccion().getNombre());
            return encontrada.orElse(null);
        });
        if (asignacion == null) throw new SecurityException("No tienes asignado ese curso o sección.");
        String curso=django.nombreCurso(cursoId);
        if (seccionId == null) return new Contexto(curso, 1, null, null);
        return new Contexto(curso, asignacion.getSeccion().getGrado(), asignacion.getSeccion().getNombre(), asignacion.getAnioEscolar());
    }

    private Respuesta leerPropia(UUID docenteId, UUID id) {
        Respuesta respuesta=leer(id, false);
        // Una solicitud ajena se responde igual que una inexistente.
        if (respuesta == null || !respuesta.solicitud().getDocenteId().equals(docenteId))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró la solicitud.");
        return respuesta;
    }

    private Respuesta leer(UUID id, boolean creada) {
        return transaccion.execute(estado -> solicitudes.findById(id)
            .map(s -> new Respuesta(s, s.getEstado().equals("generada") ? propuestas.findFirstBySolicitudIdOrderByVersionDesc(id).orElse(null) : null, creada))
            .orElse(null));
    }

    public List<String> lista(String guardada) {
        try { return Arrays.asList(json.readValue(guardada, String[].class)); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("La propuesta guardada no se pudo leer."); }
    }

    private String aJson(List<String> valores) {
        try { return json.writeValueAsString(valores); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("No se pudo guardar la propuesta."); }
    }
}
