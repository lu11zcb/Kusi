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
    // Solo los juegos «listos» de la sección del estudiante. Sin juegos, la pantalla
    // dice «Tu profe te avisará» y ofrece buscar de nuevo: no hay un juego de ejemplo.
    var biblioteca by mutableStateOf(EstadoBibliotecaInfantil()); private set
    var cierre by mutableStateOf(EstadoCierreInfantil()); private set
    private val registroJuego = RegistroAvisosJuego()
    private var propietarioBiblioteca: String? = null
    private var partidaActual: String? = null
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
            finally {
                ocupado = false
                val id = cuenta?.id
                if (validado && id != null && propietarioBiblioteca != id) cargarBiblioteca()
                if (id == null) { propietarioBiblioteca = null; biblioteca = EstadoBibliotecaInfantil(); registroJuego.limpiar(); partidaActual = null; cierre = EstadoCierreInfantil() }
            }
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
    fun cargarBiblioteca() {
        if (!validado || biblioteca.cargando) return
        val propietario = cuenta?.id ?: return
        propietarioBiblioteca = propietario
        biblioteca = biblioteca.copy(cargando = true, error = null)
        viewModelScope.launch {
            try {
                val juegos = withContext(Dispatchers.IO) { api.juegosDePrueba() }
                if (cuenta?.id == propietario) biblioteca = EstadoBibliotecaInfantil(juegos.map {
                    AventuraInfantil(it.id, it.titulo, "Juego de tu clase", "Practica con Kusi.", "Escucha la consigna al entrar.", paquete = it.paquete)
                })
            } catch (_: Exception) {
                if (cuenta?.id == propietario) biblioteca = EstadoBibliotecaInfantil(error = "No se pudieron cargar los juegos de tu clase. Vuelve a intentarlo.")
            }
        }
    }

    fun registrarAvisoJuego(aviso: org.json.JSONObject) {
        if (!validado) return
        val partida = aviso.optString("partida")
        if (partidaActual != partida) { partidaActual = partida; cierre = EstadoCierreInfantil() }
        registroJuego.agregar(aviso)
        if (aviso.optString("tipo") == "fin") cierre = cierre.copy(total = aviso.optInt("niveles", 3))
        reenviarAvisosJuego()
    }

    fun reenviarAvisosJuego() {
        val propietario = cuenta?.id ?: return
        cierre = cierre.copy(guardando = true, error = null, guardado = false)
        viewModelScope.launch {
            try {
                val resumen = withContext(Dispatchers.IO) { registroJuego.vaciar { aviso ->
                    // Un trabajo pendiente nunca usa las cookies de otra cuenta.
                    if (cuenta?.id != propietario) throw IllegalStateException("La sesión de esta partida cambió.")
                    api.guardarAvisoJuego(aviso)
                } }
                if (cuenta?.id == propietario && resumen != null && resumen.optString("partida") == partidaActual) {
                    cierre = cierre.copy(completados = resumen.optInt("niveles_completados"), guardando = registroJuego.cantidadPendientes() > 0,
                        guardado = resumen.optBoolean("termino") && registroJuego.cantidadPendientes() == 0)
                }
            } catch (_: Exception) {
                if (cuenta?.id == propietario) cierre = cierre.copy(guardando = false, error = "Quedó avance por guardar. Puedes volver a enviarlo.", guardado = false)
            }
        }
    }
    override fun onCleared() { claveTemporal = ""; super.onCleared() }
}
