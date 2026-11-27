package pe.kusi.edu.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

// Varias cuentas a la vez en el mismo navegador. El navegador comparte la cookie «sessionid» entre todas las
// pestañas, así que entrar con otra cuenta en una pestaña cambiaba las demás. El panel web guarda la sesión de
// cada pestaña y la manda en la cabecera X-Kusi-Sesion (vacía si esa pestaña no inició sesión). Si llega, este
// filtro hace que las rutas vean esa sesión como su cookie «sessionid» (las 43 rutas que leen @CookieValue no
// cambian). La app del celular no manda la cabecera y sigue con su cookie. Django hace lo mismo de su lado.
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SesionPorPestana extends OncePerRequestFilter {
    static final String CABECERA = "X-Kusi-Sesion";
    static final String COOKIE_SESION = "sessionid";
    // Las claves de sesión de Django son letras minúsculas y números.
    private static final Pattern CLAVE_VALIDA = Pattern.compile("[a-z0-9]{1,64}");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain cadena)
            throws ServletException, IOException {
        String cabecera = request.getHeader(CABECERA);
        if (cabecera == null) {
            cadena.doFilter(request, response);
            return;
        }
        String clave = cabecera.strip();
        boolean valida = CLAVE_VALIDA.matcher(clave).matches();
        cadena.doFilter(new HttpServletRequestWrapper(request) {
            @Override
            public Cookie[] getCookies() {
                List<Cookie> cookies = new ArrayList<>();
                Cookie[] originales = super.getCookies();
                if (originales != null) {
                    for (Cookie cookie : originales) {
                        if (!COOKIE_SESION.equals(cookie.getName())) cookies.add(cookie);
                    }
                }
                if (valida) cookies.add(new Cookie(COOKIE_SESION, clave));
                return cookies.isEmpty() ? null : cookies.toArray(new Cookie[0]);
            }
        }, response);
    }
}
