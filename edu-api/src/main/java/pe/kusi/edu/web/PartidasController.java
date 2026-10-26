package pe.kusi.edu.web;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.PartidasService;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/edu/partidas")
public class PartidasController {
    private final PartidasService partidas;
    private final DjangoInternoClient django;
    public PartidasController(PartidasService partidas, DjangoInternoClient django) { this.partidas = partidas; this.django = django; }

    private Map<String, Object> jugador(String sesion) {
        Map<String, Object> usuario = django.validarSesion(sesion);
        if (!(usuario.get("roles") instanceof List<?> roles) || (!roles.contains("estudiante") && !roles.contains("docente"))) {
            throw new SecurityException("Solo un estudiante o un docente puede registrar su partida.");
        }
        return usuario;
    }

    @PostMapping("/avisos/")
    public Map<String, Object> guardar(@CookieValue(value = "sessionid", required = false) String sesion, @RequestBody JsonNode datos) {
        Map<String, Object> usuario = jugador(sesion);
        List<?> roles = (List<?>) usuario.get("roles");
        // El cliente no puede hacerse pasar por otro estudiante ni quitar la marca
        // de prueba al docente: ambos datos se calculan en el servidor.
        return partidas.guardar(UUID.fromString(usuario.get("id").toString()), !roles.contains("estudiante"), datos.path("aviso"));
    }

    @GetMapping("/{id}/")
    public Map<String, Object> resumen(@CookieValue(value = "sessionid", required = false) String sesion, @PathVariable String id) {
        Map<String, Object> usuario = jugador(sesion);
        return Map.of("resumen", partidas.resumen(UUID.fromString(usuario.get("id").toString()), id));
    }
}
