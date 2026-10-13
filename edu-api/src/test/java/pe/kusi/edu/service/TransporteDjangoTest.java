package pe.kusi.edu.service;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

// Servidor HTTP local real (no MockRestServiceServer): comprueba cómo viaja el cuerpo.
// Regresión: con Transfer-Encoding chunked el servidor de Django respondía 400.
class TransporteDjangoTest {
    @Test
    void validarSesionEnviaContentLengthSinChunked() throws Exception {
        AtomicReference<String> longitud=new AtomicReference<>(), troceado=new AtomicReference<>();
        HttpServer servidor=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        servidor.createContext("/api/interno/sesiones/validar/", intercambio -> {
            longitud.set(intercambio.getRequestHeaders().getFirst("Content-Length"));
            troceado.set(intercambio.getRequestHeaders().getFirst("Transfer-Encoding"));
            intercambio.getRequestBody().readAllBytes();
            byte[] cuerpo="{\"usuario\":{\"id\":\"u1\",\"roles\":[\"docente\"]}}".getBytes(StandardCharsets.UTF_8);
            intercambio.getResponseHeaders().add("Content-Type","application/json");
            intercambio.sendResponseHeaders(200,cuerpo.length);
            intercambio.getResponseBody().write(cuerpo);
            intercambio.close();
        });
        servidor.start();
        try {
            DjangoInternoClient cliente=new DjangoInternoClient(new RestTemplate(DjangoInternoClient.fabrica()));
            ReflectionTestUtils.setField(cliente,"djangoUrl","http://127.0.0.1:"+servidor.getAddress().getPort());
            ReflectionTestUtils.setField(cliente,"internalKey","clave-solo-para-pruebas");
            assertEquals("u1", cliente.validarSesion("sesion-prueba").get("id"));
            assertNotNull(longitud.get());
            assertNull(troceado.get());
        } finally { servidor.stop(0); }
    }
}
