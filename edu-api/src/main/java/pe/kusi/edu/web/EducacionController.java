package pe.kusi.edu.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.model.*;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.DjangoInternoClient;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.*;

@RestController
@RequestMapping("/interno")
public class EducacionController {
    private final SeccionRepository secciones;
    private final VinculoEstudianteRepository vinculos;
    private final AsignacionDocenteRepository asignaciones;
    private final DjangoInternoClient django;
    @Value("${kusi.internal-key:}") private String claveInterna;

    public EducacionController(SeccionRepository secciones, VinculoEstudianteRepository vinculos, AsignacionDocenteRepository asignaciones, DjangoInternoClient django) {
        this.secciones=secciones; this.vinculos=vinculos; this.asignaciones=asignaciones; this.django=django;
    }

    private Map<String,Object> autorizar(String clave, String sesion) {
        if (claveInterna == null || claveInterna.isBlank() || clave == null || !java.security.MessageDigest.isEqual(claveInterna.getBytes(java.nio.charset.StandardCharsets.UTF_8), clave.getBytes(java.nio.charset.StandardCharsets.UTF_8))) throw new SecurityException("Servicio no autorizado.");
        return django.validarAdministrador(sesion);
    }

    @GetMapping("/secciones/") @Transactional(readOnly=true)
    public Map<String,Object> listarSecciones(@RequestHeader(value="X-Clave-Interna", required=false) String clave,
        @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion) {
        autorizar(clave, sesion);
        return Map.of("secciones", secciones.findAll().stream()
            .sorted(Comparator.comparingInt(Seccion::getAnioEscolar).reversed().thenComparing(Seccion::getNombre))
            .map(this::seccionDto).toList());
    }

    @PostMapping("/secciones/")
    public ResponseEntity<?> crearSeccion(@RequestHeader(value="X-Clave-Interna", required=false) String clave,
        @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion, @Valid @RequestBody CrearSeccion body) {
        autorizar(clave, sesion);
        if (body.grado() != 1 || body.anio_escolar() < 1000 || body.anio_escolar() > 9999) return ResponseEntity.badRequest().body(Map.of("mensaje", "Indica primero de primaria y un año escolar de cuatro cifras."));
        Seccion nueva = new Seccion(body.nombre(), body.grado(), body.anio_escolar());
        if (secciones.existsByNombreClaveAndAnioEscolar(nueva.getNombreClave(), body.anio_escolar())) return ResponseEntity.status(409).body(Map.of("mensaje", "Ya existe una sección con ese nombre en el mismo año escolar."));
        return ResponseEntity.status(201).body(Map.of("seccion", seccionDto(secciones.save(nueva))));
    }

    @PostMapping("/vinculos-estudiantes/") @Transactional
    public ResponseEntity<?> vincularEstudiante(@RequestHeader(value="X-Clave-Interna", required=false) String clave,
        @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion, @Valid @RequestBody VincularEstudiante body) {
        Map<String,Object> admin=autorizar(clave,sesion);
        django.validarCuenta(body.estudiante_id(), "estudiante");
        Seccion seccion=secciones.findById(body.seccion_id()).orElseThrow(() -> new IllegalArgumentException("La sección indicada no existe."));
        if (body.anio_escolar() != seccion.getAnioEscolar()) return ResponseEntity.badRequest().body(Map.of("mensaje", "El año escolar debe coincidir con el de la sección."));
        if (vinculos.existsByEstudianteIdAndSeccion_IdAndAnioEscolar(body.estudiante_id(), body.seccion_id(), body.anio_escolar())) return ResponseEntity.status(409).body(Map.of("mensaje", "El estudiante ya está vinculado a esa sección en ese año escolar."));
        UUID adminId=UUID.fromString((String)admin.get("id"));
        VinculoEstudiante saved=vinculos.saveAndFlush(new VinculoEstudiante(body.estudiante_id(), seccion, body.anio_escolar(), adminId));
        return ResponseEntity.status(201).body(Map.of("vinculo", vinculoDto(saved)));
    }

    @GetMapping("/vinculos-estudiantes/") @Transactional(readOnly=true)
    public Map<String,Object> listarVinculos(@RequestHeader(value="X-Clave-Interna", required=false) String clave, @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion) {
        autorizar(clave,sesion); return Map.of("vinculos", vinculos.findAll().stream().map(this::vinculoDto).toList());
    }

