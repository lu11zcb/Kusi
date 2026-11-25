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
import org.springframework.test.web.servlet.ResultActions;
import pe.kusi.edu.ia.ClienteIa;
import pe.kusi.edu.ia.FalloGeneracion;
import pe.kusi.edu.model.*;
import pe.kusi.edu.repository.*;
import pe.kusi.edu.service.*;

import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * «Kusi Sabio»: conoce las actividades recientes del docente y elige de cuál habla; responde el taller y, si no, la reserva.
 * A quien responde nunca le llegan nombres ni ids de estudiantes.
 */
@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:kusi_sabio;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.config.import=", "kusi.taller-clave=clave-del-taller-solo-para-pruebas"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class KusiSabioTest {
    private static final String CSRF = "csrf-sintetico-sabio";
    private static final String CLAVE = "clave-del-taller-solo-para-pruebas";
    private static final String CONSULTAS = "/api/edu/sabio/consultas/";
    private static final String TALLER = "/interno/taller/consultas/";

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
    @Autowired KusiSabioService sabio;
    @MockitoBean DjangoInternoClient django;
    @MockitoBean ClienteIa ia;
    UUID docente, estudiante, curso, actividad;
    Generacion juego;

    @BeforeEach void preparar() {
        jdbc.update("delete from edu.consultas_sabio");
        docente = UUID.randomUUID(); estudiante = UUID.randomUUID(); curso = UUID.randomUUID(); actividad = UUID.randomUUID();
        Seccion seccion = secciones.saveAndFlush(new Seccion("Sección " + UUID.randomUUID(), 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(docente, curso, seccion, 2026, docente));
        vinculos.saveAndFlush(new VinculoEstudiante(estudiante, seccion, 2026, docente));
        solicitudes.saveAndFlush(new SolicitudPropuesta(actividad, docente, curso, seccion.getId(), "Animales", null, "refuerzo", null));
        Propuesta propuesta = propuestas.saveAndFlush(new Propuesta(actividad, 1, "docente", null, null, "Reconocer animales", "docente",
                "Animales del Perú", "[]", "[]", "[\"Busca la vicuña.\"]", "[\"Mira sus orejas.\"]", null, null, null));
        ObjectNode paquete = json.createObjectNode().put("formato", "kusi-paquete/0").put("familia", "animales");
        var retos = paquete.putArray("retos");
        for (int nivel = 1; nivel <= 3; nivel++) retos.addObject().put("id", nivel).put("consigna", "Busca el animal.");
        Generacion generacion = new Generacion(actividad, propuesta.getId(), 1);
        generacion.guardarPaquete(paquete.toString()); generacion.registrarEstado("lista", null); generacion.publicar();
        juego = generaciones.saveAndFlush(generacion);
        actividades.materializar(juego.getId());

        when(django.validarSesion("docente")).thenReturn(Map.of("id", docente.toString(), "roles", List.of("docente")));
        when(django.validarSesion("ajeno")).thenReturn(Map.of("id", UUID.randomUUID().toString(), "roles", List.of("docente")));
        when(django.validarSesion("estudiante")).thenReturn(Map.of("id", estudiante.toString(), "roles", List.of("estudiante")));
        when(django.validarCuenta(estudiante, "estudiante")).thenReturn(Map.of("nombre", "Rosa Quispe Mamani"));
        when(django.nombreCurso(curso)).thenReturn("Ciencia y Tecnología");

        // Rosa se equivoca 3 veces en el nivel 1 y no termina: necesita apoyo en clase.
        String partida = UUID.randomUUID().toString();
        for (int orden = 1; orden <= 3; orden++) partidas.guardar(estudiante, false, aviso(partida, orden, "accion", 1).put("correcto", false));
        partidas.guardar(estudiante, false, aviso(partida, 4, "reto_completado", 1));
    }

    private ObjectNode aviso(String partida, int orden, String tipo, int nivel) {
        return json.createObjectNode().put("partida", partida).put("orden", orden).put("tipo", tipo).put("nivel", nivel)
                .put("momento", "2026-11-24T15:00:00Z").put("juego_id", juego.getId().toString());
    }

    private ResultActions preguntar(String sesion, String texto) throws Exception {
        ObjectNode cuerpo = json.createObjectNode().put("pregunta", texto);
        cuerpo.putArray("historial");
        return mvc.perform(post(CONSULTAS).cookie(new Cookie("sessionid", sesion), new Cookie("kusi_edu_csrf", CSRF))
                .header("X-XSRF-TOKEN", CSRF).contentType("application/json").content(cuerpo.toString()));
    }

    private UUID nueva(String sesion, String texto) throws Exception {
        String respuesta = preguntar(sesion, texto).andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("pensando")).andReturn().getResponse().getContentAsString();
        return UUID.fromString(json.readTree(respuesta).path("id").asText());
    }

    private ResultActions ver(String sesion, UUID id) throws Exception {
        return mvc.perform(get(CONSULTAS + id + "/").cookie(new Cookie("sessionid", sesion)));
    }

    private ResultActions taller(String ruta, String cuerpo) throws Exception {
        var pedido = post(TALLER + ruta).header("X-Taller-Clave", CLAVE).contentType("application/json");
        return mvc.perform(cuerpo == null ? pedido : pedido.content(cuerpo));
    }

    @Test void elContextoLlevaLosNombresYElAvanceDeCadaEstudiantePeroNoSuDniNiSuId() throws Exception {
        UUID id = nueva("docente", "¿Qué refuerzo mañana? Rosa Quispe se confundió, su DNI es 70000001.");
        String contexto = jdbc.queryForObject("select contexto from edu.consultas_sabio where id = ?", String.class, id);
        for (String prohibido : List.of("70000001", estudiante.toString(), docente.toString())) {
            assertFalse(contexto.contains(prohibido), "El contexto no debe llevar «" + prohibido + "»: " + contexto);
        }
        // Por decisión del equipo, Kusi Sabio conoce a los estudiantes por su nombre: lo escrito llega tal cual, sin el DNI.
        assertEquals("¿Qué refuerzo mañana? Rosa Quispe se confundió, su DNI es [dato oculto].",
                json.readTree(contexto).path("pregunta").asText(), contexto);
        var rosa = json.readTree(contexto).path("actividades").get(0).path("estudiantes").get(0);
        assertEquals("Rosa Quispe Mamani", rosa.path("nombre").asText(), contexto);
        assertEquals(3, rosa.path("errores_por_nivel").path("1").asInt(), contexto);
        assertEquals("En curso", rosa.path("estado").asText(), contexto);
        // Sí lleva la actividad (su id, no el de un niño), los datos del grupo y el contenido del juego.
        assertTrue(contexto.contains(actividad.toString()) && contexto.contains("\"grupo\"") && contexto.contains("Reconocer animales"), contexto);
    }

    @Test void elTallerRespondeYElPanelPoneLosNombres() throws Exception {
        UUID id = nueva("docente", "¿Quién necesita ayuda?");
        ver("docente", id).andExpect(jsonPath("$.estado").value("pensando"));
        taller("siguiente", null).andExpect(status().isOk()).andExpect(jsonPath("$.consulta.id").value(id.toString()))
                .andExpect(jsonPath("$.consulta.con_actividad").value(true));
        taller("siguiente", null).andExpect(status().isNoContent());
        taller(id + "/respuesta", "{\"texto\":\"Trabaja el nivel 1 en parejas.\"}").andExpect(status().is(422));
        taller(id + "/respuesta", "{\"texto\":\"Trabaja el nivel 1 en parejas.\",\"actividad\":\"" + actividad + "\","
                + "\"graficos\":[\"errores_por_nivel\",\"inventado\"],\"mostrar_quienes_necesitan_ayuda\":true}").andExpect(status().isOk());
        taller(id + "/respuesta", "{\"texto\":\"Otra.\",\"graficos\":[],\"mostrar_quienes_necesitan_ayuda\":false}")
                .andExpect(status().isConflict());
        ver("docente", id).andExpect(status().isOk()).andExpect(jsonPath("$.estado").value("lista"))
                .andExpect(jsonPath("$.texto").value("Trabaja el nivel 1 en parejas."))
                .andExpect(jsonPath("$.actividad.titulo").value("Animales"))
                .andExpect(jsonPath("$.graficos.length()").value(1))
                .andExpect(jsonPath("$.graficos[0].tipo").value("errores_por_nivel"))
                .andExpect(jsonPath("$.graficos[0].barras[0].valor").value(3))
                .andExpect(jsonPath("$.quienes_necesitan_ayuda[0].nombre").value("Rosa Quispe Mamani"));
        assertEquals("taller", jdbc.queryForObject("select respondio from edu.consultas_sabio where id = ?", String.class, id));
    }

    @Test void sinTallerRespondeLaReservaYSinReservaUnMensajeAmable() throws Exception {
        when(ia.pedirJson(anyString(), anyString(), anyDouble(), anyString(), any())).thenReturn(json.readTree(
                "{\"texto\":\"Repasa con tarjetas.\",\"actividad\":\"" + actividad + "\",\"graficos\":[\"ayudas_por_nivel\"],"
                + "\"mostrar_quienes_necesitan_ayuda\":false}"));
        UUID conReserva = nueva("docente", "¿Qué refuerzo?");
        assertTrue(sabio.revisarEsperas(Instant.now().plusSeconds(60)).contains(conReserva));
        sabio.responderConReserva(conReserva);
        ver("docente", conReserva).andExpect(jsonPath("$.estado").value("lista"))
                .andExpect(jsonPath("$.texto").value("Repasa con tarjetas."))
                .andExpect(jsonPath("$.graficos[0].tipo").value("ayudas_por_nivel"))
                .andExpect(jsonPath("$.quienes_necesitan_ayuda").doesNotExist());
        // Una respuesta tardía del taller ya no cambia nada.
        taller(conReserva + "/respuesta", "{\"texto\":\"Tarde.\",\"graficos\":[],\"mostrar_quienes_necesitan_ayuda\":false}")
                .andExpect(status().isConflict());

        when(ia.pedirJson(anyString(), anyString(), anyDouble(), anyString(), any())).thenThrow(new FalloGeneracion("sin red", true));
        UUID sinReserva = nueva("docente", "¿Qué refuerzo?");
        taller("siguiente", null).andExpect(status().isOk());
        taller(sinReserva + "/fallo", "{\"motivo\":\"límite de uso\"}").andExpect(status().isOk());
        sabio.responderConReserva(sinReserva);
        ver("docente", sinReserva).andExpect(jsonPath("$.estado").value("lista"))
                .andExpect(jsonPath("$.graficos.length()").value(4))
                .andExpect(jsonPath("$.quienes_necesitan_ayuda[0].nombre").value("Rosa Quispe Mamani"));
        assertEquals("local", jdbc.queryForObject("select respondio from edu.consultas_sabio where id = ?", String.class, sinReserva));
    }

    @Test void unaRespuestaSobreElPanelOConUnaActividadAjenaNoLlevaGraficosNiLista() throws Exception {
        UUID id = nueva("docente", "¿Cómo asigno una actividad a mi sección?");
        taller("siguiente", null).andExpect(jsonPath("$.consulta.con_actividad").value(true));
        taller(id + "/respuesta", "{\"texto\":\"Abre Resultados y elige Asignar.\",\"actividad\":\"\",\"graficos\":[\"errores_por_nivel\"],"
                + "\"mostrar_quienes_necesitan_ayuda\":true}").andExpect(status().isOk());
        ver("docente", id).andExpect(jsonPath("$.texto").value("Abre Resultados y elige Asignar."))
                .andExpect(jsonPath("$.actividad").doesNotExist())
                .andExpect(jsonPath("$.graficos").isEmpty()).andExpect(jsonPath("$.quienes_necesitan_ayuda").doesNotExist());
        // Un id que no estaba en el contexto no abre los datos de otra actividad.
        UUID otra = nueva("docente", "¿Qué refuerzo?");
        taller("siguiente", null).andExpect(status().isOk());
        taller(otra + "/respuesta", "{\"texto\":\"Refuerza.\",\"actividad\":\"" + UUID.randomUUID() + "\",\"graficos\":[\"errores_por_nivel\"],"
                + "\"mostrar_quienes_necesitan_ayuda\":true}").andExpect(status().isOk());
        ver("docente", otra).andExpect(jsonPath("$.graficos").isEmpty()).andExpect(jsonPath("$.quienes_necesitan_ayuda").doesNotExist());
    }

    @Test void unSaludoLlegaTalCualComoEnCualquierChat() throws Exception {
        for (String texto : List.of("ola", "Hola, gracias por la ayuda", "explícame más")) {
            UUID id = nueva("docente", texto);
            String contexto = jdbc.queryForObject("select contexto from edu.consultas_sabio where id = ?", String.class, id);
            assertEquals(texto, json.readTree(contexto).path("pregunta").asText(), contexto);
        }
    }

    @Test void cuantosEstudiantesYSusNombres() throws Exception {
        UUID id = nueva("docente", "¿Cuántos estudiantes tengo y cuáles son sus nombres?");
        String contexto = jdbc.queryForObject("select contexto from edu.consultas_sabio where id = ?", String.class, id);
        // A quien responde le llegan cuántos hay por sección y quiénes son, para que pueda nombrarlos.
        var secciones = json.readTree(contexto).path("secciones");
        assertEquals(1, secciones.size(), contexto);
        assertEquals(1, secciones.get(0).path("cantidad").asInt(), contexto);
        assertEquals("Rosa Quispe Mamani", secciones.get(0).path("estudiantes").get(0).asText(), contexto);
        assertTrue(secciones.get(0).path("seccion").asText().startsWith("1.º Sección"), contexto);
        taller("siguiente", null).andExpect(status().isOk());
        taller(id + "/respuesta", "{\"texto\":\"Tienes 1 estudiante en 1.º A. Aquí tienes la lista.\",\"actividad\":\"\",\"graficos\":[],"
                + "\"mostrar_quienes_necesitan_ayuda\":false,\"mostrar_lista_de_estudiantes\":true}").andExpect(status().isOk());
        ver("docente", id).andExpect(jsonPath("$.estudiantes.length()").value(1))
                .andExpect(jsonPath("$.estudiantes[0].nombres[0]").value("Rosa Quispe Mamani"))
                .andExpect(jsonPath("$.graficos").isEmpty());
        // Sin pedir la lista, no se muestra.
        UUID otra = nueva("docente", "¿Qué refuerzo?");
        taller("siguiente", null).andExpect(status().isOk());
        taller(otra + "/respuesta", "{\"texto\":\"Refuerza.\",\"actividad\":\"\",\"graficos\":[],\"mostrar_quienes_necesitan_ayuda\":false}")
                .andExpect(status().isOk());
        ver("docente", otra).andExpect(jsonPath("$.estudiantes").doesNotExist());
    }

    @Test void losGraficosQuePideElDocenteSeMuestranYLosMalFormadosSeDescartan() throws Exception {
        UUID id = nueva("docente", "Hazme un gráfico de los puntos de cada estudiante");
        taller("siguiente", null).andExpect(status().isOk());
        String barras31 = String.join(",", Collections.nCopies(31, "{\"etiqueta\":\"X\",\"valor\":1}"));
        taller(id + "/respuesta", "{\"texto\":\"Aquí está.\",\"actividad\":\"\",\"graficos\":[],\"mostrar_quienes_necesitan_ayuda\":false,"
                + "\"graficos_propios\":[{\"titulo\":\"Puntos por estudiante\",\"barras\":[{\"etiqueta\":\"Rosa Quispe Mamani\",\"valor\":7}]},"
                + "{\"titulo\":\"Demasiadas barras\",\"barras\":[" + barras31 + "]},"
                + "{\"titulo\":\"Negativo\",\"barras\":[{\"etiqueta\":\"A\",\"valor\":-2}]}]}").andExpect(status().isOk());
        ver("docente", id).andExpect(jsonPath("$.graficos.length()").value(1))
                .andExpect(jsonPath("$.graficos[0].tipo").value("propio"))
                .andExpect(jsonPath("$.graficos[0].titulo").value("Puntos por estudiante"))
                .andExpect(jsonPath("$.graficos[0].barras[0].etiqueta").value("Rosa Quispe Mamani"))
                .andExpect(jsonPath("$.graficos[0].barras[0].valor").value(7));
    }

    @Test void unDocenteSinActividadesSoloPreguntaPorElPanelYNoVeLasAjenas() throws Exception {
        UUID id = nueva("ajeno", "¿Qué refuerzo?");
        String contexto = jdbc.queryForObject("select contexto from edu.consultas_sabio where id = ?", String.class, id);
        assertFalse(contexto.contains("Reconocer animales") || contexto.contains(actividad.toString()) || contexto.contains("Rosa"), contexto);
        taller("siguiente", null).andExpect(jsonPath("$.consulta.con_actividad").value(false));
    }

    @Test void soloElDocenteDeLaSeccionYElTallerConSuClave() throws Exception {
        UUID id = nueva("docente", "¿Qué refuerzo?");
        ver("ajeno", id).andExpect(status().isNotFound());
        preguntar("estudiante", "¿Qué refuerzo?").andExpect(status().isForbidden());
        preguntar("docente", " ").andExpect(status().isBadRequest());
        mvc.perform(post(TALLER + "siguiente")).andExpect(status().isForbidden());
        mvc.perform(post(TALLER + "siguiente").header("X-Taller-Clave", "otra")).andExpect(status().isForbidden());
    }

    @Test void lasPruebasDelDocenteNoCuentan() throws Exception {
        String prueba = UUID.randomUUID().toString();
        for (int orden = 1; orden <= 5; orden++) partidas.guardar(docente, true, aviso(prueba, orden, "accion", 2).put("correcto", false));
        UUID id = nueva("docente", "¿Cómo va el grupo?");
        String contexto = jdbc.queryForObject("select contexto from edu.consultas_sabio where id = ?", String.class, id);
        var grupo = json.readTree(contexto).path("actividades").get(0).path("grupo");
        assertEquals(1, grupo.path("jugaron").asInt(), contexto);
        assertEquals(0, grupo.path("niveles").get(1).path("errores").asInt(), contexto);
    }
}
