package pe.kusi.edu.ia;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
import java.time.Duration;
import java.util.*;

// Proveedor real de IA: Groq (API compatible con OpenAI). Se activa solo si existe
// GROQ_API_KEY en el .env local o en el entorno; la clave nunca se sube al repositorio.
public class GeneradorGroq implements GeneradorPropuestas {
    private static final Duration TIEMPO_MAXIMO = Duration.ofSeconds(60);
    private final String clave, modelo, url;
    private final ObjectMapper json;
    private final HttpClient cliente = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public GeneradorGroq(String clave, String modelo, String url, ObjectMapper json) {
        this.clave=clave; this.modelo=modelo; this.url=url; this.json=json;
    }

    public boolean configurado() { return true; }
    public String proveedor() { return "groq"; }
    public String modelo() { return modelo; }

    public Map<String,Object> generar(EntradaGeneracion entrada) throws FalloGeneracion {
        String cuerpo;
        try {
            cuerpo=json.writeValueAsString(Map.of(
                "model", modelo,
                "temperature", 0.7,
                "response_format", Map.of("type", "json_object"),
                "messages", List.of(
                    Map.of("role", "system", "content", INSTRUCCIONES),
                    Map.of("role", "user", "content", pedido(entrada)))));
        } catch (IOException e) { throw new FalloGeneracion("No se pudo preparar el pedido a la IA.", false); }
        HttpRequest pedido=HttpRequest.newBuilder(URI.create(url)).timeout(TIEMPO_MAXIMO)
            .header("Authorization", "Bearer " + clave).header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(cuerpo)).build();
        HttpResponse<String> respuesta;
        try { respuesta=cliente.send(pedido, HttpResponse.BodyHandlers.ofString()); }
        catch (HttpTimeoutException e) { throw new FalloGeneracion("La IA tardó demasiado en responder.", true); }
        catch (IOException e) { throw new FalloGeneracion("No se pudo conectar con la IA.", false); }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new FalloGeneracion("Se interrumpió la conexión con la IA.", false); }
        int estado=respuesta.statusCode();
        if (estado == 401 || estado == 403) throw new FalloGeneracion("La clave de Groq no es válida. Revisa GROQ_API_KEY en tu .env.", false);
        if (estado == 429) throw new FalloGeneracion("La IA recibió demasiadas solicitudes. Espera un momento.", false);
        if (estado < 200 || estado >= 300) throw new FalloGeneracion("La IA respondió con un error (" + estado + ").", false);
        try {
            JsonNode contenido=json.readTree(respuesta.body()).path("choices").path(0).path("message").path("content");
            if (!contenido.isTextual()) throw new FalloGeneracion("La IA devolvió una propuesta incompleta o no válida.", false);
            return json.readValue(contenido.asText(), new TypeReference<Map<String,Object>>() {});
        } catch (IOException e) { throw new FalloGeneracion("La IA devolvió una propuesta incompleta o no válida.", false); }
    }

    private String pedido(EntradaGeneracion e) throws IOException {
        StringBuilder texto=new StringBuilder();
        texto.append("Curso: ").append(e.cursoNombre()).append("\nGrado: ").append(e.grado()).append("° de primaria");
        if (e.seccionNombre() != null) texto.append("\nSección: ").append(e.seccionNombre());
        texto.append("\nTema: ").append(e.tema());
        texto.append("\nObjetivo: ").append(e.objetivoDocente() == null ? "propón uno adecuado al tema y al grado" : e.objetivoDocente());
        if (e.proposito() != null) texto.append("\nPropósito del juego: ").append(e.proposito());
        if (e.instrucciones() != null) texto.append("\nInstrucciones del docente: ").append(e.instrucciones());
        if ("observaciones".equals(e.tipo())) {
            texto.append("\n\nAjusta esta propuesta según las observaciones del docente, sin cambiar lo que no menciona.");
            texto.append("\nPropuesta actual: ").append(json.writeValueAsString(e.propuestaBase()));
            texto.append("\nObservaciones: ").append(e.observaciones());
        } else if ("alternativa".equals(e.tipo())) {
            texto.append("\n\nEl docente rechazó esta propuesta. Crea una alternativa claramente distinta.");
            texto.append("\nPropuesta rechazada: ").append(json.writeValueAsString(e.propuestaBase()));
            if (e.observaciones() != null) texto.append("\nMotivo: ").append(e.observaciones());
        }
        return texto.toString();
    }

    private static final String INSTRUCCIONES = """
        Eres el asistente de Kusi, una app de juegos para niños de primer grado de primaria en Perú. Propones un juego a partir del tema del docente. La propuesta la lee el docente: escribe corto, en español sencillo y sin palabras técnicas.

        Kusi sabe hacer dos juegos 2D. Propón uno de ellos:
        - El mercado (Matemática): Kusi, un cuy, le da al niño su lista de compras y 15 soles. El niño camina por una plaza, compra en puestos donde venden animales de los Andes, paga con billetes y monedas, revisa su vuelto y ayuda a los vendedores con favores: contar, sumar, restar, completar hasta 10 y comparar precios. Al final, Kusi cocina con lo que trajo.
        - El juego de ordenar (cualquier curso): el niño pone en orden escenas o pasos, por ejemplo una receta, cómo crece una planta, las partes de un cuento o la rutina del día.
        Si el tema no encaja en ninguno de los dos, propón el que más se acerque y dilo en la historia.

        Responde solo con un objeto JSON con estas claves:
        - "objetivo": una sola oración que empieza con «Los niños aprenderán a».
        - "historia": 2 o 3 oraciones cortas: qué juego es y qué pasa en él.
        - "acciones": lo que hace el niño.
        - "reglas": cómo funciona el juego.
        - "retos": los desafíos o favores del juego.
        - "ayudas": pistas que guían al niño.
        - "recursos": los dibujos que usa el juego.
        Cada lista tiene 2 o 3 textos cortos.

        Reglas:
        - No hay cuenta regresiva, ni vidas, ni corazones: equivocarse no termina el juego.
        - Ninguna ayuda dice la respuesta.
        - En "recursos" usa solo nombres de esta lista. Si para el tema hace falta un dibujo que no está, escribe «Falta dibujar:» y qué falta.
          Puestos: pan, frutas, verduras, granja, granos, dulces.
          Vendedores: llama, alpaca, vicuña, vizcacha, zorro, cóndor, gallito de las rocas, oso de anteojos, cuy, perro, gato, paloma, oveja, loro.
          Productos: pan, harina, galleta, avena, alfajor, manzana, fresa, plátano, mango, piña, uva, naranja, papaya, mandarina, granadilla, lúcuma, aguaymanto, papa, choclo, zanahoria, tomate, cebolla, palta, camote, zapallo, huevo, leche, queso, yogur, mantequilla, arroz, quinua, azúcar, sal, fideos, maíz morado, chocolate, caramelo, miel, mermelada, chupetín.
        - No uses nombres de niños ni datos personales.
        """;

    // Condición para crear este proveedor: hay una GROQ_API_KEY con texto.
    public static class ClavePresente implements Condition {
        public boolean matches(ConditionContext contexto, AnnotatedTypeMetadata metadatos) {
            return StringUtils.hasText(contexto.getEnvironment().getProperty("GROQ_API_KEY"));
        }
    }

    public static class ClaveAusente implements Condition {
        public boolean matches(ConditionContext contexto, AnnotatedTypeMetadata metadatos) {
            return !new ClavePresente().matches(contexto, metadatos);
        }
    }
}
