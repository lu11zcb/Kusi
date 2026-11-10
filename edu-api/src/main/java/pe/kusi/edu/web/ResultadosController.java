package pe.kusi.edu.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.ResultadosService;
import java.util.*;

@RestController
@RequestMapping("/api/edu/resultados")
public class ResultadosController {
    private final ResultadosService resultados;
    private final DjangoInternoClient django;
    public ResultadosController(ResultadosService resultados, DjangoInternoClient django) { this.resultados = resultados; this.django = django; }

    private UUID docente(String sesion) {
        Map<String, Object> usuario = django.validarSesion(sesion);
        if (!(usuario.get("roles") instanceof List<?> roles) || !roles.contains("docente") || roles.contains("administrador"))
            throw new SecurityException("Los resultados son solo para el docente de la sección.");
        return UUID.fromString(usuario.get("id").toString());
    }
    private ResponseEntity<Map<String, Object>> respuesta(String clave, Object valor) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of(clave, valor));
    }
    @GetMapping("/actividades/")
    public ResponseEntity<Map<String, Object>> actividades(@CookieValue(value = "sessionid", required = false) String sesion) {
        return respuesta("actividades", resultados.actividades(docente(sesion)));
    }
    @GetMapping("/actividades/{actividad}/estudiantes/")
    public ResponseEntity<Map<String, Object>> estudiantes(@CookieValue(value = "sessionid", required = false) String sesion, @PathVariable UUID actividad) {
        return respuesta("estudiantes", resultados.estudiantes(docente(sesion), actividad));
    }
    @GetMapping("/actividades/{actividad}/estudiantes/{estudiante}/")
    public ResponseEntity<Map<String, Object>> respuestas(@CookieValue(value = "sessionid", required = false) String sesion,
                                                        @PathVariable UUID actividad, @PathVariable UUID estudiante) {
        return respuesta("partidas", resultados.respuestas(docente(sesion), actividad, estudiante));
    }
}
