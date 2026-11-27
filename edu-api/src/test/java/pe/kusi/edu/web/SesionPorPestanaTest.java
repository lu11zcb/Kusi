package pe.kusi.edu.web;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.util.WebUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

// Cada pestaña del panel manda su sesión en X-Kusi-Sesion: manda sobre la cookie que el navegador comparte.
class SesionPorPestanaTest {

    private HttpServletRequest pasar(MockHttpServletRequest pedido) throws Exception {
        MockFilterChain cadena = new MockFilterChain();
        new SesionPorPestana().doFilter(pedido, new MockHttpServletResponse(), cadena);
        return (HttpServletRequest) cadena.getRequest();
    }

    private String sesion(HttpServletRequest pedido) {
        Cookie cookie = WebUtils.getCookie(pedido, "sessionid");
        return cookie == null ? null : cookie.getValue();
    }

    @Test
    void la_sesion_de_la_pestana_manda_sobre_la_cookie_compartida() throws Exception {
        MockHttpServletRequest pedido = new MockHttpServletRequest("GET", "/api/edu/propuestas/solicitudes/");
        pedido.setCookies(new Cookie("sessionid", "deotracuenta1"), new Cookie("kusi_edu_csrf", "token"));
        pedido.addHeader("X-Kusi-Sesion", "deestapestana2");
        HttpServletRequest visto = pasar(pedido);
        assertEquals("deestapestana2", sesion(visto));
        assertEquals("token", WebUtils.getCookie(visto, "kusi_edu_csrf").getValue());
    }

    @Test
    void una_pestana_sin_sesion_no_hereda_la_cookie_y_una_clave_rara_se_descarta() throws Exception {
        MockHttpServletRequest nueva = new MockHttpServletRequest("GET", "/api/edu/propuestas/solicitudes/");
        nueva.setCookies(new Cookie("sessionid", "deotracuenta1"));
        nueva.addHeader("X-Kusi-Sesion", "");
        assertNull(sesion(pasar(nueva)));

        MockHttpServletRequest rara = new MockHttpServletRequest("GET", "/api/edu/propuestas/solicitudes/");
        rara.addHeader("X-Kusi-Sesion", "<script>");
        assertNull(sesion(pasar(rara)));
    }

    @Test
    void sin_la_cabecera_la_app_sigue_con_su_cookie() throws Exception {
        MockHttpServletRequest app = new MockHttpServletRequest("GET", "/api/edu/juegos/");
        app.setCookies(new Cookie("sessionid", "delaapp3"));
        assertEquals("delaapp3", sesion(pasar(app)));
    }
}
