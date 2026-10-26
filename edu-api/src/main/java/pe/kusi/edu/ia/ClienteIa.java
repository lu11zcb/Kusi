package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Set;

// El único adaptador de IA de Kusi. Habla con cualquier proveedor compatible con la
// API de chat de OpenAI (Groq, la IA de Tecsup...). Las dos llamadas, la propuesta
// (llamada 1) y el guion del laberinto (llamada 2), pasan por aquí: cada una trae
// sus instrucciones y su esquema, y este adaptador se ocupa del transporte, de los
// errores y de pedir el formato JSON. Lo que responde la IA nunca se da por bueno:
// quien llama lo valida después.
public class ClienteIa {
    private static final Duration TIEMPO_MAXIMO = Duration.ofSeconds(90);
    private static final String RESPUESTA_INVALIDA = "La IA devolvió una respuesta incompleta o no válida.";

    // Con estos modelos de Groq el esquema estricto funciona sin pedirlo. Con otros
    // (por ejemplo el de Tecsup) se activa con IA_ESQUEMA_ESTRICTO=true.
    private static final Set<String> MODELOS_CON_ESQUEMA_ESTRICTO = Set.of("openai/gpt-oss-120b", "openai/gpt-oss-20b");

    private final String clave;
    private final String modelo;
    private final String url;
    private final String proveedor;
    private final boolean esquemaEstricto;
    private final ObjectMapper json;
    private final HttpClient cliente = HttpClient.newBuilder().version(HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(10)).build();

    public ClienteIa(String clave, String modelo, String url, boolean esquemaEstricto, String proveedor, ObjectMapper json) {
        this.clave = clave;
        this.modelo = modelo;
        this.url = url;
        this.esquemaEstricto = esquemaEstricto;
        this.proveedor = proveedor;
        this.json = json;
    }

    public static boolean esquemaEstrictoPorDefecto(String modelo) {
        return MODELOS_CON_ESQUEMA_ESTRICTO.contains(modelo);
    }

    public String proveedor() { return proveedor; }

    public String modelo() { return modelo; }

    public boolean esquemaEstricto() { return esquemaEstricto; }

    // Hace una llamada de chat y devuelve el objeto JSON que respondió la IA.
    // «esquema» describe la forma de la respuesta: con el esquema estricto activado
    // la IA está obligada a respetarlo; si no, se le pide solo «un objeto JSON» y
    // la forma queda descrita en las instrucciones.
    public JsonNode pedirJson(String instrucciones, String pedido, double temperatura,
                              String nombreEsquema, Map<String, Object> esquema) throws FalloGeneracion {
        String cuerpo;
        try {
            cuerpo = json.writeValueAsString(Map.of(
                    "model", modelo,
                    "temperature", temperatura,
                    "response_format", formatoRespuesta(nombreEsquema, esquema),
                    "messages", List.of(
                            Map.of("role", "system", "content", instrucciones),
                            Map.of("role", "user", "content", pedido))));
        } catch (IOException e) {
            throw new FalloGeneracion("No se pudo preparar el pedido a la IA.", false);
        }
        HttpRequest peticion = HttpRequest.newBuilder(URI.create(url)).timeout(TIEMPO_MAXIMO)
                .header("Authorization", "Bearer " + clave).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build();
        HttpResponse<String> respuesta;
        try {
            respuesta = cliente.send(peticion, HttpResponse.BodyHandlers.ofString());
        } catch (HttpTimeoutException e) {
            throw new FalloGeneracion("La IA tardó demasiado en responder.", true);
        } catch (IOException e) {
            throw new FalloGeneracion("No se pudo conectar con la IA.", false);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new FalloGeneracion("Se interrumpió la conexión con la IA.", false);
        }
        int estado = respuesta.statusCode();
        if (estado == 401 || estado == 403) {
            throw new FalloGeneracion("La clave de la IA no es válida. Revisa IA_CLAVE (o GROQ_API_KEY) en tu .env.", false);
        }
        if (estado == 429) {
            throw new FalloGeneracion("La IA recibió demasiadas solicitudes. Espera un momento.", false);
        }
        if (estado == 400 && esquemaEstricto) {
            throw new FalloGeneracion("La IA rechazó el pedido (400). Si tu modelo no admite esquema estricto, "
                    + "pon IA_ESQUEMA_ESTRICTO=false en tu .env.", false);
        }
        if (estado < 200 || estado >= 300) {
            throw new FalloGeneracion("La IA respondió con un error (" + estado + ").", false);
        }
        try {
            JsonNode contenido = json.readTree(respuesta.body()).path("choices").path(0).path("message").path("content");
            if (!contenido.isTextual()) throw new FalloGeneracion(RESPUESTA_INVALIDA, false);
            JsonNode resultado = leerObjeto(contenido.asText());
            if (resultado == null) throw new FalloGeneracion(RESPUESTA_INVALIDA, false);
            return resultado;
        } catch (IOException e) {
            throw new FalloGeneracion(RESPUESTA_INVALIDA, false);
        }
    }

    // Lee el objeto JSON de la respuesta. Algunos modelos lo envuelven en texto o en
    // una cerca de Markdown; en ese caso se toma lo que va de la primera «{» a la última «}».
    private JsonNode leerObjeto(String texto) {
        try {
            JsonNode directo = json.readTree(texto);
            if (directo != null && directo.isObject()) return directo;
        } catch (IOException e) {
            // Se intenta rescatar el objeto de entre el texto.
        }
        int inicio = texto.indexOf('{');
        int fin = texto.lastIndexOf('}');
        if (inicio < 0 || fin <= inicio) return null;
        try {
            JsonNode rescatado = json.readTree(texto.substring(inicio, fin + 1));
            return rescatado != null && rescatado.isObject() ? rescatado : null;
        } catch (IOException e) {
            return null;
        }
    }

    private Map<String, Object> formatoRespuesta(String nombre, Map<String, Object> esquema) {
        if (!esquemaEstricto) return Map.of("type", "json_object");
        return Map.of("type", "json_schema", "json_schema", Map.of(
                "name", nombre, "strict", true, "schema", esquema));
    }
}
