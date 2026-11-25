package pe.kusi.edu.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.kusi.edu.service.DetalleJuegoAdministracionService;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.JuegosAdministracionService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/edu/administracion/juegos")
public class JuegosAdministracionController {
    private final DjangoInternoClient django;
    private final JuegosAdministracionService juegos;
    private final DetalleJuegoAdministracionService detalles;

    public JuegosAdministracionController(DjangoInternoClient django, JuegosAdministracionService juegos,
                                          DetalleJuegoAdministracionService detalles) {
        this.django = django;
        this.juegos = juegos;
        this.detalles = detalles;
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

    // Lo que escribió el docente, las versiones con sus correcciones y cada guion con sus
    // comprobaciones. Solo el administrador; el docente ve únicamente su juego.
    @GetMapping("/detalle/{juego}/")
    public ResponseEntity<DetalleJuegoAdministracionService.Detalle> detalle(
            @CookieValue(value = "sessionid", required = false) String sesion, @PathVariable UUID juego) {
        django.validarAdministrador(sesion);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(detalles.detalle(juego));
    }
}
