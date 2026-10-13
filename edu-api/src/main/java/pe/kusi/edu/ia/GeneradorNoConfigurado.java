package pe.kusi.edu.ia;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.Map;

// Estado por defecto: sin proveedor. Las solicitudes se guardan como "pendiente"
// y nunca se devuelve contenido ficticio. El adaptador real se registra como otro
// bean GeneradorPropuestas cuando Luis elija proveedor/modelo y configure su clave.
@Configuration
public class GeneradorNoConfigurado {
    @Bean @ConditionalOnMissingBean(GeneradorPropuestas.class)
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
