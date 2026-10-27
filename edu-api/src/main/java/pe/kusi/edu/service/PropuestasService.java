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

// HU16/HU18 crean la solicitud; HU19-HU25 revisan y versionan sus propuestas.
// La entrada y el estado se guardan antes de llamar al proveedor y ninguna
// transacción queda abierta durante esa llamada HTTP.
@Service
public class PropuestasService {
    public record Respuesta(SolicitudPropuesta solicitud, Propuesta propuesta, boolean creada) {}
    public record EdicionDocente(String objetivo, String historia, List<String> acciones, List<String> reglas, List<String> retos, List<String> ayudas, List<String> recursos) {}

    private static final Set<String> PROPOSITOS=Set.of("preparacion", "refuerzo");

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

    // Contextos de las asignaciones vigentes del docente autenticado (HU08/HU17).
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

    public Respuesta crear(UUID docenteId, UUID id, UUID cursoId, UUID seccionId, String temaRecibido, String objetivoRecibido,
                           String propositoRecibido, String instruccionesRecibidas) {
        if (temaRecibido == null || temaRecibido.isBlank() || temaRecibido.trim().length() > 2000)
            throw new IllegalArgumentException("Indica un tema de hasta 2000 caracteres.");
        if (objetivoRecibido != null && objetivoRecibido.length() > 4000)
            throw new IllegalArgumentException("El objetivo debe tener como máximo 4000 caracteres.");
        // HU19: sin propósito explícito se asume preparación, como antes de esta historia.
        String proposito=propositoRecibido == null ? "preparacion" : propositoRecibido;
        if (!PROPOSITOS.contains(proposito)) throw new IllegalArgumentException("Elige preparación o refuerzo.");
        if (instruccionesRecibidas != null && instruccionesRecibidas.length() > 4000)
            throw new IllegalArgumentException("Las instrucciones deben tener como máximo 4000 caracteres.");
        String tema=temaRecibido.trim();
        // Objetivo e instrucciones se conservan exactos; solo espacios equivale a no indicarlos.
        String objetivo=objetivoRecibido == null || objetivoRecibido.isBlank() ? null : objetivoRecibido;
        String instrucciones=instruccionesRecibidas == null || instruccionesRecibidas.isBlank() ? null : instruccionesRecibidas;
        Contexto contexto=autorizar(docenteId, cursoId, seccionId);

        Optional<SolicitudPropuesta> existente=transaccion.execute(estado -> solicitudes.findById(id));
        if (existente.isEmpty()) {
            try {
                transaccion.executeWithoutResult(estado -> solicitudes.saveAndFlush(new SolicitudPropuesta(id, docenteId, cursoId, seccionId, tema, objetivo, proposito, instrucciones)));
            } catch (DataIntegrityViolationException carrera) {
                // Otro envío simultáneo con el mismo UUID ganó la inserción.
                existente=transaccion.execute(estado -> solicitudes.findById(id));
                if (existente.isEmpty()) throw carrera;
            }
        }
        if (existente.isPresent()) {
            if (!existente.get().mismaEntrada(docenteId, cursoId, seccionId, tema, objetivo, proposito, instrucciones))
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya existe una solicitud con ese identificador y datos diferentes.");
            return leer(id, false);
        }
        if (!generador.configurado()) return leer(id, true);
        return generar(id, contexto, true);
    }

    // HU20: solicitudes propias, la más reciente primero.
    public List<Respuesta> listar(UUID docenteId) {
        return transaccion.execute(estado -> solicitudes.findAllByDocenteIdOrderByCreadoEnDesc(docenteId).stream()
            .map(s -> new Respuesta(s, propuestas.findFirstBySolicitudIdOrderByVersionDesc(s.getId()).orElse(null), false)).toList());
    }

    public Respuesta consultar(UUID docenteId, UUID id) {
        Respuesta respuesta=leerPropia(docenteId, id);
        autorizar(docenteId, respuesta.solicitud().getCursoId(), respuesta.solicitud().getSeccionId());
        return respuesta;
    }

    // HU25: todas las versiones, la más reciente primero (versión y fecha crecen juntas).
    public List<Propuesta> versiones(UUID docenteId, UUID id) {
        consultar(docenteId, id);
        return transaccion.execute(estado -> propuestas.findAllBySolicitudIdOrderByVersionDesc(id));
    }

