package pe.kusi.edu.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.service.KusiSabioService;
import pe.kusi.edu.taller.EntregaTallerInvalida;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// Las preguntas a «Kusi Sabio», vistas desde el taller de la Mac. Igual que el buzón de trabajos: sin sesión ni CSRF,
// con la clave del taller en el encabezado X-Taller-Clave.
@RestController
@RequestMapping("/interno/taller/consultas")
public class ConsultasTallerController {
    private final KusiSabioService sabio;
    private final ObjectMapper json;
    @Value("${kusi.taller-clave:}") private String claveTaller;

    public ConsultasTallerController(KusiSabioService sabio, ObjectMapper json) {
        this.sabio = sabio;
        this.json = json;
    }

    private void autorizar(String clave) {
        if (claveTaller == null || claveTaller.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "El buzón del taller no está configurado: falta TALLER_CLAVE.");
        }
        if (clave == null || !MessageDigest.isEqual(claveTaller.getBytes(StandardCharsets.UTF_8), clave.getBytes(StandardCharsets.UTF_8))) {
            throw new SecurityException("Servicio no autorizado.");
        }
    }

    // La pregunta pendiente más antigua: { consulta: { id, con_actividad, contexto } }. 204 si no hay.
    @PostMapping("/siguiente")
    public ResponseEntity<Map<String, Object>> siguiente(@RequestHeader(value = "X-Taller-Clave", required = false) String clave) {
        autorizar(clave);
        Optional<Map<String, Object>> consulta = sabio.siguiente();
        if (consulta.isEmpty()) return ResponseEntity.noContent().cacheControl(CacheControl.noStore()).build();
        return sinCache(200, Map.of("consulta", consulta.get()));
    }

    // { texto, graficos, mostrar_quienes_necesitan_ayuda }. 422 con motivos si no tiene esa forma.
    @PostMapping("/{id}/respuesta")
    public ResponseEntity<Map<String, Object>> respuesta(@RequestHeader(value = "X-Taller-Clave", required = false) String clave,
                                                         @PathVariable UUID id, @RequestBody(required = false) String cuerpo) {
        autorizar(clave);
        sabio.responder(id, leer(cuerpo));
        return sinCache(200, Map.of("consulta", Map.of("id", id, "estado", "lista")));
    }

    // { motivo }. Responde la reserva.
    @PostMapping("/{id}/fallo")
    public ResponseEntity<Map<String, Object>> fallo(@RequestHeader(value = "X-Taller-Clave", required = false) String clave,
                                                     @PathVariable UUID id, @RequestBody(required = false) String cuerpo) {
        autorizar(clave);
        JsonNode datos = leer(cuerpo);
        sabio.fallar(id, datos != null && datos.path("motivo").isTextual() ? datos.path("motivo").asText() : null);
        return sinCache(200, Map.of("consulta", Map.of("id", id, "estado", "respaldo")));
    }

    @ExceptionHandler(EntregaTallerInvalida.class)
    public ResponseEntity<Map<String, Object>> entregaInvalida(EntregaTallerInvalida ex) {
        return sinCache(422, Map.of("mensaje", "La respuesta no tiene la forma pedida.", "motivos", ex.getMotivos()));
    }

    private JsonNode leer(String cuerpo) {
        if (cuerpo == null || cuerpo.isBlank()) return null;
        try { return json.readTree(cuerpo); }
        catch (Exception ilegible) { throw new IllegalArgumentException("El cuerpo no es un JSON válido."); }
    }

    private ResponseEntity<Map<String, Object>> sinCache(int estado, Map<String, Object> datos) {
        return ResponseEntity.status(estado).cacheControl(CacheControl.noStore()).body(datos);
    }
}
