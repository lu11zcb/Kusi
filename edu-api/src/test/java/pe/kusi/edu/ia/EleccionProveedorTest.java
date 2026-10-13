package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.junit.jupiter.api.Assertions.*;

// Con GROQ_API_KEY se usa Groq; sin ella (o vacía) la IA queda como no configurada.
class EleccionProveedorTest {
    private final ApplicationContextRunner contexto = new ApplicationContextRunner()
        .withBean(ObjectMapper.class).withUserConfiguration(GeneradorNoConfigurado.class);

    @Test void sinClaveNoHayIa() {
        contexto.run(c -> assertFalse(c.getBean(GeneradorPropuestas.class).configurado()));
        contexto.withPropertyValues("GROQ_API_KEY=  ").run(c -> assertFalse(c.getBean(GeneradorPropuestas.class).configurado()));
    }

    @Test void conClaveUsaGroq() {
        contexto.withPropertyValues("GROQ_API_KEY=gsk_prueba").run(c -> {
            GeneradorPropuestas generador = c.getBean(GeneradorPropuestas.class);
            assertEquals("groq", generador.proveedor());
            assertEquals("llama-3.3-70b-versatile", generador.modelo());
        });
    }
}
