package pe.kusi.edu;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.ia.EntradaGeneracion;
import pe.kusi.edu.ia.EntradaGuion;
import pe.kusi.edu.ia.FalloGeneracion;
import pe.kusi.edu.ia.GeneradorGuion;
import pe.kusi.edu.ia.GeneradorPropuestas;
import pe.kusi.edu.laberinto.CatalogoLaberinto;
import pe.kusi.edu.laberinto.GuionesDePrueba;
import pe.kusi.edu.laberinto.MapasBase;
import pe.kusi.edu.laberinto.ValidadorLaberinto;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.DjangoInternoClient;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.function.Function;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// HU26: la generación del guion de punta a punta (solicitud → propuesta → aprobar →
// generar → procesar → consultar) con H2 y Flyway reales y los permisos de siempre.
// SIMULADO: Django y la IA son dobles de prueba; no se usa internet ni ninguna clave.
// Acredita el flujo, los estados, las etapas, las correcciones y el respaldo con mapas
// base; NO acredita lo que escribiría una IA real (eso se prueba a mano con Groq).
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:kusi_edu_generacion;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password=", "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.config.import=", "kusi.internal-key=clave-solo-para-pruebas-aisladas"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GeneracionesProcesoTest {
    private static final UUID DOCENTE = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final UUID OTRO_DOCENTE = UUID.fromString("55555555-5555-5555-5555-555555555555");
    private static final UUID ADMIN = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID CURSO = UUID.fromString("44444444-4444-4444-4444-444444444444");
    private static final String TOKEN = "token-csrf-de-prueba-con-cuarenta-y-tres-ch";
    private static final String TEMA = "Patrones con frutas";
    private static final String TEMA_DE_PATRONES = TEMA;
    private static final String TEMA_DE_CLASIFICAR = "Clasificar frutas y verduras";
    private static final String RUTA_SOLICITUDES = "/api/edu/propuestas/solicitudes/";
    // Contesta con el guion de la regla que le pidieron (o con «orden» si no le pidieron ninguna).
    private static final Function<EntradaGuion, Object> GUION_CON_LA_REGLA_PEDIDA = GeneracionesProcesoTest::guionConLaReglaPedida;

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
    @Autowired MapasBase mapasBase;
    @MockitoBean DjangoInternoClient django;
    @MockitoBean GeneradorPropuestas generadorPropuestas;
    @MockitoBean GeneradorGuion generadorGuion;
    // Se deja trabajar al validador de verdad; solo se anota en qué estado estaba la generación al comprobar.
    @MockitoSpyBean ValidadorLaberinto validador;

    // El validador de las comprobaciones de las pruebas, aparte del espiado.
    private final ValidadorLaberinto validadorReal = new ValidadorLaberinto();

    Seccion seccion;

    // Lo que "responde" la IA en cada llamada: las respuestas en orden y, cuando se
    // acaban, la última se repite. Un FalloGeneracion o una excepción se lanza en vez de responder.
    private final Deque<Object> respuestas = new ArrayDeque<>();
    private Object ultimaRespuesta;
    // Lo que recibió la IA y en qué estado estaba la generación guardada en cada paso.
    private final List<EntradaGuion> pedidos = new ArrayList<>();
    private final List<String> estadosVistos = new ArrayList<>();

    @SuppressWarnings("unchecked")
    @BeforeEach
    void preparar() throws Exception {
        etapas.deleteAll(); generaciones.deleteAll(); propuestas.deleteAll(); solicitudes.deleteAll();
        asignaciones.deleteAll(); vinculos.deleteAll(); secciones.deleteAll();
        seccion = secciones.saveAndFlush(new Seccion("1ro A", 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(DOCENTE, CURSO, seccion, 2026, ADMIN));
        when(django.validarSesion("ses-docente")).thenReturn(Map.of("id", DOCENTE.toString(), "roles", List.of("docente")));
        when(django.validarSesion("ses-otro")).thenReturn(Map.of("id", OTRO_DOCENTE.toString(), "roles", List.of("docente")));
        when(django.validarSesion("ses-admin")).thenReturn(Map.of("id", ADMIN.toString(), "roles", List.of("administrador")));
        when(django.validarSesion("ses-caducada")).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión no está autorizada o ha caducado."));
        when(django.nombreCurso(CURSO)).thenReturn("Matemática");

        // Llamada 1 (la propuesta): siempre la misma, ya válida.
        when(generadorPropuestas.configurado()).thenReturn(true);
        when(generadorPropuestas.proveedor()).thenReturn("simulado");
        when(generadorPropuestas.modelo()).thenReturn("simulado-pruebas");
        when(generadorPropuestas.generar(any())).thenReturn(propuestaValida());

        // Llamada 2 (el guion): lo que haya en «respuestas».
        respuestas.clear(); ultimaRespuesta = null; pedidos.clear(); estadosVistos.clear();
        when(generadorGuion.configurado()).thenReturn(true);
        when(generadorGuion.proveedor()).thenReturn("proveedor-simulado");
        when(generadorGuion.modelo()).thenReturn("modelo-simulado");
        when(generadorGuion.generarGuion(any())).thenAnswer(llamada -> {
            EntradaGuion pedido = llamada.getArgument(0);
            pedidos.add(pedido);
            estadosVistos.add("ia:" + estadoGuardado());
            Object siguiente = respuestas.isEmpty() ? ultimaRespuesta : respuestas.poll();
            // Una función contesta según lo que se le pidió (por ejemplo, con la regla que pidieron).
            if (siguiente instanceof Function<?, ?> segunElPedido) siguiente = ((Function<EntradaGuion, Object>) segunElPedido).apply(pedido);
            if (siguiente instanceof FalloGeneracion fallo) throw fallo;
            if (siguiente instanceof RuntimeException error) throw error;
            return siguiente;
        });
        doAnswer(llamada -> {
            estadosVistos.add("validador:" + estadoGuardado());
            return llamada.callRealMethod();
        }).when(validador).validar(any(), any());
    }

    // ---------- Ayudas de las pruebas ----------

    private void respuestasDeLaIa(Object... lista) {
        respuestas.clear();
        respuestas.addAll(List.of(lista));
        ultimaRespuesta = lista[lista.length - 1];
    }

    // El estado que hay en la base (no el que tenga en memoria el servidor) de la
    // generación más reciente, que es la que se está procesando.
    private String estadoGuardado() {
        return jdbc.queryForObject("select estado from edu.generaciones order by creado_en desc limit 1", String.class);
    }

    private Map<String, Object> propuestaValida() {
        return Map.of("objetivo", "Objetivo sugerido simulado", "historia", "Historia simulada del cuy",
            "acciones", List.of("Contar"), "reglas", List.of("Una regla"), "retos", List.of("Reto 1"), "ayudas", List.of("Pista"));
    }

    private ResultActions escribir(String ruta, String sesion, Object cuerpo) throws Exception {
        return mvc.perform(post(ruta).cookie(new Cookie("sessionid", sesion), new Cookie("kusi_edu_csrf", TOKEN))
            .header("X-XSRF-TOKEN", TOKEN).contentType("application/json").content(json.writeValueAsBytes(cuerpo)));
    }

    private ResultActions leer(String ruta, String sesion) throws Exception {
        return mvc.perform(get(ruta).cookie(new Cookie("sessionid", sesion)));
    }

    private JsonNode cuerpo(ResultActions resultado) throws Exception {
        return json.readTree(resultado.andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    // Una solicitud con su propuesta ya aprobada: lo que el docente hace antes de generar.
    private UUID solicitudAprobada() throws Exception {
        return solicitudAprobada(TEMA);
    }

    private UUID solicitudAprobada(String tema) throws Exception {
        UUID id = solicitudSinAprobar(tema);
        escribir(RUTA_SOLICITUDES + id + "/versiones/1/aprobar/", "ses-docente", Map.of()).andExpect(status().isOk());
        return id;
    }

    private UUID solicitudSinAprobar(String tema) throws Exception {
        UUID id = UUID.randomUUID();
        escribir(RUTA_SOLICITUDES, "ses-docente", datosDeSolicitud(id, tema)).andExpect(status().isCreated());
        return id;
    }

    private Map<String, Object> datosDeSolicitud(UUID id, String tema) {
        Map<String, Object> datos = new HashMap<>();
        datos.put("id_solicitud", id); datos.put("curso_id", CURSO); datos.put("seccion_id", seccion.getId());
        datos.put("tema", tema); datos.put("proposito", "refuerzo"); datos.put("instrucciones", "Que sea corto");
        return datos;
    }

    private UUID generar(UUID solicitud) throws Exception {
        ResultActions creada = escribir(RUTA_SOLICITUDES + solicitud + "/versiones/1/generar/", "ses-docente", Map.of())
            .andExpect(status().isCreated()).andExpect(jsonPath("$.generacion.estado").value("pendiente"));
        return UUID.fromString(cuerpo(creada).path("generacion").path("id").asText());
    }

    private UUID generacionPendiente() throws Exception {
        return generar(solicitudAprobada());
    }

    private ResultActions procesar(UUID generacion, String sesion) throws Exception {
        return escribir("/api/edu/generaciones/" + generacion + "/procesar/", sesion, Map.of());
    }

    // «etapa:estado» de cada etapa, en el orden en que ocurrieron.
    private List<String> resumenDeEtapas(JsonNode generacion) {
        List<String> resumen = new ArrayList<>();
        generacion.path("etapas").forEach(etapa -> resumen.add(etapa.path("etapa").asText() + ":" + etapa.path("estado").asText()));
        return resumen;
    }

    private String mensajeDeEtapa(JsonNode generacion, String etapa, String estado) {
        for (JsonNode candidata : generacion.path("etapas")) {
            if (candidata.path("etapa").asText().equals(etapa) && candidata.path("estado").asText().equals(estado)) {
                return candidata.path("mensaje").asText();
            }
        }
        return fail("No hay una etapa " + etapa + ":" + estado + " en " + resumenDeEtapas(generacion));
    }

    private JsonNode paqueteDe(JsonNode generacion) throws Exception {
        assertTrue(generacion.path("paquete").isTextual(), "La generación debía traer su paquete.");
        return json.readTree(generacion.path("paquete").asText());
    }

    // HU28 · Una propuesta de la IA con la regla indicada (o sin ninguna si es null).
    private Map<String, Object> propuestaConRegla(String regla) {
        Map<String, Object> propuesta = new HashMap<>(propuestaValida());
        if (regla != null) propuesta.put("regla_juego", regla);
        return propuesta;
    }

    // HU28 · Una IA que hace lo esperado: «orden» para un tema de patrones y «solo_clase» para
    // uno de clasificar. Es un doble de prueba: acredita que la elección viaja de la propuesta al
    // guion, no que una IA real elija bien (eso se prueba a mano con Groq).
    private void iaQueEligeLaReglaSegunElTema() throws Exception {
        when(generadorPropuestas.generar(any())).thenAnswer(llamada -> {
            String tema = ((EntradaGeneracion) llamada.getArgument(0)).tema().toLowerCase();
            return propuestaConRegla(tema.contains("patrones") ? "orden" : tema.contains("clasificar") ? "solo_clase" : null);
        });
    }

    private static Object guionConLaReglaPedida(EntradaGuion pedido) {
        try {
            return GuionesDePrueba.respuestaConLaRegla(pedido.reglaJuego() != null ? pedido.reglaJuego() : "orden");
        } catch (IOException error) {
            throw new UncheckedIOException(error);
        }
    }

    // HU28 · La barra de arriba del juego: con «orden», una ficha por cada fruta del patrón; con
    // «solo_clase», una ficha por cada fruta (o verdura) que hay que juntar.
    private List<String> barra(JsonNode reto) {
        JsonNode regla = reto.path("regla");
        List<String> fichas = new ArrayList<>();
        if (regla.path("tipo").asText().equals("orden")) {
            regla.path("secuencia").forEach(tipo -> fichas.add(tipo.asText()));
        } else {
            for (int ficha = 0; ficha < regla.path("meta").asInt(); ficha++) fichas.add(regla.path("clase").asText());
        }
        return fichas;
    }

    // HU28 · Las trampas de un nivel: con «orden», los objetos que no forman parte del patrón; con
    // «solo_clase», los objetos de la otra clase. Recogerlos es equivocarse, y equivocarse no termina el juego.
    private List<String> trampas(JsonNode reto) {
        JsonNode regla = reto.path("regla");
        Set<String> secuencia = new HashSet<>();
        regla.path("secuencia").forEach(tipo -> secuencia.add(tipo.asText()));
        List<String> trampas = new ArrayList<>();
        for (JsonNode objeto : reto.path("objetos")) {
            String tipo = objeto.path("tipo").asText();
            boolean esTrampa = regla.path("tipo").asText().equals("orden")
                ? !secuencia.contains(tipo)
                : !CatalogoLaberinto.CLASES.get(regla.path("clase").asText()).contains(tipo);
            if (esTrampa) trampas.add(tipo);
        }
        return trampas;
    }

    // ---------- Un guion bueno ----------

    @Test
    void hu26_un_guion_bueno_queda_lista_al_primer_intento() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());
        UUID generacion = generacionPendiente();

        ResultActions resultado = procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.ultimo_error").isEmpty())
            .andExpect(jsonPath("$.generacion.procedencia.proveedor").value("proveedor-simulado"))
            .andExpect(jsonPath("$.generacion.procedencia.modelo").value("modelo-simulado"))
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(1))
            .andExpect(jsonPath("$.generacion.procedencia.mapa_base").value(false));
        JsonNode respuesta = cuerpo(resultado).path("generacion");

        JsonNode paquete = paqueteDe(respuesta);
        assertEquals(List.of(), validadorReal.validar(paquete));
        assertEquals("kusi-paquete/0", paquete.path("formato").asText());
        assertEquals(paquete.path("procedencia"), respuesta.path("procedencia"));
        assertEquals(List.of("solicitud:completada", "generacion:en_progreso", "generacion:completada", "comprobacion:completada"),
            resumenDeEtapas(respuesta));
        assertEquals(List.of("ia:generando", "validador:comprobando"), estadosVistos);
        assertEquals("lista", estadoGuardado());
    }

    @Test
    void hu26_la_ia_recibe_la_propuesta_aprobada_completa_y_nada_de_estudiantes() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());

        procesar(generacionPendiente(), "ses-docente").andExpect(status().isOk());

        assertEquals(1, pedidos.size());
        EntradaGuion pedido = pedidos.get(0);
        assertEquals(1, pedido.intento());
        assertEquals(3, pedido.intentosMaximos());
        assertNull(pedido.guionAnterior());
        assertTrue(pedido.problemas().isEmpty());
        assertEquals("Matemática", pedido.cursoNombre());
        assertEquals(1, pedido.grado());
        assertEquals(TEMA, pedido.tema());
        assertEquals("refuerzo", pedido.proposito());
        assertEquals("Que sea corto", pedido.instrucciones());
        assertEquals("Objetivo sugerido simulado", pedido.propuesta().get("objetivo"));
        assertEquals("Historia simulada del cuy", pedido.propuesta().get("historia"));
        assertEquals(List.of("Contar"), pedido.propuesta().get("acciones"));
        assertEquals(List.of("Una regla"), pedido.propuesta().get("reglas"));
        assertEquals(List.of("Reto 1"), pedido.propuesta().get("retos"));
        assertEquals(List.of("Pista"), pedido.propuesta().get("ayudas"));
    }

    @Test
    void hu26_consultar_una_generacion_lista_devuelve_el_paquete_con_los_mismos_permisos() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());
        UUID generacion = generacionPendiente();
        JsonNode procesada = cuerpo(procesar(generacion, "ses-docente")).path("generacion");

        JsonNode consultada = cuerpo(leer("/api/edu/generaciones/" + generacion + "/", "ses-docente")
            .andExpect(status().isOk()).andExpect(jsonPath("$.generacion.estado").value("lista"))).path("generacion");

        assertEquals(procesada.path("paquete").asText(), consultada.path("paquete").asText());
        assertEquals(procesada.path("procedencia"), consultada.path("procedencia"));
        assertEquals(List.of(), validadorReal.validar(paqueteDe(consultada)));
        // Otro docente no la ve; sin sesión o con otro rol, tampoco.
        leer("/api/edu/generaciones/" + generacion + "/", "ses-otro").andExpect(status().isNotFound());
        leer("/api/edu/generaciones/" + generacion + "/", "ses-admin").andExpect(status().isForbidden());
        leer("/api/edu/generaciones/" + generacion + "/", "ses-caducada").andExpect(status().isUnauthorized());
        leer("/api/edu/generaciones/" + UUID.randomUUID() + "/", "ses-docente").andExpect(status().isNotFound());
        // Y el historial de la solicitud también la trae.
        UUID solicitud = UUID.fromString(consultada.path("solicitud_id").asText());
        leer(RUTA_SOLICITUDES + solicitud + "/generaciones/", "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generaciones.length()").value(1))
            .andExpect(jsonPath("$.generaciones[0].procedencia.intentos").value(1));
    }

    // ---------- Un guion malo que se corrige ----------

    @Test
    void hu26_un_guion_malo_se_corrige_al_segundo_intento() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaConUnObjetoEnUnMuro(), GuionesDePrueba.respuestaBuena());
        UUID generacion = generacionPendiente();

        ResultActions resultado = procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(2))
            .andExpect(jsonPath("$.generacion.procedencia.mapa_base").value(false));
        JsonNode respuesta = cuerpo(resultado).path("generacion");

        assertEquals(List.of(), validadorReal.validar(paqueteDe(respuesta)));
        assertEquals(List.of("solicitud:completada",
            "generacion:en_progreso", "generacion:completada", "comprobacion:fallida",
            "correccion:en_progreso", "correccion:completada", "comprobacion:completada"), resumenDeEtapas(respuesta));
        // Los problemas van en el mensaje de la etapa «comprobacion», uno por línea: «CODIGO: motivo».
        String mensaje = mensajeDeEtapa(respuesta, "comprobacion", "fallida");
        assertTrue(mensaje.startsWith("Intento 1: "), mensaje);
        assertTrue(mensaje.contains("\nOBJETO_FUERA_DEL_CAMINO: Nivel 2: "), mensaje);
        // La generación pasó por «correccion» mientras se pedía la corrección.
        assertEquals(List.of("ia:generando", "validador:comprobando", "ia:correccion", "validador:comprobando"), estadosVistos);
    }

    @Test
    void hu26_la_correccion_le_manda_a_la_ia_los_problemas_y_el_guion_que_fallo() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaConUnObjetoEnUnMuro(), GuionesDePrueba.respuestaBuena());

        procesar(generacionPendiente(), "ses-docente").andExpect(status().isOk());

        assertEquals(2, pedidos.size());
        EntradaGuion correccion = pedidos.get(1);
        assertEquals(2, correccion.intento());
        assertEquals(3, correccion.intentosMaximos());
        assertTrue(correccion.problemas().stream().anyMatch(problema -> problema.codigo().equals("OBJETO_FUERA_DEL_CAMINO")));
        assertTrue(correccion.problemas().stream().noneMatch(problema -> problema.motivo().isBlank()));
        assertNotNull(correccion.guionAnterior());
        // El guion anterior es el que falló: su primer objeto del nivel 2 sigue sobre el muro.
        assertEquals(0, correccion.guionAnterior().path("retos").path(1).path("objetos").path(0).path("fila").asInt(-1));
        // La IA no recuerda la llamada anterior: la propuesta va completa otra vez.
        assertEquals("Objetivo sugerido simulado", correccion.propuesta().get("objetivo"));
    }

    @Test
    void hu26_una_respuesta_que_no_es_un_objeto_se_corrige_como_cualquier_otro_defecto() throws Exception {
        respuestasDeLaIa(json.createArrayNode().add(1).add(2), GuionesDePrueba.respuestaBuena());
        UUID generacion = generacionPendiente();

        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(2))).path("generacion");

        assertTrue(mensajeDeEtapa(respuesta, "comprobacion", "fallida").contains("GUION_INVALIDO: "));
        assertEquals(List.of(), validadorReal.validar(paqueteDe(respuesta)));
    }

    @Test
    void hu30_la_procedencia_guarda_reparaciones_estructuradas_solo_con_respaldo() throws Exception {
        ObjectNode respuestaIa = GuionesDePrueba.respuestaConLaRegla("orden");
        ((ObjectNode) respuestaIa.path("retos").path(0).path("regla")).putArray("secuencia").add("fresa").add("platano").add("fresa");
        ((ObjectNode) respuestaIa.path("retos").path(1)).put("consigna", "x".repeat(120));
        respuestasDeLaIa(respuestaIa);
        UUID generacion = generacionPendiente();
        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
                .andExpect(jsonPath("$.generacion.estado").value("lista"))).path("generacion");
        JsonNode reparaciones = json.readTree("{\"regla\":[1],\"textos\":[1,2]}");
        assertEquals(reparaciones, respuesta.path("procedencia").path("reparaciones"));
        assertEquals(reparaciones, paqueteDe(respuesta).path("procedencia").path("reparaciones"));
        leer("/api/edu/generaciones/" + generacion + "/", "ses-docente").andExpect(status().isOk())
                .andExpect(jsonPath("$.generacion.procedencia.reparaciones.regla[0]").value(1));
        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());
        procesar(generacionPendiente(), "ses-docente").andExpect(status().isOk())
                .andExpect(jsonPath("$.generacion.procedencia.reparaciones").doesNotExist());
    }

    // ---------- Un guion siempre malo: mapas base ----------

    @Test
    void hu26_un_guion_siempre_malo_termina_con_los_mapas_base_despues_de_dos_correcciones() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaConMapasRotos());
        UUID generacion = generacionPendiente();

        ResultActions resultado = procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.ultimo_error").isEmpty())
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(3))
            .andExpect(jsonPath("$.generacion.procedencia.mapa_base").value(true));
        JsonNode respuesta = cuerpo(resultado).path("generacion");

        // Se pidió el primer intento y dos correcciones: ni una más.
        assertEquals(3, pedidos.size());
        assertEquals(List.of(1, 2, 3), pedidos.stream().map(EntradaGuion::intento).toList());
        // El guion final pasa las comprobaciones, con los mapas base y las reglas, objetos y textos de la IA.
        JsonNode paquete = paqueteDe(respuesta);
        assertEquals(List.of(), validadorReal.validar(paquete));
        for (int nivel = 0; nivel < 3; nivel++) {
            assertEquals(mapasBase.niveles().get(nivel).path("mapa"), paquete.path("retos").path(nivel).path("mapa"));
            assertEquals(mapasBase.niveles().get(nivel).path("enemigos"), paquete.path("retos").path(nivel).path("enemigos"));
        }
        assertEquals(GuionesDePrueba.respuestaConMapasRotos().path("retos").path(0).path("consigna"),
            paquete.path("retos").path(0).path("consigna"));
        assertEquals(List.of("solicitud:completada",
            "generacion:en_progreso", "generacion:completada", "comprobacion:fallida",
            "correccion:en_progreso", "correccion:completada", "comprobacion:fallida",
            "correccion:en_progreso", "correccion:completada", "comprobacion:fallida",
            "mapa_base:en_progreso", "mapa_base:completada", "comprobacion:completada"), resumenDeEtapas(respuesta));
        assertEquals(List.of("ia:generando", "validador:comprobando", "ia:correccion", "validador:comprobando",
            "ia:correccion", "validador:comprobando", "validador:comprobando"), estadosVistos);
        assertEquals("lista", estadoGuardado());
    }

    @Test
    void hu26_si_la_ia_falla_en_una_correccion_se_usa_el_respaldo_con_lo_que_ya_dio() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaConMapasRotos(), new FalloGeneracion("La IA tardó demasiado en responder.", true));
        UUID generacion = generacionPendiente();

        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(1))
            .andExpect(jsonPath("$.generacion.procedencia.mapa_base").value(true))).path("generacion");

        assertEquals(2, pedidos.size());
        assertTrue(resumenDeEtapas(respuesta).contains("correccion:fallida"));
        assertTrue(mensajeDeEtapa(respuesta, "correccion", "fallida").contains("La IA tardó demasiado en responder."));
        assertEquals(List.of(), validadorReal.validar(paqueteDe(respuesta)));
    }

    // ---------- Cuando no se puede ----------

    @Test
    void hu26_si_la_ia_falla_en_el_primer_intento_la_generacion_queda_fallida_con_su_motivo() throws Exception {
        respuestasDeLaIa(new FalloGeneracion("La IA tardó demasiado en responder.", true));
        UUID generacion = generacionPendiente();

        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("fallida"))
            .andExpect(jsonPath("$.generacion.ultimo_error").value("La IA tardó demasiado en responder."))
            .andExpect(jsonPath("$.generacion.paquete").isEmpty())
            .andExpect(jsonPath("$.generacion.procedencia").isEmpty())).path("generacion");

        assertEquals(List.of("solicitud:completada", "generacion:en_progreso", "generacion:fallida"), resumenDeEtapas(respuesta));
        assertEquals(1, pedidos.size());
        assertEquals("fallida", estadoGuardado());
        // Una generación terminada no se procesa otra vez; se pide una nueva.
        procesar(generacion, "ses-docente").andExpect(status().isConflict());
        assertEquals(1, pedidos.size());
    }

    @Test
    void hu26_una_generacion_fallida_se_puede_reemplazar_por_una_nueva() throws Exception {
        UUID solicitud = solicitudAprobada();
        respuestasDeLaIa(new FalloGeneracion("La IA recibió demasiadas solicitudes. Espera un momento.", false));
        procesar(generar(solicitud), "ses-docente").andExpect(jsonPath("$.generacion.estado").value("fallida"));

        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());
        procesar(generar(solicitud), "ses-docente").andExpect(jsonPath("$.generacion.estado").value("lista"));

        leer(RUTA_SOLICITUDES + solicitud + "/generaciones/", "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generaciones.length()").value(2));
    }

    @Test
    void hu26_una_respuesta_incompleta_recibe_niveles_de_respaldo_validos() throws Exception {
        respuestasDeLaIa(json.createArrayNode().add(1));
        UUID generacion = generacionPendiente();
        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))).path("generacion");
        assertEquals(3, pedidos.size());
        assertTrue(resumenDeEtapas(respuesta).contains("mapa_base:completada"));
        assertEquals(List.of(), validadorReal.validar(paqueteDe(respuesta)));
        assertTrue(mensajeDeEtapa(respuesta, "mapa_base", "completada").contains("Nivel 1: se rehízo la regla y los textos."));
    }

    @Test
    void hu26_un_error_inesperado_no_deja_la_generacion_en_generando() throws Exception {
        respuestasDeLaIa(new IllegalStateException("fallo inesperado de prueba"));
        UUID generacion = generacionPendiente();

        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("fallida"))
            .andExpect(jsonPath("$.generacion.ultimo_error").isNotEmpty())).path("generacion");

        assertTrue(resumenDeEtapas(respuesta).contains("generacion:fallida"));
        // El detalle técnico no llega al docente.
        assertFalse(respuesta.path("ultimo_error").asText().contains("fallo inesperado de prueba"));
        assertEquals("fallida", estadoGuardado());
    }

    @Test
    void hu26_sin_ia_configurada_la_generacion_sigue_pendiente_y_no_se_inventa_nada() throws Exception {
        when(generadorGuion.configurado()).thenReturn(false);
        UUID generacion = generacionPendiente();

        procesar(generacion, "ses-docente").andExpect(status().isServiceUnavailable());

        verify(generadorGuion, never()).generarGuion(any());
        assertEquals("pendiente", estadoGuardado());
        assertNull(generaciones.findById(generacion).orElseThrow().getPaquete());
        assertEquals(1, etapas.count());
    }

    // ---------- Permisos y repetición ----------

    @Test
    void hu26_solo_el_docente_de_la_solicitud_puede_procesar_la_generacion() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());
        UUID generacion = generacionPendiente();

        procesar(generacion, "ses-otro").andExpect(status().isNotFound());
        procesar(generacion, "ses-admin").andExpect(status().isForbidden());
        procesar(generacion, "ses-caducada").andExpect(status().isUnauthorized());
        procesar(UUID.randomUUID(), "ses-docente").andExpect(status().isNotFound());
        // Sin su asignación vigente, el docente tampoco.
        asignaciones.deleteAll();
        procesar(generacion, "ses-docente").andExpect(status().isForbidden());

        verify(generadorGuion, never()).generarGuion(any());
        assertEquals("pendiente", estadoGuardado());
    }

    @Test
    void hu26_una_generacion_ya_procesada_no_vuelve_a_llamar_a_la_ia() throws Exception {
        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());
        UUID generacion = generacionPendiente();
        procesar(generacion, "ses-docente").andExpect(status().isOk());

        procesar(generacion, "ses-docente").andExpect(status().isConflict());

        assertEquals(1, pedidos.size());
        assertEquals("lista", estadoGuardado());
    }

    @Test
    void hu26_el_estado_de_una_generacion_en_curso_no_se_puede_volver_a_tomar() throws Exception {
        UUID generacion = generacionPendiente();
        jdbc.update("update edu.generaciones set estado = 'generando'");

        procesar(generacion, "ses-docente").andExpect(status().isConflict());

        verify(generadorGuion, never()).generarGuion(any());
        assertEquals("generando", estadoGuardado());
    }

    // ---------- HU28: la propuesta elige la regla y el guion la respeta ----------

    @Test
    void hu28_un_tema_de_patrones_elige_orden_y_uno_de_clasificar_elige_solo_clase_y_el_juego_cambia() throws Exception {
        iaQueEligeLaReglaSegunElTema();
        respuestasDeLaIa(GUION_CON_LA_REGLA_PEDIDA);
        UUID patrones = solicitudAprobada(TEMA_DE_PATRONES);
        UUID clasificar = solicitudAprobada(TEMA_DE_CLASIFICAR);

        // La propuesta ya trae la regla que eligió la IA, también al consultarla.
        leer(RUTA_SOLICITUDES + patrones + "/", "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.propuesta.regla_juego").value("orden"));
        leer(RUTA_SOLICITUDES + clasificar + "/", "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.propuesta.regla_juego").value("solo_clase"));

        JsonNode juegoDePatrones = cuerpo(procesar(generar(patrones), "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(1))).path("generacion");
        JsonNode juegoDeClasificar = cuerpo(procesar(generar(clasificar), "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(1))).path("generacion");

        // La llamada 2 recibe la regla de cada propuesta.
        assertEquals(List.of("orden", "solo_clase"), pedidos.stream().map(EntradaGuion::reglaJuego).toList());

        // Cada guion usa su regla en los tres niveles y pasa las comprobaciones de esa regla.
        JsonNode guionDePatrones = paqueteDe(juegoDePatrones);
        JsonNode guionDeClasificar = paqueteDe(juegoDeClasificar);
        assertEquals(List.of(), validadorReal.validar(guionDePatrones, "orden"));
        assertEquals(List.of(), validadorReal.validar(guionDeClasificar, "solo_clase"));

        // Y el juego cambia de verdad en cada nivel: otra regla, otra barra y otras trampas.
        for (int nivel = 0; nivel < 3; nivel++) {
            JsonNode conPatron = guionDePatrones.path("retos").path(nivel);
            JsonNode porClase = guionDeClasificar.path("retos").path(nivel);
            String cual = "nivel " + (nivel + 1);
            assertEquals("orden", conPatron.path("regla").path("tipo").asText(), cual);
            assertEquals("solo_clase", porClase.path("regla").path("tipo").asText(), cual);
            assertNotEquals(barra(conPatron), barra(porClase), cual);
            assertNotEquals(trampas(conPatron), trampas(porClase), cual);
        }
        // Un caso concreto: el primer nivel de cada juego.
        assertEquals(List.of("fresa", "platano", "fresa", "platano"), barra(guionDePatrones.path("retos").path(0)));
        assertEquals(List.of(), trampas(guionDePatrones.path("retos").path(0)));
        assertEquals(List.of("fruta", "fruta", "fruta"), barra(guionDeClasificar.path("retos").path(0)));
        assertEquals(List.of("zanahoria"), trampas(guionDeClasificar.path("retos").path(0)));
    }

    @Test
    void hu28_si_la_llamada_2_cambia_la_regla_de_la_propuesta_se_le_pide_corregirla() throws Exception {
        iaQueEligeLaReglaSegunElTema();
        // La primera vez se equivoca y escribe «orden»; la segunda obedece.
        respuestasDeLaIa(GuionesDePrueba.respuestaConLaRegla("orden"), GUION_CON_LA_REGLA_PEDIDA);
        UUID generacion = generar(solicitudAprobada(TEMA_DE_CLASIFICAR));

        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))
            .andExpect(jsonPath("$.generacion.procedencia.intentos").value(2))).path("generacion");

        assertTrue(mensajeDeEtapa(respuesta, "comprobacion", "fallida").contains("REGLA_DISTINTA: "));
        assertEquals("solo_clase", pedidos.get(1).reglaJuego());
        assertTrue(pedidos.get(1).problemas().stream().anyMatch(problema -> problema.codigo().equals("REGLA_DISTINTA")));
        assertEquals(List.of(), validadorReal.validar(paqueteDe(respuesta), "solo_clase"));
    }

    @Test
    void hu28_el_respaldo_respeta_la_regla_de_la_propuesta_si_la_ia_insiste_con_otra() throws Exception {
        iaQueEligeLaReglaSegunElTema();
        respuestasDeLaIa(GuionesDePrueba.respuestaConLaRegla("orden"));
        UUID generacion = generar(solicitudAprobada(TEMA_DE_CLASIFICAR));
        JsonNode respuesta = cuerpo(procesar(generacion, "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"))).path("generacion");
        assertEquals(3, pedidos.size());
        assertTrue(resumenDeEtapas(respuesta).contains("mapa_base:completada"));
        assertEquals(List.of(), validadorReal.validar(paqueteDe(respuesta), "solo_clase"));
    }

    @Test
    void hu28_una_propuesta_sin_regla_deja_que_la_llamada_2_elija() throws Exception {
        // La propuesta de siempre de estas pruebas no trae regla, como las de antes de la HU28.
        UUID solicitud = solicitudAprobada();
        leer(RUTA_SOLICITUDES + solicitud + "/", "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.propuesta.regla_juego").isEmpty());
        respuestasDeLaIa(GuionesDePrueba.respuestaConLaRegla("solo_clase"));

        procesar(generar(solicitud), "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.generacion.estado").value("lista"));

        assertNull(pedidos.get(0).reglaJuego());
    }

    @Test
    void hu28_una_regla_que_kusi_no_sabe_jugar_hace_invalida_la_propuesta() throws Exception {
        when(generadorPropuestas.generar(any())).thenReturn(propuestaConRegla("mercado"));
        UUID id = UUID.randomUUID();

        escribir(RUTA_SOLICITUDES, "ses-docente", datosDeSolicitud(id, TEMA_DE_PATRONES)).andExpect(status().isBadGateway());

        leer(RUTA_SOLICITUDES + id + "/", "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.solicitud.estado").value("fallida"))
            .andExpect(jsonPath("$.solicitud.propuesta").isEmpty());
        assertEquals(0, propuestas.count());
    }

    @Test
    void hu28_la_regla_pasa_de_una_version_de_la_propuesta_a_la_siguiente() throws Exception {
        iaQueEligeLaReglaSegunElTema();
        UUID id = solicitudSinAprobar(TEMA_DE_PATRONES);
        String ruta = RUTA_SOLICITUDES + id;

        // El docente edita los textos (versión 2): la regla no se edita, se conserva.
        Map<String, Object> edicion = Map.of("objetivo", "Los niños aprenderán a seguir patrones.", "historia", "Kusi sigue el camino.",
            "acciones", List.of("Mover al cuy"), "reglas", List.of("Se recoge en orden"), "retos", List.of("Completar el patrón"),
            "ayudas", List.of("Mira lo que se repite"));
        escribir(ruta + "/versiones/1/modificar/", "ses-docente", edicion).andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(2))
            .andExpect(jsonPath("$.solicitud.propuesta.regla_juego").value("orden"));

        // La IA ajusta según las observaciones y no repite la regla (versión 3): hereda la de la base.
        // (doReturn y no when: when volvería a ejecutar la respuesta anterior con un pedido vacío.)
        doReturn(propuestaConRegla(null)).when(generadorPropuestas).generar(any());
        escribir(ruta + "/versiones/2/observaciones/", "ses-docente", Map.of("observaciones", "Más corto, por favor"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(3))
            .andExpect(jsonPath("$.solicitud.propuesta.regla_juego").value("orden"));
        // A la IA le llegó la regla de la versión que ajusta.
        ArgumentCaptor<EntradaGeneracion> pedidosDePropuesta = ArgumentCaptor.forClass(EntradaGeneracion.class);
        verify(generadorPropuestas, atLeastOnce()).generar(pedidosDePropuesta.capture());
        EntradaGeneracion ajuste = pedidosDePropuesta.getAllValues().stream()
            .filter(entrada -> "observaciones".equals(entrada.tipo())).findFirst().orElseThrow();
        assertEquals("orden", ajuste.propuestaBase().get("regla_juego"));

        // El docente rechaza y la IA propone otra alternativa con otra regla (versión 4).
        escribir(ruta + "/versiones/3/rechazar/", "ses-docente", Map.of()).andExpect(status().isOk());
        doReturn(propuestaConRegla("solo_clase")).when(generadorPropuestas).generar(any());
        escribir(ruta + "/alternativa/", "ses-docente", Map.of()).andExpect(status().isCreated())
            .andExpect(jsonPath("$.solicitud.propuesta.version").value(4))
            .andExpect(jsonPath("$.solicitud.propuesta.regla_juego").value("solo_clase"));

        // Las versiones anteriores no cambian.
        leer(ruta + "/versiones/", "ses-docente").andExpect(status().isOk())
            .andExpect(jsonPath("$.versiones.length()").value(4))
            .andExpect(jsonPath("$.versiones[0].regla_juego").value("solo_clase"))
            .andExpect(jsonPath("$.versiones[1].regla_juego").value("orden"))
            .andExpect(jsonPath("$.versiones[2].regla_juego").value("orden"))
            .andExpect(jsonPath("$.versiones[3].regla_juego").value("orden"));
    }

    @Test
    void hu28_la_base_solo_acepta_las_dos_reglas_o_ninguna() throws Exception {
        iaQueEligeLaReglaSegunElTema();
        solicitudSinAprobar(TEMA_DE_PATRONES);
        assertEquals("orden", jdbc.queryForObject("select regla_juego from edu.propuestas", String.class));

        assertThrows(DataIntegrityViolationException.class, () -> jdbc.update("update edu.propuestas set regla_juego = 'mercado'"));
        assertEquals(1, jdbc.update("update edu.propuestas set regla_juego = null"));
    }
    @Test
    void hu46_la_biblioteca_solo_muestra_los_cinco_ultimos_juegos_de_la_seccion_vinculada() throws Exception {
        UUID alumno = UUID.randomUUID(), ajeno = UUID.randomUUID();
        when(django.validarSesion("ses-alumno-demo")).thenReturn(Map.of("id", alumno.toString(), "roles", List.of("estudiante")));
        when(django.validarSesion("ses-alumno-ajeno")).thenReturn(Map.of("id", ajeno.toString(), "roles", List.of("estudiante")));
        vinculos.saveAndFlush(new pe.kusi.edu.model.VinculoEstudiante(alumno, seccion, seccion.getAnioEscolar(), ADMIN));
        Seccion otra = secciones.saveAndFlush(new Seccion("Sección sin juegos", 1, seccion.getAnioEscolar()));
        vinculos.saveAndFlush(new pe.kusi.edu.model.VinculoEstudiante(ajeno, otra, otra.getAnioEscolar(), ADMIN));
        respuestasDeLaIa(GuionesDePrueba.respuestaBuena());
        UUID solicitud = solicitudAprobada();
        UUID ultima = null;
        for (int numero = 0; numero < 6; numero++) {
            ultima = generar(solicitud);
            procesar(ultima, "ses-docente").andExpect(jsonPath("$.generacion.estado").value("lista"));
        }
        leer("/api/edu/estudiante/juegos/", "ses-alumno-demo").andExpect(status().isOk())
                .andExpect(jsonPath("$.juegos.length()").value(5)).andExpect(jsonPath("$.juegos[0].id").value(ultima.toString()))
                .andExpect(jsonPath("$.juegos[0].titulo").isNotEmpty()).andExpect(jsonPath("$.juegos[0].paquete").isNotEmpty());
        leer("/api/edu/estudiante/juegos/", "ses-alumno-ajeno").andExpect(status().isOk()).andExpect(jsonPath("$.juegos.length()").value(0));
        leer("/api/edu/estudiante/juegos/", "ses-docente").andExpect(status().isForbidden());
    }
}
