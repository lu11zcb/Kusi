package pe.kusi.edu.web;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.service.ConsultaKusiService;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.KusiSabioService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** «Kusi Sabio»: el docente pregunta sobre su clase o sobre el panel, y el panel consulta hasta que la respuesta está lista. */
@RestController
@RequestMapping("/api/edu/sabio")
public class KusiSabioController {
    private final DjangoInternoClient django;
    private final KusiSabioService sabio;

    public KusiSabioController(DjangoInternoClient django, KusiSabioService sabio) {
        this.django = django;
        this.sabio = sabio;
    }

    private UUID docente(String sesion) {
        Map<String, Object> usuario = django.validarSesion(sesion);
        if (!(usuario.get("roles") instanceof List<?> roles) || !roles.contains("docente") || roles.contains("administrador"))
            throw new SecurityException("Kusi Sabio es solo para el docente.");
        return UUID.fromString(usuario.get("id").toString());
    }

    // { pregunta, historial: [{ pregunta, respuesta }] }. Kusi Sabio conoce las actividades recientes del docente y elige de
    // cuál habla según la pregunta; también responde sobre cómo usar el panel.
    @PostMapping("/consultas/")
    public ResponseEntity<Map<String, Object>> preguntar(@CookieValue(value = "sessionid", required = false) String sesion,
                                                         @RequestBody JsonNode datos) {
        UUID docente = docente(sesion);
        if (datos == null || !datos.isObject()) throw new IllegalArgumentException("Escribe tu pregunta.");
        List<ConsultaKusiService.Turno> historial = new ArrayList<>();
        JsonNode turnos = datos.path("historial");
        if (!turnos.isMissingNode() && !turnos.isArray()) throw new IllegalArgumentException("El historial debe ser una lista.");
        turnos.forEach(turno -> historial.add(new ConsultaKusiService.Turno(
                turno.path("pregunta").asText(null), turno.path("respuesta").asText(null))));
        ConsultaKusiService.Pregunta pregunta = new ConsultaKusiService.Pregunta(
                datos.path("pregunta").isTextual() ? datos.path("pregunta").asText() : null, historial);
        return sinCache(sabio.crear(docente, pregunta));
    }

    @GetMapping("/consultas/{id}/")
    public ResponseEntity<Map<String, Object>> consultar(@CookieValue(value = "sessionid", required = false) String sesion,
                                                         @PathVariable UUID id) {
        return sinCache(sabio.consultar(docente(sesion), id));
    }

    private ResponseEntity<Map<String, Object>> sinCache(Map<String, Object> datos) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(datos);
    }
}
