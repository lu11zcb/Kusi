package pe.kusi.edu.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.JuegosAdministracionService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/edu/administracion/juegos")
public class JuegosAdministracionController {
    private final DjangoInternoClient django;
    private final JuegosAdministracionService juegos;

    public JuegosAdministracionController(DjangoInternoClient django, JuegosAdministracionService juegos) {
        this.django = django;
        this.juegos = juegos;
    }

    @GetMapping("/")
    public ResponseEntity<JuegosAdministracionService.Resumen> resumen(
            @CookieValue(value = "sessionid", required = false) String sesion) {
        django.validarAdministrador(sesion);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(juegos.resumen());
    }

    private record JuegosDocente(List<JuegosAdministracionService.Juego> juegos) {}

    @GetMapping("/{docente}/")
    public ResponseEntity<JuegosDocente> juegosDe(
            @CookieValue(value = "sessionid", required = false) String sesion, @PathVariable UUID docente) {
        // Conocer el UUID del docente, incluso el propio, no concede este acceso.
        django.validarAdministrador(sesion);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new JuegosDocente(juegos.juegosDe(docente)));
    }
}
