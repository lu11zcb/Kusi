package pe.kusi.movil

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.rotate
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.zIndex
import kotlin.math.PI
import kotlin.math.sin

private const val SaludoIngreso = "¡Hola! Escribe tu DNI y tu contraseña. Después, toca Entrar."
private val TintaPanel = Color(0xFF533425)
private val BordePanel = Color(0xFFC0803B)

@Composable
internal fun IngresoInfantil(
    estado: EstadoEntradaKusi,
    voz: VozKusi,
    ingresar: (String, String, Boolean) -> Unit,
    volver: () -> Unit,
    ayuda: () -> Unit,
) {
    var dni by rememberSaveable { mutableStateOf("") }
    var pulsosDni by remember { mutableIntStateOf(0) }
    var clave by remember { mutableStateOf("") }
    var recordar by rememberSaveable { mutableStateOf(true) }
    var mostrarClave by remember { mutableStateOf(false) }
    var enDni by remember { mutableStateOf(false) }
    var enClave by remember { mutableStateOf(false) }
    var validarDni by rememberSaveable { mutableStateOf(false) }
    var validarClave by remember { mutableStateOf(false) }
    var ocultarError by remember(estado.mensaje, estado.ocupado) { mutableStateOf(false) }

    val contexto = LocalContext.current
    val quieto = remember(contexto) { animacionesDesactivadas(contexto) }
    val foco = LocalFocusManager.current
    val teclado = LocalSoftwareKeyboardController.current
    val focoDni = remember { FocusRequester() }
    val focoClave = remember { FocusRequester() }
    val listo = dni.length == 8 && clave.isNotEmpty()
    val mensaje = estado.mensaje?.takeUnless { ocultarError || estado.ocupado }
    val gesto = when {
        estado.ocupado -> GestoIngreso.REPOSO
        mostrarClave -> GestoIngreso.ESPIA
        enClave -> GestoIngreso.PRIVACIDAD
        enDni -> GestoIngreso.DNI
        else -> GestoIngreso.REPOSO
    }

    fun enviar() {
        if (estado.ocupado) return
        if (!listo) {
            validarDni = dni.length != 8
            validarClave = clave.isEmpty()
            if (validarDni) focoDni.requestFocus() else focoClave.requestFocus()
            return
        }
        foco.clearFocus()
        teclado?.hide()
        mostrarClave = false
        ingresar(dni, clave, recordar)
    }

    val papel = MaterialTheme.colorScheme.background
    BoxWithConstraints(Modifier.fillMaxSize().background(papel), contentAlignment = Alignment.TopCenter) {
        SenderoEnMovimiento(Modifier.matchParentSize(), papel, quieto)
        val altoCuy = (maxHeight * 0.285f).coerceIn(145.dp, 218.dp)
        Column(
            Modifier.widthIn(max = 454.dp).fillMaxSize().imePadding()
                .verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Box(Modifier.fillMaxWidth().height(56.dp), contentAlignment = Alignment.Center) {
                Box(Modifier.align(Alignment.CenterStart)) {
                    MandoIngreso(R.drawable.ic_ingreso_atras, "Volver", Color(0xFFFFF2CD), Color(0xFF985327)) {
                        voz.callar()
                        volver()
                    }
                }
                PalabraKusi(Modifier.size(142.dp, 54.dp))
                Box(Modifier.align(Alignment.CenterEnd)) {
                    MandoIngreso(
                        if (voz.hablando) R.drawable.ic_ingreso_silenciar else R.drawable.ic_ingreso_voz,
                        if (voz.hablando) "Dejar de escuchar a Kusi" else "Escuchar a Kusi",
                        if (voz.hablando) Color(0xFFC7E99E) else Color(0xFFE4F5D2),
                        Color(0xFF36654A),
                    ) {
                        if (voz.hablando) voz.callar() else voz.hablar(SaludoIngreso)
                    }
                }
            }

            Column(
                Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(-SolapePanelIngreso),
            ) {
                CuyDeIngreso(Modifier.size(altoCuy).zIndex(1f), gesto, pulsosDni, estado.ocupado, quieto)
                Surface(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(topStart = 34.dp, topEnd = 34.dp, bottomEnd = 29.dp, bottomStart = 29.dp),
                    color = Color(0xFFFFF8E9),
                    contentColor = TintaPanel,
                    border = BorderStroke(2.5.dp, BordePanel),
                    shadowElevation = 7.dp,
                ) {
                    Column(Modifier.padding(horizontal = 16.dp, vertical = 13.dp)) {
                        TituloPanelIngreso()
                        Spacer(Modifier.height(12.dp))
                        OutlinedTextField(
                            value = dni,
                            onValueChange = {
                                val numeros = it.filter { numero -> numero in '0'..'9' }.take(8)
                                if (numeros != dni) pulsosDni++
                                dni = numeros
                                ocultarError = true
                            },
                            label = { Text("Mi DNI") },
                            leadingIcon = { IconoKusi(R.drawable.ic_student, modifier = Modifier.size(22.dp)) },
                            supportingText = {
                                Text(if (validarDni && dni.length != 8) "Escribe los 8 números de tu DNI."
                                    else "Los 8 números de tu DNI")
                            },
                            singleLine = true,
                            enabled = !estado.ocupado,
                            isError = validarDni && dni.length != 8,
                            shape = RoundedCornerShape(19.dp),
                            colors = coloresCampoIngreso(),
                            textStyle = MaterialTheme.typography.titleMedium,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Next),
                            keyboardActions = KeyboardActions(onNext = {
                                validarDni = dni.length != 8
                                if (!validarDni) focoClave.requestFocus()
                            }),
                            modifier = Modifier.fillMaxWidth().focusRequester(focoDni).onFocusChanged {
                                if (enDni && !it.isFocused && dni.isNotEmpty()) validarDni = true
                                enDni = it.isFocused
                            },
                        )
                        OutlinedTextField(
                            value = clave,
                            onValueChange = { clave = it; ocultarError = true },
                            label = { Text("Mi contraseña") },
                            leadingIcon = { IconoKusi(R.drawable.ic_kusi_key, modifier = Modifier.size(22.dp)) },
                            trailingIcon = {
                                IconButton(onClick = { mostrarClave = !mostrarClave }, enabled = !estado.ocupado,
                                    modifier = Modifier.size(48.dp)) {
                                    IconoKusi(
                                        if (mostrarClave) R.drawable.ic_eye_slash else R.drawable.ic_eye,
                                        if (mostrarClave) "Ocultar Mi contraseña" else "Mostrar Mi contraseña",
                                    )
                                }
                            },
                            supportingText = if (validarClave && clave.isEmpty()) {
                                { Text("Escribe la contraseña que te dio tu profe.") }
                            } else null,
                            singleLine = true,
                            enabled = !estado.ocupado,
                            isError = validarClave && clave.isEmpty(),
                            shape = RoundedCornerShape(19.dp),
                            colors = coloresCampoIngreso(),
                            textStyle = MaterialTheme.typography.titleMedium,
                            visualTransformation = if (mostrarClave) VisualTransformation.None else PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                            keyboardActions = KeyboardActions(onDone = { enviar() }),
                            modifier = Modifier.fillMaxWidth().focusRequester(focoClave)
                                .onFocusChanged { enClave = it.isFocused },
                        )
                        Row(
                            Modifier.fillMaxWidth().heightIn(min = 48.dp).toggleable(
                                recordar, role = Role.Checkbox, enabled = !estado.ocupado, onValueChange = { recordar = it },
                            ),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(recordar, onCheckedChange = null, enabled = !estado.ocupado)
                            Spacer(Modifier.width(8.dp))
                            Text("Recordarme en este celular", style = MaterialTheme.typography.bodyMedium)
                        }
                        if (mensaje != null) {
                            AvisoKusi(mensaje, error = true)
                            Spacer(Modifier.height(12.dp))
                        }
                        Spacer(Modifier.height(4.dp))
                        BotonAventura(
                            habilitado = listo && !estado.ocupado,
                            celebrando = false,
                            movimientoReducido = quieto,
                            entrar = ::enviar,
                            modifier = Modifier.fillMaxWidth(),
                            texto = if (estado.ocupado) "Entrando…" else "Entrar",
                        )
                        if (estado.ocupado) {
                            Spacer(Modifier.height(9.dp))
                            LinearProgressIndicator(Modifier.fillMaxWidth())
                        }
                    }
                }
            }
            BotonAyudaIngreso(ayuda)
        }
    }
}

