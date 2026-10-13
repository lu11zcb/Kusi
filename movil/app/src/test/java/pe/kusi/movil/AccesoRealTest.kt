package pe.kusi.movil

import org.junit.Assert.*
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Test

/** Integración REAL contra el entorno desechable de scripts/comprobar_domingo.py --servir. */
class AccesoRealTest {
    private val api = AccesoApi("http://127.0.0.1:8000", "http://127.0.0.1:8080")
    @Before fun soloConEntornoExplicito() { assumeTrue(System.getProperty("kusi.integracion") == "true") }
    @Test fun ingreso_estudiante_validacion_spring_y_salida_real() {
        val cuenta = api.ingresar("qa-estudiante@example.com", "PruebaLocalSegura2026!")
        assertEquals(cuenta.id, api.validarEstudiante().id)
        assertEquals(cuenta.id, api.sesion()?.id)
        api.salir(); assertNull(api.sesion())
        try { api.validarEstudiante(); fail("Sesión cerrada") }
        catch (fallo: FalloAcceso) { assertEquals(401, fallo.estado) }
    }
    @Test fun temporal_cambio_y_permisos_reales() {
        assertTrue(api.ingresar("qa-temporal-movil@example.com", "PruebaLocalSegura2026!").temporal)
        try { api.validarEstudiante(); fail("Contraseña temporal") }
        catch (fallo: FalloAcceso) { assertEquals(403, fallo.estado) }
        assertFalse(api.cambiar("PruebaLocalSegura2026!", "NuevaMovilSegura2026!", "NuevaMovilSegura2026!").temporal)
        assertTrue(api.validarEstudiante().roles.contains("estudiante")); api.salir()
        api.ingresar("qa-admin@example.com", "PruebaLocalSegura2026!")
        try { api.validarEstudiante(); fail("Administrador sin rol estudiante") }
        catch (fallo: FalloAcceso) { assertEquals(403, fallo.estado) }
        api.salir()
    }
}
