package pe.kusi.movil

import android.app.Application
import androidx.compose.runtime.*
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AccesoViewModel(aplicacion: Application) : AndroidViewModel(aplicacion) {
    // HU13: la sesión se recuerda en el celular hasta cerrar sesión o que caduque.
    private val api = AccesoApi(BuildConfig.DJANGO_URL, BuildConfig.EDU_URL, AlmacenPreferencias(aplicacion))
    var cuenta by mutableStateOf<Cuenta?>(null); private set
    var ocupado by mutableStateOf(false); private set
    var mensaje by mutableStateOf<String?>(null); private set
    var validado by mutableStateOf(false); private set
    var iniciando by mutableStateOf(true); private set
    // Solo en memoria mientras se activa la cuenta: nunca preferencias o SavedState.
    private var claveTemporal = ""
    val claveTemporalDisponible get() = claveTemporal.isNotEmpty()
    init { ejecutar {
        try {
            cuenta = api.sesion(); validado = false
            if (cuenta?.temporal == false && cuenta?.roles?.contains("estudiante") == true) {
                api.validarEstudiante(); validado = true
            }
        } finally { iniciando = false }
    } }
    private fun ejecutar(tarea: () -> Unit) {
        if (ocupado) return
        ocupado = true; mensaje = null
        viewModelScope.launch {
            try { withContext(Dispatchers.IO) { tarea() } }
            catch (fallo: FalloAcceso) {
                mensaje = fallo.message
                if (fallo.estado == 401) { cuenta = null; validado = false; claveTemporal = "" }
                if (fallo.estado == 403) validado = false
            }
            catch (_: Exception) { mensaje = "No se pudo completar la operación. Vuelve a intentarlo." }
            finally { ocupado = false }
        }
    }
    fun ingresar(dni: String, contrasena: String, recordar: Boolean) = ejecutar {
        claveTemporal = ""
        api.recordar = recordar
        cuenta = api.ingresar(dni, contrasena); validado = false
        if (cuenta?.temporal == true) claveTemporal = contrasena
        if (cuenta?.temporal == false && cuenta?.roles?.contains("estudiante") == true) {
            api.validarEstudiante(); validado = true
        }
    }
    fun cambiar(actual: String, nueva: String, confirmacion: String) = ejecutar {
        cuenta = api.cambiar(actual.ifEmpty { claveTemporal }, nueva, confirmacion); validado = false
        claveTemporal = ""
        if (cuenta?.roles?.contains("estudiante") == true) { api.validarEstudiante(); validado = true }
    }
    fun comprobar() = ejecutar {
        cuenta = api.sesion()
        if (cuenta == null) throw FalloAcceso(401, "La sesión caducó. Vuelve a ingresar.")
        api.validarEstudiante(); validado = true
    }
    // El celular también deja de mostrar la cuenta si la salida falla por red.
    fun salir() = ejecutar { try { api.salir() } finally { cuenta = null; validado = false; claveTemporal = "" } }
    override fun onCleared() { claveTemporal = ""; super.onCleared() }
}
