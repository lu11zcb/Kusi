package pe.kusi.edu;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pe.kusi.edu.ia.GeneradorGuion;
import pe.kusi.edu.ia.GeneradorPropuestas;
import pe.kusi.edu.laberinto.GuionesDePrueba;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.GeneracionesService;
import pe.kusi.edu.service.PropuestasService;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/** Verifica el recorrido existente sin cambiar el código que lleva el taller. */
@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:kusi_correcciones;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.config.import="})
@ActiveProfiles("test")
class CorreccionesJuegoTest {
    @Autowired PropuestasService propuestas;
    @Autowired GeneracionesService generaciones;
    @Autowired PropuestaRepository versiones;
    @Autowired GeneracionRepository juegos;
    @Autowired EtapaGeneracionRepository etapas;
    @Autowired SeccionRepository secciones;
    @Autowired AsignacionDocenteRepository asignaciones;
    @MockitoBean DjangoInternoClient django;
    @MockitoBean GeneradorPropuestas ideas;
    @MockitoBean GeneradorGuion guiones;

    @Test
    void elCambioDelChatConservaLoAnteriorPeroNecesitaAprobacionYComprobacionesNuevas() throws Exception {
        UUID docente = UUID.randomUUID(), curso = UUID.randomUUID(), actividad = UUID.randomUUID();
        Seccion seccion = secciones.saveAndFlush(new Seccion("Primero A", 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(docente, curso, seccion, 2026, docente));
        when(django.nombreCurso(curso)).thenReturn("Matemática");
        when(ideas.configurado()).thenReturn(true);
        when(ideas.proveedor()).thenReturn("prueba"); when(ideas.modelo()).thenReturn("prueba");
        when(ideas.generar(any())).thenReturn(Map.of("objetivo", "Continuar patrones", "historia", "Un paseo", "acciones", List.of("Elegir"),
                "reglas", List.of("Seguir el patrón"), "retos", List.of("Completar"), "ayudas", List.of("Mirar la fila"), "regla_juego", "orden", "tipo_juego", "laberinto"));
        when(guiones.configurado()).thenReturn(true);
        when(guiones.proveedor()).thenReturn("prueba"); when(guiones.modelo()).thenReturn("prueba");
        when(guiones.generarGuion(any())).thenReturn(GuionesDePrueba.respuestaConLaRegla("orden"));
        propuestas.crear(docente, actividad, curso, seccion.getId(), "Patrones", null, "preparacion", null);
        propuestas.aprobar(docente, actividad, 1);
        var anterior = generaciones.procesar(docente, generaciones.iniciar(docente, actividad, 1).getId());
        assertEquals("lista", anterior.getEstado());
        generaciones.publicar(docente, anterior.getId());
        String paqueteAnterior = anterior.getPaquete();

        var cambio = propuestas.observaciones(docente, actividad, 1, "Acorta la consigna.");
        assertEquals(2, cambio.propuesta().getVersion());
        assertEquals("pendiente", cambio.propuesta().getEstadoRevision());
        assertNull(cambio.propuesta().getRevisadaPor());
        assertNull(cambio.propuesta().getRevisadaEn());
        assertTrue(propuestas.aprobadaParaJuego(actividad).isEmpty());
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> generaciones.iniciar(docente, actividad, 2));
        propuestas.aprobar(docente, actividad, 2);
        var corregida = generaciones.iniciar(docente, actividad, 2);
        assertNotEquals(anterior.getId(), corregida.getId());
        assertEquals("pendiente", corregida.getEstado());
        assertNull(corregida.getPaquete());
        assertFalse(corregida.isPublicada());
        assertThrows(org.springframework.web.server.ResponseStatusException.class, () -> generaciones.publicar(docente, corregida.getId()));

        // Aunque el anterior pasó, el nuevo contenido incorrecto debe rechazarse.
        when(guiones.generarGuion(any())).thenReturn(GuionesDePrueba.respuestaConUnObjetoEnUnMuro(), GuionesDePrueba.respuestaConLaRegla("orden"));
        var comprobada = generaciones.procesar(docente, corregida.getId());
        assertEquals("lista", comprobada.getEstado());
        assertFalse(comprobada.isPublicada());
        var comprobaciones = etapas.findAllByGeneracionIdOrderByCreadoEnAsc(corregida.getId()).stream()
                .filter(etapa -> etapa.getEtapa().equals("comprobacion")).toList();
        assertTrue(comprobaciones.stream().anyMatch(etapa -> etapa.getEstado().equals("fallida")));
        assertEquals("completada", comprobaciones.get(comprobaciones.size() - 1).getEstado());
        assertEquals("aprobada", versiones.findBySolicitudIdAndVersion(actividad, 1).orElseThrow().getEstadoRevision());
        assertEquals(paqueteAnterior, juegos.findById(anterior.getId()).orElseThrow().getPaquete());
        assertTrue(juegos.findById(anterior.getId()).orElseThrow().isPublicada());
    }
}
