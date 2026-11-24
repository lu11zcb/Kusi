package pe.kusi.movil

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.window.DialogProperties
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            TemaKusi {
                AccesoPantalla()
                AvisoInicialMicrofono()
            }
        }
    }
}

@Composable
private fun AvisoInicialMicrofono() {
    val contexto = LocalContext.current
    val preferencias = remember(contexto) {
        contexto.getSharedPreferences("kusi_inicio", Context.MODE_PRIVATE)
    }
    var mostrarAviso by remember(preferencias) {
        mutableStateOf(
            !preferencias.getBoolean("aviso_microfono_atendido", false) &&
                contexto.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
        )
    }
    val solicitarMicrofono = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    if (!mostrarAviso) return

    fun cerrarAviso() {
        // Recordamos que la familia atendió el aviso, incluso si Android recibe una negativa.
        // El juego consulta el permiso real para respetar cualquier cambio posterior en Ajustes.
        preferencias.edit().putBoolean("aviso_microfono_atendido", true).apply()
        mostrarAviso = false
    }

    AlertDialog(
        onDismissRequest = ::cerrarAviso,
        properties = DialogProperties(dismissOnClickOutside = false),
        text = { Text("Kusi te pedirá decir algunas palabras en voz alta. Tu voz no se graba ni se guarda.") },
        confirmButton = {
            TextButton(onClick = {
                cerrarAviso()
                solicitarMicrofono.launch(Manifest.permission.RECORD_AUDIO)
            }) { Text("Continuar") }
        },
        dismissButton = {
            TextButton(onClick = ::cerrarAviso) { Text("Seguir sin micrófono") }
        }
    )
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
        logros = modelo.logros, recargarLogros = modelo::cargarLogros,
        cierre = modelo.cierre, reintentarGuardado = modelo::reenviarAvisosJuego,
        alVerMision = modelo::marcarAventuraVista,
        contenidoJuego = { aventura, finalizar, volver ->
            JuegoLaberinto(aventura, modelo::registrarAvisoJuego, finalizar, volver,
                preparar = modelo::prepararJuego, guardarPausa = modelo::guardarPausaJuego)
        })
}
