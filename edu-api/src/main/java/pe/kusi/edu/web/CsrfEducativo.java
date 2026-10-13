package pe.kusi.edu.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

// CSRF propio de Spring para las rutas del navegador (/api/edu/), con el patrón de
// doble envío: cookie SameSite=Strict + cabecera X-XSRF-TOKEN iguales. No reutiliza
// el token de Django. Las rutas /interno siguen protegidas por la clave interna.
@Component
public class CsrfEducativo extends OncePerRequestFilter {
    static final String COOKIE="kusi_edu_csrf";
    private static final SecureRandom aleatorio=new SecureRandom();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/edu/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain cadena) throws ServletException, IOException {
        String metodo=request.getMethod();
        boolean lectura=metodo.equals("GET") || metodo.equals("HEAD") || metodo.equals("OPTIONS");
        if (!lectura) {
            String cookie=leerCookie(request), cabecera=request.getHeader("X-XSRF-TOKEN");
            if (cookie == null || cabecera == null || !MessageDigest.isEqual(cookie.getBytes(StandardCharsets.UTF_8), cabecera.getBytes(StandardCharsets.UTF_8))) {
                response.setStatus(403);
                response.setContentType("application/json;charset=UTF-8");
                response.getWriter().write("{\"mensaje\":\"No se pudo comprobar la seguridad de la solicitud. Recarga la página e inténtalo de nuevo.\"}");
                return;
            }
        }
        cadena.doFilter(request, response);
    }

    // Reutiliza el token vigente para no invalidar otra pestaña abierta.
    static String tokenPara(HttpServletRequest request, HttpServletResponse response) {
        String actual=leerCookie(request);
        if (actual != null && actual.length() == 43) return actual;
        byte[] bytes=new byte[32];
        aleatorio.nextBytes(bytes);
        String nuevo=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        ResponseCookie cookie=ResponseCookie.from(COOKIE, nuevo).httpOnly(true).secure(request.isSecure()).sameSite("Strict").path("/api/edu/").build();
        response.addHeader("Set-Cookie", cookie.toString());
        return nuevo;
    }

    private static String leerCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies()) if (COOKIE.equals(cookie.getName())) return cookie.getValue();
        return null;
    }
}
