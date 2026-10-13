package pe.kusi.movil

import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class AccesoViewModel : ViewModel() {
    private val api = AccesoApi(BuildConfig.DJANGO_URL, BuildConfig.EDU_URL)
    var cuenta by mutableStateOf<Cuenta?>(null); private set
    var ocupado by mutableStateOf(false); private set
    var mensaje by mutableStateOf<String?>(null); private set
    var validado by mutableStateOf(false); private set
    init { ejecutar { cuenta = api.sesion(); validado = false } }
    private fun ejecutar(tarea: () -> Unit) {
        if (ocupado) return
        ocupado = true; mensaje = null
        viewModelScope.launch {
            try { withContext(Dispatchers.IO) { tarea() } }
            catch (fallo: FalloAcceso) {
                mensaje = fallo.message
                if (fallo.estado == 401) { cuenta = null; validado = false }
                if (fallo.estado == 403) validado = false
            }
            catch (_: Exception) { mensaje = "No se pudo completar la operación. Vuelve a intentarlo." }
            finally { ocupado = false }
        }
    }
    fun ingresar(correo: String, contrasena: String) = ejecutar {
        cuenta = api.ingresar(correo, contrasena); validado = false
        if (cuenta?.temporal == false && cuenta?.roles?.contains("estudiante") == true) {
            api.validarEstudiante(); validado = true
        }
    }
    fun cambiar(actual: String, nueva: String, confirmacion: String) = ejecutar {
        cuenta = api.cambiar(actual, nueva, confirmacion); validado = false
        if (cuenta?.roles?.contains("estudiante") == true) { api.validarEstudiante(); validado = true }
    }
    fun comprobar() = ejecutar {
        cuenta = api.sesion()
        if (cuenta == null) throw FalloAcceso(401, "La sesión caducó. Vuelve a ingresar.")
        api.validarEstudiante(); validado = true
    }
    fun salir() = ejecutar { api.salir(); cuenta = null; validado = false }
}