    public Respuesta reintentar(UUID docenteId, UUID id) {
        Respuesta actual=leerPropia(docenteId, id);
        SolicitudPropuesta s=actual.solicitud();
        Contexto contexto=autorizar(docenteId, s.getCursoId(), s.getSeccionId());
        if (s.getEstado().equals("generada") || s.getEstado().equals("generando")) return actual;
        exigirIa();
        return generar(id, contexto, false);
    }

    // HU21: se aprueba la versión exacta que el docente vio, y solo si sigue siendo la actual.
    public Respuesta aprobar(UUID docenteId, UUID id, int version) { return revisar(docenteId, id, version, "aprobada"); }

    // HU24: una versión rechazada no puede pasar a generar un juego.
    public Respuesta rechazar(UUID docenteId, UUID id, int version) { return revisar(docenteId, id, version, "rechazada"); }

    private Respuesta revisar(UUID docenteId, UUID id, int version, String decision) {
        Respuesta actual=leerPropia(docenteId, id);
        autorizar(docenteId, actual.solicitud().getCursoId(), actual.solicitud().getSeccionId());
        transaccion.executeWithoutResult(estado -> {
            SolicitudPropuesta s=solicitudes.bloquear(id).orElseThrow();
            if (!s.getEstado().equals("generada")) throw new ResponseStatusException(HttpStatus.CONFLICT, "La propuesta todavía no está lista para revisarse.");
            Propuesta ultima=propuestas.findFirstBySolicitudIdOrderByVersionDesc(id).orElseThrow();
            if (ultima.getVersion() != version) throw new ResponseStatusException(HttpStatus.CONFLICT, "La propuesta cambió. Revisa la versión actual antes de decidir.");
            if (!ultima.getEstadoRevision().equals("pendiente")) throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta versión ya fue " + ultima.getEstadoRevision() + ".");
            ultima.revisar(decision, docenteId);
        });
        return leer(id, false);
    }

    // HU24: otra alternativa con la misma solicitud; la rechazada queda en el historial.
    public Respuesta alternativa(UUID docenteId, UUID id) {
        Respuesta actual=leerPropia(docenteId, id);
        Contexto contexto=autorizar(docenteId, actual.solicitud().getCursoId(), actual.solicitud().getSeccionId());
        if (actual.propuesta() == null || !actual.propuesta().getEstadoRevision().equals("rechazada"))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Solo puedes pedir otra alternativa después de rechazar la versión actual.");
        exigirIa();
        return nuevaVersionIa(id, contexto, actual.propuesta(), "alternativa", null);
    }

    // HU22: la IA ajusta una versión según las observaciones; la anterior se conserva.
    public Respuesta observaciones(UUID docenteId, UUID id, int version, String observaciones) {
        if (observaciones == null || observaciones.isBlank() || observaciones.length() > 4000)
            throw new IllegalArgumentException("Escribe tus observaciones (hasta 4000 caracteres).");
        Respuesta actual=leerPropia(docenteId, id);
        Contexto contexto=autorizar(docenteId, actual.solicitud().getCursoId(), actual.solicitud().getSeccionId());
        Propuesta base=transaccion.execute(estado -> propuestas.findBySolicitudIdAndVersion(id, version))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esa versión."));
        exigirIa();
        return nuevaVersionIa(id, contexto, base, "observaciones", observaciones);
    }

