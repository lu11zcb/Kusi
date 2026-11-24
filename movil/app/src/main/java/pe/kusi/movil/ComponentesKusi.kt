package pe.kusi.movil

import android.speech.tts.TextToSpeech
import androidx.compose.animation.core.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.draw.clip
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun IconoKusi(recurso: Int, descripcion: String? = null, modifier: Modifier = Modifier, color: Color = LocalContentColor.current) {
    Icon(painterResource(recurso), descripcion, modifier.size(28.dp), tint = color)
}
@Composable
fun BotonKusi(texto: String, alPulsar: () -> Unit, modifier: Modifier = Modifier, habilitado: Boolean = true, icono: Int? = null, secundario: Boolean = false, compacto: Boolean = false) {
    val interaccion = remember { MutableInteractionSource() }
    val pulsado by interaccion.collectIsPressedAsState()
    val relieve = if (compacto) 4.dp else 6.dp
    val hundimiento by animateFloatAsState(if (pulsado && habilitado) relieve.value else 0f, spring(dampingRatio = .68f, stiffness = 900f), label = "boton-con-relieve")
    val tacto = LocalHapticFeedback.current
    val colores = MaterialTheme.colorScheme
    val fondo = if (secundario) colores.secondaryContainer else colores.primaryContainer
    val tinta = if (secundario) colores.onSecondaryContainer else colores.onPrimaryContainer
    val base = if (!habilitado) colores.outlineVariant else if (secundario) colores.secondary.copy(alpha = .55f) else Color(0xFF176B34)
    // La base permanece fija y solo baja la cara pulsable. Button conserva sus roles, foco y bloqueo nativos.
    Box(modifier.padding(bottom = relieve)) {
        Box(Modifier.matchParentSize().offset(y = relieve).background(base, MaterialTheme.shapes.medium))
        Button(onClick = { tacto.performHapticFeedback(HapticFeedbackType.LongPress); alPulsar() }, enabled = habilitado,
            interactionSource = interaccion, modifier = Modifier.fillMaxWidth().heightIn(min = if (compacto) 48.dp else 60.dp).offset(y = hundimiento.dp),
            colors = ButtonDefaults.buttonColors(containerColor = fondo, contentColor = tinta, disabledContainerColor = colores.surfaceVariant, disabledContentColor = colores.onSurfaceVariant),
            border = BorderStroke(1.5.dp, if (habilitado) tinta.copy(alpha = .10f) else colores.outlineVariant),
            elevation = null, shape = MaterialTheme.shapes.medium, contentPadding = PaddingValues(horizontal = if (compacto) 12.dp else 16.dp, vertical = if (compacto) 8.dp else 12.dp)) {
            if (icono != null) {
                Box(Modifier.size(if (compacto) 28.dp else 34.dp).background(tinta.copy(alpha = .10f), CircleShape), contentAlignment = Alignment.Center) { IconoKusi(icono, modifier = Modifier.size(23.dp)) }
                Spacer(Modifier.width(10.dp))
            }
            Text(texto, style = MaterialTheme.typography.titleLarge, textAlign = TextAlign.Center, modifier = Modifier.weight(1f, fill = false))
        }
    }
}
/** Respuesta breve al tocar: nunca anima de forma continua ni exige perseguir un botón. */
@Composable
fun CuyInteractivo(voz: VozKusi, modifier: Modifier = Modifier, mensaje: String = "¡Hola! Soy Kusi. ¡Vamos a descubrir una aventura juntos!", recurso: Int = R.drawable.kusi_guia) {
    val giro = remember { Animatable(0f) }
    val salto = remember { Animatable(0f) }
    val scope = rememberCoroutineScope()
    val tacto = LocalHapticFeedback.current
    Image(painterResource(recurso), "Toca a Kusi para saludar", contentScale = if (recurso == R.drawable.kusi_guia) ContentScale.Fit else ContentScale.Crop, modifier =
        modifier.graphicsLayer { rotationZ = giro.value; translationY = salto.value; scaleX = 1f + (-salto.value / 500f); scaleY = scaleX }
            .clickable(role = androidx.compose.ui.semantics.Role.Button, onClickLabel = "Saludar a Kusi") {
                voz.hablar(mensaje)
                tacto.performHapticFeedback(HapticFeedbackType.LongPress)
                scope.launch { giro.snapTo(-7f); giro.animateTo(0f, spring(.35f, 300f)) }
                scope.launch { salto.snapTo(-12f); salto.animateTo(0f, spring(.4f, 300f)) }
            })
}
@Composable
fun MarcaKusi(modifier: Modifier = Modifier) {
    Row(modifier, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        EmblemaKusi(Modifier.size(44.dp))
        Text("Kusi", style = MaterialTheme.typography.headlineLarge, color = MaterialTheme.colorScheme.primary)
    }
}
@Composable
fun BotonIconoKusi(icono: Int, descripcion: String, alPulsar: () -> Unit) {
    FilledTonalIconButton(onClick = alPulsar, modifier = Modifier.padding(horizontal = 6.dp).size(48.dp),
        shape = MaterialTheme.shapes.medium,
        colors = IconButtonDefaults.filledTonalIconButtonColors(containerColor = MaterialTheme.colorScheme.tertiaryContainer, contentColor = MaterialTheme.colorScheme.onTertiaryContainer)) {
        IconoKusi(icono, descripcion, Modifier.size(26.dp))
    }
}
@Composable
fun coloresCampoKusi() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = MaterialTheme.colorScheme.tertiaryContainer.copy(alpha = .22f),
    unfocusedContainerColor = MaterialTheme.colorScheme.background.copy(alpha = .7f),
    focusedBorderColor = MaterialTheme.colorScheme.primary,
    unfocusedBorderColor = MaterialTheme.colorScheme.outlineVariant,
    focusedLabelColor = MaterialTheme.colorScheme.primary,
    unfocusedLabelColor = MaterialTheme.colorScheme.onSurfaceVariant)
