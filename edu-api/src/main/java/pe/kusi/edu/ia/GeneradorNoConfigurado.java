package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import java.util.Map;

// Elige el proveedor de IA. Con GROQ_API_KEY en el .env se usa Groq; sin ella las
// solicitudes se guardan como "pendiente" y nunca se devuelve contenido ficticio.
@Configuration
public class GeneradorNoConfigurado {
    @Bean @Conditional(GeneradorGroq.ClavePresente.class)
    public GeneradorPropuestas generadorGroq(@Value("${GROQ_API_KEY}") String clave,
                                             @Value("${GROQ_MODELO:llama-3.3-70b-versatile}") String modelo,
                                             @Value("${GROQ_URL:https://api.groq.com/openai/v1/chat/completions}") String url,
                                             ObjectMapper json) {
        return new GeneradorGroq(clave.trim(), modelo, url, json);
    }

    @Bean @Conditional(GeneradorGroq.ClaveAusente.class)
    public GeneradorPropuestas generadorPropuestas() {
        return new GeneradorPropuestas() {
            public boolean configurado() { return false; }
            public String proveedor() { return "ninguno"; }
            public String modelo() { return "ninguno"; }
            public Map<String,Object> generar(EntradaGeneracion entrada) throws FalloGeneracion {
                throw new FalloGeneracion("La generación con IA aún no está configurada.", false);
            }
        };
    }
}