    // HU23: el docente guarda una versión editada. Si parte de una aprobada,
    // la nueva queda pendiente: necesita otra aprobación.
    public Respuesta modificar(UUID docenteId, UUID id, int version, EdicionDocente edicion) {
        Respuesta actual=leerPropia(docenteId, id);
        autorizar(docenteId, actual.solicitud().getCursoId(), actual.solicitud().getSeccionId());
        Map<String,Object> datos=new HashMap<>();
        datos.put("objetivo", edicion.objetivo()); datos.put("historia", edicion.historia()); datos.put("acciones", edicion.acciones());
        datos.put("reglas", edicion.reglas()); datos.put("retos", edicion.retos()); datos.put("ayudas", edicion.ayudas()); datos.put("recursos", edicion.recursos());
        ValidadorPropuesta.Resultado r;
        try { r=validador.validar(datos, null); }
        catch (FalloGeneracion invalida) { throw new IllegalArgumentException("Completa objetivo, historia, acciones, reglas, retos y ayudas (de 1 a 20 elementos cada lista)."); }
        try {
            transaccion.executeWithoutResult(estado -> {
                SolicitudPropuesta s=solicitudes.bloquear(id).orElseThrow();
                if (!s.getEstado().equals("generada")) throw new ResponseStatusException(HttpStatus.CONFLICT, "Espera a que termine la generación en curso.");
                Propuesta base=propuestas.findBySolicitudIdAndVersion(id, version)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esa versión."));
                int siguiente=propuestas.findFirstBySolicitudIdOrderByVersionDesc(id).orElseThrow().getVersion()+1;
                // El objetivo conserva su origen si no se cambió; si se editó, pasa a ser del docente.
                String origenObjetivo=r.objetivo().equals(base.getObjetivo()) ? base.getOrigenObjetivo() : "docente";
                // HU28: el docente edita los textos, no la regla ni el tipo de juego: la versión nueva conserva los de la base.
                propuestas.saveAndFlush(new Propuesta(id, siguiente, "docente", version, null, r.objetivo(), origenObjetivo, r.historia(),
                    aJson(r.acciones()), aJson(r.reglas()), aJson(r.retos()), aJson(r.ayudas()), r.recursos() == null ? null : aJson(r.recursos()),
                    null, null, base.getReglaJuego(), base.getTipoJuego()));
            });
        } catch (DataIntegrityViolationException carrera) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Se guardó otra versión al mismo tiempo. Revisa la versión actual.");
        }
        return leer(id, false);
    }

    // Lo que el generador del guion necesita saber de la solicitud, además de la
    // propuesta: el curso, el grado y lo que pidió el docente. Solo datos del recurso
    // educativo, nunca de estudiantes.
    public record ContextoSolicitud(String cursoNombre, int grado, String tema, String proposito, String instrucciones) {}

    // Igual que consultar: una solicitud ajena se responde como inexistente.
    public ContextoSolicitud contextoDe(UUID docenteId, UUID solicitudId) {
        SolicitudPropuesta s=leerPropia(docenteId, solicitudId).solicitud();
        Contexto contexto=autorizar(docenteId, s.getCursoId(), s.getSeccionId());
        return new ContextoSolicitud(contexto.cursoNombre(), contexto.grado(), s.getTema(), s.getProposito(), s.getInstrucciones());
    }

    // Base para el Sprint 2: solo la versión vigente y aprobada puede generar un juego.
    public Optional<Propuesta> aprobadaParaJuego(UUID solicitudId) {
        return transaccion.execute(estado -> propuestas.findFirstBySolicitudIdOrderByVersionDesc(solicitudId)
            .filter(p -> p.getEstadoRevision().equals("aprobada")));
    }

    private void exigirIa() {
        if (!generador.configurado())
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "La generación con IA aún no está configurada. Tu solicitud sigue guardada para reintentarla después.");
    }

    private Respuesta generar(UUID id, Contexto contexto, boolean creada) {
        Integer tomada=transaccion.execute(estado -> solicitudes.iniciarGeneracion(id, Instant.now()));
        if (tomada == null || tomada == 0) return leer(id, creada);
        SolicitudPropuesta s=transaccion.execute(estado -> solicitudes.findById(id).orElseThrow());
        EntradaGeneracion entrada=entrada(contexto, s, "nueva", null, null);
        try {
            ValidadorPropuesta.Resultado r=validador.validar(generador.generar(entrada), s.getObjetivoDocente());
            guardarVersionIa(id, null, null, r, null, null);
            return leer(id, creada);
        } catch (FalloGeneracion fallo) {
            terminarConFallo(id, "fallida", fallo.getMessage());
            throw new ResponseStatusException(fallo.isTiempoAgotado() ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                fallo.getMessage() + " Tu solicitud quedó guardada; puedes reintentarla.");
        } catch (RuntimeException fallo) {
            terminarConFallo(id, "fallida", "No se pudo obtener la propuesta de la IA.");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo obtener la propuesta de la IA. Tu solicitud quedó guardada; puedes reintentarla.");
        }
    }

    // Si falla, la solicitud vuelve a "generada": las versiones existentes no cambian.
    private Respuesta nuevaVersionIa(UUID id, Contexto contexto, Propuesta base, String tipo, String observaciones) {
        Integer tomada=transaccion.execute(estado -> solicitudes.iniciarNuevaVersion(id, Instant.now()));
        if (tomada == null || tomada == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Ya hay una generación en curso para esta solicitud.");
        SolicitudPropuesta s=transaccion.execute(estado -> solicitudes.findById(id).orElseThrow());
        // Un objetivo del docente se conserva exacto también en las versiones nuevas.
        String objetivoFijo=base.getOrigenObjetivo().equals("docente") ? base.getObjetivo() : null;
        try {
            ValidadorPropuesta.Resultado r=validador.validar(generador.generar(entrada(contexto, s, tipo, base, observaciones)), objetivoFijo);
            guardarVersionIa(id, base.getVersion(), observaciones, r, base.getReglaJuego(), base.getTipoJuego());
            return leer(id, false);
        } catch (FalloGeneracion fallo) {
            terminarConFallo(id, "generada", fallo.getMessage());
            throw new ResponseStatusException(fallo.isTiempoAgotado() ? HttpStatus.GATEWAY_TIMEOUT : HttpStatus.BAD_GATEWAY,
                fallo.getMessage() + " Las versiones anteriores se conservan; puedes intentarlo de nuevo.");
        } catch (RuntimeException fallo) {
            terminarConFallo(id, "generada", "No se pudo obtener la propuesta de la IA.");
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "No se pudo obtener la propuesta de la IA. Las versiones anteriores se conservan.");
        }
    }

    private EntradaGeneracion entrada(Contexto c, SolicitudPropuesta s, String tipo, Propuesta base, String observaciones) {
        return new EntradaGeneracion(c.cursoNombre(), c.grado(), c.seccionNombre(), c.anio(), s.getTema(), s.getObjetivoDocente(),
            s.getProposito(), s.getInstrucciones(), tipo, base == null ? null : contenido(base), observaciones);
    }

    // reglaHeredada (HU28): la regla de la versión que se ajusta. Si la IA no vuelve a elegir
    // una, la nueva versión conserva la de la versión base. Lo mismo con el tipo de juego. Si
    // el juego es «otro», no lleva regla de laberinto.
    private void guardarVersionIa(UUID id, Integer versionBase, String observaciones, ValidadorPropuesta.Resultado r,
                                  String reglaHeredada, String tipoHeredado) {
        String tipoJuego=r.tipoJuego() != null ? r.tipoJuego() : tipoHeredado;
        String reglaJuego=ValidadorPropuesta.TIPO_OTRO.equals(tipoJuego) ? null : r.reglaJuego() != null ? r.reglaJuego() : reglaHeredada;
        transaccion.executeWithoutResult(estado -> {
            int version=propuestas.findFirstBySolicitudIdOrderByVersionDesc(id).map(p -> p.getVersion()+1).orElse(1);
            propuestas.saveAndFlush(new Propuesta(id, version, "ia", versionBase, observaciones, r.objetivo(), r.origenObjetivo(), r.historia(),
                aJson(r.acciones()), aJson(r.reglas()), aJson(r.retos()), aJson(r.ayudas()), r.recursos() == null ? null : aJson(r.recursos()),
                generador.proveedor(), generador.modelo(), reglaJuego, tipoJuego));
            solicitudes.terminarGeneracion(id, "generada", null, Instant.now());
        });
    }

    private void terminarConFallo(UUID id, String estado, String mensaje) {
        String error=mensaje.length() > 300 ? mensaje.substring(0, 300) : mensaje;
        transaccion.executeWithoutResult(t -> solicitudes.terminarGeneracion(id, estado, error, Instant.now()));
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

    // La propuesta mostrada es siempre la versión más reciente.
    private Respuesta leer(UUID id, boolean creada) {
        return transaccion.execute(estado -> solicitudes.findById(id)
            .map(s -> new Respuesta(s, s.getEstado().equals("generada") ? propuestas.findFirstBySolicitudIdOrderByVersionDesc(id).orElse(null) : null, creada))
            .orElse(null));
    }

    public Map<String,Object> contenido(Propuesta p) {
        Map<String,Object> d=new LinkedHashMap<>();
        d.put("objetivo", p.getObjetivo()); d.put("historia", p.getHistoria());
        d.put("acciones", lista(p.getAcciones())); d.put("reglas", lista(p.getReglas()));
        d.put("retos", lista(p.getRetos())); d.put("ayudas", lista(p.getAyudas()));
        d.put("recursos", p.getRecursos() == null ? null : lista(p.getRecursos()));
        // HU28: "orden", "solo_clase" o null si la propuesta no eligió regla.
        d.put("regla_juego", p.getReglaJuego());
        // «laberinto», «otro» o null (propuestas anteriores). El panel solo deja generar lo
        // que Kusi sabe construir hoy.
        d.put("tipo_juego", p.getTipoJuego());
        d.put("se_puede_generar", p.sePuedeGenerar());
        return d;
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