@Composable
private fun SenderoEnMovimiento(modifier: Modifier, papel: Color, quieto: Boolean) {
    val fase = if (quieto) null else rememberInfiniteTransition(label = "brisa-en-el-sendero").animateFloat(
        0f, 1f, infiniteRepeatable(tween(16000, easing = LinearEasing)), label = "hojas-del-fondo",
    )
    Box(modifier.clipToBounds()) {
        Image(painterResource(R.drawable.kusi_sendero_ingreso), null,
            Modifier.matchParentSize().graphicsLayer {
                if (!quieto) {
                    val aire = (fase?.value ?: 0f) * 2 * PI
                    scaleX = 1.045f
                    scaleY = 1.045f
                    translationX = sin(aire).toFloat() * 4.dp.toPx()
                    translationY = sin(aire + 0.9).toFloat() * 5.dp.toPx()
                }
            }, contentScale = ContentScale.Crop)
        Spacer(Modifier.matchParentSize().background(Brush.verticalGradient(
            0f to papel,
            0.17f to papel.copy(alpha = 0.12f),
            0.35f to papel.copy(alpha = 0f),
            0.75f to papel.copy(alpha = 0f),
            1f to papel,
        )))
        if (fase != null) {
            val arte = ImageBitmap.imageResource(R.drawable.kusi_ramas_ingreso)
            Canvas(Modifier.matchParentSize()) {
                repeat(3) { indice ->
                    val tiempo = (fase.value + 0.34f * indice) % 1f
                    val lateral = if (indice == 1) 0.91f else 0.08f
                    val centro = Offset(size.width * (lateral + 0.042f * sin(tiempo * 3 * PI).toFloat()),
                        size.height * (0.13f + tiempo * 0.65f))
                    val lado = (31 - indice * 4).dp.toPx()
                    rotate(35f + 130f * tiempo, pivot = centro) {
                        dibujarHojaIngreso(arte, 3, centro - Offset(lado, lado) / 2f, lado,
                            alpha = sin(tiempo * PI).toFloat() * 0.56f)
                    }
                }
            }
        }
    }
}

