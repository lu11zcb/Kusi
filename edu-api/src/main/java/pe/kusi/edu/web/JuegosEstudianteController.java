package pe.kusi.edu.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.ActividadesEstudianteService;
import pe.kusi.edu.service.MonedasEstudianteService;
import pe.kusi.edu.service.SalonEstudianteService;
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
    private final MonedasEstudianteService monedas;
    private final SalonEstudianteService salon;
    public JuegosEstudianteController(DjangoInternoClient django, ActividadesEstudianteService actividades,
                                      MonedasEstudianteService monedas, SalonEstudianteService salon) {
        this.django = django; this.actividades = actividades;
        this.monedas = monedas; this.salon = salon;
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
        UUID id = estudiante(sesion);
        // Los puntos propios y, si el estudiante tiene sección, el podio y la meta de su salón.
        Map<String, Object> cuerpo = new LinkedHashMap<>(actividades.logros(id));
        cuerpo.putAll(salon.salon(id));
        return sinCache(cuerpo);
    }
    @PostMapping("/apariencia/")
    public ResponseEntity<Map<String, Object>> apariencia(@CookieValue(value = "sessionid", required = false) String sesion,
                                                          @RequestBody JsonNode datos) {
        salon.guardarApariencia(estudiante(sesion), datos);
        return sinCache(Map.of("guardado", true));
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
    @GetMapping("/monedas/")
    public ResponseEntity<Map<String, Object>> saldo(@CookieValue(value = "sessionid", required = false) String sesion) {
        return sinCache(Map.of("saldo", monedas.saldo(estudiante(sesion))));
    }
    @GetMapping("/tienda/")
    public ResponseEntity<Map<String, Object>> tienda(@CookieValue(value = "sessionid", required = false) String sesion) {
        return sinCache(Map.of("prendas", monedas.tienda(estudiante(sesion))));
    }
    @PostMapping("/tienda/compras/")
    public ResponseEntity<Map<String, Object>> comprar(@CookieValue(value = "sessionid", required = false) String sesion,
                                                       @RequestBody JsonNode datos) {
        UUID estudiante = estudiante(sesion);
        JsonNode prenda = datos.path("prenda_id");
        if (!datos.isObject() || datos.size() != 1 || !prenda.isTextual() || prenda.asText().isBlank()) {
            throw new IllegalArgumentException("Indica solo la prenda que quieres comprar.");
        }
        return sinCache(monedas.comprar(estudiante, prenda.asText()));
    }
    private ResponseEntity<Map<String, Object>> sinCache(Map<String, Object> datos) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(datos);
    }
}
