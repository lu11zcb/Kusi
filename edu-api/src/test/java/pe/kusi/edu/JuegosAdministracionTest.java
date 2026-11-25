package pe.kusi.edu;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.model.AsignacionDocente;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.model.Seccion;
import pe.kusi.edu.model.SolicitudPropuesta;
import pe.kusi.edu.repository.AsignacionDocenteRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;
import pe.kusi.edu.repository.SeccionRepository;
import pe.kusi.edu.repository.SolicitudPropuestaRepository;
import pe.kusi.edu.service.DjangoInternoClient;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.doCallRealMethod;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:kusi_juegos_admin;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
        "spring.config.import="
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
class JuegosAdministracionTest {
    private static final String RUTA = "/api/edu/administracion/juegos/";

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper json;
    @Autowired SeccionRepository secciones;
    @Autowired AsignacionDocenteRepository asignaciones;
    @Autowired SolicitudPropuestaRepository solicitudes;
    @Autowired PropuestaRepository propuestas;
    @Autowired GeneracionRepository generaciones;
    @MockitoBean DjangoInternoClient django;

    @Test void administradorConsultaCadaJuegoUnaVezYRecibeSoloSusMetadatos() throws Exception {
        UUID docente = UUID.randomUUID();
        UUID otro = UUID.randomUUID();
        UUID sinJuegos = UUID.randomUUID();
        UUID curso = UUID.randomUUID();
        Seccion seccion = secciones.saveAndFlush(new Seccion("Primero A", 1, 2026));
        asignaciones.saveAndFlush(new AsignacionDocente(sinJuegos, curso, seccion, 2026, docente));
        when(django.nombreDocenteHistorico(docente)).thenReturn("Docente Alba");
        when(django.nombreDocenteHistorico(otro)).thenReturn("Docente Bruno");
        when(django.nombreDocenteHistorico(sinJuegos)).thenReturn("Docente Carmen");
        when(django.nombreCurso(curso)).thenReturn("Matemática");
        doCallRealMethod().when(django).validarAdministrador("admin");
        when(django.validarSesion("admin")).thenReturn(Map.of("roles", List.of("administrador")));

        Propuesta publicado = propuesta(docente, curso, seccion.getId(), "Patrones");
        version(publicado, "lista", true, "Patrones en el patio");
        version(publicado, "fallida", false, null);
        Propuesta listo = propuesta(docente, curso, seccion.getId(), "Sumas");
        version(listo, "lista", false, "Sumas con frutas");
        Propuesta generando = propuesta(docente, curso, null, "Decenas");
        version(generando, "comprobando", false, null);
        Propuesta fallido = propuesta(docente, curso, seccion.getId(), "Restas");
        version(fallido, "fallida", false, null);
        Propuesta retirado = propuesta(docente, curso, seccion.getId(), "Conteo");
        version(retirado, "lista", true, "Cuenta las flores");
        jdbc.update("update edu.solicitudes_propuesta set retirada_en = current_timestamp where id = ?", retirado.getSolicitudId());
        version(propuesta(otro, curso, seccion.getId(), "Unidades"), "pendiente", false, null);
        propuesta(docente, curso, seccion.getId(), "Solo una propuesta");

        Cookie sesion = new Cookie("sessionid", "admin");
        mvc.perform(get(RUTA).cookie(sesion))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.totales.creados").value(6))
                .andExpect(jsonPath("$.totales.publicados").value(1))
                .andExpect(jsonPath("$.totales.en_preparacion").value(3))
                .andExpect(jsonPath("$.docentes.length()").value(3))
                .andExpect(jsonPath("$.docentes[0].juegos_creados").value(5))
                .andExpect(jsonPath("$.docentes[1].juegos_creados").value(1))
                .andExpect(jsonPath("$.docentes[2].juegos_creados").value(0));

        var respuesta = mvc.perform(get(RUTA + docente + "/").cookie(sesion))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.juegos.length()").value(5)).andReturn().getResponse();
        for (var juego : json.readTree(respuesta.getContentAsByteArray()).path("juegos")) {
            // Una lista cerrada protege resultados, destinatarios, paquetes y detalles internos del fallo.
            assertEquals(Set.of("id", "titulo", "curso", "seccion", "anio_escolar", "estado", "creado_en", "fallo_generacion"),
                    juego.properties().stream().map(Map.Entry::getKey).collect(java.util.stream.Collectors.toSet()));
            assertEquals("Matemática", juego.path("curso").asText());
            if (juego.path("id").asText().equals(publicado.getSolicitudId().toString())) {
                assertEquals("Patrones en el patio", juego.path("titulo").asText());
                assertEquals("Primero A", juego.path("seccion").asText());
                assertEquals("publicado", juego.path("estado").asText());
                assertEquals(true, juego.path("fallo_generacion").asBoolean());
            }
        }
        var juegos = json.readTree(respuesta.getContentAsByteArray()).path("juegos").valueStream()
                .collect(java.util.stream.Collectors.toMap(juego -> juego.path("id").asText(), juego -> juego.path("estado").asText()));
        assertEquals(Map.of(publicado.getSolicitudId().toString(), "publicado", listo.getSolicitudId().toString(), "listo_para_probar",
                generando.getSolicitudId().toString(), "generando", fallido.getSolicitudId().toString(), "fallido",
                retirado.getSolicitudId().toString(), "retirado"), juegos);
        verify(django, times(1)).nombreCurso(curso);
        mvc.perform(get(RUTA + sinJuegos + "/").cookie(sesion)).andExpect(jsonPath("$.juegos").isEmpty());
    }

