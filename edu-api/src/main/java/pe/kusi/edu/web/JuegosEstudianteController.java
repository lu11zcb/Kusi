package pe.kusi.edu.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.ActividadesEstudianteService;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/edu/estudiante")
public class JuegosEstudianteController {
    private final DjangoInternoClient django;
    private final ActividadesEstudianteService actividades;
    public JuegosEstudianteController(DjangoInternoClient django, ActividadesEstudianteService actividades) {
        this.django = django; this.actividades = actividades;
    }

    private UUID estudiante(String sesion) {
        Map<String, Object> usuario = django.validarSesion(sesion);
        if (!(usuario.get("roles") instanceof List<?> roles) || !roles.contains("estudiante")) throw new SecurityException("Esta biblioteca es para estudiantes.");
        return UUID.fromString(usuario.get("id").toString());
    }
    @GetMapping("/juegos/")
    public ResponseEntity<Map<String, Object>> juegos(@CookieValue(value = "sessionid", required = false) String sesion) {
        return sinCache(Map.of("juegos", actividades.juegos(estudiante(sesion))));
    }
    @GetMapping("/logros/")
    public ResponseEntity<Map<String, Object>> logros(@CookieValue(value = "sessionid", required = false) String sesion) {
        return sinCache(actividades.logros(estudiante(sesion)));
    }
    @GetMapping("/juegos/{id}/avance/")
    public ResponseEntity<Map<String, Object>> avance(@CookieValue(value = "sessionid", required = false) String sesion, @PathVariable UUID id) {
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("avance", actividades.avance(estudiante(sesion), id));
        return sinCache(cuerpo);
    }
    @PostMapping("/juegos/{id}/avance/")
    public ResponseEntity<Map<String, Object>> guardarAvance(@CookieValue(value = "sessionid", required = false) String sesion,
                                                          @PathVariable UUID id, @RequestBody JsonNode datos) {
        return sinCache(Map.of("guardado", true, "avance", actividades.guardarAvance(estudiante(sesion), id, datos)));
    }
    @PostMapping("/juegos/{id}/visto/")
    public ResponseEntity<Map<String, Object>> visto(@CookieValue(value = "sessionid", required = false) String sesion, @PathVariable UUID id) {
        actividades.visto(estudiante(sesion), id);
        return sinCache(Map.of("guardado", true));
    }
    private ResponseEntity<Map<String, Object>> sinCache(Map<String, Object> datos) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(datos);
    }
}