@Composable
private fun TituloPanelIngreso() {
    Text(
        "¡Vamos a entrar!",
        Modifier.fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp, bottomStart = 17.dp, bottomEnd = 17.dp))
            .background(Color(0xFFE6F1C8)).padding(horizontal = 16.dp, vertical = 8.dp)
            .semantics { heading() },
        color = Color(0xFF345336), style = MaterialTheme.typography.headlineLarge, textAlign = TextAlign.Center,
    )
}

private val TintaAyudaIngreso = Color(0xFF375845)
private val PapelAyudaIngreso = Color(0xFFFFFAEB)

@Composable
private fun BotonAyudaIngreso(abrir: () -> Unit) {
    Surface(
        onClick = abrir,
        modifier = Modifier.padding(top = 12.dp, bottom = 8.dp).widthIn(max = 285.dp).fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        color = PapelAyudaIngreso,
        contentColor = TintaAyudaIngreso,
        border = BorderStroke(1.5.dp, Color(0xFFA3AD6D)),
        shadowElevation = 2.dp,
    ) {
        Row(
            Modifier.heightIn(min = 54.dp).padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            InsigniaAyudaIngreso(Modifier.size(34.dp))
            Text("Necesito ayuda", Modifier.weight(1f), style = MaterialTheme.typography.titleMedium)
            IconoKusi(R.drawable.ic_arrow_right, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun InsigniaAyudaIngreso(modifier: Modifier) {
    Box(modifier.background(Color(0xFFE6F1C8), CircleShape), contentAlignment = Alignment.Center) {
        IconoKusi(R.drawable.ic_chat_circle_text, modifier = Modifier.fillMaxSize(0.62f), color = TintaAyudaIngreso)
    }
}

@Composable
internal fun AyudaDelIngreso(texto: String, voz: VozKusi, cerrar: () -> Unit) {
    fun salir() {
        voz.callar()
        cerrar()
    }
    AlertDialog(
        onDismissRequest = ::salir,
        shape = RoundedCornerShape(29.dp),
        containerColor = PapelAyudaIngreso,
        titleContentColor = TintaAyudaIngreso,
        textContentColor = TintaPanel,
        icon = { InsigniaAyudaIngreso(Modifier.size(58.dp)) },
        title = { Text("Kusi te ayuda", style = MaterialTheme.typography.headlineSmall) },
        text = { Text(texto, style = MaterialTheme.typography.bodyLarge) },
        confirmButton = {
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Button(
                    onClick = ::salir,
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color(0xFF327648), contentColor = PapelAyudaIngreso,
                    ),
                ) { Text("¡Entendido!") }
                OutlinedButton(
                    onClick = { if (voz.hablando) voz.callar() else voz.hablar(texto) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = TintaAyudaIngreso),
                ) { Text(if (voz.hablando) "Detener" else "Escuchar") }
            }
        },
    )
}

@Composable
private fun coloresCampoIngreso() = OutlinedTextFieldDefaults.colors(
    focusedTextColor = TintaPanel,
    unfocusedTextColor = TintaPanel,
    focusedContainerColor = Color(0xFFF3F8E6),
    unfocusedContainerColor = Color(0xFFFFFCF5),
    focusedBorderColor = Color(0xFF39804C),
    unfocusedBorderColor = Color(0xFFB79C74),
    focusedLabelColor = Color(0xFF34613B),
    unfocusedLabelColor = Color(0xFF6D5342),
    unfocusedSupportingTextColor = Color(0xFF6D5342),
    focusedSupportingTextColor = Color(0xFF6D5342),
)

@Composable
internal fun MandoIngreso(icono: Int, descripcion: String, fondo: Color, tinta: Color, pulsar: () -> Unit) {
    Surface(
        onClick = pulsar,
        modifier = Modifier.size(50.dp),
        shape = RoundedCornerShape(18.dp),
        color = fondo,
        contentColor = tinta,
        border = BorderStroke(2.dp, tinta),
        shadowElevation = 3.dp,
    ) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Icon(painterResource(icono), descripcion, Modifier.size(27.dp))
        }
    }
}