    @PostMapping("/asignaciones-docentes/") @Transactional
    public ResponseEntity<?> asignarDocente(@RequestHeader(value="X-Clave-Interna", required=false) String clave,
        @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion, @Valid @RequestBody AsignarDocente body) {
        Map<String,Object> admin=autorizar(clave,sesion);
        django.validarCuenta(body.docente_id(), "docente"); django.validarCurso(body.curso_id());
        Seccion seccion=secciones.findById(body.seccion_id()).orElseThrow(() -> new IllegalArgumentException("La sección indicada no existe."));
        if (body.anio_escolar() != seccion.getAnioEscolar()) return ResponseEntity.badRequest().body(Map.of("mensaje", "El año escolar debe coincidir con el de la sección."));
        if (asignaciones.existsByDocenteIdAndCursoIdAndSeccion_IdAndAnioEscolar(body.docente_id(),body.curso_id(),body.seccion_id(),body.anio_escolar())) return ResponseEntity.status(409).body(Map.of("mensaje", "Esta asignación docente ya existe."));
        UUID adminId=UUID.fromString((String)admin.get("id"));
        AsignacionDocente saved=asignaciones.saveAndFlush(new AsignacionDocente(body.docente_id(),body.curso_id(),seccion,body.anio_escolar(),adminId));
        return ResponseEntity.status(201).body(Map.of("asignacion", asignacionDto(saved)));
    }

    @GetMapping("/asignaciones-docentes/") @Transactional(readOnly=true)
    public Map<String,Object> listarAsignaciones(@RequestHeader(value="X-Clave-Interna", required=false) String clave, @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion) {
        autorizar(clave,sesion); return Map.of("asignaciones", asignaciones.findAll().stream().map(this::asignacionDto).toList());
    }

    // Las consultas docentes se filtran por su UUID autenticado; no existe una ruta de listado global para docentes.
    @GetMapping("/docentes/{docenteId}/recursos/") @Transactional(readOnly=true)
    public Map<String,Object> recursosDocente(@RequestHeader(value="X-Clave-Interna", required=false) String clave,
        @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion, @PathVariable UUID docenteId) {
        if (claveInterna == null || claveInterna.isBlank() || clave == null || !java.security.MessageDigest.isEqual(claveInterna.getBytes(java.nio.charset.StandardCharsets.UTF_8), clave.getBytes(java.nio.charset.StandardCharsets.UTF_8))) throw new SecurityException("Servicio no autorizado.");
        Map<String,Object> usuario=django.validarSesion(sesion);
        Object rolesValue=usuario.get("roles");
        if (!(rolesValue instanceof List<?> roles) || !roles.contains("docente") || !Objects.equals(String.valueOf(usuario.get("id")), docenteId.toString())) throw new SecurityException("Solo puedes consultar tus recursos asignados.");
        return Map.of("asignaciones", asignaciones.findAllByDocenteId(docenteId).stream().map(this::asignacionDto).toList());
    }

    @GetMapping("/docentes/{docenteId}/estudiantes/") @Transactional(readOnly=true)
    public Map<String,Object> estudiantesDocente(
        @RequestHeader(value="X-Clave-Interna", required=false) String clave,
        @RequestHeader(value="X-Sesion-Kusi", required=false) String sesion,
        @PathVariable UUID docenteId) {

        if (claveInterna == null || claveInterna.isBlank() || clave == null ||
            !java.security.MessageDigest.isEqual(
                claveInterna.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                clave.getBytes(java.nio.charset.StandardCharsets.UTF_8))) {
            throw new SecurityException("Servicio no autorizado.");
        }

        Map<String,Object> usuario = django.validarSesion(sesion);
        Object rolesValue = usuario.get("roles");

        if (!(rolesValue instanceof List<?> roles) ||
            !roles.contains("docente") ||
            !Objects.equals(String.valueOf(usuario.get("id")), docenteId.toString())) {
            throw new SecurityException("Solo puedes consultar estudiantes de tus secciones asignadas.");
        }

        return Map.of("estudiantes",
            vinculos.findEstudiantesDeSeccionesAsignadas(docenteId)
                .stream().map(this::vinculoDto).toList());
    }


    private Map<String,Object> seccionDto(Seccion s){return Map.of("id",s.getId(),"nombre",s.getNombre(),"grado",s.getGrado(),"anio_escolar",s.getAnioEscolar());}
    private Map<String,Object> vinculoDto(VinculoEstudiante v){return Map.of("id",v.getId(),"estudiante_id",v.getEstudianteId(),"seccion",seccionDto(v.getSeccion()),"anio_escolar",v.getAnioEscolar(),"creado_en",v.getCreadoEn());}
    private Map<String,Object> asignacionDto(AsignacionDocente a){return Map.of("id",a.getId(),"docente_id",a.getDocenteId(),"curso_id",a.getCursoId(),"seccion",seccionDto(a.getSeccion()),"anio_escolar",a.getAnioEscolar(),"creado_en",a.getCreadoEn());}

    public record CrearSeccion(@NotBlank @Size(max=80) String nombre, @Min(1) @Max(1) int grado, @Min(1000) @Max(9999) int anio_escolar) {}
    public record VincularEstudiante(@NotNull UUID estudiante_id, @NotNull UUID seccion_id, @Min(1000) @Max(9999) int anio_escolar) {}
    public record AsignarDocente(@NotNull UUID docente_id, @NotNull UUID curso_id, @NotNull UUID seccion_id, @Min(1000) @Max(9999) int anio_escolar) {}
}
