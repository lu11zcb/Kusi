package pe.kusi.edu;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import pe.kusi.edu.service.DjangoInternoClient;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:kusi_partidas;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1", "spring.config.import="})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PartidasTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @MockitoBean DjangoInternoClient django;
    private static final String TOKEN = "token-csrf-de-prueba";

    private ObjectNode aviso(String partida, int orden, String tipo) {
        return json.createObjectNode().put("partida", partida).put("orden", orden).put("tipo", tipo)
                .put("momento", "2026-10-26T20:00:00Z").put("nivel", 1).put("ayuda", 1);
    }
    private org.springframework.test.web.servlet.ResultActions guardar(String sesion, ObjectNode aviso) throws Exception {
        return mvc.perform(post("/api/edu/partidas/avisos/").cookie(new Cookie("sessionid", sesion), new Cookie("kusi_edu_csrf", TOKEN))
                .header("X-XSRF-TOKEN", TOKEN).contentType("application/json").content(json.createObjectNode().set("aviso", aviso).toString()));
    }
    @Test
    void guardaReenviosSinDuplicarYAislaElPropietario() throws Exception {
        UUID docente = UUID.randomUUID(), otro = UUID.randomUUID();
        when(django.validarSesion("docente")).thenReturn(Map.of("id", docente.toString(), "roles", List.of("docente")));
        when(django.validarSesion("otro")).thenReturn(Map.of("id", otro.toString(), "roles", List.of("estudiante")));
        String partida = UUID.randomUUID().toString();
        ObjectNode ayuda = aviso(partida, 2, "ayuda");
        guardar("docente", ayuda).andExpect(status().isOk()).andExpect(jsonPath("$.duplicado").value(false));
        guardar("docente", ayuda).andExpect(status().isOk()).andExpect(jsonPath("$.duplicado").value(true))
                .andExpect(jsonPath("$.resumen.ayudas_usadas").value(1)).andExpect(jsonPath("$.resumen.prueba_docente").value(true));
        guardar("docente", aviso(partida, 3, "reto_completado")).andExpect(status().isOk());
        guardar("docente", aviso(partida, 4, "reto_completado")).andExpect(status().isOk());
        guardar("docente", aviso(partida, 5, "fin")).andExpect(status().isOk());
        mvc.perform(get("/api/edu/partidas/" + partida + "/").cookie(new Cookie("sessionid", "docente")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.resumen.niveles_completados").value(1)).andExpect(jsonPath("$.resumen.termino").value(true));
        guardar("otro", ayuda).andExpect(status().isNotFound());
        mvc.perform(get("/api/edu/partidas/" + partida + "/").cookie(new Cookie("sessionid", "otro"))).andExpect(status().isNotFound());
        guardar("docente", aviso(partida, 2, "inicio")).andExpect(status().isConflict());
        assertEquals(4, jdbc.queryForObject("select count(*) from edu.avisos_partida where partida_id = ?", Integer.class, partida));
    }
    @Test
    void rechazaTiposTamanosYCsrfYMarcaAlEstudianteSinPruebaDocente() throws Exception {
        when(django.validarSesion("alumno")).thenReturn(Map.of("id", UUID.randomUUID().toString(), "roles", List.of("estudiante")));
        String partida = UUID.randomUUID().toString();
        guardar("alumno", aviso(partida, 1, "inicio")).andExpect(status().isOk()).andExpect(jsonPath("$.resumen.prueba_docente").value(false));
        guardar("alumno", aviso(partida, 2, "inventado")).andExpect(status().isBadRequest());
        guardar("alumno", aviso(partida, 0, "inicio")).andExpect(status().isBadRequest());
        guardar("alumno", aviso(partida, 3, "ayuda").put("ayuda", 3)).andExpect(status().isBadRequest());
        guardar("alumno", aviso(partida, 3, "accion").put("texto", "x".repeat(8192))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/edu/partidas/avisos/").contentType("application/json").content("{}")).andExpect(status().isForbidden());
    }
}
