package pe.kusi.edu;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.model.VinculoEstudiante;
import pe.kusi.edu.repository.AsignacionDocenteRepository;
import pe.kusi.edu.repository.SeccionRepository;
import pe.kusi.edu.repository.VinculoEstudianteRepository;
import pe.kusi.edu.service.DjangoInternoClient;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// No @Transactional en los tests: cada petición debe cerrar su propia transacción,
// igual que con open-in-view=false en ejecución normal. Solo se usa H2 de prueba.
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:kusi_edu_pruebas;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.config.import=",
    "kusi.internal-key=clave-solo-para-pruebas-aisladas"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EducacionPersistenciaTest {
    private static final String CLAVE="clave-solo-para-pruebas-aisladas";
    private static final String SESION="sesion-admin-prueba";
    private static final UUID ADMIN=UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID DOCENTE=UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ESTUDIANTE=UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final UUID CURSO=UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID OTRO_DOCENTE=UUID.fromString("55555555-5555-5555-5555-555555555555");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired SeccionRepository secciones;
    @MockitoSpyBean VinculoEstudianteRepository vinculos;
    @MockitoSpyBean AsignacionDocenteRepository asignaciones;
    @MockitoBean DjangoInternoClient django;

    @BeforeEach
    void preparar() {
        asignaciones.deleteAll();
        vinculos.deleteAll();
        secciones.deleteAll();
        when(django.validarAdministrador(SESION)).thenReturn(Map.of("id",ADMIN.toString(),"roles",List.of("administrador")));
    }

    private Seccion seccion() {
        return secciones.saveAndFlush(new Seccion("1ro A",1,2026));
    }

    private ResultActions enviar(String ruta, Map<String,Object> cuerpo) throws Exception {
        return mvc.perform(post(ruta).header("X-Clave-Interna",CLAVE).header("X-Sesion-Kusi",SESION)
            .contentType("application/json").content(json.writeValueAsBytes(cuerpo)));
    }

    private ResultActions consultar(String ruta) throws Exception {
        return mvc.perform(get(ruta).header("X-Clave-Interna",CLAVE).header("X-Sesion-Kusi",SESION));
    }

    @Test
    void listaSeccionesAunqueTodaviaNoTenganAsignaciones() throws Exception {
        Seccion seccion = seccion();
        consultar("/interno/secciones/")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.secciones.length()").value(1))
            .andExpect(jsonPath("$.secciones[0].id").value(seccion.getId().toString()))
            .andExpect(jsonPath("$.secciones[0].nombre").value("1ro A"))
            .andExpect(jsonPath("$.secciones[0].anio_escolar").value(2026));
    }

    @Test
    void listadoSeccionesExigeClaveYSesionAdministradora() throws Exception {
        mvc.perform(get("/interno/secciones/")).andExpect(status().isForbidden());
        doThrow(new SecurityException("Solo administradores")).when(django).validarAdministrador(SESION);
        consultar("/interno/secciones/").andExpect(status().isForbidden());
    }

    @Test
    void listadoVinculosCargaSeccionFueraDeLaTransaccionDePreparacion() throws Exception {
        Seccion seccion=seccion();
        vinculos.saveAndFlush(new VinculoEstudiante(ESTUDIANTE,seccion,2026,ADMIN));
        consultar("/interno/vinculos-estudiantes/")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.vinculos[0].seccion.nombre").value("1ro A"));
    }

    @Test
    void listadoAsignacionesCargaSeccionSinOpenInView() throws Exception {
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE,CURSO,seccion(),2026,ADMIN));
        consultar("/interno/asignaciones-docentes/")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.asignaciones[0].seccion.nombre").value("1ro A"));
    }

    @Test
    void recursosDocenteIncluyenSoloSusAsignaciones() throws Exception {
        Seccion seccion=seccion();
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE,CURSO,seccion,2026,ADMIN));
        asignaciones.saveAndFlush(new AsignacionDocente(OTRO_DOCENTE,CURSO,seccion,2026,ADMIN));
        when(django.validarSesion(SESION)).thenReturn(Map.of("id",DOCENTE.toString(),"roles",List.of("docente")));
        consultar("/interno/docentes/"+DOCENTE+"/recursos/")
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.asignaciones.length()").value(1))
            .andExpect(jsonPath("$.asignaciones[0].docente_id").value(DOCENTE.toString()))
            .andExpect(jsonPath("$.asignaciones[0].seccion.nombre").value("1ro A"));
    }

    @Test
    void docenteNoPuedeConsultarOtroUuid() throws Exception {
        when(django.validarSesion(SESION)).thenReturn(Map.of("id",DOCENTE.toString(),"roles",List.of("docente")));
        consultar("/interno/docentes/"+OTRO_DOCENTE+"/recursos/").andExpect(status().isForbidden());
    }

    @Test
    void sinClaveInternaNoConsultaDjangoNiEscribe() throws Exception {
        clearInvocations(django);
        mvc.perform(post("/interno/secciones/").header("X-Sesion-Kusi",SESION)
            .contentType("application/json").content("{\"nombre\":\"1ro A\",\"grado\":1,\"anio_escolar\":2026}"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(django);
        assertEquals(0L,secciones.count());
    }

    @Test
    void cuentaRechazadaPorDjangoNoSeVincula() throws Exception {
        Seccion seccion=seccion();
        when(django.validarCuenta(ESTUDIANTE,"estudiante")).thenThrow(new IllegalArgumentException("Cuenta inactiva o rol incorrecto."));
        enviar("/interno/vinculos-estudiantes/",Map.of("estudiante_id",ESTUDIANTE,"seccion_id",seccion.getId(),"anio_escolar",2026))
            .andExpect(status().isBadRequest());
        assertEquals(0L,vinculos.count());
    }

    @Test
    void cursoRechazadoPorDjangoNoSeAsigna() throws Exception {
        Seccion seccion=seccion();
        doThrow(new IllegalArgumentException("Curso inexistente.")).when(django).validarCurso(CURSO);
        enviar("/interno/asignaciones-docentes/",Map.of("docente_id",DOCENTE,"curso_id",CURSO,"seccion_id",seccion.getId(),"anio_escolar",2026))
            .andExpect(status().isBadRequest());
        assertEquals(0L,asignaciones.count());
    }

    @Test
    void duplicadoVinculoDetectadoPorBaseRevierteAntesDeResponder409() throws Exception {
        Seccion seccion=seccion();
        vinculos.saveAndFlush(new VinculoEstudiante(ESTUDIANTE,seccion,2026,ADMIN));
        // Emula la ventana concurrente: la comprobación previa no ve la otra
        // escritura, pero la restricción real de H2 debe rechazar el INSERT.
        doReturn(false).when(vinculos).existsByEstudianteIdAndSeccion_IdAndAnioEscolar(ESTUDIANTE,seccion.getId(),2026);
        enviar("/interno/vinculos-estudiantes/",Map.of("estudiante_id",ESTUDIANTE,"seccion_id",seccion.getId(),"anio_escolar",2026))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.mensaje").isString());
        assertEquals(1L,vinculos.count());
        consultar("/interno/vinculos-estudiantes/").andExpect(status().isOk());
    }

    @Test
    void duplicadoAsignacionDetectadoPorBaseRevierteAntesDeResponder409() throws Exception {
        Seccion seccion=seccion();
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE,CURSO,seccion,2026,ADMIN));
        doReturn(false).when(asignaciones).existsByDocenteIdAndCursoIdAndSeccion_IdAndAnioEscolar(DOCENTE,CURSO,seccion.getId(),2026);
        enviar("/interno/asignaciones-docentes/",Map.of("docente_id",DOCENTE,"curso_id",CURSO,"seccion_id",seccion.getId(),"anio_escolar",2026))
            .andExpect(status().isConflict());
        assertEquals(1L,asignaciones.count());
        consultar("/interno/asignaciones-docentes/").andExpect(status().isOk());
    }

    @Test
    void seccionEquivalenteUnicodeNoSeDuplica() throws Exception {
        enviar("/interno/secciones/",Map.of("nombre","１ro A","grado",1,"anio_escolar",2026)).andExpect(status().isCreated());
        enviar("/interno/secciones/",Map.of("nombre","1ro A","grado",1,"anio_escolar",2026)).andExpect(status().isConflict());
        assertEquals(1L,secciones.count());
    }

    @Test
    void vinculoDeOtroAnioNoSeGuarda() throws Exception {
        Seccion seccion=seccion();
        enviar("/interno/vinculos-estudiantes/",Map.of("estudiante_id",ESTUDIANTE,"seccion_id",seccion.getId(),"anio_escolar",2027))
            .andExpect(status().isBadRequest());
        assertEquals(0L,vinculos.count());
    }

    @ParameterizedTest
    @ValueSource(ints={401,403})
    void conservaErrorDeAutenticacionDjangoEnLaRespuesta(int estado) throws Exception {
        when(django.validarAdministrador(SESION)).thenThrow(new ResponseStatusException(HttpStatus.valueOf(estado),"Sesión rechazada."));
        consultar("/interno/vinculos-estudiantes/")
            .andExpect(status().is(estado))
            .andExpect(jsonPath("$.mensaje").value("Sesión rechazada."));
    }

    @Test
    void indisponibilidadDjangoSeResponde503() throws Exception {
        when(django.validarAdministrador(SESION)).thenThrow(new IllegalStateException("Servicio temporalmente no disponible."));
        consultar("/interno/asignaciones-docentes/")
            .andExpect(status().isServiceUnavailable())
            .andExpect(jsonPath("$.mensaje").value("Servicio temporalmente no disponible."));
    }
}
