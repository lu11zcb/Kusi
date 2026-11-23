package pe.kusi.edu;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.kusi.edu.model.*;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.*;
import java.util.*;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:kusi_actividades;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.config.import="})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ActividadesEstudianteTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired SeccionRepository secciones;
    @Autowired AsignacionDocenteRepository asignaciones;
    @Autowired VinculoEstudianteRepository vinculos;
    @Autowired SolicitudPropuestaRepository solicitudes;
    @Autowired PropuestaRepository propuestas;
    @Autowired GeneracionRepository generaciones;
    @Autowired PartidasService partidas;
    @Autowired ActividadesEstudianteService actividades;
    @MockitoBean DjangoInternoClient django;
    UUID docente, estudiante, otro, curso, actividad;
    Seccion seccion;
    Generacion juego;
    static final String CSRF = "csrf-sintetico-avance";

    @BeforeEach void preparar() {
        docente = UUID.randomUUID(); estudiante = UUID.randomUUID(); otro = UUID.randomUUID(); curso = UUID.randomUUID();
        seccion = secciones.saveAndFlush(new Seccion("Sección " + UUID.randomUUID(), 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(docente, curso, seccion, 2026, docente));
        vinculos.saveAndFlush(new VinculoEstudiante(estudiante, seccion, 2026, docente));
        actividad = UUID.randomUUID();
        solicitudes.saveAndFlush(new SolicitudPropuesta(actividad, docente, curso, seccion.getId(), "Animales", null, "refuerzo", null));
        Propuesta propuesta = propuestas.saveAndFlush(new Propuesta(actividad, 1, "docente", null, null, "Reconocer", "docente", "Animales", "[]", "[]", "[]", "[]", null, null, null));
        juego = enviar(new Generacion(actividad, propuesta.getId(), 1), 3);
        when(django.validarSesion("estudiante")).thenReturn(Map.of("id", estudiante.toString(), "roles", List.of("estudiante")));
        when(django.validarSesion("otro")).thenReturn(Map.of("id", otro.toString(), "roles", List.of("estudiante")));
        when(django.validarSesion("docente")).thenReturn(Map.of("id", docente.toString(), "roles", List.of("docente")));
        when(django.validarSesion("ajeno")).thenReturn(Map.of("id", UUID.randomUUID().toString(), "roles", List.of("docente")));
        when(django.validarSesion("admin")).thenReturn(Map.of("id", docente.toString(), "roles", List.of("administrador", "docente")));
        when(django.validarCuenta(estudiante, "estudiante")).thenReturn(Map.of("nombre", "Estudiante de prueba"));
        when(django.validarCuenta(otro, "estudiante")).thenReturn(Map.of("nombre", "Estudiante posterior"));
    }

    private Generacion enviar(Generacion generacion, int retos) {
        ObjectNode paquete = json.createObjectNode().put("formato", "kusi-paquete/0").put("familia", "animales");
        var lista = paquete.putArray("retos");
        for (int nivel = 1; nivel <= retos; nivel++) lista.addObject().put("id", nivel).put("consigna", "Busca el animal.");
        generacion.guardarPaquete(paquete.toString()); generacion.registrarEstado("lista", null); generacion.publicar();
        Generacion guardada = generaciones.saveAndFlush(generacion);
        actividades.materializar(guardada.getId());
        return guardada;
    }

    private ObjectNode aviso(Generacion generacion, String partida, int orden, String tipo, int nivel) {
        return json.createObjectNode().put("partida", partida).put("orden", orden).put("tipo", tipo).put("nivel", nivel)
                .put("momento", "2026-11-10T17:00:00Z").put("juego_id", generacion.getId().toString());
    }
    private org.springframework.test.web.servlet.ResultActions leer(String ruta, String sesion) throws Exception {
        return mvc.perform(get(ruta).cookie(new Cookie("sessionid", sesion)));
    }
    private org.springframework.test.web.servlet.ResultActions enviar(String ruta, String sesion, ObjectNode cuerpo) throws Exception {
        return mvc.perform(post(ruta).cookie(new Cookie("sessionid", sesion), new Cookie("kusi_edu_csrf", CSRF))
                .header("X-XSRF-TOKEN", CSRF).contentType("application/json").content(cuerpo.toString()));
    }
    private String ruta(Generacion generacion) { return "/api/edu/estudiante/juegos/" + generacion.getId() + "/avance/"; }
    private ObjectNode checkpoint(String partida, int orden, int nivel) { return json.createObjectNode().put("partida", partida).put("orden", orden).put("nivel", nivel); }
    private int puntos(Map<String, Object> resultado) { return (Integer) ((Map<?, ?>) resultado.get("resumen")).get("puntos"); }

    @Test void pausaConfirmadaConservaVersionRetoYOrdenAlExistirUnEnvioNuevo() throws Exception {
        String partida = UUID.randomUUID().toString();
        leer(ruta(juego), "estudiante").andExpect(status().isOk()).andExpect(jsonPath("$.avance").isEmpty());
        partidas.guardar(estudiante, false, aviso(juego, partida, 1, "listo", 1));
        partidas.guardar(estudiante, false, aviso(juego, partida, 2, "inicio", 1));
        partidas.guardar(estudiante, false, aviso(juego, partida, 3, "reto_completado", 1));
        enviar(ruta(juego), "estudiante", checkpoint(partida, 3, 2)).andExpect(status().isOk())
                .andExpect(jsonPath("$.guardado").value(true)).andExpect(jsonPath("$.avance.nivel").value(2))
                .andExpect(jsonPath("$.avance.partida.orden").value(3)).andExpect(jsonPath("$.avance.partida.avisados[2]").value("reto_completado:1"));
        Generacion nueva = enviar(new Generacion(actividad, juego.getPropuestaId(), 2), 3);
        leer(ruta(nueva), "estudiante").andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.avance.juego_id").value(juego.getId().toString())).andExpect(jsonPath("$.avance.nivel").value(2));
        leer("/api/edu/estudiante/juegos/", "estudiante").andExpect(jsonPath("$.juegos.length()").value(1))
                .andExpect(jsonPath("$.juegos[0].id").value(juego.getId().toString()));
        partidas.guardar(estudiante, false, aviso(juego, partida, 4, "accion", 2).put("objeto", "llama"));
        enviar(ruta(juego), "estudiante", checkpoint(partida, 4, 2)).andExpect(status().isOk());
        partidas.guardar(estudiante, false, aviso(juego, partida, 5, "fin", 3));
        leer(ruta(juego), "estudiante").andExpect(jsonPath("$.avance").isEmpty());
        leer("/api/edu/estudiante/juegos/", "estudiante").andExpect(jsonPath("$.juegos[0].id").value(nueva.getId().toString()));
    }

    @Test void noConfirmaAvisosFaltantesAtrasadosRetosInventadosNiPartidasAjenas() throws Exception {
        String partida = UUID.randomUUID().toString();
        partidas.guardar(estudiante, false, aviso(juego, partida, 1, "listo", 1));
        partidas.guardar(estudiante, false, aviso(juego, partida, 3, "accion", 1));
        enviar(ruta(juego), "estudiante", checkpoint(partida, 3, 1)).andExpect(status().isConflict());
        enviar(ruta(juego), "estudiante", checkpoint(partida, 1, 1)).andExpect(status().isConflict());
        partidas.guardar(estudiante, false, aviso(juego, partida, 2, "inicio", 1));
        enviar(ruta(juego), "estudiante", checkpoint(partida, 3, 2)).andExpect(status().isConflict());
        enviar(ruta(juego), "estudiante", checkpoint(partida, 3, 4)).andExpect(status().isBadRequest());
        enviar(ruta(juego), "estudiante", checkpoint(partida, 3, 1)).andExpect(status().isOk());
        enviar(ruta(juego), "otro", checkpoint(partida, 3, 1)).andExpect(status().isNotFound());
        leer(ruta(juego), "otro").andExpect(status().isNotFound());
        leer(ruta(juego), "admin").andExpect(status().isForbidden());
        mvc.perform(post(ruta(juego)).cookie(new Cookie("sessionid", "estudiante")).contentType("application/json")
                .content(checkpoint(partida, 3, 1).toString())).andExpect(status().isForbidden());
        Generacion borrador = generaciones.saveAndFlush(new Generacion(actividad, juego.getPropuestaId(), 2));
        leer(ruta(borrador), "estudiante").andExpect(status().isNotFound());
    }

    @Test void reconciliaAvisosPosterioresALaPausaSinReutilizarOrdenNiCambiarVersion() throws Exception {
        String partida = UUID.randomUUID().toString();
        partidas.guardar(estudiante, false, aviso(juego, partida, 1, "listo", 1));
        partidas.guardar(estudiante, false, aviso(juego, partida, 2, "inicio", 1));
        partidas.guardar(estudiante, false, aviso(juego, partida, 3, "reto_completado", 1));
        enviar(ruta(juego), "estudiante", checkpoint(partida, 3, 2)).andExpect(status().isOk());
        partidas.guardar(estudiante, false, aviso(juego, partida, 4, "accion", 2).put("objeto", "llama"));
        partidas.guardar(estudiante, false, aviso(juego, partida, 5, "ayuda", 2).put("ayuda", 1));
        Generacion nueva = enviar(new Generacion(actividad, juego.getPropuestaId(), 2), 3);
        leer(ruta(nueva), "estudiante").andExpect(status().isOk())
                .andExpect(jsonPath("$.avance.juego_id").value(juego.getId().toString()))
                .andExpect(jsonPath("$.avance.nivel").value(2)).andExpect(jsonPath("$.avance.partida.orden").value(5));
        partidas.guardar(estudiante, false, aviso(juego, partida, 6, "reto_completado", 2));
        leer(ruta(juego), "estudiante").andExpect(status().isOk())
                .andExpect(jsonPath("$.avance.nivel").value(3)).andExpect(jsonPath("$.avance.partida.orden").value(6));
        partidas.guardar(estudiante, false, aviso(juego, partida, 7, "fallo", 3));
        leer(ruta(juego), "estudiante").andExpect(status().isOk()).andExpect(jsonPath("$.avance").isEmpty());
        assertEquals(0, jdbc.queryForObject("select count(*) from edu.avances_actividad where estudiante_id = ? and actividad_id = ?",
                Integer.class, estudiante, actividad));
    }

    @Test void noDevuelveSemillaConHuecosEntreAvisosPosterioresALaPausa() throws Exception {
        String partida = UUID.randomUUID().toString();
        partidas.guardar(estudiante, false, aviso(juego, partida, 1, "listo", 1));
        enviar(ruta(juego), "estudiante", checkpoint(partida, 1, 1)).andExpect(status().isOk());
        partidas.guardar(estudiante, false, aviso(juego, partida, 3, "accion", 1));
        leer(ruta(juego), "estudiante").andExpect(status().isConflict());
        partidas.guardar(estudiante, false, aviso(juego, partida, 2, "inicio", 1));
        leer(ruta(juego), "estudiante").andExpect(status().isOk()).andExpect(jsonPath("$.avance.partida.orden").value(3));
    }

    @Test void otraPartidaNoReemplazaElAvanceConfirmadoHastaQueLaAnteriorTermine() throws Exception {
        String primera = UUID.randomUUID().toString(), segunda = UUID.randomUUID().toString();
        partidas.guardar(estudiante, false, aviso(juego, primera, 1, "listo", 1));
        partidas.guardar(estudiante, false, aviso(juego, primera, 2, "reto_completado", 1));
        partidas.guardar(estudiante, false, aviso(juego, primera, 3, "reto_completado", 2));
        enviar(ruta(juego), "estudiante", checkpoint(primera, 3, 3)).andExpect(status().isOk());
        partidas.guardar(estudiante, false, aviso(juego, segunda, 1, "listo", 1));
        enviar(ruta(juego), "estudiante", checkpoint(segunda, 1, 1)).andExpect(status().isConflict());
        leer(ruta(juego), "estudiante").andExpect(jsonPath("$.avance.partida.id").value(primera))
                .andExpect(jsonPath("$.avance.nivel").value(3));
        partidas.guardar(estudiante, false, aviso(juego, primera, 4, "fallo", 3));
        enviar(ruta(juego), "estudiante", checkpoint(segunda, 1, 1)).andExpect(status().isOk());
        leer(ruta(juego), "estudiante").andExpect(jsonPath("$.avance.partida.id").value(segunda));
    }

    @Test void puntosRepartidosRedondeadosAyudasSinDescuentoYRepeticionesSinPremio() {
        String partida = UUID.randomUUID().toString();
        ObjectNode primero = aviso(juego, partida, 1, "reto_completado", 1);
        assertEquals(7, puntos(partidas.guardar(estudiante, false, primero)));
        assertEquals(7, puntos(partidas.guardar(estudiante, false, primero)));
        assertEquals(7, puntos(partidas.guardar(estudiante, false, aviso(juego, partida, 2, "ayuda", 2).put("ayuda", 2))));
        assertEquals(13, puntos(partidas.guardar(estudiante, false, aviso(juego, partida, 3, "reto_completado", 2))));
        assertEquals(20, puntos(partidas.guardar(estudiante, false, aviso(juego, partida, 4, "reto_completado", 3))));
        assertEquals(20, puntos(partidas.guardar(estudiante, false, aviso(juego, UUID.randomUUID().toString(), 1, "reto_completado", 1))));
        Generacion nueva = enviar(new Generacion(actividad, juego.getPropuestaId(), 2), 5);
        String repetida = UUID.randomUUID().toString();
        assertEquals(20, puntos(partidas.guardar(estudiante, false, aviso(nueva, repetida, 1, "reto_completado", 4))));
        assertEquals(20, puntos(partidas.guardar(estudiante, false, aviso(nueva, repetida, 2, "reto_completado", 5))));
        assertEquals(20, jdbc.queryForObject("select sum(puntos) from edu.puntos_reto where actividad_id = ? and estudiante_id = ?", Integer.class, actividad, estudiante));
        assertEquals(5, jdbc.queryForObject("select count(*) from edu.puntos_reto where actividad_id = ? and estudiante_id = ?", Integer.class, actividad, estudiante));
        assertThrows(IllegalArgumentException.class, () -> partidas.guardar(estudiante, false, aviso(juego, UUID.randomUUID().toString(), 1, "reto_completado", 4)));
    }

    @Test void dosPartidasSimultaneasNoDuplicanLosPuntosDelMismoReto() throws Exception {
        var salida = new CountDownLatch(1);
        try (var hilos = Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Map<String, Object>> jugar = () -> {
                salida.await();
                return partidas.guardar(estudiante, false, aviso(juego, UUID.randomUUID().toString(), 1, "reto_completado", 1));
            };
            var primera = hilos.submit(jugar); var segunda = hilos.submit(jugar); salida.countDown();
            assertEquals(7, puntos(primera.get(5, TimeUnit.SECONDS)));
            assertEquals(7, puntos(segunda.get(5, TimeUnit.SECONDS)));
        }
        assertEquals(1, jdbc.queryForObject("select count(*) from edu.puntos_reto where actividad_id = ? and estudiante_id = ?", Integer.class, actividad, estudiante));
    }

    @Test void pruebasDocentesYPartidasAntiguasSinJuegoNoGananPuntos() {
        assertEquals(0, puntos(partidas.guardar(docente, true, aviso(juego, UUID.randomUUID().toString(), 1, "reto_completado", 1))));
        ObjectNode antiguo = aviso(juego, UUID.randomUUID().toString(), 1, "reto_completado", 1); antiguo.remove("juego_id");
        assertEquals(0, puntos(partidas.guardar(estudiante, false, antiguo)));
        assertEquals(0, jdbc.queryForObject("select count(*) from edu.puntos_reto where actividad_id = ?", Integer.class, actividad));
    }

    @Test void estudiantePosteriorSoloRecibeActividadTrasAsignacionExplicitaYConservaAvisoNuevo() throws Exception {
        vinculos.saveAndFlush(new VinculoEstudiante(otro, seccion, 2026, docente));
        String rutaAsignacion = "/api/edu/resultados/actividades/" + actividad + "/asignaciones/";
        leer("/api/edu/estudiante/juegos/", "otro").andExpect(jsonPath("$.juegos.length()").value(0));
        leer(ruta(juego), "otro").andExpect(status().isNotFound());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> partidas.guardar(otro, false, aviso(juego, UUID.randomUUID().toString(), 1, "inicio", 1)));
        leer(rutaAsignacion, "docente").andExpect(status().isOk()).andExpect(jsonPath("$.estudiantes[1].asignado").value(false));
        ObjectNode asignacion = json.createObjectNode(); asignacion.putArray("estudiantes").add(otro.toString());
        enviar(rutaAsignacion, "docente", asignacion).andExpect(status().isOk()).andExpect(jsonPath("$.guardado").value(true));
        leer("/api/edu/estudiante/juegos/", "otro").andExpect(jsonPath("$.juegos[0].nuevo").value(true));
        enviar("/api/edu/estudiante/juegos/" + juego.getId() + "/visto/", "otro", json.createObjectNode()).andExpect(status().isOk());
        enviar(rutaAsignacion, "docente", asignacion).andExpect(status().isOk());
        leer("/api/edu/estudiante/juegos/", "otro").andExpect(jsonPath("$.juegos[0].nuevo").value(false));
        assertEquals(1, jdbc.queryForObject("select count(*) from edu.destinatarios_actividad where generacion_id = ? and estudiante_id = ?", Integer.class, juego.getId(), otro));
        leer("/api/edu/resultados/actividades/" + actividad + "/estudiantes/", "docente").andExpect(jsonPath("$.estudiantes.length()").value(2));
    }

    @Test void asignacionesNieganAdministradorDocenteAjenoYOtraSeccionSinReasignarAlReenviar() throws Exception {
        vinculos.saveAndFlush(new VinculoEstudiante(otro, seccion, 2026, docente));
        actividades.materializar(juego.getId());
        assertFalse(actividades.permitido(otro, juego.getId()));
        String rutaAsignacion = "/api/edu/resultados/actividades/" + actividad + "/asignaciones/";
        ObjectNode asignacion = json.createObjectNode(); asignacion.putArray("estudiantes").add(otro.toString());
        leer(rutaAsignacion, "admin").andExpect(status().isForbidden());
        enviar(rutaAsignacion, "admin", asignacion).andExpect(status().isForbidden());
        leer(rutaAsignacion, "ajeno").andExpect(status().isNotFound());
        enviar(rutaAsignacion, "ajeno", asignacion).andExpect(status().isNotFound());
        asignacion.withArray("estudiantes").add(UUID.randomUUID().toString());
        enviar(rutaAsignacion, "docente", asignacion).andExpect(status().isNotFound());
        assertFalse(actividades.permitido(otro, juego.getId()));
        jdbc.update("delete from edu.asignaciones_docente where docente_id = ?", docente);
        leer(rutaAsignacion, "docente").andExpect(status().isNotFound());
    }

    @Test void lasCorreccionesNoAsignanAutomaticamenteALosPosterioresPeroHeredanLaAsignacionExplicita() throws Exception {
        vinculos.saveAndFlush(new VinculoEstudiante(otro, seccion, 2026, docente));
        Generacion corregida = enviar(new Generacion(actividad, juego.getPropuestaId(), 2), 3);
        assertFalse(actividades.permitido(otro, juego.getId()));
        assertFalse(actividades.permitido(otro, corregida.getId()));
        leer("/api/edu/estudiante/juegos/", "otro").andExpect(jsonPath("$.juegos.length()").value(0));
        ObjectNode asignacion = json.createObjectNode(); asignacion.putArray("estudiantes").add(otro.toString());
        enviar("/api/edu/resultados/actividades/" + actividad + "/asignaciones/", "docente", asignacion)
                .andExpect(status().isOk());
        assertFalse(actividades.permitido(otro, juego.getId()));
        assertTrue(actividades.permitido(otro, corregida.getId()));
        Generacion siguiente = enviar(new Generacion(actividad, juego.getPropuestaId(), 3), 3);
        assertTrue(actividades.permitido(otro, siguiente.getId()));
        leer("/api/edu/estudiante/juegos/", "otro").andExpect(jsonPath("$.juegos.length()").value(1))
                .andExpect(jsonPath("$.juegos[0].id").value(siguiente.getId().toString()))
                .andExpect(jsonPath("$.juegos[0].nuevo").value(true));
    }

    @Test void hu10RetirarEstudianteImpideAbrirRetomarYRecibirSinPerderHistorial() throws Exception {
        String partida = UUID.randomUUID().toString();
        partidas.guardar(estudiante, false, aviso(juego, partida, 1, "reto_completado", 1));
        enviar(ruta(juego), "estudiante", checkpoint(partida, 1, 2)).andExpect(status().isOk());
        UUID vinculo = vinculos.findAllByEstudianteId(estudiante).get(0).getId();
        String retiro = "/interno/vinculos-estudiantes/" + vinculo + "/retirar/";
        when(django.validarAdministrador("admin")).thenReturn(Map.of("id", docente.toString()));
        mvc.perform(post(retiro).header("X-Clave-Interna", "incorrecta").header("X-Sesion-Kusi", "admin"))
                .andExpect(status().isForbidden());
        for (int i = 0; i < 2; i++) mvc.perform(post(retiro).header("X-Clave-Interna", "clave-solo-para-pruebas-aisladas")
                .header("X-Sesion-Kusi", "admin")).andExpect(status().isCreated()).andExpect(jsonPath("$.vinculo.retirado").value(true));
        leer("/api/edu/estudiante/juegos/", "estudiante").andExpect(jsonPath("$.juegos.length()").value(0));
        leer(ruta(juego), "estudiante").andExpect(status().isNotFound());
        enviar(ruta(juego), "estudiante", checkpoint(partida, 1, 2)).andExpect(status().isNotFound());
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> partidas.guardar(estudiante, false, aviso(juego, partida, 2, "inicio", 2)));
        Generacion nueva = enviar(new Generacion(actividad, juego.getPropuestaId(), 2), 3);
        assertFalse(actividades.permitido(estudiante, nueva.getId()));
        assertEquals(0, jdbc.queryForObject("select count(*) from edu.destinatarios_actividad where generacion_id = ?", Integer.class, nueva.getId()));
        assertEquals(1, jdbc.queryForObject("select count(*) from edu.avances_actividad where partida_id = ?", Integer.class, partida));
        assertEquals(7, jdbc.queryForObject("select sum(puntos) from edu.puntos_reto where partida_id = ?", Integer.class, partida));
        leer("/api/edu/resultados/actividades/" + actividad + "/estudiantes/" + estudiante + "/", "docente")
                .andExpect(status().isOk()).andExpect(jsonPath("$.partidas.length()").value(1));
    }

}
