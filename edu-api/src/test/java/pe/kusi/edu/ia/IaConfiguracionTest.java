package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.junit.jupiter.api.Assertions.*;

// Con IA_CLAVE (o, si no está, GROQ_API_KEY) hay IA; sin ninguna de las dos (o vacías)
// queda como no configurada. IA_URL, IA_CLAVE e IA_MODELO mandan sobre las GROQ_.
class IaConfiguracionTest {
    private final ApplicationContextRunner contexto = new ApplicationContextRunner()
        .withBean(ObjectMapper.class).withUserConfiguration(IaConfiguracion.class);

    @Test void sinClaveNoHayIa() {
        contexto.run(c -> {
            assertFalse(c.getBean(GeneradorPropuestas.class).configurado());
            assertFalse(c.getBean(GeneradorGuion.class).configurado());
            assertEquals(0, c.getBeansOfType(ClienteIa.class).size());
        });
        contexto.withPropertyValues("GROQ_API_KEY=  ", "IA_CLAVE=").run(c -> {
            assertFalse(c.getBean(GeneradorPropuestas.class).configurado());
            assertFalse(c.getBean(GeneradorGuion.class).configurado());
        });
    }

    @Test void sinClaveElGeneradorDelGuionNoInventaNada() {
        contexto.run(c -> {
            FalloGeneracion fallo = assertThrows(FalloGeneracion.class,
                () -> c.getBean(GeneradorGuion.class).generarGuion(null));
            assertTrue(fallo.getMessage().contains("no está configurada"));
        });
    }

    @Test void conClaveDeGroqUsaGroqParaLasDosLlamadas() {
        contexto.withPropertyValues("GROQ_API_KEY=gsk_prueba").run(c -> {
            GeneradorPropuestas propuestas = c.getBean(GeneradorPropuestas.class);
            GeneradorGuion guion = c.getBean(GeneradorGuion.class);
            assertTrue(propuestas.configurado());
            assertTrue(guion.configurado());
            assertEquals("groq", propuestas.proveedor());
            assertEquals("openai/gpt-oss-120b", propuestas.modelo());
            assertEquals("groq", guion.proveedor());
            assertEquals("openai/gpt-oss-120b", guion.modelo());
            // Los modelos gpt-oss de Groq usan el esquema estricto sin pedirlo.
            assertTrue(c.getBean(ClienteIa.class).esquemaEstricto());
        });
    }

    @Test void lasVariablesGroqAnterioresSiguenFuncionando() {
        contexto.withPropertyValues("GROQ_API_KEY=gsk_prueba", "GROQ_MODELO=llama-3.3-70b-versatile").run(c -> {
            assertEquals("llama-3.3-70b-versatile", c.getBean(GeneradorPropuestas.class).modelo());
            assertFalse(c.getBean(ClienteIa.class).esquemaEstricto());
        });
    }

    @Test void lasVariablesIaMandanSobreLasDeGroq() {
        contexto.withPropertyValues("GROQ_API_KEY=gsk_prueba", "GROQ_MODELO=otro-de-groq",
            "IA_CLAVE=clave-de-tecsup", "IA_URL=https://ia.tecsup.test/v1", "IA_MODELO=Qwen/Qwen3.6-35B-A3B-FP8",
            "IA_ESQUEMA_ESTRICTO=true").run(c -> {
            GeneradorGuion guion = c.getBean(GeneradorGuion.class);
            assertEquals("Qwen/Qwen3.6-35B-A3B-FP8", guion.modelo());
            assertEquals("ia.tecsup.test", guion.proveedor());
            assertEquals("Qwen/Qwen3.6-35B-A3B-FP8", c.getBean(GeneradorPropuestas.class).modelo());
            assertTrue(c.getBean(ClienteIa.class).esquemaEstricto());
        });
    }

    @Test void conSoloIaClaveSeUsanLosValoresDeGroqPorOmision() {
        contexto.withPropertyValues("IA_CLAVE=clave-sola", "IA_URL=", "IA_MODELO=  ").run(c -> {
            assertEquals("groq", c.getBean(GeneradorGuion.class).proveedor());
            assertEquals("openai/gpt-oss-120b", c.getBean(GeneradorGuion.class).modelo());
        });
    }

    @Test void elEsquemaEstrictoSeFuerzaOSeApagaConLaVariable() {
        contexto.withPropertyValues("IA_CLAVE=x", "IA_MODELO=cualquier-modelo", "IA_ESQUEMA_ESTRICTO=true")
            .run(c -> assertTrue(c.getBean(ClienteIa.class).esquemaEstricto()));
        contexto.withPropertyValues("IA_CLAVE=x", "IA_MODELO=openai/gpt-oss-20b", "IA_ESQUEMA_ESTRICTO=false")
            .run(c -> assertFalse(c.getBean(ClienteIa.class).esquemaEstricto()));
        contexto.withPropertyValues("IA_CLAVE=x", "IA_MODELO=cualquier-modelo")
            .run(c -> assertFalse(c.getBean(ClienteIa.class).esquemaEstricto()));
    }

    @Test void laDireccionPuedeVenirCompletaOSoloHastaLaVersion() {
        String completa = "https://api.groq.com/openai/v1/chat/completions";
        assertEquals(completa, IaConfiguracion.normalizarUrl(completa));
        assertEquals(completa, IaConfiguracion.normalizarUrl(completa + "/"));
        assertEquals("https://ia.tecsup.test/v1/chat/completions", IaConfiguracion.normalizarUrl("https://ia.tecsup.test/v1"));
        assertEquals("https://ia.tecsup.test/v1/chat/completions", IaConfiguracion.normalizarUrl(" https://ia.tecsup.test/v1/ "));
        // Cualquier otra dirección se toma como el endpoint completo.
        assertEquals("https://ia.tecsup.test/api/chat", IaConfiguracion.normalizarUrl("https://ia.tecsup.test/api/chat"));
    }

    @Test void elProveedorSeNombraPorSuServidor() {
        assertEquals("groq", IaConfiguracion.proveedorDe("https://api.groq.com/openai/v1/chat/completions"));
        assertEquals("ia.tecsup.test", IaConfiguracion.proveedorDe("https://ia.tecsup.test/v1/chat/completions"));
        assertEquals("ia", IaConfiguracion.proveedorDe("esto no es una direccion"));
    }
}
