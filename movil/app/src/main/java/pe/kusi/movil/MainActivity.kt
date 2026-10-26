package pe.kusi.movil

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { TemaKusi { AccesoPantalla() } }
    }
}
@Composable
fun AccesoPantalla(modelo: AccesoViewModel = viewModel()) {
    val cuenta = modelo.cuenta
    LifecycleResumeEffect(cuenta?.id) {
        if (cuenta != null && !cuenta.temporal && cuenta.roles.contains("estudiante")) modelo.comprobar()
        onPauseOrDispose { }
    }
    AplicacionInfantil(EstadoEntradaKusi(cuenta, modelo.ocupado, modelo.mensaje, modelo.validado, modelo.iniciando, modelo.claveTemporalDisponible),
        ingresar = modelo::ingresar, cambiarClave = modelo::cambiar, comprobar = modelo::comprobar, salir = modelo::salir,
        biblioteca = modelo.biblioteca, reintentarBiblioteca = modelo::cargarBiblioteca,
        cierre = modelo.cierre, reintentarGuardado = modelo::reenviarAvisosJuego,
        contenidoJuego = { aventura, finalizar, volver ->
            JuegoLaberinto(aventura, modelo::registrarAvisoJuego, finalizar, volver)
        })
}
