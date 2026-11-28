package pe.kusi.edu.taller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.test.web.servlet.ResultActions;
import pe.kusi.edu.ia.FalloGeneracion;
import pe.kusi.edu.ia.GeneradorGuion;
import pe.kusi.edu.ia.GeneradorPropuestas;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.PropuestasService;

import java.time.Instant;
import java.util.*;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// La propuesta la escribe el taller por el buzón y la IA directa es el respaldo. H2 y
// Flyway reales; Django y la IA son dobles de prueba (SIMULADO: no es una propuesta real).
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:kusi_edu_propuestas_taller;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.config.import=", "kusi.internal-key=clave-solo-para-pruebas-aisladas",
    "kusi.taller-clave=clave-del-taller-solo-para-pruebas", "kusi.propuestas-por=taller",
    // Estas pruebas cubren también el respaldo con la IA directa, que en la Mac viene apagado.
    "kusi.propuesta-respaldo-ia=true", "kusi.propuesta-espera-taller-seg=60", "kusi.propuesta-tiempo-taller-seg=480"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PropuestasTallerTest {
    private static final UUID DOCENTE = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CURSO = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final String TOKEN = "token-csrf-de-prueba-con-cuarenta-y-tres-ch";
    private static final String CLAVE = "clave-del-taller-solo-para-pruebas";
    private static final String SOLICITUDES = "/api/edu/propuestas/solicitudes/";
    private static final String TALLER = "/interno/taller/trabajos/";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired SeccionRepository secciones;
    @Autowired AsignacionDocenteRepository asignaciones;
    @Autowired SolicitudPropuestaRepository solicitudes;
    @Autowired PropuestaRepository propuestas;
    @Autowired VinculoEstudianteRepository vinculos;
    @Autowired PropuestasService servicio;
    @MockitoBean DjangoInternoClient django;
    @MockitoBean GeneradorPropuestas generador;
    @MockitoBean GeneradorGuion generadorGuion;

    Seccion seccion;

    @BeforeEach
    void preparar() throws Exception {
        jdbc.update("delete from edu.trabajos_taller");
        propuestas.deleteAll(); solicitudes.deleteAll(); asignaciones.deleteAll(); vinculos.deleteAll(); secciones.deleteAll();
        seccion = secciones.saveAndFlush(new Seccion("2do A", 2, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE, CURSO, seccion, 2026, ADMIN));
        when(django.validarSesion("ses-docente")).thenReturn(Map.of("id", DOCENTE.toString(), "roles", List.of("docente")));
        when(django.nombreCurso(CURSO)).thenReturn("Ciencia y Tecnología");
        when(generador.configurado()).thenReturn(false);
        when(generador.proveedor()).thenReturn("simulado");
        when(generador.modelo()).thenReturn("simulado-pruebas");
    }

    // ---- ayudantes ----

    private ResultActions docente(String ruta, Object cuerpo) throws Exception {
        return mvc.perform(post(ruta).cookie(new Cookie("sessionid", "ses-docente"), new Cookie("kusi_edu_csrf", TOKEN))
            .header("X-XSRF-TOKEN", TOKEN).contentType("application/json").content(json.writeValueAsBytes(cuerpo)));
    }

    private ResultActions consultar(UUID solicitud) throws Exception {
        return mvc.perform(get(SOLICITUDES + solicitud + "/").cookie(new Cookie("sessionid", "ses-docente")));
    }

    private ResultActions taller(String ruta, Object cuerpo) throws Exception {
        return mvc.perform(post(TALLER + ruta).header("X-Taller-Clave", CLAVE)
            .contentType("application/json").content(cuerpo == null ? "" : json.writeValueAsString(cuerpo)));
    }

    private UUID pedirPropuesta(String tema) throws Exception {
        UUID id = UUID.randomUUID();
        Map<String, Object> cuerpo = new HashMap<>();
        cuerpo.put("id_solicitud", id); cuerpo.put("curso_id", CURSO); cuerpo.put("seccion_id", seccion.getId()); cuerpo.put("tema", tema);
        docente(SOLICITUDES, cuerpo).andExpect(status().isCreated()).andExpect(jsonPath("$.solicitud.estado").value("generando"))
            .andExpect(jsonPath("$.solicitud.propuesta").doesNotExist());
        return id;
    }

    // El trabajador toma el trabajo: devuelve su id.
    private String tomar() throws Exception {
        String cuerpo = taller("siguiente", null).andExpect(status().isOk())
            .andExpect(jsonPath("$.trabajo.tipo").value("proponer")).andReturn().getResponse().getContentAsString();
        return json.readTree(cuerpo).at("/trabajo/id").asText();
    }

    private Map<String, Object> propuestaDelTaller() {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("tipo_juego", "otro"); p.put("regla_juego", "ninguna");
        p.put("objetivo", "Los niños aprenderán a reconocer las partes del cuerpo");
        p.put("historia", "El niño arma el cuerpo con ayuda de Kusi. Practica los nombres de las partes.");
        p.put("acciones", List.of("Tocar una parte")); p.put("reglas", List.of("Se arma una parte a la vez"));
        p.put("retos", List.of("Armar la cabeza", "Armar el cuerpo")); p.put("ayudas", List.of("Kusi dice dónde mirar"));
        p.put("recursos", List.of("Dibujo del cuerpo")); p.put("objetos", List.of("cabeza", "brazo"));
        return p;
    }

    private Map<String, Object> entregaValida() {
        return Map.of("propuesta", propuestaDelTaller(),
            "fuentes", List.of(Map.of("documento", "Programa curricular de Primaria", "referencia", "página 120", "tema", "El cuerpo humano")),
            "evidencia", Map.of("segundos", 95));
    }

    private void esperarEstado(UUID solicitud, String estado) throws Exception {
        for (int i = 0; i < 100; i++) {
            if (estado.equals(solicitudes.findById(solicitud).orElseThrow().getEstado())) return;
            Thread.sleep(50);
        }
        fail("La solicitud no llegó al estado " + estado);
    }

    // ---- las pruebas ----

    @Test
    void laPropuestaNuevaQuedaGenerandoYElTallerLaEntregaConSusFuentes() throws Exception {
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        assertEquals(1, jdbc.queryForObject("select count(*) from edu.trabajos_taller where tipo='proponer' and estado='pendiente' and generacion_id is null", Integer.class));

        String trabajo = tomar();
        // El pedido lleva el grado de la sección (segundo) y el tema, y ningún dato de estudiantes.
        taller("siguiente", null).andExpect(status().isNoContent());
        taller(trabajo + "/propuesta", entregaValida()).andExpect(status().isOk()).andExpect(jsonPath("$.trabajo.estado").value("listo"));

        consultar(solicitud).andExpect(status().isOk()).andExpect(jsonPath("$.solicitud.estado").value("generada"))
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(1))
            .andExpect(jsonPath("$.solicitud.propuesta.origen").value("ia"))
            .andExpect(jsonPath("$.solicitud.propuesta.proveedor").value("taller"))
            .andExpect(jsonPath("$.solicitud.propuesta.tipo_juego").value("otro"));
        String fuentes = propuestas.findFirstBySolicitudIdOrderByVersionDesc(solicitud).orElseThrow().getFuentes();
        JsonNode lista = json.readTree(fuentes);
        assertEquals(1, lista.size());
        assertEquals("página 120", lista.get(0).path("referencia").asText());
        assertEquals("listo", jdbc.queryForObject("select estado from edu.trabajos_taller where id = ?", String.class, UUID.fromString(trabajo)));
    }

    @Test
    void elPedidoDelTallerLlevaElGradoYElTemaSinDatosDeEstudiantes() throws Exception {
        pedirPropuesta("Las partes del hueso");
        String cuerpo = taller("siguiente", null).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode entrada = json.readTree(cuerpo).at("/trabajo/entrada");
        assertEquals(2, entrada.at("/entrada/grado").asInt());
        assertEquals("Las partes del hueso", entrada.at("/entrada/tema").asText());
        assertEquals("nueva", entrada.at("/entrada/tipo").asText());
        assertFalse(cuerpo.contains("docente_id") || cuerpo.contains("estudiante"));
    }

    @Test
    void unaEntregaIncompletaSeRechazaConSusMotivosYSePuedeCorregir() throws Exception {
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        String trabajo = tomar();
        Map<String, Object> mala = new LinkedHashMap<>(propuestaDelTaller());
        mala.remove("historia"); mala.put("retos", List.of());
        taller(trabajo + "/propuesta", Map.of("propuesta", mala)).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.motivos[?(@ =~ /.*historia.*/)]").exists())
            .andExpect(jsonPath("$.motivos[?(@ =~ /.*retos.*/)]").exists())
            .andExpect(jsonPath("$.motivos[?(@ =~ /.*fuentes.*/)]").exists());
        // Sigue esperando: el trabajador corrige y entrega otra vez.
        assertEquals("generando", solicitudes.findById(solicitud).orElseThrow().getEstado());
        taller(trabajo + "/propuesta", entregaValida()).andExpect(status().isOk());
        assertEquals("generada", solicitudes.findById(solicitud).orElseThrow().getEstado());
    }

    @Test
    void unaFuenteSinReferenciaSeRechaza() throws Exception {
        pedirPropuesta("El cuerpo humano");
        String trabajo = tomar();
        taller(trabajo + "/propuesta", Map.of("propuesta", propuestaDelTaller(),
            "fuentes", List.of(Map.of("documento", "Programa curricular")))).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.motivos[0]").value(org.hamcrest.Matchers.containsString("referencia")));
    }

    @Test
    void elFalloDelTallerHaceQueEntreLaIaDirectaDeRespaldo() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenReturn(propuestaDelTaller());
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        String trabajo = tomar();
        taller(trabajo + "/fallo", Map.of("motivo", "Se acabaron los tokens")).andExpect(status().isOk())
            .andExpect(jsonPath("$.trabajo.estado").value("fallido"));

        esperarEstado(solicitud, "generada");
        var propuesta = propuestas.findFirstBySolicitudIdOrderByVersionDesc(solicitud).orElseThrow();
        assertEquals("simulado", propuesta.getProveedor());
        // La del respaldo no trae fuentes: queda dicho, no inventado.
        assertNull(propuesta.getFuentes());
        assertEquals("fallido", jdbc.queryForObject("select estado from edu.trabajos_taller where id = ?", String.class, UUID.fromString(trabajo)));
    }

    @Test
    void sinRespaldoElFalloDejaLaSolicitudFallidaParaReintentar() throws Exception {
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        taller(tomar() + "/fallo", Map.of("motivo", "Sin tokens")).andExpect(status().isOk());
        consultar(solicitud).andExpect(jsonPath("$.solicitud.estado").value("fallida"));

        // El docente reintenta: vuelve a pedirse al taller.
        docente(SOLICITUDES + solicitud + "/reintentar/", Map.of()).andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.estado").value("generando"));
        tomar();
    }

    @Test
    void conElRespaldoApagadoLaIaDirectaNoEscribeLaPropuestaAunqueEsteConfigurada() throws Exception {
        when(generador.configurado()).thenReturn(true);
        ReflectionTestUtils.setField(servicio, "respaldoIa", false);
        try {
            UUID solicitud = pedirPropuesta("Los cinco sentidos");
            taller(tomar() + "/fallo", Map.of("motivo", "Se acabó el tiempo de la propuesta")).andExpect(status().isOk());
            consultar(solicitud).andExpect(jsonPath("$.solicitud.estado").value("fallida"));
            // Pasado cualquier tiempo de espera tampoco entra: la IA directa no se llama nunca.
            servicio.revisarEspera(Instant.now().plusSeconds(3600));
            verify(generador, never()).generar(any());
            // El docente reintenta y el pedido vuelve al taller.
            docente(SOLICITUDES + solicitud + "/reintentar/", Map.of()).andExpect(status().isOk())
                .andExpect(jsonPath("$.solicitud.estado").value("generando"));
            tomar();
        } finally {
            ReflectionTestUtils.setField(servicio, "respaldoIa", true);
        }
    }

    @Test
    void siNadieDelTallerTomaElPedidoEntraElRespaldoSinEsperarParaSiempre() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenReturn(propuestaDelTaller());
        UUID solicitud = pedirPropuesta("El cuerpo humano");

        // Recién pedido: todavía se espera al taller.
        servicio.revisarEspera(Instant.now());
        assertEquals("generando", solicitudes.findById(solicitud).orElseThrow().getEstado());

        // Pasado el tiempo de espera, entra el respaldo y el trabajo ya no se le ofrece al taller.
        servicio.revisarEspera(Instant.now().plusSeconds(120));
        esperarEstado(solicitud, "generada");
        taller("siguiente", null).andExpect(status().isNoContent());
        assertEquals("fallido", jdbc.queryForObject("select estado from edu.trabajos_taller where solicitud_id = ?", String.class, solicitud));
    }

    @Test
    void siElTallerLoTomoYNoLoEntregaTambienEntraElRespaldo() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenReturn(propuestaDelTaller());
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        tomar();
        servicio.revisarEspera(Instant.now().plusSeconds(60));
        assertEquals("generando", solicitudes.findById(solicitud).orElseThrow().getEstado());
        servicio.revisarEspera(Instant.now().plusSeconds(600));
        esperarEstado(solicitud, "generada");
    }

    @Test
    void laPropuestaPausadaSiguePreparandoseHastaQueElTallerLaRetoma() throws Exception {
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        String cuerpo = taller("siguiente", null).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode tomado = json.readTree(cuerpo).path("trabajo");
        String trabajo = tomado.path("id").asText();
        Instant hasta = Instant.now().plusSeconds(7200);
        taller(trabajo + "/pausa", Map.of("motivo", "Límite de uso del proponedor.",
            "hasta", hasta.toString(), "tomado_en", tomado.path("tomado_en").asText()))
            .andExpect(status().isOk()).andExpect(jsonPath("$.trabajo.intentos").value(0));

        servicio.revisarEspera(hasta.plusSeconds(600));
        consultar(solicitud).andExpect(jsonPath("$.solicitud.estado").value("generando"));
        taller("siguiente", null).andExpect(status().isNoContent());
        jdbc.update("update edu.trabajos_taller set disponible_desde = current_timestamp where id = ?", UUID.fromString(trabajo));
        assertEquals(trabajo, tomar());
        taller(trabajo + "/propuesta", entregaValida()).andExpect(status().isOk());
        consultar(solicitud).andExpect(jsonPath("$.solicitud.estado").value("generada"));
    }

    @Test
    void siElRespaldoTambienFallaLaSolicitudQuedaFallida() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenThrow(new FalloGeneracion("La IA no respondió.", false));
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        taller(tomar() + "/fallo", Map.of("motivo", "Sin tokens")).andExpect(status().isOk());
        esperarEstado(solicitud, "fallida");
        assertTrue(solicitudes.findById(solicitud).orElseThrow().getUltimoError().contains("La IA no respondió"));
    }

    @Test
    void lasObservacionesDelDocenteTambienPasanPorElTallerYConservanLaVersionAnterior() throws Exception {
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        taller(tomar() + "/propuesta", entregaValida()).andExpect(status().isOk());

        docente(SOLICITUDES + solicitud + "/versiones/1/observaciones/", Map.of("observaciones", "Que sea más corto")).andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.estado").value("generando"));
        String cuerpo = taller("siguiente", null).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        JsonNode trabajo = json.readTree(cuerpo).path("trabajo");
        assertEquals("observaciones", trabajo.at("/entrada/entrada/tipo").asText());
        assertEquals("Que sea más corto", trabajo.at("/entrada/entrada/observaciones").asText());
        assertEquals(1, trabajo.at("/entrada/versionBase").asInt());

        taller(trabajo.path("id").asText() + "/propuesta", entregaValida()).andExpect(status().isOk());
        consultar(solicitud).andExpect(jsonPath("$.solicitud.propuesta.version").value(2))
            .andExpect(jsonPath("$.solicitud.propuesta.version_base").value(1))
            .andExpect(jsonPath("$.solicitud.propuesta.observaciones").value("Que sea más corto"));
        assertEquals(2, propuestas.findAllBySolicitudIdOrderByVersionDesc(solicitud).size());
    }

    @Test
    void unaEntregaTardiaSeRechazaPorqueLaSolicitudYaNoEspera() throws Exception {
        when(generador.configurado()).thenReturn(true);
        when(generador.generar(any())).thenReturn(propuestaDelTaller());
        UUID solicitud = pedirPropuesta("El cuerpo humano");
        String trabajo = tomar();
        servicio.revisarEspera(Instant.now().plusSeconds(600));
        esperarEstado(solicitud, "generada");
        // El taller llega tarde: el trabajo ya está cerrado y no se guarda una segunda versión.
        taller(trabajo + "/propuesta", entregaValida()).andExpect(status().isConflict());
        assertEquals(1, propuestas.findAllBySolicitudIdOrderByVersionDesc(solicitud).size());
    }

    @Test
    void elBuzonDeJuegosNoAceptaUnaPropuestaNiAlReves() throws Exception {
        pedirPropuesta("El cuerpo humano");
        String trabajo = tomar();
        taller(trabajo + "/resultado", Map.of("paquete", Map.of())).andExpect(status().isConflict());
    }

    @Test
    void sinLaClaveDelTallerNoSeEntregaNada() throws Exception {
        pedirPropuesta("El cuerpo humano");
        String trabajo = tomar();
        mvc.perform(post(TALLER + trabajo + "/propuesta").contentType("application/json").content(json.writeValueAsBytes(entregaValida())))
            .andExpect(status().isForbidden());
    }
}
