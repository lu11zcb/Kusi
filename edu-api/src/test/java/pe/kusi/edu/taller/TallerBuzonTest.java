package pe.kusi.edu.taller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import pe.kusi.edu.ia.GeneradorGuion;
import pe.kusi.edu.ia.GeneradorPropuestas;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.DjangoInternoClient;
import pe.kusi.edu.service.TallerService;
import pe.kusi.edu.web.TallerController;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// El buzón del taller de punta a punta: el docente genera un juego «otro», el trabajador
// lo toma con su clave, entrega el resultado o el fallo, y el docente ve su juego listo
// o un mensaje amable. H2 y Flyway reales; Django y la IA son dobles de prueba.
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:kusi_edu_taller;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.config.import=", "kusi.internal-key=clave-solo-para-pruebas-aisladas",
    "kusi.taller-clave=clave-del-taller-solo-para-pruebas"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TallerBuzonTest {
    private static final UUID DOCENTE = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CURSO = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final String TOKEN = "token-csrf-de-prueba-con-cuarenta-y-tres-ch";
    private static final String CLAVE = "clave-del-taller-solo-para-pruebas";
    private static final String TEMA = "Los animales de la chacra";
    private static final String RUTA_SOLICITUDES = "/api/edu/propuestas/solicitudes/";
    private static final String RUTA_TALLER = "/interno/taller/trabajos/";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired SeccionRepository secciones;
    @Autowired AsignacionDocenteRepository asignaciones;
    @Autowired SolicitudPropuestaRepository solicitudes;
    @Autowired PropuestaRepository propuestas;
    @Autowired VinculoEstudianteRepository vinculos;
    @Autowired GeneracionRepository generaciones;
    @Autowired EtapaGeneracionRepository etapas;
    @Autowired TallerController controlador;
    @MockitoBean DjangoInternoClient django;
    @MockitoBean GeneradorPropuestas generadorPropuestas;
    @MockitoBean GeneradorGuion generadorGuion;

    Seccion seccion;

    @BeforeEach
    void preparar() throws Exception {
        jdbc.update("delete from edu.piezas_taller");
        jdbc.update("delete from edu.trabajos_taller");
        etapas.deleteAll(); generaciones.deleteAll(); propuestas.deleteAll(); solicitudes.deleteAll();
        asignaciones.deleteAll(); vinculos.deleteAll(); secciones.deleteAll();
        seccion = secciones.saveAndFlush(new Seccion("1ro A", 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE, CURSO, seccion, 2026, ADMIN));
        when(django.validarSesion("ses-docente")).thenReturn(Map.of("id", DOCENTE.toString(), "roles", List.of("docente")));
        when(django.nombreCurso(CURSO)).thenReturn("Ciencia y Tecnología");

        // La propuesta de la IA diseña otro juego: no es un laberinto de frutas.
        Map<String, Object> otroJuego = new HashMap<>();
        otroJuego.put("objetivo", "Reconocer los animales de la chacra");
        otroJuego.put("historia", "Kusi visita la chacra");
        otroJuego.put("acciones", List.of("Tocar el animal que se nombra"));
        otroJuego.put("reglas", List.of("Una regla"));
        otroJuego.put("retos", List.of("Reto 1"));
        otroJuego.put("ayudas", List.of("Pista"));
        otroJuego.put("tipo_juego", "otro");
        otroJuego.put("regla_juego", "ninguna");
        otroJuego.put("objetos", List.of("la vaca", "la oveja", "la llama"));
        when(generadorPropuestas.configurado()).thenReturn(true);
        when(generadorPropuestas.proveedor()).thenReturn("simulado");
        when(generadorPropuestas.modelo()).thenReturn("simulado-pruebas");
        when(generadorPropuestas.generar(any())).thenReturn(otroJuego);
        when(generadorGuion.configurado()).thenReturn(true);
    }

    // ---------- Ayudas de las pruebas ----------

    private ResultActions escribir(String ruta, Object cuerpo) throws Exception {
        return mvc.perform(post(ruta).cookie(new Cookie("sessionid", "ses-docente"), new Cookie("kusi_edu_csrf", TOKEN))
            .header("X-XSRF-TOKEN", TOKEN).contentType("application/json").content(json.writeValueAsBytes(cuerpo)));
    }

    private ResultActions leer(String ruta) throws Exception {
        return mvc.perform(get(ruta).cookie(new Cookie("sessionid", "ses-docente")));
    }

    private JsonNode cuerpo(ResultActions resultado) throws Exception {
        return json.readTree(resultado.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    // Lo que hace el trabajador: sin sesión ni CSRF, solo con la clave del taller.
    private ResultActions taller(String ruta, String clave, Object cuerpo) throws Exception {
        MockHttpServletRequestBuilder pedido = post(RUTA_TALLER + ruta).contentType("application/json");
        if (clave != null) pedido.header("X-Taller-Clave", clave);
        if (cuerpo != null) pedido.content(json.writeValueAsBytes(cuerpo));
        return mvc.perform(pedido);
    }

    // El docente escribe el tema, aprueba la propuesta y pide «Generar».
    private UUID generarJuegoDelTaller() throws Exception {
        UUID solicitud = UUID.randomUUID();
        Map<String, Object> datos = new HashMap<>();
        datos.put("id_solicitud", solicitud); datos.put("curso_id", CURSO); datos.put("seccion_id", seccion.getId());
        datos.put("tema", TEMA); datos.put("proposito", "refuerzo"); datos.put("instrucciones", "Que sea corto");
        escribir(RUTA_SOLICITUDES, datos).andExpect(status().isCreated());
        escribir(RUTA_SOLICITUDES + solicitud + "/versiones/1/aprobar/", Map.of()).andExpect(status().isOk());
        JsonNode creada = cuerpo(escribir(RUTA_SOLICITUDES + solicitud + "/versiones/1/generar/", Map.of())
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.generacion.taller").value(true)));
        return UUID.fromString(creada.path("generacion").path("id").asText());
    }

    private UUID solicitudDe(UUID generacion) {
        return generaciones.findById(generacion).orElseThrow().getSolicitudId();
    }

    private UUID trabajoDe(UUID generacion) {
        return jdbc.queryForObject("select id from edu.trabajos_taller where generacion_id = ?", UUID.class, generacion);
    }

    private String estadoDelTrabajo(UUID trabajo) {
        return jdbc.queryForObject("select estado from edu.trabajos_taller where id = ?", String.class, trabajo);
    }

    private String estadoDeLaGeneracion(UUID generacion) {
        return generaciones.findById(generacion).orElseThrow().getEstado();
    }

    // El trabajador toma el siguiente trabajo y devuelve su id.
    private UUID tomar() throws Exception {
        return UUID.fromString(cuerpo(taller("siguiente", CLAVE, null).andExpect(status().isOk()))
            .path("trabajo").path("id").asText());
    }

    // Como si el trabajador lo hubiera tomado hace 31 minutos y se hubiera colgado.
    private void envejecer(UUID trabajo) {
        jdbc.update("update edu.trabajos_taller set tomado_en = ? where id = ?",
            Timestamp.from(Instant.now().minus(Duration.ofMinutes(91))), trabajo);
    }

    private ObjectNode resultadoBueno(UUID trabajo) {
        ObjectNode resultado = json.createObjectNode();
        resultado.set("paquete", ValidadorPaqueteTallerTest.guionBueno(json, trabajo));
        ArrayNode piezas = resultado.putArray("piezas");
        piezas.addObject().put("id", "olla-de-barro").put("tipo", "objeto").put("nombre", "Olla de barro");
        piezas.addObject().put("id", "fondo-chacra").put("tipo", "fondo");
        ObjectNode evidencia = resultado.putObject("evidencia");
        evidencia.put("trabajo", trabajo.toString());
        evidencia.put("resultado", "listo");
        evidencia.putObject("intentos").put("juego", 2);
        evidencia.put("segundos", 300);
        return resultado;
    }

    // ---------- La clave ----------

    @Test
    void sin_clave_o_con_otra_clave_el_buzon_no_entrega_nada() throws Exception {
        UUID juego = generarJuegoDelTaller();
        taller("siguiente", null, null).andExpect(status().isForbidden());
        taller("siguiente", "otra-clave", null).andExpect(status().isForbidden());
        taller("siguiente", CLAVE.substring(0, 10), null).andExpect(status().isForbidden());
        taller(trabajoDe(juego) + "/fallo", "otra-clave", Map.of("motivo", "x")).andExpect(status().isForbidden());
        assertEquals("pendiente", estadoDelTrabajo(trabajoDe(juego)));
    }

    @Test
    void sin_TALLER_CLAVE_en_el_env_las_rutas_responden_503() throws Exception {
        ReflectionTestUtils.setField(controlador, "claveTaller", "");
        try {
            taller("siguiente", CLAVE, null).andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.mensaje").value(org.hamcrest.Matchers.containsString("TALLER_CLAVE")));
            taller(UUID.randomUUID() + "/resultado", CLAVE, Map.of()).andExpect(status().isServiceUnavailable());
            taller(UUID.randomUUID() + "/fallo", "", Map.of()).andExpect(status().isServiceUnavailable());
        } finally {
            ReflectionTestUtils.setField(controlador, "claveTaller", CLAVE);
        }
    }

    // ---------- siguiente ----------

    @Test
    void sin_trabajos_siguiente_responde_204() throws Exception {
        taller("siguiente", CLAVE, null).andExpect(status().isNoContent());
    }

    @Test
    void el_trabajador_recibe_la_propuesta_aprobada_y_nada_de_estudiantes() throws Exception {
        UUID juego = generarJuegoDelTaller();
        // Un segundo «Generar» mientras el taller trabaja no encarga otro juego igual.
        escribir(RUTA_SOLICITUDES + solicitudDe(juego) + "/versiones/1/generar/", Map.of()).andExpect(status().isConflict());

        JsonNode trabajo = cuerpo(taller("siguiente", CLAVE, null).andExpect(status().isOk())).path("trabajo");
        assertEquals(trabajoDe(juego).toString(), trabajo.path("id").asText());
        assertEquals("crear_juego", trabajo.path("tipo").asText());
        assertEquals(1, trabajo.path("intentos").asInt());
        JsonNode entrada = trabajo.path("entrada");
        assertEquals(TEMA, entrada.at("/solicitud/tema").asText());
        assertEquals("Ciencia y Tecnología", entrada.at("/solicitud/curso").asText());
        assertEquals("Reconocer los animales de la chacra", entrada.at("/propuesta/objetivo").asText());
        assertEquals("otro", entrada.at("/propuesta/tipo_juego").asText());
        assertFalse(entrada.toString().contains(DOCENTE.toString()), "El trabajo no lleva el id del docente.");
        assertFalse(entrada.has("estudiantes"));

        assertEquals("en_proceso", estadoDelTrabajo(trabajoDe(juego)));
        assertEquals("generando", estadoDeLaGeneracion(juego));
        // Nadie más lo recibe: ya está en proceso.
        taller("siguiente", CLAVE, null).andExpect(status().isNoContent());
        verify(generadorGuion, never()).generarGuion(any());
    }

    @Test
    void entrega_primero_el_trabajo_mas_antiguo() throws Exception {
        UUID primero = generarJuegoDelTaller();
        UUID segundo = generarJuegoDelTaller();
        assertEquals(trabajoDe(primero), tomar());
        assertEquals(trabajoDe(segundo), tomar());
    }

    // ---------- resultado ----------

    @Test
    void un_resultado_bueno_deja_el_juego_listo_con_su_procedencia_y_sus_piezas_pendientes() throws Exception {
        UUID juego = generarJuegoDelTaller();
        UUID trabajo = tomar();
        ObjectNode resultado = resultadoBueno(trabajo);
        // El taller no decide su procedencia: la escribe Spring.
        ((ObjectNode) resultado.get("paquete")).putObject("procedencia").put("proveedor", "no-debe-quedar");

        taller(trabajo + "/resultado", CLAVE, resultado).andExpect(status().isOk())
            .andExpect(jsonPath("$.trabajo.estado").value("listo"))
            .andExpect(jsonPath("$.generacion.estado").value("lista"));

        // El docente ve su juego listo, sin publicar todavía.
        JsonNode generacion = cuerpo(leer("/api/edu/generaciones/" + juego + "/").andExpect(status().isOk())).path("generacion");
        assertEquals("lista", generacion.path("estado").asText());
        assertTrue(generacion.path("taller").asBoolean());
        assertFalse(generacion.path("publicada").asBoolean());
        assertTrue(generacion.path("ultimo_error").isNull());
        JsonNode paquete = json.readTree(generacion.path("paquete").asText());
        assertEquals("memoria_andina", paquete.path("familia").asText());
        assertEquals(trabajo.toString(), paquete.path("trabajo").asText());
        JsonNode procedencia = paquete.path("procedencia");
        assertEquals(Set.of("origen", "trabajo", "intentos", "segundos"), camposDe(procedencia));
        assertEquals("taller", procedencia.path("origen").asText());
        assertEquals(trabajo.toString(), procedencia.path("trabajo").asText());
        assertEquals(2, procedencia.path("intentos").asInt());
        assertTrue(procedencia.path("segundos").asLong() >= 0);

        // Las piezas nuevas quedan pendientes hasta que el docente las apruebe.
        assertEquals(List.of("fondo-chacra:fondo:pendiente", "olla-de-barro:objeto:pendiente"),
            jdbc.queryForList("select pieza || ':' || tipo || ':' || estado from edu.piezas_taller where trabajo_id = ? order by pieza",
                String.class, trabajo));
        // Por dentro se guarda lo que entregó el taller, con su evidencia.
        assertEquals("listo", estadoDelTrabajo(trabajo));
        JsonNode guardado = json.readTree(jdbc.queryForObject("select resultado from edu.trabajos_taller where id = ?", String.class, trabajo));
        assertEquals(2, guardado.at("/evidencia/intentos/juego").asInt());

        // Entregarlo otra vez no hace nada: el trabajo ya terminó.
        taller(trabajo + "/resultado", CLAVE, resultado).andExpect(status().isConflict());
    }

    @Test
    void un_resultado_malo_responde_422_con_sus_motivos_y_el_trabajo_sigue_en_proceso() throws Exception {
        UUID juego = generarJuegoDelTaller();
        UUID trabajo = tomar();
        ObjectNode malo = resultadoBueno(trabajo);
        ObjectNode paquete = (ObjectNode) malo.get("paquete");
        paquete.put("trabajo", UUID.randomUUID().toString());
        ((ObjectNode) paquete.get("retos").get(0)).putArray("ayudas").add("Una.").add("Dos.").add("Tres.");
        ((ArrayNode) malo.get("piezas")).addObject().put("id", "Zorro Nuevo").put("tipo", "objeto");
        ((ArrayNode) malo.get("piezas")).addObject().put("id", "zorro-nuevo").put("tipo", "personaje");
        malo.remove("evidencia");

        JsonNode respuesta = cuerpo(taller(trabajo + "/resultado", CLAVE, malo).andExpect(status().isUnprocessableEntity()));
        List<String> motivos = new ArrayList<>();
        respuesta.path("motivos").forEach(motivo -> motivos.add(motivo.asText()));
        assertEquals(5, motivos.size(), motivos.toString());
        assertTrue(motivos.get(0).contains("«trabajo»"));
        assertTrue(motivos.get(1).contains("exactamente 2"));
        assertTrue(motivos.get(2).contains("minúsculas"));
        assertTrue(motivos.get(3).contains("personajes"));
        assertTrue(motivos.get(4).contains("evidencia"));

        // No se guardó nada: el trabajador corrige y vuelve a entregar.
        assertEquals("en_proceso", estadoDelTrabajo(trabajo));
        assertEquals("generando", estadoDeLaGeneracion(juego));
        assertEquals(0, jdbc.queryForObject("select count(*) from edu.piezas_taller", Integer.class));
        taller(trabajo + "/resultado", CLAVE, resultadoBueno(trabajo)).andExpect(status().isOk());
        assertEquals("lista", estadoDeLaGeneracion(juego));
    }

    @Test
    void mas_de_dos_correcciones_en_la_evidencia_no_se_aceptan() throws Exception {
        generarJuegoDelTaller();
        UUID trabajo = tomar();
        ObjectNode resultado = resultadoBueno(trabajo);
        ((ObjectNode) resultado.at("/evidencia/intentos")).put("juego", 4);
        taller(trabajo + "/resultado", CLAVE, resultado).andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.motivos[0]").value(org.hamcrest.Matchers.containsString("hasta dos correcciones")));
    }

    @Test
    void un_cuerpo_que_no_es_json_responde_400() throws Exception {
        generarJuegoDelTaller();
        UUID trabajo = tomar();
        mvc.perform(post(RUTA_TALLER + trabajo + "/resultado").header("X-Taller-Clave", CLAVE)
                .contentType("application/json").content("{esto no es json"))
            .andExpect(status().isBadRequest());
        assertEquals("en_proceso", estadoDelTrabajo(trabajo));
    }

    // ---------- fallo ----------

    @Test
    void un_fallo_deja_todo_fallido_y_el_docente_solo_ve_un_mensaje_amable() throws Exception {
        UUID juego = generarJuegoDelTaller();
        UUID trabajo = tomar();
        String motivo = "El revisor rechazó el juego tres veces: la ayuda 2 no aparece. " + "x".repeat(2500);

        taller(trabajo + "/fallo", CLAVE, Map.of("motivo", motivo)).andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("fallida"));

        // Por dentro se guarda el motivo, recortado a 2000 caracteres.
        assertEquals("fallido", estadoDelTrabajo(trabajo));
        String guardado = jdbc.queryForObject("select motivo_fallo from edu.trabajos_taller where id = ?", String.class, trabajo);
        assertEquals(TallerService.MAX_CARACTERES_MOTIVO, guardado.length());
        assertTrue(guardado.startsWith("El revisor rechazó"));

        // El docente nunca ve el motivo: solo un mensaje amable, y puede intentarlo de nuevo.
        String paraElDocente = leer("/api/edu/generaciones/" + juego + "/").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("fallida"))
            .andExpect(jsonPath("$.generacion.ultimo_error").value(TallerService.MENSAJE_PARA_EL_DOCENTE))
            .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertFalse(paraElDocente.contains("revisor"));
        escribir(RUTA_SOLICITUDES + solicitudDe(juego) + "/versiones/1/generar/", Map.of()).andExpect(status().isCreated());
    }

    @Test
    void un_fallo_sin_motivo_tambien_se_registra() throws Exception {
        generarJuegoDelTaller();
        UUID trabajo = tomar();
        taller(trabajo + "/fallo", CLAVE, null).andExpect(status().isOk());
        assertEquals("El taller no dio un motivo.",
            jdbc.queryForObject("select motivo_fallo from edu.trabajos_taller where id = ?", String.class, trabajo));
    }

    @Test
    void no_se_cierra_un_trabajo_que_no_existe_o_que_no_esta_en_proceso() throws Exception {
        taller(UUID.randomUUID() + "/resultado", CLAVE, Map.of()).andExpect(status().isNotFound());
        taller(UUID.randomUUID() + "/fallo", CLAVE, Map.of("motivo", "x")).andExpect(status().isNotFound());
        UUID juego = generarJuegoDelTaller();
        // Todavía está pendiente: nadie lo tomó.
        taller(trabajoDe(juego) + "/fallo", CLAVE, Map.of("motivo", "x")).andExpect(status().isConflict());
        taller(trabajoDe(juego) + "/resultado", CLAVE, resultadoBueno(trabajoDe(juego))).andExpect(status().isConflict());
        assertEquals("pendiente", estadoDelTrabajo(trabajoDe(juego)));
    }

    // ---------- 15 minutos ----------

    @Test
    void un_trabajo_vencido_vuelve_a_pendiente_y_al_tercer_vencimiento_queda_fallido() throws Exception {
        UUID juego = generarJuegoDelTaller();
        UUID trabajo = tomar();

        // 1.ª y 2.ª vez: se vence y se entrega de nuevo, con un intento más.
        for (int vez = 2; vez <= 3; vez++) {
            envejecer(trabajo);
            JsonNode otraVez = cuerpo(taller("siguiente", CLAVE, null).andExpect(status().isOk())).path("trabajo");
            assertEquals(trabajo.toString(), otraVez.path("id").asText());
            assertEquals(vez, otraVez.path("intentos").asInt());
            assertEquals("generando", estadoDeLaGeneracion(juego));
        }

        // Un trabajo que lleva menos de 90 minutos no se toca.
        taller("siguiente", CLAVE, null).andExpect(status().isNoContent());
        assertEquals("en_proceso", estadoDelTrabajo(trabajo));

        // 3.ª vez: queda fallido con su motivo y no se vuelve a entregar.
        envejecer(trabajo);
        taller("siguiente", CLAVE, null).andExpect(status().isNoContent());
        assertEquals("fallido", estadoDelTrabajo(trabajo));
        assertTrue(jdbc.queryForObject("select motivo_fallo from edu.trabajos_taller where id = ?", String.class, trabajo)
            .contains("3 veces"));
        leer("/api/edu/generaciones/" + juego + "/")
            .andExpect(jsonPath("$.generacion.estado").value("fallida"))
            .andExpect(jsonPath("$.generacion.ultimo_error").value(TallerService.MENSAJE_PARA_EL_DOCENTE));
        // Un resultado que llega tarde se rechaza.
        taller(trabajo + "/resultado", CLAVE, resultadoBueno(trabajo)).andExpect(status().isConflict());
    }

    // ---------- Un cambio por el chat ----------

    // El docente pide un cambio sobre un juego del taller que ya envió. Spring deja un
    // trabajo «corregir_juego» con el juego anterior y el pedido; la versión nueva no
    // hereda la aprobación (HU39), vuelve a pasar las comprobaciones y se envía igual
    // que un laberinto (HU37 y HU41). El juego anterior sigue intacto hasta entonces.
    @Test
    void un_cambio_por_el_chat_corrige_el_mismo_juego_sin_heredar_su_aprobacion() throws Exception {
        UUID primero = generarJuegoDelTaller();
        UUID solicitud = solicitudDe(primero);
        UUID trabajoAnterior = tomar();
        taller(trabajoAnterior + "/resultado", CLAVE, resultadoBueno(trabajoAnterior)).andExpect(status().isOk());
        escribir("/api/edu/generaciones/" + primero + "/publicar/", Map.of()).andExpect(status().isOk());

        // El chat crea la versión 2 de la propuesta, que espera su propia aprobación.
        escribir(RUTA_SOLICITUDES + solicitud + "/versiones/1/observaciones/", Map.of("observaciones", "Que tenga un solo nivel."))
            .andExpect(status().isCreated());
        escribir(RUTA_SOLICITUDES + solicitud + "/versiones/2/generar/", Map.of()).andExpect(status().isConflict());
        escribir(RUTA_SOLICITUDES + solicitud + "/versiones/2/aprobar/", Map.of()).andExpect(status().isOk());
        UUID corregido = UUID.fromString(cuerpo(escribir(RUTA_SOLICITUDES + solicitud + "/versiones/2/generar/", Map.of())
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.generacion.taller").value(true))
            .andExpect(jsonPath("$.generacion.publicada").value(false))).path("generacion").path("id").asText());

        JsonNode trabajo = cuerpo(taller("siguiente", CLAVE, null).andExpect(status().isOk())).path("trabajo");
        UUID trabajoNuevo = UUID.fromString(trabajo.path("id").asText());
        assertNotEquals(trabajoAnterior, trabajoNuevo);
        assertEquals("corregir_juego", trabajo.path("tipo").asText());
        JsonNode entrada = trabajo.path("entrada");
        assertEquals("Que tenga un solo nivel.", entrada.path("pedido").asText());
        assertEquals(trabajoAnterior.toString(), entrada.at("/anterior/trabajo").asText());
        assertEquals(1, entrada.at("/anterior/version_propuesta").asInt());
        assertEquals("memoria_andina", entrada.at("/anterior/paquete/familia").asText());
        assertEquals(2, entrada.at("/anterior/paquete/retos").size());

        // No hereda nada: no se envía hasta estar lista y vuelve a pasar las comprobaciones
        // (un guion con el id del trabajo anterior se rechaza).
        escribir("/api/edu/generaciones/" + corregido + "/publicar/", Map.of()).andExpect(status().isConflict());
        taller(trabajoNuevo + "/resultado", CLAVE, resultadoBueno(trabajoAnterior)).andExpect(status().isUnprocessableEntity());
        ObjectNode conUnNivel = resultadoBueno(trabajoNuevo);
        ((ArrayNode) conUnNivel.at("/paquete/retos")).remove(1);
        taller(trabajoNuevo + "/resultado", CLAVE, conUnNivel).andExpect(status().isOk());
        leer("/api/edu/generaciones/" + corregido + "/")
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.publicada").value(false));

        // El juego anterior sigue enviado y sin cambios hasta que el docente envía el nuevo.
        assertTrue(generaciones.findById(primero).orElseThrow().isPublicada());
        assertEquals(trabajoAnterior.toString(),
            json.readTree(generaciones.findById(primero).orElseThrow().getPaquete()).path("trabajo").asText());
        escribir("/api/edu/generaciones/" + corregido + "/publicar/", Map.of()).andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.publicada").value(true));
    }

    @Test
    void generar_otra_vez_la_misma_version_crea_un_juego_nuevo_y_no_una_correccion() throws Exception {
        UUID primero = generarJuegoDelTaller();
        UUID trabajo = tomar();
        taller(trabajo + "/resultado", CLAVE, resultadoBueno(trabajo)).andExpect(status().isOk());
        escribir(RUTA_SOLICITUDES + solicitudDe(primero) + "/versiones/1/generar/", Map.of()).andExpect(status().isCreated());
        assertEquals("crear_juego", cuerpo(taller("siguiente", CLAVE, null).andExpect(status().isOk())).at("/trabajo/tipo").asText());
    }

    @Test
    void la_tabla_solo_acepta_los_dos_tipos_de_trabajo() throws Exception {
        UUID juego = generarJuegoDelTaller();
        assertThrows(org.springframework.dao.DataIntegrityViolationException.class, () ->
            jdbc.update("update edu.trabajos_taller set tipo = 'otro_tipo' where generacion_id = ?", juego));
        jdbc.update("update edu.trabajos_taller set tipo = 'corregir_juego' where generacion_id = ?", juego);
    }

    // ---------- La biblioteca crece sola ----------

    // Al enviar un juego del taller a su clase, el docente aprueba sus piezas, y desde entonces
    // el juego y sus piezas aparecen en la biblioteca del supervisor.
    @Test
    void enviar_un_juego_del_taller_aprueba_sus_piezas_y_lo_pone_en_la_biblioteca() throws Exception {
        UUID juego = generarJuegoDelTaller();
        UUID trabajo = tomar();
        taller(trabajo + "/resultado", CLAVE, resultadoBueno(trabajo)).andExpect(status().isOk());
        mvc.perform(get(RUTA_TALLER + "biblioteca").header("X-Taller-Clave", CLAVE)).andExpect(status().isOk())
            .andExpect(jsonPath("$.juegos.length()").value(0));
        assertEquals(List.of("pendiente", "pendiente"),
            jdbc.queryForList("select estado from edu.piezas_taller where trabajo_id = ? order by pieza", String.class, trabajo));

        escribir("/api/edu/generaciones/" + juego + "/publicar/", Map.of()).andExpect(status().isOk());
        assertEquals(List.of("aprobada", "aprobada"),
            jdbc.queryForList("select estado from edu.piezas_taller where trabajo_id = ? order by pieza", String.class, trabajo));
        JsonNode biblioteca = cuerpo(mvc.perform(get(RUTA_TALLER + "biblioteca").header("X-Taller-Clave", CLAVE)).andExpect(status().isOk()));
        assertEquals(1, biblioteca.path("juegos").size());
        JsonNode primero = biblioteca.path("juegos").get(0);
        assertEquals(trabajo.toString(), primero.path("trabajo").asText());
        assertEquals("memoria_andina", primero.path("familia").asText());
        assertEquals(List.of("fondo-chacra", "olla-de-barro"),
            List.of(primero.path("piezas").get(0).path("id").asText(), primero.path("piezas").get(1).path("id").asText()));
        mvc.perform(get(RUTA_TALLER + "biblioteca").header("X-Taller-Clave", "otra")).andExpect(status().isForbidden());
    }

    // ---------- Eliminar la propuesta ----------

    @Test
    void eliminar_la_propuesta_borra_su_trabajo_y_sus_piezas_pero_no_mientras_el_taller_trabaja() throws Exception {
        UUID juego = generarJuegoDelTaller();
        UUID solicitud = solicitudDe(juego);
        UUID trabajo = tomar();
        mvc.perform(delete(RUTA_SOLICITUDES + solicitud + "/")
                .cookie(new Cookie("sessionid", "ses-docente"), new Cookie("kusi_edu_csrf", TOKEN)).header("X-XSRF-TOKEN", TOKEN))
            .andExpect(status().isConflict());

        taller(trabajo + "/resultado", CLAVE, resultadoBueno(trabajo)).andExpect(status().isOk());
        mvc.perform(delete(RUTA_SOLICITUDES + solicitud + "/")
                .cookie(new Cookie("sessionid", "ses-docente"), new Cookie("kusi_edu_csrf", TOKEN)).header("X-XSRF-TOKEN", TOKEN))
            .andExpect(status().isOk());
        assertEquals(0, jdbc.queryForObject("select count(*) from edu.trabajos_taller", Integer.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from edu.piezas_taller", Integer.class));
    }

    private static Set<String> camposDe(JsonNode nodo) {
        Set<String> campos = new HashSet<>();
        nodo.fieldNames().forEachRemaining(campos::add);
        return campos;
    }
}