    @Test void unaSesionDocenteEstudianteOCaducadaNoPuedeConsultarLosJuegos() throws Exception {
        UUID docente = UUID.randomUUID();
        doCallRealMethod().when(django).validarAdministrador(nullable(String.class));
        when(django.validarSesion("docente")).thenReturn(Map.of("id", docente, "roles", List.of("docente")));
        when(django.validarSesion("estudiante")).thenReturn(Map.of("roles", List.of("estudiante")));
        when(django.validarSesion(null)).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Inicia sesión para continuar."));
        when(django.validarSesion("vencida")).thenThrow(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "La sesión ha caducado."));
        for (String ruta : List.of(RUTA, RUTA + docente + "/")) {
            for (String rol : List.of("docente", "estudiante")) {
                mvc.perform(get(ruta).cookie(new Cookie("sessionid", rol))).andExpect(status().isForbidden());
            }
            mvc.perform(get(ruta)).andExpect(status().isUnauthorized());
            mvc.perform(get(ruta).cookie(new Cookie("sessionid", "vencida"))).andExpect(status().isUnauthorized());
        }
    }

    // El administrador abre un juego y ve lo que escribió el docente, cada versión con la
    // corrección que pidió y cada guion con sus comprobaciones. El título es el que propuso Kusi.
    @Test void administradorVeElDetalleDeUnJuegoConElPedidoLasCorreccionesYElGuion() throws Exception {
        UUID docente = UUID.randomUUID();
        UUID curso = UUID.randomUUID();
        Seccion seccion = secciones.saveAndFlush(new Seccion("Primero B", 1, 2026));
        when(django.nombreCurso(curso)).thenReturn("Comunicación");
        doCallRealMethod().when(django).validarAdministrador(nullable(String.class));
        when(django.validarSesion("admin")).thenReturn(Map.of("roles", List.of("administrador")));
        when(django.validarSesion("docente")).thenReturn(Map.of("id", docente, "roles", List.of("docente")));

        UUID id = UUID.randomUUID();
        solicitudes.saveAndFlush(new SolicitudPropuesta(id, docente, curso, seccion.getId(), "las vocales",
                "Reconocer la a y la e", "preparacion", "Usar animales de la sierra"));
        Propuesta primera = new Propuesta(id, 1, "ia", null, null, "Practicar vocales", "docente", "Kusi viaja",
                "[\"Tocar\"]", "[\"Una regla\"]", "[\"Reto\"]", "[\"Pista\"]", null, "taller", "proponedor");
        primera.setTitulo("Las vocales congeladas");
        propuestas.saveAndFlush(primera);
        Propuesta corregida = new Propuesta(id, 2, "ia", 1, "Que sea más corto", "Practicar vocales", "docente", "Kusi viaja corto",
                "[\"Tocar\"]", "[\"Una regla\"]", "[\"Reto\"]", "[\"Pista\"]", null, "taller", "proponedor");
        corregida.setTitulo("Las vocales congeladas");
        corregida.revisar("aprobada", docente);
        propuestas.saveAndFlush(corregida);
        Generacion juego = new Generacion(id, corregida.getId(), 2);
        juego.registrarEstado("lista", null);
        juego.guardarPaquete(json.createObjectNode().put("titulo", "Otro nombre del guion").toString());
        generaciones.saveAndFlush(juego);
        jdbc.update("insert into edu.etapas_generacion (id, generacion_id, etapa, estado, mensaje, creado_en) values (?, ?, ?, ?, ?, current_timestamp)",
                UUID.randomUUID(), juego.getId(), "comprobacion", "fallida", "Un objeto quedó sobre un muro.");

        String ruta = RUTA + "detalle/" + id + "/";
        mvc.perform(get(ruta).cookie(new Cookie("sessionid", "admin")))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.juego.titulo").value("Las vocales congeladas"))
                .andExpect(jsonPath("$.juego.curso").value("Comunicación"))
                .andExpect(jsonPath("$.pedido.tema").value("las vocales"))
                .andExpect(jsonPath("$.pedido.objetivo_docente").value("Reconocer la a y la e"))
                .andExpect(jsonPath("$.pedido.instrucciones").value("Usar animales de la sierra"))
                .andExpect(jsonPath("$.versiones.length()").value(2))
                .andExpect(jsonPath("$.versiones[0].version").value(2))
                .andExpect(jsonPath("$.versiones[0].observaciones").value("Que sea más corto"))
                .andExpect(jsonPath("$.versiones[0].contenido.historia").value("Kusi viaja corto"))
                .andExpect(jsonPath("$.generaciones[0].estado").value("lista"))
                .andExpect(jsonPath("$.generaciones[0].etapas[0].mensaje").value("Un objeto quedó sobre un muro."))
                .andExpect(jsonPath("$.generaciones[0].guion.titulo").value("Otro nombre del guion"));
        // Solo el administrador; un juego que no existe responde 404.
        mvc.perform(get(ruta).cookie(new Cookie("sessionid", "docente"))).andExpect(status().isForbidden());
        mvc.perform(get(RUTA + "detalle/" + UUID.randomUUID() + "/").cookie(new Cookie("sessionid", "admin"))).andExpect(status().isNotFound());
    }

    private Propuesta propuesta(UUID docente, UUID curso, UUID seccion, String tema) {
        UUID id = UUID.randomUUID();
        solicitudes.saveAndFlush(new SolicitudPropuesta(id, docente, curso, seccion, tema, null, "refuerzo", null));
        Propuesta propuesta = new Propuesta(id, 1, "docente", null, null,
                "Practicar", "docente", tema, "[]", "[]", "[]", "[]", null, null, null);
        propuesta.revisar("aprobada", docente);
        return propuestas.saveAndFlush(propuesta);
    }

    private void version(Propuesta propuesta, String estado, boolean publicada, String titulo) {
        Generacion generacion = new Generacion(propuesta.getSolicitudId(), propuesta.getId(), 1);
        generacion.registrarEstado(estado, "fallida".equals(estado) ? "Detalle privado" : null);
        if (titulo != null) generacion.guardarPaquete(json.createObjectNode().put("titulo", titulo).toString());
        if (publicada) generacion.publicar();
        generaciones.saveAndFlush(generacion);
    }
}