@Composable
fun CampoClaveKusi(valor: String, cambiar: (String) -> Unit, etiqueta: String, habilitado: Boolean = true) {
    var visible by remember { mutableStateOf(false) }
    OutlinedTextField(value = valor, onValueChange = cambiar, label = { Text(etiqueta) }, singleLine = true,
        visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password), enabled = habilitado, shape = MaterialTheme.shapes.medium,
        colors = coloresCampoKusi(), textStyle = MaterialTheme.typography.titleMedium,
        trailingIcon = { IconButton(onClick = { visible = !visible }, enabled = habilitado, modifier = Modifier.size(56.dp)) { IconoKusi(if (visible) R.drawable.ic_eye_slash else R.drawable.ic_eye, if (visible) "Ocultar $etiqueta" else "Mostrar $etiqueta") } }, modifier = Modifier.fillMaxWidth())
}
@Composable
fun AvisoKusi(texto: String, error: Boolean = false) {
    val colores = MaterialTheme.colorScheme
    Surface(color = if (error) colores.errorContainer else colores.tertiaryContainer, contentColor = if (error) colores.onErrorContainer else colores.onTertiaryContainer,
        shape = MaterialTheme.shapes.medium, modifier = Modifier.fillMaxWidth().semantics { liveRegion = LiveRegionMode.Polite }) {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            IconoKusi(R.drawable.ic_info)
            Text(texto, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1f))
        }
    }
}
@Composable
fun TarjetaKusi(modifier: Modifier = Modifier, contenido: @Composable ColumnScope.() -> Unit) {
    Surface(modifier, color = MaterialTheme.colorScheme.surface, shape = MaterialTheme.shapes.large,
        border = BorderStroke(2.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.padding(22.dp), verticalArrangement = Arrangement.spacedBy(16.dp), content = contenido)
    }
}
/**
 * Voz de Kusi. [hablando] es verdadero solo mientras el teléfono está pronunciando una frase:
 * lo usa la animación de Rive para mover la boca de Kusi al mismo tiempo que se oye la voz.
 */
data class VozKusi(val disponible: Boolean, val hablar: (String) -> Unit, val callar: () -> Unit = {}, val hablando: Boolean = false)
@Composable
fun recordarVozKusi(avisar: (String) -> Unit): VozKusi {
    val contexto = LocalContext.current
    val preferencias = remember(contexto) { contexto.getSharedPreferences("kusi_mi_cuy", android.content.Context.MODE_PRIVATE) }
    var lista by remember { mutableStateOf(false) }
    var hablando by remember { mutableStateOf(false) }
    var fraseActiva by remember { mutableStateOf<String?>(null) }
    var numeroFrase by remember { mutableLongStateOf(0L) }
    val motor = remember { mutableStateOf<TextToSpeech?>(null) }
    val avisoActual by rememberUpdatedState(avisar)
    DisposableEffect(contexto) {
        var cerrado = false
        // El motor de voz avisa desde otro hilo; el estado de la pantalla se cambia en el principal.
        val principal = android.os.Handler(android.os.Looper.getMainLooper())
        fun marcar(id: String?, valor: Boolean) {
            principal.post {
                if (!cerrado && id != null && id == fraseActiva) {
                    hablando = valor
                    if (!valor) fraseActiva = null
                }
            }
        }
        val instancia = TextToSpeech(contexto) { estado ->
            if (!cerrado && estado == TextToSpeech.SUCCESS) {
                val idioma = motor.value?.setLanguage(Locale.forLanguageTag("es-PE")) ?: TextToSpeech.LANG_NOT_SUPPORTED
                lista = idioma >= TextToSpeech.LANG_AVAILABLE
                motor.value?.setSpeechRate(0.88f)
            }
        }
        // Empieza a hablar al sonar la primera sílaba y termina al acabar, al fallar o al callarla.
        instancia.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
            override fun onStart(id: String?) = marcar(id, true)
            override fun onDone(id: String?) = marcar(id, false)
            override fun onStop(id: String?, interrumpida: Boolean) = marcar(id, false)
            @Deprecated("Requerido por versiones antiguas de Android")
            override fun onError(id: String?) = marcar(id, false)
            override fun onError(id: String?, codigo: Int) = marcar(id, false)
        })
        motor.value = instancia
        onDispose {
            cerrado = true
            lista = false
            fraseActiva = null
            hablando = false
            instancia.stop()
            instancia.shutdown()
            motor.value = null
        }
    }
    return VozKusi(lista, hablando = hablando, hablar = hablar@{ texto ->
        if (!preferencias.getBoolean("voz", true)) return@hablar
        val id = "frase-kusi-${++numeroFrase}"
        fraseActiva = id
        hablando = false
        if (!lista || motor.value?.speak(texto, TextToSpeech.QUEUE_FLUSH, null, id) != TextToSpeech.SUCCESS) {
            fraseActiva = null
            avisoActual("La voz no está disponible en este celular. También puedes leer la ayuda.")
        }
    }, callar = {
        fraseActiva = null
        hablando = false
        motor.value?.stop()
    })
}
