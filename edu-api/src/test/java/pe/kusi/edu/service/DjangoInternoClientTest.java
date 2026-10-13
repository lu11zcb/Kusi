package pe.kusi.edu.service;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.net.SocketTimeoutException;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

// El servidor intercepta RestTemplate: no se usa red, contexto Spring ni base.
class DjangoInternoClientTest {
    private static final String URL="http://django.kusi.test";
    private static final String CLAVE="clave-solo-para-pruebas";
    private static final UUID ID=UUID.fromString("11111111-1111-1111-1111-111111111111");
    private MockRestServiceServer servidor;
    private DjangoInternoClient cliente;

    @BeforeEach
    void preparar() {
        RestTemplate http=new RestTemplate();
        servidor=MockRestServiceServer.bindTo(http).build();
        cliente=new DjangoInternoClient(http);
        ReflectionTestUtils.setField(cliente,"djangoUrl",URL);
        ReflectionTestUtils.setField(cliente,"internalKey",CLAVE);
    }

    @AfterEach
    void verificar() { servidor.verify(); }

    private String ruta(String operacion) {
        return switch (operacion) {
            case "sesion" -> "/api/interno/sesiones/validar/";
            case "cuenta" -> "/api/interno/cuentas/"+ID+"/";
            default -> "/api/interno/cursos/"+ID+"/";
        };
    }

    private void validar(String operacion) {
        switch (operacion) {
            case "sesion" -> cliente.validarSesion("sesion-prueba");
            case "cuenta" -> cliente.validarCuenta(ID,"docente");
            default -> cliente.validarCurso(ID);
        }
    }

    @Test
    void sesionEnviaClaveYTokenYConservaValidacionDeRol() {
        servidor.expect(requestTo(URL+ruta("sesion")))
            .andExpect(method(HttpMethod.POST))
            .andExpect(header("X-Clave-Interna",CLAVE))
            .andExpect(content().json("{\"sesion\":\"sesion-prueba\"}"))
            .andRespond(withSuccess("{\"usuario\":{\"id\":\""+ID+"\",\"roles\":[\"docente\"]}}",MediaType.APPLICATION_JSON));
        assertThrows(SecurityException.class,()->cliente.validarAdministrador("sesion-prueba"));
    }

    @ParameterizedTest
    @ValueSource(ints={401,403})
    void autenticacionConservaEstadoOriginal(int estado) {
        servidor.expect(requestTo(URL+ruta("sesion")))
            .andRespond(withStatus(HttpStatus.valueOf(estado)));
        ResponseStatusException error=assertThrows(ResponseStatusException.class,()->validar("sesion"));
        assertEquals(estado,error.getStatusCode().value());
    }

    @ParameterizedTest
    @ValueSource(strings={"sesion","cuenta","curso"})
    void errorDjangoNoSeConfundeConDatosInvalidos(String operacion) {
        servidor.expect(requestTo(URL+ruta(operacion))).andExpect(header("X-Clave-Interna",CLAVE))
            .andRespond(withServerError().body("detalle privado del servidor"));
        IllegalStateException error=assertThrows(IllegalStateException.class,()->validar(operacion));
        assertFalse(error.getMessage().contains("detalle privado"));
    }

    @ParameterizedTest
    @ValueSource(strings={"sesion","cuenta","curso"})
    void esperaAgotadaEsIndisponibilidad(String operacion) {
        servidor.expect(requestTo(URL+ruta(operacion)))
            .andRespond(withException(new SocketTimeoutException("tiempo de lectura agotado")));
        assertThrows(IllegalStateException.class,()->validar(operacion));
    }

    @ParameterizedTest
    @ValueSource(strings={"cuenta","curso"})
    void recursoInexistenteSigueSiendoDatoInvalido(String operacion) {
        servidor.expect(requestTo(URL+ruta(operacion))).andRespond(withStatus(HttpStatus.NOT_FOUND));
        assertThrows(IllegalArgumentException.class,()->validar(operacion));
    }

    @Test
    void respuestaDeSesionSinUsuarioNoSeConfundeConPermisos() {
        servidor.expect(requestTo(URL+ruta("sesion")))
            .andRespond(withSuccess("{\"usuario\":null}",MediaType.APPLICATION_JSON));
        assertThrows(IllegalStateException.class,()->validar("sesion"));
    }

    @Test
    void cuentaInactivaSigueRechazada() {
        servidor.expect(requestTo(URL+ruta("cuenta")))
            .andRespond(withSuccess("{\"usuario\":{\"id\":\""+ID+"\",\"activo\":false,\"roles\":[\"docente\"]}}",MediaType.APPLICATION_JSON));
        assertThrows(IllegalArgumentException.class,()->validar("cuenta"));
    }

    @Test
    void sinClaveNoHacePeticiones() {
        ReflectionTestUtils.setField(cliente,"internalKey","");
        assertThrows(IllegalStateException.class,()->validar("sesion"));
    }

    @Test
    void sinSesionNoHacePeticionesYResponde401() {
        ResponseStatusException error=assertThrows(ResponseStatusException.class,()->cliente.validarSesion(" "));
        assertEquals(401,error.getStatusCode().value());
    }
}
