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
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.PartidasService;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:kusi_resultados;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.config.import="})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ResultadosTest {
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
    @MockitoBean DjangoInternoClient django;
    UUID docente, estudiante, otroEstudiante, curso, actividad;
    Seccion seccion;
    Generacion juego;
    private static final String BASE = "/api/edu/resultados/actividades/";

    @BeforeEach
    void preparar() {
        docente = UUID.randomUUID(); estudiante = UUID.randomUUID(); otroEstudiante = UUID.randomUUID(); curso = UUID.randomUUID();
        seccion = secciones.saveAndFlush(new Seccion("Sección " + UUID.randomUUID(), 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(docente, curso, seccion, 2026, docente));
        vinculos.saveAndFlush(new VinculoEstudiante(estudiante, seccion, 2026, docente));
        vinculos.saveAndFlush(new VinculoEstudiante(otroEstudiante, seccion, 2026, docente));
        actividad = UUID.randomUUID();
        solicitudes.saveAndFlush(new SolicitudPropuesta(actividad, docente, curso, seccion.getId(), "Clasificar formas", null, "preparacion", null));
        Propuesta propuesta = propuestas.saveAndFlush(new Propuesta(actividad, 1, "docente", null, null, "Clasificar", "docente", "Formas", "[]", "[]", "[]", "[]", null, null, null));
        juego = generaciones.saveAndFlush(new Generacion(actividad, propuesta.getId(), 1));
        juego.guardarPaquete("{\"familia\":\"formas\"}"); juego.registrarEstado("lista", null); juego.publicar(); generaciones.saveAndFlush(juego);
        when(django.validarSesion("docente")).thenReturn(Map.of("id", docente.toString(), "roles", List.of("docente")));
        when(django.validarSesion("otro")).thenReturn(Map.of("id", UUID.randomUUID().toString(), "roles", List.of("docente")));
        when(django.validarSesion("admin")).thenReturn(Map.of("id", docente.toString(), "roles", List.of("administrador", "docente")));
        when(django.validarSesion("estudiante")).thenReturn(Map.of("id", estudiante.toString(), "roles", List.of("estudiante")));
        when(django.validarCuenta(estudiante, "estudiante")).thenReturn(Map.of("nombre", "Estudiante de prueba A"));
        when(django.validarCuenta(otroEstudiante, "estudiante")).thenReturn(Map.of("nombre", "Estudiante de prueba B"));
    }

    private ObjectNode aviso(String partida, int orden, String tipo) {
        return json.createObjectNode().put("partida", partida).put("orden", orden).put("tipo", tipo)
                .put("momento", "2026-11-09T10:00:00Z").put("nivel", 1).put("reto", "formas").put("juego_id", juego.getId().toString());
    }
    private org.springframework.test.web.servlet.ResultActions leer(String ruta, String sesion) throws Exception {
        return mvc.perform(get(ruta).cookie(new Cookie("sessionid", sesion)));
    }

    @Test
    void muestraSinIniciarEnCursoYCompletadaConRespuestasGenericasSinDuplicados() throws Exception {
        leer(BASE, "docente").andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.actividades[0].titulo").value("Clasificar formas"));
        String partida = UUID.randomUUID().toString();
        partidas.guardar(estudiante, false, aviso(partida, 1, "listo"));
        leer(BASE + actividad + "/estudiantes/", "docente").andExpect(jsonPath("$.estudiantes[0].estado").value("sin_iniciar"));
        partidas.guardar(estudiante, false, aviso(partida, 2, "inicio"));
        partidas.guardar(estudiante, false, aviso(partida, 3, "ayuda").put("ayuda", 1));
        ObjectNode respuesta = aviso(partida, 4, "accion").put("respuesta", "Cuadrado").put("correcto", false);
        partidas.guardar(estudiante, false, respuesta);
        assertEquals(true, partidas.guardar(estudiante, false, respuesta).get("duplicado"));
        ObjectNode reenvio = respuesta.deepCopy(); reenvio.remove("juego_id");
        assertEquals(true, partidas.guardar(estudiante, false, reenvio).get("duplicado"));
        partidas.guardar(estudiante, false, aviso(partida, 5, "ayuda").put("ayuda", 2));
        partidas.guardar(estudiante, false, aviso(partida, 6, "accion").put("respuesta", "Círculo").put("correcto", true));
        leer(BASE + actividad + "/estudiantes/", "docente").andExpect(jsonPath("$.estudiantes[0].estado").value("en_curso"))
                .andExpect(jsonPath("$.estudiantes[1].estado").value("sin_iniciar"));
        partidas.guardar(estudiante, false, aviso(partida, 7, "fin"));
        leer(BASE + actividad + "/estudiantes/", "docente").andExpect(jsonPath("$.estudiantes[0].estado").value("completada"))
                .andExpect(jsonPath("$.estudiantes[0].ayudas_usadas").value(2));
        leer(BASE + actividad + "/estudiantes/" + estudiante + "/", "docente").andExpect(status().isOk())
                .andExpect(jsonPath("$.partidas[0].juego_id").value(juego.getId().toString()))
                .andExpect(jsonPath("$.partidas[0].retos[0].respuestas.length()").value(2))
                .andExpect(jsonPath("$.partidas[0].retos[0].respuestas[0].respuesta").value("Cuadrado"))
                .andExpect(jsonPath("$.partidas[0].retos[0].respuestas[0].ayudas[0]").value(1))
                .andExpect(jsonPath("$.partidas[0].retos[0].respuestas[1].tipo").value("correccion"))
                .andExpect(jsonPath("$.partidas[0].retos[0].respuestas[1].ayudas[1]").value(2));
    }

    @Test
    void rechazaDocenteAjenoAdministradorEstudianteEIdentificadoresDirectos() throws Exception {
        String estudiantes = BASE + actividad + "/estudiantes/";
        for (String ruta : List.of(BASE, estudiantes, estudiantes + estudiante + "/")) {
            leer(ruta, "admin").andExpect(status().isForbidden());
            leer(ruta, "estudiante").andExpect(status().isForbidden());
        }
        leer(BASE, "otro").andExpect(jsonPath("$.actividades.length()").value(0));
        leer(estudiantes, "otro").andExpect(status().isNotFound());
        leer(estudiantes + estudiante + "/", "otro").andExpect(status().isNotFound());
        leer(estudiantes + UUID.randomUUID() + "/", "docente").andExpect(status().isNotFound());
        jdbc.update("delete from edu.asignaciones_docente where docente_id = ?", docente);
        leer(BASE, "docente").andExpect(jsonPath("$.actividades.length()").value(0));
        leer(estudiantes, "docente").andExpect(status().isNotFound());
        leer(estudiantes + estudiante + "/", "docente").andExpect(status().isNotFound());
        verify(django, never()).validarCuenta(any(), any());
    }

    @Test
    void dosDocentesConSeccionesPropiasSoloConsultanSusResultadosYElAdministradorNoConsultaNinguno() throws Exception {
        UUID otroDocente = UUID.randomUUID(), alumnoAjeno = UUID.randomUUID(), actividadAjena = UUID.randomUUID();
        Seccion otraSeccion = secciones.saveAndFlush(new Seccion("Otra sección de prueba " + UUID.randomUUID(), 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(otroDocente, curso, otraSeccion, 2026, otroDocente));
        vinculos.saveAndFlush(new VinculoEstudiante(alumnoAjeno, otraSeccion, 2026, otroDocente));
        solicitudes.saveAndFlush(new SolicitudPropuesta(actividadAjena, otroDocente, curso, otraSeccion.getId(),
                "Actividad de la otra sección", null, "preparacion", null));
        Propuesta otraPropuesta = propuestas.saveAndFlush(new Propuesta(actividadAjena, 1, "docente", null, null,
                "Objetivo de prueba", "docente", "Otra actividad", "[]", "[]", "[]", "[]", null, null, null));
        Generacion otroJuego = new Generacion(actividadAjena, otraPropuesta.getId(), 1);
        otroJuego.registrarEstado("lista", null); otroJuego.publicar(); generaciones.saveAndFlush(otroJuego);
        when(django.validarSesion("otro")).thenReturn(Map.of("id", otroDocente.toString(), "roles", List.of("docente")));
        when(django.validarSesion("admin-solo")).thenReturn(Map.of("id", UUID.randomUUID().toString(), "roles", List.of("administrador")));
        when(django.validarCuenta(alumnoAjeno, "estudiante")).thenReturn(Map.of("nombre", "Cuenta sintética de otra sección"));
        partidas.guardar(alumnoAjeno, false, aviso(UUID.randomUUID().toString(), 1, "accion")
                .put("juego_id", otroJuego.getId().toString()).put("respuesta", "Respuesta privada de prueba").put("correcto", true));

        // Los dos accesos propios funcionan: no es una denegación general del servicio.
        leer(BASE + actividad + "/estudiantes/", "docente").andExpect(status().isOk());
        leer(BASE + actividadAjena + "/estudiantes/", "otro").andExpect(status().isOk());
        leer(BASE, "otro").andExpect(jsonPath("$.actividades.length()").value(1))
                .andExpect(jsonPath("$.actividades[0].id").value(actividadAjena.toString()));
        clearInvocations(django);
        for (String sesion : List.of("admin-solo", "admin")) {
            for (String ruta : List.of(BASE, BASE + actividadAjena + "/estudiantes/",
                    BASE + actividadAjena + "/estudiantes/" + alumnoAjeno + "/")) {
                leer(ruta, sesion).andExpect(status().isForbidden());
            }
        }
        leer(BASE + actividadAjena + "/estudiantes/", "docente").andExpect(status().isNotFound());
        leer(BASE + actividadAjena + "/estudiantes/" + alumnoAjeno + "/", "docente").andExpect(status().isNotFound());
        leer(BASE + actividad + "/estudiantes/", "otro").andExpect(status().isNotFound());
        leer(BASE + actividad + "/estudiantes/" + estudiante + "/", "otro").andExpect(status().isNotFound());
        // Se rechaza antes incluso de pedir nombres al servicio de identidad.
        verify(django, never()).validarCuenta(any(), any());
    }

    @Test
    void noAtribuyePruebasDocentesNiAvisosSinJuegoNiIncorporaEstudiantesPosteriores() throws Exception {
        ObjectNode antiguo = aviso(UUID.randomUUID().toString(), 1, "fin"); antiguo.remove("juego_id");
        partidas.guardar(estudiante, false, antiguo);
        partidas.guardar(docente, true, aviso(UUID.randomUUID().toString(), 1, "fin"));
        jdbc.update("update edu.vinculos_estudiante set creado_en = ? where estudiante_id = ?", Timestamp.from(Instant.now().plusSeconds(60)), otroEstudiante);
        leer(BASE + actividad + "/estudiantes/", "docente").andExpect(jsonPath("$.estudiantes.length()").value(1))
                .andExpect(jsonPath("$.estudiantes[0].estado").value("sin_iniciar"));
        leer(BASE + actividad + "/estudiantes/" + estudiante + "/", "docente").andExpect(jsonPath("$.partidas.length()").value(0));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> partidas.guardar(estudiante, false, antiguo.deepCopy().put("orden", 2).put("juego_id", juego.getId().toString())));
    }

    @Test
    void conservaJuegoExactoAunqueSePubliqueOtroYNoPermiteCambiarElVinculo() throws Exception {
        String partida = UUID.randomUUID().toString();
        partidas.guardar(estudiante, false, aviso(partida, 1, "inicio"));
        Generacion nuevo = generaciones.saveAndFlush(new Generacion(actividad, juego.getPropuestaId(), 1));
        nuevo.registrarEstado("lista", null); nuevo.publicar(); generaciones.saveAndFlush(nuevo);
        UUID nuevoId = nuevo.getId();
        ObjectNode siguiente = aviso(partida, 2, "accion").put("respuesta", "Círculo"); siguiente.remove("juego_id");
        partidas.guardar(estudiante, false, siguiente);
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> partidas.guardar(estudiante, false, aviso(partida, 3, "fin").put("juego_id", nuevoId.toString())));
        leer(BASE + actividad + "/estudiantes/" + estudiante + "/", "docente")
                .andExpect(jsonPath("$.partidas[0].juego_id").value(juego.getId().toString()));
        // Tampoco se aceptan resultados de un enlace a un borrador ni de otra sección.
        nuevo = generaciones.saveAndFlush(new Generacion(actividad, juego.getPropuestaId(), 1));
        UUID borrador = nuevo.getId();
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> partidas.guardar(estudiante, false, aviso(UUID.randomUUID().toString(), 1, "inicio").put("juego_id", borrador.toString())));
        assertThrows(org.springframework.web.server.ResponseStatusException.class,
                () -> partidas.guardar(UUID.randomUUID(), false, aviso(UUID.randomUUID().toString(), 1, "inicio")));
    }

    @Test
    void dosReenviosSimultaneosGuardanUnaSolaRespuesta() throws Exception {
        String partida = UUID.randomUUID().toString();
        ObjectNode respuesta = aviso(partida, 1, "accion").put("respuesta", "Círculo").put("correcto", true);
        var salida = new java.util.concurrent.CountDownLatch(1);
        try (var hilos = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Map<String, Object>> enviar = () -> { salida.await(); return partidas.guardar(estudiante, false, respuesta); };
            var primero = hilos.submit(enviar); var segundo = hilos.submit(enviar); salida.countDown();
            boolean duplicadoPrimero = (Boolean) primero.get(5, java.util.concurrent.TimeUnit.SECONDS).get("duplicado");
            boolean duplicadoSegundo = (Boolean) segundo.get(5, java.util.concurrent.TimeUnit.SECONDS).get("duplicado");
            assertNotEquals(duplicadoPrimero, duplicadoSegundo);
        }
        assertEquals(1, jdbc.queryForObject("select count(*) from edu.avisos_partida where partida_id = ?", Integer.class, partida));
        leer(BASE + actividad + "/estudiantes/" + estudiante + "/", "docente")
                .andExpect(jsonPath("$.partidas[0].retos[0].respuestas.length()").value(1));
    }
}
