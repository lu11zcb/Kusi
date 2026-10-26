package pe.kusi.edu.web;

import org.springframework.data.domain.PageRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.SolicitudPropuestaRepository;
import pe.kusi.edu.service.DjangoInternoClient;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/edu/estudiante")
public class JuegosEstudianteController {
    private final GeneracionRepository generaciones;
    private final SolicitudPropuestaRepository solicitudes;
    private final DjangoInternoClient django;
    public JuegosEstudianteController(GeneracionRepository generaciones, SolicitudPropuestaRepository solicitudes, DjangoInternoClient django) {
        this.generaciones = generaciones; this.solicitudes = solicitudes; this.django = django;
    }
    @GetMapping("/juegos/")
    public ResponseEntity<Map<String, Object>> juegos(@CookieValue(value = "sessionid", required = false) String sesion) {
        Map<String, Object> usuario = django.validarSesion(sesion);
        if (!(usuario.get("roles") instanceof List<?> roles) || !roles.contains("estudiante")) throw new SecurityException("Esta biblioteca es para estudiantes.");
        UUID estudiante = UUID.fromString(usuario.get("id").toString());
        List<Map<String, Object>> juegos = generaciones.juegosDelEstudiante(estudiante, PageRequest.of(0, 5)).stream()
                .map(generacion -> Map.<String, Object>of("id", generacion.getId(), "titulo",
                        solicitudes.findById(generacion.getSolicitudId()).orElseThrow().getTema(), "paquete", generacion.getPaquete())).toList();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("juegos", juegos));
    }
}
