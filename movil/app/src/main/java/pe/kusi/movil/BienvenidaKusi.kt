package pe.kusi.movil

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.IconButton
import androidx.compose.material3.IconButtonDefaults
import androidx.compose.material3.IconToggleButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/*
 * Bienvenida de la app: la primera pantalla que ve el niño sin sesión, según el diseño
 * «Ajustes antes de programar»: marca y sonido arriba, Kusi al centro, título y botón verde.
 *
 * La escena avisa cuando termina el saludo para habilitar la entrada sin depender de otro reloj.
 */

// ---- Valores ajustables ----

private const val FRASE_BIENVENIDA = "¡Hola! Soy Kusi. Ven, vamos a la aventura."
private const val INVITACION_VOZ = "¡Vamos a jugar! Toca el botón verde."
/** Proporción de la escena de Kusi (360 × 330 unidades, la de KusiAnimado.kt). */
private const val PROPORCION_ESCENA = 360f / 330f
/** La ilustración no pasa de este ancho en tabletas, para que Kusi no se vea borroso. */
private val ANCHO_MAXIMO_ESCENA = 420.dp
/** En pantallas bajas la ilustración ocupa como mucho esta parte del alto disponible. */
private const val PARTE_DEL_ALTO_PARA_ESCENA = 0.52f

private const val PARTE_DEL_ALTO_PARA_PAISAJE = 0.75f
private val ALTO_MARCA = 86.dp
private val ANCHO_MAXIMO_BOTON = 408.dp

private val FondoBotonSonido = Color(0xFFFFF4D8)
private val BordeBotonSonido = Color(0xFFE5C58B)
private val TintaTitulo = Color(0xFF512C20)

@Composable
fun BienvenidaKusi(voz: VozKusi, entrar: () -> Unit) {
    val contexto = LocalContext.current
    val quieto = remember(contexto) { animacionesDesactivadas(contexto) }
    val preferencias = remember(contexto) { contexto.getSharedPreferences("kusi_mi_cuy", android.content.Context.MODE_PRIVATE) }
    var sonidoActivo by rememberSaveable { mutableStateOf(preferencias.getBoolean("efectos_bienvenida", true)) }
    val efectos = recordarEfectosBienvenida(sonidoActivo)
    var presentacionTerminada by remember { mutableStateOf(false) }
    var celebrando by remember { mutableStateOf(false) }
    BoxWithConstraints(Modifier.fillMaxSize().background(PapelAventura)) {
        val paisaje = Modifier.fillMaxWidth().height(maxHeight * PARTE_DEL_ALTO_PARA_PAISAJE)
        PaisajeKusi(paisaje)
        AmbienteBienvenida(paisaje)
        val anchoEscena = minOf(maxWidth - 40.dp, ANCHO_MAXIMO_ESCENA)
        val anchoMarca = (maxWidth - 142.dp).coerceAtLeast(100.dp)
        // La escena conserva su proporción y deja sitio al título y al botón sin desplazar.
        val altoEscena = minOf(anchoEscena / PROPORCION_ESCENA, maxHeight * PARTE_DEL_ALTO_PARA_ESCENA)
        // Arriba la marca, al centro Kusi y el título, abajo el botón. Con letra grande o pantalla
        // baja la columna se desplaza en vez de recortar.
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).heightIn(min = maxHeight)
            .padding(horizontal = 20.dp, vertical = 8.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.SpaceBetween) {
            Box(Modifier.fillMaxWidth().heightIn(min = ALTO_MARCA)) {
                PalabraKusi(Modifier.align(Alignment.Center).widthIn(max = anchoMarca))
                IconToggleButton(checked = sonidoActivo, onCheckedChange = {
                    sonidoActivo = it
                    preferencias.edit().putBoolean("efectos_bienvenida", it).apply()
                }, modifier = Modifier.align(Alignment.CenterStart).size(48.dp)
                    .border(1.4.dp, BordeBotonSonido, CircleShape),
                    colors = IconButtonDefaults.iconToggleButtonColors(containerColor = FondoBotonSonido,
                        checkedContainerColor = FondoBotonSonido)) {
                    IconoKusi(if (sonidoActivo) R.drawable.ic_aventura_musica else R.drawable.ic_aventura_musica_silencio,
                        if (sonidoActivo) "Silenciar efectos" else "Activar efectos", Modifier.size(25.dp), color = Color.Unspecified)
                }
                IconButton(onClick = { voz.hablar(if (presentacionTerminada) INVITACION_VOZ else FRASE_BIENVENIDA) },
                    enabled = !celebrando,
                    modifier = Modifier.align(Alignment.CenterEnd).size(48.dp)
                        .border(1.4.dp, BordeBotonSonido, CircleShape),
                    colors = IconButtonDefaults.iconButtonColors(containerColor = FondoBotonSonido)) {
                    IconoKusi(R.drawable.ic_aventura_voz, "Escuchar a Kusi", Modifier.size(25.dp), color = Color.Unspecified)
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                KusiAnimado(
                    hablando = voz.hablando,
                    invitando = presentacionTerminada && !celebrando, celebrando = celebrando,
                    alSonar = { if (!voz.hablando) efectos.sonar(it) },
                    alTerminarPresentacion = { presentacionTerminada = true },
                    alTerminarCelebracion = entrar,
                    modifier = Modifier.size(anchoEscena, altoEscena),
                )
                Spacer(Modifier.height(7.dp))
                Text("Ven, vamos a\nla aventura", style = MaterialTheme.typography.headlineLarge, color = TintaTitulo, textAlign = TextAlign.Center)
                BotonAventura(
                    habilitado = presentacionTerminada && !celebrando,
                    celebrando = celebrando, movimientoReducido = quieto,
                    entrar = {
                        if (!celebrando) {
                            voz.callar()
                            if (quieto) entrar() else celebrando = true
                        }
                    },
                    modifier = Modifier.padding(top = 22.dp).widthIn(max = ANCHO_MAXIMO_BOTON).fillMaxWidth(),
                )
            }
            Spacer(Modifier.height(12.dp))
        }
    }
}
