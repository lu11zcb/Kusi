package pe.kusi.edu.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.PropuestasService;
import java.util.*;

// Rutas del panel docente (mismo origen vía Vite). La identidad sale siempre de la
// sesión Django validada; nunca de un docente_id enviado por el navegador.
@RestController
@RequestMapping("/api/edu")
public class PropuestasController {
    private final PropuestasService servicio;
    private final DjangoInternoClient django;

    public PropuestasController(PropuestasService servicio, DjangoInternoClient django) { this.servicio=servicio; this.django=django; }

    @GetMapping("/acceso/csrf/")
    public ResponseEntity<Map<String,String>> csrf(HttpServletRequest request, HttpServletResponse response) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("csrf_token", CsrfEducativo.tokenPara(request, response)));
    }

    // HU11 (app móvil): confirma que la sesión Django corresponde a un estudiante con contraseña definitiva.
    @GetMapping("/acceso/estudiante/")
    public ResponseEntity<Map<String,Object>> estudiante(@CookieValue(value="sessionid", required=false) String sesion) {
        Map<String,Object> usuario=django.validarSesion(sesion);
        if (!(usuario.get("roles") instanceof List<?> roles) || !roles.contains("estudiante")) throw new SecurityException("Esta app es para estudiantes.");
        Map<String,Object> datos=new LinkedHashMap<>();
        datos.put("id", usuario.get("id")); datos.put("nombre", usuario.get("nombre")); datos.put("roles", roles);
        datos.put("debe_cambiar_contrasena", false);
        return sinCache(200, Map.of("usuario", datos));
    }

    @GetMapping("/contexto/propuestas/")
    public ResponseEntity<Map<String,Object>> contexto(@CookieValue(value="sessionid", required=false) String sesion) {
        UUID docente=docente(sesion);
        return sinCache(200, Map.of("contextos", servicio.contextos(docente), "ia_configurada", servicio.iaConfigurada()));
    }

    @PostMapping("/propuestas/solicitudes/")
    public ResponseEntity<Map<String,Object>> crear(@CookieValue(value="sessionid", required=false) String sesion, @Valid @RequestBody NuevaSolicitud body) {
        UUID docente=docente(sesion);
        PropuestasService.Respuesta r=servicio.crear(docente, body.id_solicitud(), body.curso_id(), body.seccion_id(), body.tema(), body.objetivo());
        return sinCache(r.creada() ? 201 : 200, Map.of("solicitud", dto(r)));
    }

    @GetMapping("/propuestas/solicitudes/{id}/")
    public ResponseEntity<Map<String,Object>> consultar(@CookieValue(value="sessionid", required=false) String sesion, @PathVariable UUID id) {
        return sinCache(200, Map.of("solicitud", dto(servicio.consultar(docente(sesion), id))));
    }

    @PostMapping("/propuestas/solicitudes/{id}/reintentar/")
    public ResponseEntity<Map<String,Object>> reintentar(@CookieValue(value="sessionid", required=false) String sesion, @PathVariable UUID id) {
        return sinCache(200, Map.of("solicitud", dto(servicio.reintentar(docente(sesion), id))));
    }

    private UUID docente(String sesion) {
        Map<String,Object> usuario=django.validarSesion(sesion);
        if (!(usuario.get("roles") instanceof List<?> roles) || !roles.contains("docente")) throw new SecurityException("Esta operación requiere el rol docente.");
        return UUID.fromString(String.valueOf(usuario.get("id")));
    }

    private ResponseEntity<Map<String,Object>> sinCache(int estado, Map<String,Object> cuerpo) {
        return ResponseEntity.status(estado).cacheControl(CacheControl.noStore()).body(cuerpo);
    }

    private Map<String,Object> dto(PropuestasService.Respuesta r) {
        Map<String,Object> s=new LinkedHashMap<>();
        s.put("id_solicitud", r.solicitud().getId());
        s.put("curso_id", r.solicitud().getCursoId());
        s.put("seccion_id", r.solicitud().getSeccionId());
        s.put("tema", r.solicitud().getTema());
        s.put("objetivo_docente", r.solicitud().getObjetivoDocente());
        s.put("estado", r.solicitud().getEstado());
        s.put("propuesta", r.propuesta() == null ? null : propuesta(r.propuesta()));
        return s;
    }

    private Map<String,Object> propuesta(Propuesta p) {
        Map<String,Object> d=new LinkedHashMap<>();
        d.put("id", p.getId()); d.put("objetivo", p.getObjetivo()); d.put("origen_objetivo", p.getOrigenObjetivo()); d.put("historia", p.getHistoria());
        d.put("acciones", servicio.lista(p.getAcciones())); d.put("reglas", servicio.lista(p.getReglas()));
        d.put("retos", servicio.lista(p.getRetos())); d.put("ayudas", servicio.lista(p.getAyudas()));
        return d;
    }

    public record NuevaSolicitud(@NotNull UUID id_solicitud, @NotNull UUID curso_id, UUID seccion_id, String tema, String objetivo) {}
}
