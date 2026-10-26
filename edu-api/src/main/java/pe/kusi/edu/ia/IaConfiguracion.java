package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.util.Map;
import java.util.Random;
import java.util.Set;

// Elige el proveedor de IA y arma las dos llamadas (la propuesta y el guion) con un
// solo adaptador, ClienteIa. Se configura con IA_URL, IA_CLAVE e IA_MODELO desde el
// .env local o el entorno; si no están, usa las variables GROQ_ que ya existían
// (GROQ_URL, GROQ_API_KEY y GROQ_MODELO), así lo que funciona en casa con Groq no se
// rompe. Con IA_ESQUEMA_ESTRICTO=true se exige el esquema JSON estricto también con
// modelos que no son de la lista de Groq (por ejemplo, el de Tecsup).
//
// Sin clave la IA queda «no configurada»: las solicitudes se guardan como
// pendientes y nunca se devuelve contenido ficticio.
@Configuration
public class IaConfiguracion {
    static final String URL_GROQ = "https://api.groq.com/openai/v1/chat/completions";
    static final String MODELO_GROQ = "openai/gpt-oss-120b";
    private static final String FIN_DEL_ENDPOINT = "/chat/completions";

    // Lo que resulta de leer el entorno. «proveedor» es un nombre corto para la
    // procedencia del guion: groq, o el servidor al que se llama.
    record Ajustes(String clave, String modelo, String url, boolean esquemaEstricto, String proveedor) {}

    static Ajustes leerAjustes(Environment entorno) {
        String clave = primero(texto(entorno, "IA_CLAVE"), texto(entorno, "GROQ_API_KEY"));
        String url = normalizarUrl(primero(texto(entorno, "IA_URL"), texto(entorno, "GROQ_URL"), URL_GROQ));
        String modelo = primero(texto(entorno, "IA_MODELO"), texto(entorno, "GROQ_MODELO"), MODELO_GROQ);
        String estricto = texto(entorno, "IA_ESQUEMA_ESTRICTO");
        boolean esquemaEstricto = estricto == null ? ClienteIa.esquemaEstrictoPorDefecto(modelo) : esAfirmativo(estricto);
        return new Ajustes(clave, modelo, url, esquemaEstricto, proveedorDe(url));
    }

    // Una dirección puede venir completa (…/chat/completions, como GROQ_URL) o solo
    // hasta la versión (…/v1, como la piden los clientes de OpenAI). En el segundo
    // caso se le agrega el final; cualquier otra se toma como el endpoint completo.
    static String normalizarUrl(String url) {
        String limpia = url.trim().replaceAll("/+$", "");
        if (limpia.endsWith(FIN_DEL_ENDPOINT)) return limpia;
        if (limpia.endsWith("/v1")) return limpia + FIN_DEL_ENDPOINT;
        return limpia;
    }

    static String proveedorDe(String url) {
        String servidor;
        try {
            servidor = URI.create(url).getHost();
        } catch (IllegalArgumentException e) {
            servidor = null;
        }
        if (servidor == null || servidor.isBlank()) return "ia";
        return servidor.contains("groq") ? "groq" : servidor;
    }

    @Bean @Conditional(ClavePresente.class)
    public ClienteIa clienteIa(Environment entorno, ObjectMapper json) {
        Ajustes ajustes = leerAjustes(entorno);
        return new ClienteIa(ajustes.clave(), ajustes.modelo(), ajustes.url(), ajustes.esquemaEstricto(), ajustes.proveedor(), json);
    }

    @Bean @Conditional(ClavePresente.class)
    public GeneradorPropuestas generadorPropuestas(ClienteIa cliente, ObjectMapper json) {
        return new GeneradorPropuestasIa(cliente, json);
    }

    @Bean @Conditional(ClavePresente.class)
    public GeneradorGuion generadorGuion(ClienteIa cliente, ObjectMapper json) {
        return new GeneradorGuionIa(cliente, json, new Random());
    }

    @Bean @Conditional(ClaveAusente.class)
    public GeneradorPropuestas generadorPropuestasAusente() {
        return new GeneradorPropuestas() {
            public boolean configurado() { return false; }
            public String proveedor() { return "ninguno"; }
            public String modelo() { return "ninguno"; }
            public Map<String, Object> generar(EntradaGeneracion entrada) throws FalloGeneracion {
                throw new FalloGeneracion("La generación con IA aún no está configurada.", false);
            }
        };
    }

    @Bean @Conditional(ClaveAusente.class)
    public GeneradorGuion generadorGuionAusente() {
        return new GeneradorGuion() {
            public boolean configurado() { return false; }
            public String proveedor() { return "ninguno"; }
            public String modelo() { return "ninguno"; }
            public JsonNode generarGuion(EntradaGuion entrada) throws FalloGeneracion {
                throw new FalloGeneracion("La generación con IA aún no está configurada.", false);
            }
        };
    }

    // Condición: hay una clave con texto, IA_CLAVE o, si no, GROQ_API_KEY.
    public static class ClavePresente implements Condition {
        public boolean matches(ConditionContext contexto, AnnotatedTypeMetadata metadatos) {
            return StringUtils.hasText(contexto.getEnvironment().getProperty("IA_CLAVE"))
                    || StringUtils.hasText(contexto.getEnvironment().getProperty("GROQ_API_KEY"));
        }
    }

    public static class ClaveAusente implements Condition {
        public boolean matches(ConditionContext contexto, AnnotatedTypeMetadata metadatos) {
            return !new ClavePresente().matches(contexto, metadatos);
        }
    }

    // El texto de una variable sin espacios alrededor, o null si no está o está vacía.
    private static String texto(Environment entorno, String nombre) {
        String valor = entorno.getProperty(nombre);
        return StringUtils.hasText(valor) ? valor.trim() : null;
    }

    private static String primero(String... valores) {
        for (String valor : valores) {
            if (valor != null) return valor;
        }
        return null;
    }

    private static boolean esAfirmativo(String valor) {
        return Set.of("true", "1", "si", "sí", "yes").contains(valor.toLowerCase());
    }
}
