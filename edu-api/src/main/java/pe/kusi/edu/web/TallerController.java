package pe.kusi.edu.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.TrabajoTaller;
import pe.kusi.edu.service.TallerService;
import pe.kusi.edu.taller.EntregaTallerInvalida;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// Las rutas del trabajador del taller, que corre en la Mac. Están fuera de /api/edu/
// porque no las usa un navegador: no llevan sesión ni CSRF, sino la clave del taller
// en el encabezado X-Taller-Clave, que se compara con TALLER_CLAVE del .env.
@RestController
@RequestMapping("/interno/taller/trabajos")
public class TallerController {

    private final TallerService taller;
    private final ObjectMapper json;
    @Value("${kusi.taller-clave:}") private String claveTaller;

    public TallerController(TallerService taller, ObjectMapper json) {
        this.taller = taller;
        this.json = json;
    }

    // Sin TALLER_CLAVE el buzón no atiende a nadie (503). Con clave, se compara en tiempo
    // constante, igual que CsrfEducativo, para no dar pistas de cuántos caracteres acertó.
    private void autorizar(String clave) {
        if (claveTaller == null || claveTaller.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "El buzón del taller no está configurado: falta TALLER_CLAVE.");
        }
        if (clave == null || !MessageDigest.isEqual(
                claveTaller.getBytes(StandardCharsets.UTF_8), clave.getBytes(StandardCharsets.UTF_8))) {
            throw new SecurityException("Servicio no autorizado.");
        }
    }

    // Toma el trabajo pendiente más antiguo. 204 si no hay ninguno.
    @PostMapping("/siguiente")
    public ResponseEntity<Map<String, Object>> siguiente(
            @RequestHeader(value = "X-Taller-Clave", required = false) String clave) {
        autorizar(clave);
        Optional<TrabajoTaller> trabajo = taller.siguiente();
        if (trabajo.isEmpty()) {
            return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
        }
        return sinCache(200, Map.of("trabajo", dtoTrabajo(trabajo.get())));
    }

    // La biblioteca del supervisor: los juegos del taller enviados a una clase, con sus piezas aprobadas.
    @GetMapping("/biblioteca")
    public ResponseEntity<Map<String, Object>> biblioteca(
            @RequestHeader(value = "X-Taller-Clave", required = false) String clave) {
        autorizar(clave);
        return sinCache(200, Map.of("juegos", taller.biblioteca()));
    }

    // { paquete, piezas, evidencia }. 422 con los motivos si el guion no pasa.
    @PostMapping("/{id}/resultado")
    public ResponseEntity<Map<String, Object>> resultado(
            @RequestHeader(value = "X-Taller-Clave", required = false) String clave,
            @PathVariable UUID id,
            @RequestBody(required = false) String cuerpo) {
        // El cuerpo se lee después de la clave: sin clave no se procesa nada.
        autorizar(clave);
        Generacion generacion = taller.resultado(id, leer(cuerpo));
        return sinCache(200, Map.of(
                "trabajo", Map.of("id", id, "estado", "listo"),
                "generacion", Map.of("id", generacion.getId(), "estado", generacion.getEstado())));
    }

    // { motivo }. El motivo es interno: el docente nunca lo ve.
    @PostMapping("/{id}/fallo")
    public ResponseEntity<Map<String, Object>> fallo(
            @RequestHeader(value = "X-Taller-Clave", required = false) String clave,
            @PathVariable UUID id,
            @RequestBody(required = false) String cuerpo) {
        autorizar(clave);
        JsonNode datos = leer(cuerpo);
        String motivo = datos != null && datos.path("motivo").isTextual() ? datos.path("motivo").asText() : null;
        Generacion generacion = taller.fallo(id, motivo);
        return sinCache(200, Map.of(
                "trabajo", Map.of("id", id, "estado", "fallido"),
                "generacion", Map.of("id", generacion.getId(), "estado", generacion.getEstado())));
    }

    @ExceptionHandler(EntregaTallerInvalida.class)
    public ResponseEntity<Map<String, Object>> entregaInvalida(EntregaTallerInvalida ex) {
        return sinCache(422, Map.of(
                "mensaje", "El guion no pasó la revisión. Corrige estos motivos y vuelve a entregarlo.",
                "motivos", ex.getMotivos()));
    }

    private JsonNode leer(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return null;
        try {
            return json.readTree(cuerpo);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("El cuerpo no es un JSON válido.");
        }
    }

    // Lo que necesita el trabajador para empezar: la propuesta aprobada y los datos del
    // tema, sin nombres ni datos de estudiantes (el buzón nunca los guardó).
    private Map<String, Object> dtoTrabajo(TrabajoTaller trabajo) {
        Map<String, Object> datos = new LinkedHashMap<>();
        datos.put("id", trabajo.getId());
        datos.put("tipo", trabajo.getTipo());
        datos.put("intentos", trabajo.getIntentos());
        datos.put("creado_en", trabajo.getCreadoEn());
        datos.put("tomado_en", trabajo.getTomadoEn());
        datos.put("entrada", leer(trabajo.getDatosEntrada()));
        return datos;
    }

    private ResponseEntity<Map<String, Object>> sinCache(int estado, Map<String, Object> cuerpo) {
        return ResponseEntity.status(estado).cacheControl(CacheControl.noStore()).body(cuerpo);
    }
}
