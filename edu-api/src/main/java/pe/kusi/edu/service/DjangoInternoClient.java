package pe.kusi.edu.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import java.util.*;

@Service
public class DjangoInternoClient {
    private final RestTemplate http = new RestTemplate();
    @Value("${kusi.django-url}") private String djangoUrl;
    @Value("${kusi.internal-key:}") private String internalKey;

    @SuppressWarnings("unchecked")
    public Map<String,Object> validarSesion(String session) {
        if (internalKey == null || internalKey.isBlank()) throw new IllegalStateException("Servicio educativo no configurado.");
        if (session == null || session.isBlank()) throw new SecurityException("Inicia sesión para continuar.");
        Map<String,Object> body = Map.of("sesion", session);
        HttpHeaders headers = new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON); headers.set("X-Clave-Interna", internalKey);
        try {
            ResponseEntity<Map> response = http.exchange(djangoUrl + "/api/interno/sesiones/validar/", HttpMethod.POST, new HttpEntity<>(body, headers), Map.class);
            return (Map<String,Object>) response.getBody().get("usuario");
        } catch (RestClientResponseException ex) { throw new SecurityException("La sesión no está autorizada o ha caducado."); }
    }

    public Map<String,Object> validarAdministrador(String session) {
        Map<String,Object> usuario = validarSesion(session);
        Object rolesValue = usuario.get("roles");
        if (!(rolesValue instanceof List<?> roles) || !roles.contains("administrador")) throw new SecurityException("Solo un administrador puede realizar esta operación.");
        return usuario;
    }

    @SuppressWarnings("unchecked")
    public Map<String,Object> validarCuenta(UUID id, String rolEsperado) {
        HttpHeaders headers = new HttpHeaders(); headers.set("X-Clave-Interna", internalKey);
        try {
            ResponseEntity<Map> response = http.exchange(djangoUrl + "/api/interno/cuentas/" + id + "/", HttpMethod.GET, new HttpEntity<>(headers), Map.class);
            Map<String,Object> usuario = (Map<String,Object>) response.getBody().get("usuario");
            Object rolesValue = usuario.get("roles");
            if (!Boolean.TRUE.equals(usuario.get("activo")) || !(rolesValue instanceof List<?> roles) || !roles.contains(rolEsperado)) throw new IllegalArgumentException("La cuenta debe existir, estar activa y tener el rol " + rolEsperado + ".");
            return usuario;
        } catch (RestClientResponseException ex) { throw new IllegalArgumentException("No se pudo validar la cuenta. Comprueba que exista y esté activa."); }
    }

    public void validarCurso(UUID id) {
        HttpHeaders headers = new HttpHeaders(); headers.set("X-Clave-Interna", internalKey);
        try { http.exchange(djangoUrl + "/api/interno/cursos/" + id + "/", HttpMethod.GET, new HttpEntity<>(headers), Map.class); }
        catch (RestClientResponseException ex) { throw new IllegalArgumentException("El curso indicado no existe en el catálogo."); }
    }
}
