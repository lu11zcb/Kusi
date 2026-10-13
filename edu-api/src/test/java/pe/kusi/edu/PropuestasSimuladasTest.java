package pe.kusi.edu;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.ia.FalloGeneracion;
import pe.kusi.edu.ia.GeneradorPropuestas;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.DjangoInternoClient;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// SIMULADO: Django y el proveedor de IA son dobles de prueba. Estas pruebas acreditan
// persistencia H2/Flyway, estados, permisos, CSRF y reintentos; NO una generación real.
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:kusi_edu_propuestas;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.config.import=", "kusi.internal-key=clave-solo-para-pruebas-aisladas"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PropuestasSimuladasTest {
    private static final UUID DOCENTE=UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OTRO_DOCENTE=UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID ADMIN=UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CURSO=UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final UUID CURSO_AJENO=UUID.fromString("66666666-6666-6666-6666-666666666666");
    private static final String TOKEN="token-csrf-de-prueba-con-cuarenta-y-tres-ch";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired SeccionRepository secciones;
    @Autowired AsignacionDocenteRepository asignaciones;
    @Autowired SolicitudPropuestaRepository solicitudes;
    @Autowired PropuestaRepository propuestas;
    @Autowired VinculoEstudianteRepository vinculos;
    @MockitoBean DjangoInternoClient django;
    @MockitoBean GeneradorPropuestas generador;
    Seccion seccion;

    @BeforeEach
    void preparar() {
        propuestas.deleteAll(); solicitudes.deleteAll(); asignaciones.deleteAll(); vinculos.deleteAll(); secciones.deleteAll();
        seccion=secciones.saveAndFlush(new Seccion("1ro A",1,2026));
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE,CURSO,seccion,2026,ADMIN));
        when(django.validarSesion("ses-docente")).thenReturn(Map.of("id",DOCENTE.toString(),"roles",List.of("docente")));
        when(django.validarSesion("ses-otro")).thenReturn(Map.of("id",OTRO_DOCENTE.toString(),"roles",List.of("docente")));
        when(django.validarSesion("ses-admin")).thenReturn(Map.of("id",ADMIN.toString(),"roles",List.of("administrador")));
        when(django.validarSesion("ses-caducada")).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED,"La sesión no está autorizada o ha caducado."));
        when(django.nombreCurso(CURSO)).thenReturn("Matemática");
        when(generador.configurado()).thenReturn(false);
        when(generador.proveedor()).thenReturn("simulado");
        when(generador.modelo()).thenReturn("simulado-pruebas");
    }

    private Map<String,Object> entrada(UUID id, String tema, String objetivo) {
        Map<String,Object> datos=new HashMap<>();
        datos.put("id_solicitud",id); datos.put("curso_id",CURSO); datos.put("seccion_id",seccion.getId());
        datos.put("tema",tema); datos.put("objetivo",objetivo);
        return datos;
    }

    private ResultActions escribir(String ruta, String sesion, Object cuerpo) throws Exception {
        return mvc.perform(post(ruta).cookie(new Cookie("sessionid",sesion), new Cookie("kusi_edu_csrf",TOKEN))
            .header("X-XSRF-TOKEN",TOKEN).contentType("application/json").content(json.writeValueAsBytes(cuerpo)));
    }

    private ResultActions leer(String ruta, String sesion) throws Exception {
        return mvc.perform(get(ruta).cookie(new Cookie("sessionid",sesion)));
    }

    private Map<String,Object> propuestaValida() {
        return Map.of("objetivo","Objetivo sugerido simulado","historia","Historia simulada del cuy",
            "acciones",List.of("Contar"),"reglas",List.of("Una regla"),"retos",List.of("Reto 1"),"ayudas",List.of("Pista"));
    }

    @Test
    void simulado_hu11_acceso_movil_solo_para_estudiantes() throws Exception {
        when(django.validarSesion("ses-estudiante")).thenReturn(Map.of("id","77777777-7777-7777-7777-777777777777","nombre","Estudiante ficticio","roles",List.of("estudiante")));
        leer("/api/edu/acceso/estudiante/","ses-estudiante").andExpect(status().isOk())
            .andExpect(jsonPath("$.usuario.nombre").value("Estudiante ficticio"))
            .andExpect(jsonPath("$.usuario.debe_cambiar_contrasena").value(false));
        leer("/api/edu/acceso/estudiante/","ses-docente").andExpect(status().isForbidden());
        leer("/api/edu/acceso/estudiante/","ses-caducada").andExpect(status().isUnauthorized());
    }

    @Test
    void simulado_hu09_docente_ve_solo_estudiantes_de_sus_secciones() throws Exception {
        Seccion otra=secciones.saveAndFlush(new Seccion("1ro B",1,2026));
        UUID propio=UUID.randomUUID(), ajeno=UUID.randomUUID();
        vinculos.saveAndFlush(new pe.kusi.edu.model.VinculoEstudiante(propio,seccion,2026,ADMIN));
        vinculos.saveAndFlush(new pe.kusi.edu.model.VinculoEstudiante(ajeno,otra,2026,ADMIN));
        mvc.perform(get("/interno/docentes/"+DOCENTE+"/estudiantes/").header("X-Clave-Interna","clave-solo-para-pruebas-aisladas").header("X-Sesion-Kusi","ses-docente"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.estudiantes.length()").value(1))
            .andExpect(jsonPath("$.estudiantes[0].estudiante_id").value(propio.toString()));
        // Pedir los estudiantes de otro docente con la propia sesión se rechaza.
        mvc.perform(get("/interno/docentes/"+OTRO_DOCENTE+"/estudiantes/").header("X-Clave-Interna","clave-solo-para-pruebas-aisladas").header("X-Sesion-Kusi","ses-docente"))
            .andExpect(status().isForbidden());
    }

    @Test
    void simulado_csrf_obligatorio_y_token_emitido_por_spring() throws Exception {
        mvc.perform(post("/api/edu/propuestas/solicitudes/").cookie(new Cookie("sessionid","ses-docente"))
            .contentType("application/json").content(json.writeValueAsBytes(entrada(UUID.randomUUID(),"Sumas",null))))
            .andExpect(status().isForbidden());
        MvcResult r=mvc.perform(get("/api/edu/acceso/csrf/")).andExpect(status().isOk()).andReturn();
        String token=json.readTree(r.getResponse().getContentAsString()).get("csrf_token").asText();
        assertEquals(token, r.getResponse().getCookie("kusi_edu_csrf").getValue());
        assertTrue(r.getResponse().getHeader("Set-Cookie").contains("SameSite=Strict"));
        mvc.perform(post("/api/edu/propuestas/solicitudes/").cookie(new Cookie("sessionid","ses-docente"), new Cookie("kusi_edu_csrf",token))
            .header("X-XSRF-TOKEN","otro-token").contentType("application/json").content(json.writeValueAsBytes(entrada(UUID.randomUUID(),"Sumas",null))))
            .andExpect(status().isForbidden());
        assertEquals(0, solicitudes.count());
    }

    @Test
    void simulado_sin_ia_configurada_guarda_pendiente_sin_contenido_ficticio() throws Exception {
        UUID id=UUID.randomUUID();
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"  Sumas hasta 20  ","Contar\n  objetos "))
            .andExpect(status().isCreated()).andExpect(header().string("Cache-Control","no-store"))
            .andExpect(jsonPath("$.solicitud.estado").value("pendiente"))
            .andExpect(jsonPath("$.solicitud.tema").value("Sumas hasta 20"))
            .andExpect(jsonPath("$.solicitud.objetivo_docente").value("Contar\n  objetos "))
            .andExpect(jsonPath("$.solicitud.propuesta").isEmpty());
        escribir("/api/edu/propuestas/solicitudes/"+id+"/reintentar/","ses-docente",Map.of())
            .andExpect(status().isServiceUnavailable());
        assertEquals("pendiente", solicitudes.findById(id).orElseThrow().getEstado());
        verify(generador, never()).generar(any());
        leer("/api/edu/contexto/propuestas/","ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.ia_configurada").value(false))
            .andExpect(jsonPath("$.contextos[0].curso_nombre").value("Matemática"))
            .andExpect(jsonPath("$.contextos[0].seccion_nombre").value("1ro A"))
            .andExpect(jsonPath("$.contextos[0].anio_escolar").value(2026));
    }

    @Test
    void simulado_mismo_identificador_no_duplica_y_contenido_distinto_es_409() throws Exception {
        UUID id=UUID.randomUUID();
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"Sumas","   ")).andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.objetivo_docente").isEmpty());
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"Sumas",null)).andExpect(status().isOk());
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"Restas",null)).andExpect(status().isConflict());
        escribir("/api/edu/propuestas/solicitudes/","ses-otro",entrada(id,"Sumas",null)).andExpect(status().isForbidden());
        assertEquals(1, solicitudes.count());
    }

    @Test
    void simulado_rechaza_entradas_invalidas_roles_y_recursos_ajenos() throws Exception {
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(UUID.randomUUID(),"   ",null)).andExpect(status().isBadRequest());
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(UUID.randomUUID(),"x".repeat(2001),null)).andExpect(status().isBadRequest());
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(UUID.randomUUID(),"Sumas","o".repeat(4001))).andExpect(status().isBadRequest());
        Map<String,Object> ajeno=entrada(UUID.randomUUID(),"Sumas",null); ajeno.put("curso_id",CURSO_AJENO);
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",ajeno).andExpect(status().isForbidden());
        escribir("/api/edu/propuestas/solicitudes/","ses-admin",entrada(UUID.randomUUID(),"Sumas",null)).andExpect(status().isForbidden());
        escribir("/api/edu/propuestas/solicitudes/","ses-caducada",entrada(UUID.randomUUID(),"Sumas",null)).andExpect(status().isUnauthorized());
        leer("/api/edu/contexto/propuestas/","ses-otro").andExpect(status().isOk()).andExpect(jsonPath("$.contextos").isEmpty());
        assertEquals(0, solicitudes.count());
    }

    @Test
    void simulado_genera_y_conserva_objetivo_exacto_del_docente() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenReturn(propuestaValida());
        UUID id=UUID.randomUUID();
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"Sumas"," Mi objetivo\n"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.solicitud.estado").value("generada"))
            .andExpect(jsonPath("$.solicitud.propuesta.objetivo").value(" Mi objetivo\n"))
            .andExpect(jsonPath("$.solicitud.propuesta.origen_objetivo").value("docente"))
            .andExpect(jsonPath("$.solicitud.propuesta.acciones[0]").value("Contar"));
        var guardada=propuestas.findFirstBySolicitudIdOrderByVersionDesc(id).orElseThrow();
        assertEquals("simulado", guardada.getProveedor());
        assertEquals(1, guardada.getVersion());
        // Consultar una generada no vuelve a llamar al proveedor.
        leer("/api/edu/propuestas/solicitudes/"+id+"/","ses-docente").andExpect(jsonPath("$.solicitud.estado").value("generada"));
        escribir("/api/edu/propuestas/solicitudes/"+id+"/reintentar/","ses-docente",Map.of()).andExpect(status().isOk());
        verify(generador, times(1)).generar(any());
    }

    @Test
    void simulado_sin_objetivo_la_ia_lo_sugiere_identificado() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenReturn(propuestaValida());
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(UUID.randomUUID(),"Sumas",null))
            .andExpect(jsonPath("$.solicitud.objetivo_docente").isEmpty())
            .andExpect(jsonPath("$.solicitud.propuesta.objetivo").value("Objetivo sugerido simulado"))
            .andExpect(jsonPath("$.solicitud.propuesta.origen_objetivo").value("ia"));
    }

    @Test
    void simulado_respuesta_incompleta_queda_fallida_y_se_reintenta() throws Exception {
        when(generador.configurado()).thenReturn(true);
        Map<String,Object> incompleta=new HashMap<>(propuestaValida()); incompleta.put("retos",List.of());
        when(generador.generar(any())).thenReturn(incompleta).thenReturn(propuestaValida());
        UUID id=UUID.randomUUID();
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"Sumas",null)).andExpect(status().isBadGateway());
        assertEquals("fallida", solicitudes.findById(id).orElseThrow().getEstado());
        leer("/api/edu/propuestas/solicitudes/"+id+"/","ses-docente").andExpect(jsonPath("$.solicitud.estado").value("fallida"))
            .andExpect(jsonPath("$.solicitud.propuesta").isEmpty());
        escribir("/api/edu/propuestas/solicitudes/"+id+"/reintentar/","ses-docente",Map.of()).andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.estado").value("generada"));
        assertEquals(2, solicitudes.findById(id).orElseThrow().getIntentos());
        assertEquals(1, solicitudes.count());
    }

    @Test
    void simulado_tiempo_agotado_responde_504_y_conserva_la_solicitud() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenThrow(new FalloGeneracion("La IA tardó demasiado en responder.", true));
        UUID id=UUID.randomUUID();
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"Sumas",null)).andExpect(status().isGatewayTimeout());
        assertEquals("fallida", solicitudes.findById(id).orElseThrow().getEstado());
    }

    @Test
    void simulado_otro_docente_no_ve_ni_reintenta_y_asignacion_retirada_bloquea() throws Exception {
        UUID id=UUID.randomUUID();
        escribir("/api/edu/propuestas/solicitudes/","ses-docente",entrada(id,"Sumas",null)).andExpect(status().isCreated());
        leer("/api/edu/propuestas/solicitudes/"+id+"/","ses-otro").andExpect(status().isNotFound());
        escribir("/api/edu/propuestas/solicitudes/"+id+"/reintentar/","ses-otro",Map.of()).andExpect(status().isNotFound());
        leer("/api/edu/propuestas/solicitudes/"+UUID.randomUUID()+"/","ses-docente").andExpect(status().isNotFound());
        asignaciones.deleteAll();
        leer("/api/edu/propuestas/solicitudes/"+id+"/","ses-docente").andExpect(status().isForbidden());
    }
}
