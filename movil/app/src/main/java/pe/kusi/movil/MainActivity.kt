package pe.kusi.movil

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.LifecycleResumeEffect
import androidx.lifecycle.viewmodel.compose.viewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF196447))) { AccesoPantalla() } }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AccesoPantalla(modelo: AccesoViewModel = viewModel()) {
    var dni by remember { mutableStateOf("") }
    var recordar by remember { mutableStateOf(true) }
    var contrasena by remember { mutableStateOf("") }
    var actual by remember { mutableStateOf("") }
    var nueva by remember { mutableStateOf("") }
    var confirmacion by remember { mutableStateOf("") }
    val cuenta = modelo.cuenta
    LifecycleResumeEffect(cuenta?.id) {
        if (cuenta != null && !cuenta.temporal && cuenta.roles.contains("estudiante")) modelo.comprobar()
        onPauseOrDispose { }
    }
    LaunchedEffect(cuenta?.id, cuenta?.temporal) { contrasena = ""; actual = ""; nueva = ""; confirmacion = "" }
    Scaffold(topBar = { TopAppBar(title = { Text("Kusi") }) }) { margen ->
        Column(Modifier.fillMaxSize().padding(margen).imePadding().verticalScroll(rememberScrollState()).padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Text(if (cuenta == null) "Acceso de estudiante" else if (cuenta.temporal) "Cambia tu contraseña temporal" else "Hola, " + cuenta.nombre,
                style = MaterialTheme.typography.headlineSmall)
            if (cuenta == null) {
                Text("Ingresa con tu DNI y la contraseña que te dio tu docente.")
                OutlinedTextField(dni, { dni = it.filter(Char::isDigit).take(8) }, label = { Text("DNI") }, singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), enabled = !modelo.ocupado, modifier = Modifier.fillMaxWidth())
                Clave(contrasena, { contrasena = it }, "Contraseña", !modelo.ocupado)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = recordar, onCheckedChange = { recordar = it }, enabled = !modelo.ocupado)
                    Text("Recordar mi sesión en este celular")
                }
                Button(onClick = { modelo.ingresar(dni, contrasena, recordar); contrasena = "" },
                    enabled = !modelo.ocupado && dni.length == 8 && contrasena.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("Ingresar") }
            } else if (cuenta.temporal) {
                Text("Elige una contraseña nueva para continuar. Si la olvidas, avisa a tu docente.")
                Clave(actual, { actual = it }, "Contraseña actual", !modelo.ocupado)
                Clave(nueva, { nueva = it }, "Nueva contraseña", !modelo.ocupado)
                Clave(confirmacion, { confirmacion = it }, "Repite la nueva contraseña", !modelo.ocupado)
                Button(onClick = { modelo.cambiar(actual, nueva, confirmacion); actual = ""; nueva = ""; confirmacion = "" },
                    enabled = !modelo.ocupado && actual.isNotEmpty() && nueva.isNotEmpty() && confirmacion.isNotEmpty(), modifier = Modifier.fillMaxWidth()) { Text("Guardar contraseña") }
            } else if (!cuenta.roles.contains("estudiante")) {
                Text("Esta aplicación requiere una cuenta de estudiante. Para administración o docencia, usa la web.")
            } else {
                Text(if (modelo.validado) "Tu acceso está validado. Las actividades estarán disponibles en una próxima entrega." else "Comprueba tu acceso para continuar.")
                OutlinedButton(onClick = { modelo.comprobar() }, enabled = !modelo.ocupado) { Text("Comprobar acceso") }
            }
            if (modelo.ocupado) { LinearProgressIndicator(modifier = Modifier.fillMaxWidth()); Text("Comprobando…") }
            modelo.mensaje?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            if (cuenta != null) OutlinedButton(onClick = { modelo.salir() }, enabled = !modelo.ocupado) { Text("Cerrar sesión") }
        }
    }
}

@Composable
private fun Clave(valor: String, cambiar: (String) -> Unit, etiqueta: String, habilitado: Boolean) {
    OutlinedTextField(valor, cambiar, label = { Text(etiqueta) }, singleLine = true, visualTransformation = PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), enabled = habilitado, modifier = Modifier.fillMaxWidth())
}
