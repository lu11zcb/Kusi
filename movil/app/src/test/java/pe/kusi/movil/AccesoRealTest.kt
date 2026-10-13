package pe.kusi.movil

import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test

/** Integración REAL contra un entorno local desechable con estudiantes de DNI 70000011 (definitiva) y 70000012 (temporal). */
class AccesoRealTest {
    private val api = AccesoApi("http://127.0.0.1:8000", "http://127.0.0.1:8080")
    @Before fun soloConEntornoExplicito() { assumeTrue(System.getProperty("kusi.integracion") == "true") }
    @Test fun ingreso_estudiante_validacion_spring_y_salida_real() {
        val cuenta = api.ingresar("70000011", "PruebaLocalSegura2026!")
        assertEquals(cuenta.id, api.validarEstudiante().id)
        assertEquals(cuenta.id, api.sesion()?.id)
        api.salir(); assertNull(api.sesion())
        try { api.validarEstudiante(); fail("Sesión cerrada") }
        catch (fallo: FalloAcceso) { assertEquals(401, fallo.estado) }
    }
    @Test fun temporal_cambio_y_permisos_reales() {
        assertTrue(api.ingresar("70000012", "PruebaLocalSegura2026!").temporal)
        try { api.validarEstudiante(); fail("Contraseña temporal") }
        catch (fallo: FalloAcceso) { assertEquals(403, fallo.estado) }
        assertFalse(api.cambiar("PruebaLocalSegura2026!", "NuevaMovilSegura2026!", "NuevaMovilSegura2026!").temporal)
        assertTrue(api.validarEstudiante().roles.contains("estudiante")); api.salir()
        // HU12: el DNI solo sirve para cuentas de estudiante.
        try { api.ingresar("79999999", "PruebaLocalSegura2026!"); fail("DNI inexistente") }
        catch (fallo: FalloAcceso) { assertEquals(401, fallo.estado) }
    }
}
