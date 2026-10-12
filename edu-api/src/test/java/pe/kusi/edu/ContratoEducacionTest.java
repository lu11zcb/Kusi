package pe.kusi.edu;

import org.junit.jupiter.api.Test;
import pe.kusi.edu.model.Seccion;
import static org.junit.jupiter.api.Assertions.*;

class ContratoEducacionTest {
    @Test void normalizaNombreDeSeccion() {
        Seccion seccion = new Seccion("  1ro    A  ", 1, 2026);
        assertEquals("1ro A", seccion.getNombre());
        assertEquals(1, seccion.getGrado());
        assertEquals(2026, seccion.getAnioEscolar());
    }
}
