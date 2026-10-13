package pe.kusi.edu.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;
import java.util.*;

@Service
public class DjangoInternoClient {
    private final RestTemplate http;
    @Value("${kusi.django-url}") private String djangoUrl;
    @Value("${kusi.internal-key:}") private String internalKey;

    public DjangoInternoClient() { this.http=new RestTemplate(fabrica()); }

    // SimpleClientHttpRequestFactory envía el cuerpo con Transfer-Encoding: chunked,
    // que el servidor de Django rechaza con 400. El buffer fija Content-Length.
    static ClientHttpRequestFactory fabrica() {
        SimpleClientHttpRequestFactory factory=new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(2000);
        factory.setReadTimeout(3000);
        return new BufferingClientHttpRequestFactory(factory);
    }

    // Permite probar el contrato con un servidor HTTP simulado, sin red.
    DjangoInternoClient(RestTemplate http) { this.http=http; }

    private HttpHeaders cabeceras() {
        if (internalKey == null || internalKey.isBlank()) throw new IllegalStateException("Servicio educativo no configurado.");
        HttpHeaders headers=new HttpHeaders();
        headers.set("X-Clave-Interna",internalKey);
        return headers;
    }

    private RuntimeException falloHttp(RestClientResponseException ex, String mensaje, boolean aceptarNoEncontrado) {
        if (ex.getStatusCode().value()==401 || ex.getStatusCode().value()==403)
            return new ResponseStatusException(ex.getStatusCode(),mensaje);
        if (aceptarNoEncontrado && ex.getStatusCode().value()==404)
            return new IllegalArgumentException(mensaje);
        return new IllegalStateException("El servicio de cuentas no está disponible. Inténtalo de nuevo.");
    }

    @SuppressWarnings("unchecked")
    private Map<String,Object> usuario(ResponseEntity<Map> respuesta) {
        if (respuesta.getBody()==null || !(respuesta.getBody().get("usuario") instanceof Map<?,?> datos))
            throw new IllegalStateException("El servicio de cuentas devolvió una respuesta no válida.");
        return (Map<String,Object>)datos;
    }

    public Map<String,Object> validarSesion(String session) {
        HttpHeaders headers=cabeceras();
        if (session == null || session.isBlank()) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Inicia sesión para continuar.");
        headers.setContentType(MediaType.APPLICATION_JSON);
        try {
            ResponseEntity<Map> respuesta=http.exchange(djangoUrl+"/api/interno/sesiones/validar/",HttpMethod.POST,
                new HttpEntity<>(Map.of("sesion",session),headers),Map.class);
            return usuario(respuesta);
        } catch (RestClientResponseException ex) {
            throw falloHttp(ex,"La sesión no está autorizada o ha caducado.",false);
        } catch (RestClientException ex) {
            throw new IllegalStateException("El servicio de cuentas no está disponible. Inténtalo de nuevo.");
        }
    }

    public Map<String,Object> validarAdministrador(String session) {
        Map<String,Object> usuario=validarSesion(session);
        Object rolesValue=usuario.get("roles");
        if (!(rolesValue instanceof List<?> roles) || !roles.contains("administrador")) throw new SecurityException("Solo un administrador puede realizar esta operación.");
        return usuario;
    }

    public Map<String,Object> validarCuenta(UUID id, String rolEsperado) {
        HttpHeaders headers=cabeceras();
        try {
            ResponseEntity<Map> respuesta=http.exchange(djangoUrl+"/api/interno/cuentas/"+id+"/",HttpMethod.GET,
                new HttpEntity<>(headers),Map.class);
            Map<String,Object> usuario=usuario(respuesta);
            Object rolesValue=usuario.get("roles");
            if (!Boolean.TRUE.equals(usuario.get("activo")) || !(rolesValue instanceof List<?> roles) || !roles.contains(rolEsperado)) throw new IllegalArgumentException("La cuenta debe existir, estar activa y tener el rol "+rolEsperado+".");
            return usuario;
        } catch (RestClientResponseException ex) {
            throw falloHttp(ex,"No se pudo validar la cuenta. Comprueba que exista y esté activa.",true);
        } catch (RestClientException ex) {
            throw new IllegalStateException("El servicio de cuentas no está disponible. Inténtalo de nuevo.");
        }
    }

    // Devuelve el nombre actual del catálogo Django; el UUID del curso no cambia al renombrarlo.
    public String nombreCurso(UUID id) {
        HttpHeaders headers=cabeceras();
        try {
            ResponseEntity<Map> respuesta=http.exchange(djangoUrl+"/api/interno/cursos/"+id+"/",HttpMethod.GET,new HttpEntity<>(headers),Map.class);
            if (respuesta.getBody()==null || !(respuesta.getBody().get("curso") instanceof Map<?,?> curso) || !(curso.get("nombre") instanceof String nombre) || nombre.isBlank())
                throw new IllegalStateException("El servicio de cuentas devolvió una respuesta no válida.");
            return nombre;
        } catch (RestClientResponseException ex) {
            throw falloHttp(ex,"El curso indicado no existe en el catálogo.",true);
        } catch (RestClientException ex) {
            throw new IllegalStateException("El servicio de cuentas no está disponible. Inténtalo de nuevo.");
        }
    }

    public void validarCurso(UUID id) {
        HttpHeaders headers=cabeceras();
        try {
            http.exchange(djangoUrl+"/api/interno/cursos/"+id+"/",HttpMethod.GET,new HttpEntity<>(headers),Map.class);
        } catch (RestClientResponseException ex) {
            throw falloHttp(ex,"El curso indicado no existe en el catálogo.",true);
        } catch (RestClientException ex) {
            throw new IllegalStateException("El servicio de cuentas no está disponible. Inténtalo de nuevo.");
        }
    }
}
