package pe.kusi.edu;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import pe.kusi.edu.ia.EntradaGeneracion;
import pe.kusi.edu.ia.FalloGeneracion;
import pe.kusi.edu.ia.GeneradorPropuestas;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.PropuestasService;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// SIMULADO: Django y el proveedor de IA son dobles de prueba (HU19-HU25).
// Acredita persistencia H2/Flyway, versiones, revisión y permisos; NO una IA real.
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:kusi_edu_revision;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.config.import=", "kusi.internal-key=clave-solo-para-pruebas-aisladas"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PropuestasRevisionSimuladaTest {
    private static final UUID DOCENTE=UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OTRO_DOCENTE=UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID ADMIN=UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CURSO=UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final String TOKEN="token-csrf-de-prueba-con-cuarenta-y-tres-ch";
    private static final String BASE="/api/edu/propuestas/solicitudes/";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired SeccionRepository secciones;
    @Autowired AsignacionDocenteRepository asignaciones;
    @Autowired SolicitudPropuestaRepository solicitudes;
    @Autowired PropuestaRepository propuestas;
    @Autowired VinculoEstudianteRepository vinculos;
    @Autowired PropuestasService servicio;
    @MockitoBean DjangoInternoClient django;
    @MockitoBean GeneradorPropuestas generador;
    Seccion seccion;

    @BeforeEach
    void preparar() throws Exception {
        propuestas.deleteAll(); solicitudes.deleteAll(); asignaciones.deleteAll(); vinculos.deleteAll(); secciones.deleteAll();
        seccion=secciones.saveAndFlush(new Seccion("1ro A",1,2026));
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE,CURSO,seccion,2026,ADMIN));
        when(django.validarSesion("ses-docente")).thenReturn(Map.of("id",DOCENTE.toString(),"roles",List.of("docente")));
        when(django.validarSesion("ses-otro")).thenReturn(Map.of("id",OTRO_DOCENTE.toString(),"roles",List.of("docente")));
        when(django.nombreCurso(CURSO)).thenReturn("Matemática");
        when(generador.configurado()).thenReturn(true);
        when(generador.proveedor()).thenReturn("simulado");
        when(generador.modelo()).thenReturn("simulado-pruebas");
        when(generador.generar(any())).thenReturn(propuestaIa("Historia simulada 1"));
    }

    private Map<String,Object> propuestaIa(String historia) {
        return Map.of("objetivo","Objetivo sugerido simulado","historia",historia,"acciones",List.of("Contar"),
            "reglas",List.of("Una regla"),"retos",List.of("Reto 1"),"ayudas",List.of("Pista"),"recursos",List.of("Fichas"));
    }

    private ResultActions escribir(String ruta, String sesion, Object cuerpo) throws Exception {
        return mvc.perform(post(ruta).cookie(new Cookie("sessionid",sesion), new Cookie("kusi_edu_csrf",TOKEN))
            .header("X-XSRF-TOKEN",TOKEN).contentType("application/json").content(json.writeValueAsBytes(cuerpo)));
    }

    private ResultActions leer(String ruta, String sesion) throws Exception {
        return mvc.perform(get(ruta).cookie(new Cookie("sessionid",sesion)));
    }

    private UUID crearGenerada(String proposito, String instrucciones) throws Exception {
        UUID id=UUID.randomUUID();
        Map<String,Object> datos=new HashMap<>();
        datos.put("id_solicitud",id); datos.put("curso_id",CURSO); datos.put("seccion_id",seccion.getId());
        datos.put("tema","Sumas"); datos.put("objetivo",null); datos.put("proposito",proposito); datos.put("instrucciones",instrucciones);
        escribir(BASE,"ses-docente",datos).andExpect(status().isCreated()).andExpect(jsonPath("$.solicitud.estado").value("generada"));
        return id;
    }

    @Test
    void simulado_hu19_proposito_e_instrucciones_se_guardan_y_llegan_a_la_ia() throws Exception {
        UUID id=crearGenerada("refuerzo"," Usar\nfrutas ");
        leer(BASE+id+"/","ses-docente").andExpect(jsonPath("$.solicitud.proposito").value("refuerzo"))
            .andExpect(jsonPath("$.solicitud.instrucciones").value(" Usar\nfrutas "));
        ArgumentCaptor<EntradaGeneracion> entrada=ArgumentCaptor.forClass(EntradaGeneracion.class);
        verify(generador).generar(entrada.capture());
        assertEquals("refuerzo", entrada.getValue().proposito());
        assertEquals(" Usar\nfrutas ", entrada.getValue().instrucciones());
        Map<String,Object> invalido=new HashMap<>(Map.of("id_solicitud",UUID.randomUUID(),"curso_id",CURSO,"tema","Sumas","proposito","examen"));
        escribir(BASE,"ses-docente",invalido).andExpect(status().isBadRequest());
    }

    @Test
    void simulado_hu20_lista_solo_propias_y_muestra_todas_las_partes() throws Exception {
        UUID id=crearGenerada("preparacion",null);
        leer(BASE,"ses-docente").andExpect(status().isOk()).andExpect(jsonPath("$.solicitudes.length()").value(1))
            .andExpect(jsonPath("$.solicitudes[0].id_solicitud").value(id.toString()))
            .andExpect(jsonPath("$.solicitudes[0].propuesta.historia").value("Historia simulada 1"))
            .andExpect(jsonPath("$.solicitudes[0].propuesta.recursos[0]").value("Fichas"));
        leer(BASE,"ses-otro").andExpect(jsonPath("$.solicitudes.length()").value(0));
        // Sin recursos la propuesta es válida; la pantalla los muestra como pendientes.
        when(generador.generar(any())).thenReturn(Map.of("objetivo","O","historia","H","acciones",List.of("a"),"reglas",List.of("r"),"retos",List.of("t"),"ayudas",List.of("y")));
        UUID sinRecursos=crearGenerada("preparacion",null);
        leer(BASE+sinRecursos+"/","ses-docente").andExpect(jsonPath("$.solicitud.propuesta.recursos").isEmpty());
    }

    @Test
    void simulado_hu21_aprueba_version_exacta_y_queda_apta_para_juego() throws Exception {
        UUID id=crearGenerada("preparacion",null);
        assertTrue(servicio.aprobadaParaJuego(id).isEmpty());
        escribir(BASE+id+"/versiones/2/aprobar/","ses-docente",Map.of()).andExpect(status().isConflict());
        escribir(BASE+id+"/versiones/1/aprobar/","ses-otro",Map.of()).andExpect(status().isNotFound());
        escribir(BASE+id+"/versiones/1/aprobar/","ses-docente",Map.of()).andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.propuesta.estado_revision").value("aprobada"))
            .andExpect(jsonPath("$.solicitud.propuesta.apta_para_juego").value(true));
        var aprobada=propuestas.findBySolicitudIdAndVersion(id,1).orElseThrow();
        assertEquals(DOCENTE, aprobada.getRevisadaPor());
        assertNotNull(aprobada.getRevisadaEn());
        assertEquals(1, servicio.aprobadaParaJuego(id).orElseThrow().getVersion());
        escribir(BASE+id+"/versiones/1/rechazar/","ses-docente",Map.of()).andExpect(status().isConflict());
    }

    @Test
    void simulado_hu24_rechazada_no_genera_juego_y_permite_otra_alternativa() throws Exception {
        UUID id=crearGenerada("preparacion",null);
        escribir(BASE+id+"/alternativa/","ses-docente",Map.of()).andExpect(status().isConflict());
        escribir(BASE+id+"/versiones/1/rechazar/","ses-docente",Map.of()).andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.propuesta.estado_revision").value("rechazada"))
            .andExpect(jsonPath("$.solicitud.propuesta.apta_para_juego").value(false));
        assertTrue(servicio.aprobadaParaJuego(id).isEmpty());
        escribir(BASE+id+"/versiones/1/aprobar/","ses-docente",Map.of()).andExpect(status().isConflict());
        when(generador.generar(any())).thenReturn(propuestaIa("Historia alternativa"));
        escribir(BASE+id+"/alternativa/","ses-docente",Map.of()).andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(2))
            .andExpect(jsonPath("$.solicitud.propuesta.version_base").value(1))
            .andExpect(jsonPath("$.solicitud.propuesta.historia").value("Historia alternativa"));
        assertEquals("rechazada", propuestas.findBySolicitudIdAndVersion(id,1).orElseThrow().getEstadoRevision());
        assertEquals(1, solicitudes.count());
    }

    @Test
    void simulado_hu22_observaciones_crean_version_nueva_y_conservan_la_anterior() throws Exception {
        UUID id=crearGenerada("preparacion",null);
        escribir(BASE+id+"/versiones/1/observaciones/","ses-docente",Map.of("observaciones","  ")).andExpect(status().isBadRequest());
        when(generador.generar(any())).thenReturn(propuestaIa("Historia ajustada"));
        escribir(BASE+id+"/versiones/1/observaciones/","ses-docente",Map.of("observaciones","Más corta")).andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(2))
            .andExpect(jsonPath("$.solicitud.propuesta.version_base").value(1))
            .andExpect(jsonPath("$.solicitud.propuesta.observaciones").value("Más corta"))
            .andExpect(jsonPath("$.solicitud.propuesta.origen").value("ia"));
        ArgumentCaptor<EntradaGeneracion> entrada=ArgumentCaptor.forClass(EntradaGeneracion.class);
        verify(generador, times(2)).generar(entrada.capture());
        assertEquals("observaciones", entrada.getValue().tipo());
        assertEquals("Historia simulada 1", entrada.getValue().propuestaBase().get("historia"));
        assertEquals("Historia simulada 1", propuestas.findBySolicitudIdAndVersion(id,1).orElseThrow().getHistoria());
        // Un fallo de la IA no borra ni cambia las versiones existentes.
        when(generador.generar(any())).thenThrow(new FalloGeneracion("La IA tardó demasiado en responder.", true));
        escribir(BASE+id+"/versiones/2/observaciones/","ses-docente",Map.of("observaciones","Otra")).andExpect(status().isGatewayTimeout());
        leer(BASE+id+"/","ses-docente").andExpect(jsonPath("$.solicitud.estado").value("generada"))
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(2));
        // Sin IA configurada se responde 503 y no se crea versión.
        when(generador.configurado()).thenReturn(false);
        escribir(BASE+id+"/versiones/2/observaciones/","ses-docente",Map.of("observaciones","Otra")).andExpect(status().isServiceUnavailable());
        assertEquals(2, propuestas.findAllBySolicitudIdOrderByVersionDesc(id).size());
    }

    @Test
    void simulado_hu23_edicion_docente_es_version_nueva_y_requiere_otra_aprobacion() throws Exception {
        UUID id=crearGenerada("preparacion",null);
        escribir(BASE+id+"/versiones/1/aprobar/","ses-docente",Map.of()).andExpect(status().isOk());
        Map<String,Object> edicion=new HashMap<>(Map.of("objetivo","Objetivo sugerido simulado","historia","Historia del docente",
            "acciones",List.of("Contar","Agrupar"),"reglas",List.of("Una regla"),"retos",List.of("Reto 1"),"ayudas",List.of("Pista")));
        escribir(BASE+id+"/versiones/1/modificar/","ses-docente",Map.of("historia","Solo historia")).andExpect(status().isBadRequest());
        escribir(BASE+id+"/versiones/1/modificar/","ses-docente",edicion).andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(2))
            .andExpect(jsonPath("$.solicitud.propuesta.origen").value("docente"))
            .andExpect(jsonPath("$.solicitud.propuesta.origen_objetivo").value("ia"))
            .andExpect(jsonPath("$.solicitud.propuesta.estado_revision").value("pendiente"))
            .andExpect(jsonPath("$.solicitud.propuesta.apta_para_juego").value(false));
        // La aprobada anterior ya no es la vigente: no habilita juego hasta aprobar la nueva.
        assertTrue(servicio.aprobadaParaJuego(id).isEmpty());
        edicion.put("objetivo","Objetivo escrito por el docente");
        escribir(BASE+id+"/versiones/2/modificar/","ses-docente",edicion).andExpect(jsonPath("$.solicitud.propuesta.origen_objetivo").value("docente"));
        escribir(BASE+id+"/versiones/3/aprobar/","ses-docente",Map.of()).andExpect(status().isOk());
        assertEquals(3, servicio.aprobadaParaJuego(id).orElseThrow().getVersion());
        escribir(BASE+id+"/versiones/1/modificar/","ses-otro",edicion).andExpect(status().isNotFound());
    }

    @Test
    void simulado_hu25_historial_ordenado_identifica_ia_y_docente() throws Exception {
        UUID id=crearGenerada("preparacion",null);
        escribir(BASE+id+"/versiones/1/modificar/","ses-docente",Map.of("objetivo","O","historia","H docente","acciones",List.of("a"),
            "reglas",List.of("r"),"retos",List.of("t"),"ayudas",List.of("y"))).andExpect(status().isCreated());
        leer(BASE+id+"/versiones/","ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.versiones.length()").value(2))
            .andExpect(jsonPath("$.versiones[0].version").value(2)).andExpect(jsonPath("$.versiones[0].origen").value("docente"))
            .andExpect(jsonPath("$.versiones[0].proveedor").isEmpty())
            .andExpect(jsonPath("$.versiones[1].version").value(1)).andExpect(jsonPath("$.versiones[1].origen").value("ia"))
            .andExpect(jsonPath("$.versiones[1].proveedor").value("simulado"));
        leer(BASE+id+"/versiones/","ses-otro").andExpect(status().isNotFound());
    }
}
