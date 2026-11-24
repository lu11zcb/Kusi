package pe.kusi.movil

import android.content.Context
import android.provider.Settings
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.graphics.drawscope.clipRect
import androidx.compose.ui.graphics.drawscope.rotateRad
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/*
 * Kusi animado para la bienvenida, dibujado con Compose.
 *
 * DibujoKusi dibuja el fotograma completo. Aquí se definen los apoyos de las patas
 * y cuándo reaccionan el libro y los números.
 *
 * Las plataformas, los saltos y el saludo comparten un reloj para que el botón se habilite
 * al terminar la presentación. Las cosquillas tienen sus propios tiempos para poder responder
 * durante el recorrido sin cortarlo.
 */

// ---- Valores ajustables ----

private const val ANCHO_ESCENA = 360f
private const val ALTO_ESCENA = 330f

/** Salida fuerte para respuestas; los saltos usan arcos con puntos de apoyo fijos. */
private val SalidaFuerte = CubicBezierEasing(0.23f, 1f, 0.32f, 1f)
private val VaivenSuave = CubicBezierEasing(0.42f, 0f, 0.58f, 1f)

private class Apoyo(val pies: Offset, val escala: Float)

private val Partida = Apoyo(Offset(125f, 187f), 0.52f)
private val Numeros = Apoyo(Offset(229f, 164f), 0.57f)
private val Libro = Apoyo(Offset(244f, 248f), 0.66f)
private val Frente = Apoyo(Offset(128f, 296f), 0.84f)

private const val MS_PREPARACION = 224
private const val LLEGA_A_NUMEROS = 540
private const val SALE_DE_NUMEROS = 800
private const val LLEGA_A_LIBRO = 1158
private const val SALE_DE_LIBRO = 1428
private const val LLEGA_AL_FRENTE = 1850
private const val EMPIEZA_SALUDO = LLEGA_AL_FRENTE + 144
private const val MS_SALUDO = 560
private const val FIN_PRESENTACION = EMPIEZA_SALUDO + MS_SALUDO

private const val ARCO_A_NUMEROS = 26f
private const val ARCO_A_LIBRO = 44f
private const val ARCO_AL_FRENTE = 48f
private const val ALTURA_BRINCO = 20f
private val CentroBloques = Offset(308f, 160f)
private val CentroLibro = Offset(315f, 247f)
private val PlataformaNumeros = Offset(270f, 164f)
private val PlataformaLibro = Offset(287f, 250f)
private val MundoNumeros = ColoresPortal(Color(0xFF223A64), Color(0xFF128EAA), Color(0xFF9DFFF2))
private val MundoLibro = ColoresPortal(Color(0xFF3A235B), Color(0xFF8654D3), Color(0xFFFFCFFA))

private const val MS_REACCION = 456
private const val MS_INVITACION = 2960
internal const val MS_CELEBRACION_KUSI = 600
private const val MS_HOJITAS = 290
private const val MS_HOJITAS_QUIETAS = 150L

private val Oro = Color(0xFFF5B42E)
private val VerdeHoja = Color(0xFF6FAE57)
private val VerdeHojaClaro = Color(0xFF7DBB63)
private val ColoresPapelitos = listOf(Oro, Color(0xFFF76C63), Color(0xFF1BC4AA), Color(0xFF9A69C8))
private val SombraKusi = Color(0x2E6B4423)
private val SonidosDePresentacion = listOf(
    MS_PREPARACION to SonidoKusi.IMPULSO,
    LLEGA_A_NUMEROS to SonidoKusi.NUMEROS,
    SALE_DE_NUMEROS to SonidoKusi.IMPULSO,
    LLEGA_A_LIBRO to SonidoKusi.LIBRO,
    SALE_DE_LIBRO to SonidoKusi.IMPULSO,
    LLEGA_AL_FRENTE to SonidoKusi.LLEGADA,
)

/** Una clave de animación: en [ms] vale [valor]; el tramo que empieza aquí usa [curva]. */
private class Clave(val ms: Float, val valor: Float, val curva: Easing = LinearEasing)

private fun interpolar(t: Float, claves: Array<Clave>): Float {
    if (t <= claves.first().ms) return claves.first().valor
    for (i in 0 until claves.size - 1) {
        val a = claves[i]
        val b = claves[i + 1]
        if (t <= b.ms) return a.valor + (b.valor - a.valor) * a.curva.transform((t - a.ms) / (b.ms - a.ms))
    }
    return claves.last().valor
}

// Las plataformas ceden al aterrizar. Los bloques y el libro se mecen sobre su apoyo.
private val IMPACTO = arrayOf(Clave(0f, 0f, SalidaFuerte), Clave(45f, 1f, SalidaFuerte), Clave(145f, 0f))
private val BAMBOLEO = arrayOf(Clave(0f, 0f), Clave(40f, -1f), Clave(90f, 0.48f, SalidaFuerte), Clave(170f, 0f))
private val SALTO_LIBRO = arrayOf(Clave(0f, 0f, SalidaFuerte), Clave(58f, 1f, SalidaFuerte), Clave(208f, 0f))

private val DESTELLOS_SALUDO = arrayOf(Clave(0f, 0f, SalidaFuerte), Clave(124f, 1f, VaivenSuave), Clave(223f, 0.66f, VaivenSuave),
    Clave(323f, 1f, VaivenSuave), Clave(424f, 0.70f, SalidaFuerte), Clave(MS_SALUDO.toFloat(), 0f))
private val BRINCO_ALTURA = arrayOf(Clave(65f, 0f, SalidaFuerte), Clave(155f, ALTURA_BRINCO, VaivenSuave), Clave(285f, 0f))
private val CELEBRACION_ALTURA = arrayOf(Clave(81f, 0f, SalidaFuerte), Clave(233f, 35f, VaivenSuave),
    Clave(433f, 0f))

private enum class ReaccionKusi { BRINCO, RISA, SOMBRERO }

private class ToqueKusi(val posicion: Offset?)

@Composable
internal fun KusiAnimado(
    hablando: Boolean,
    invitando: Boolean,
    celebrando: Boolean,
    alSonar: (SonidoKusi) -> Unit,
    alTerminarPresentacion: () -> Unit,
    alTerminarCelebracion: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val contexto = LocalContext.current
    val quieto = remember { animacionesDesactivadas(contexto) }
    val saltos = ImageBitmap.imageResource(HojaKusi.SALTOS.recurso)
    val gestos = ImageBitmap.imageResource(HojaKusi.GESTOS.recurso)
    val intermedios = ImageBitmap.imageResource(HojaKusi.INTERMEDIOS.recurso)
    val espera = ImageBitmap.imageResource(HojaKusi.ESPERA.recurso)
    val apunta = ImageBitmap.imageResource(HojaKusi.INVITACION.recurso)
    val pilaNumeros = ImageBitmap.imageResource(R.drawable.kusi_pila_numeros)
    val piezaLibro = ImageBitmap.imageResource(R.drawable.kusi_libro_aventura)
    val marcoPortal = ImageBitmap.imageResource(R.drawable.kusi_marco_portal)
    val portalReloj = if (quieto) {
        null
    } else {
        rememberInfiniteTransition(label = "portales").animateFloat(
            initialValue = 0f, targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(4200, easing = LinearEasing)),
            label = "luz-de-los-portales",
        )
    }
    val final = FIN_PRESENTACION.toFloat()
    val relojPresentacion = remember { Animatable(if (quieto) final else 0f) }
    val terminar by rememberUpdatedState(alTerminarPresentacion)
    val entrar by rememberUpdatedState(alTerminarCelebracion)
    val sonar by rememberUpdatedState(alSonar)
    LaunchedEffect(Unit) {
        if (!quieto) {
            var siguiente = 0
            relojPresentacion.animateTo(final, tween(FIN_PRESENTACION, easing = LinearEasing)) {
                // No se repiten sonidos atrasados si la app vuelve del segundo plano.
                while (siguiente < SonidosDePresentacion.size && value >= SonidosDePresentacion[siguiente].first) {
                    val (tiempo, sonido) = SonidosDePresentacion[siguiente++]
                    if (value - tiempo < 85f) sonar(sonido)
                }
            }
        }
        terminar()
    }
    val relojInvitacion = if (invitando && !quieto) {
        rememberInfiniteTransition(label = "gestos-de-kusi").animateFloat(
            0f, MS_INVITACION.toFloat(),
            infiniteRepeatable(tween(MS_INVITACION, easing = LinearEasing)), label = "invitar-con-las-patas",
        )
    } else {
        null
    }
    val relojFiesta = remember { Animatable(0f) }
    LaunchedEffect(celebrando) {
        if (celebrando) {
            sonar(SonidoKusi.COSQUILLAS)
            relojFiesta.animateTo(MS_CELEBRACION_KUSI.toFloat(), tween(MS_CELEBRACION_KUSI, easing = LinearEasing))
            entrar()
        }
    }

    val vozKusi = remember { Animatable(0f) }
    LaunchedEffect(hablando, quieto) {
        if (quieto) return@LaunchedEffect
        if (!hablando) {
            vozKusi.animateTo(0f, tween(90, easing = SalidaFuerte))
            return@LaunchedEffect
        }
        while (true) {
            vozKusi.animateTo(1f, tween(93, easing = SalidaFuerte))
            vozKusi.animateTo(0.15f, tween(108, easing = VaivenSuave))
        }
    }

    val relojHojas = remember { Animatable(1f) }
    val relojReaccion = remember { Animatable(0f) }
    val silueta = remember { SiluetaKusi() }
    var toque by remember { mutableStateOf<ToqueKusi?>(null) }
    var reaccion by remember { mutableStateOf<ReaccionKusi?>(null) }
    var siguienteReaccion by remember { mutableIntStateOf(0) }
    val alcance = rememberCoroutineScope()
    LaunchedEffect(toque, celebrando) {
        if (toque == null || celebrando) return@LaunchedEffect

        // Cada toque mueve las hojitas. La reacción del cuy termina antes de iniciar otra.
        if (!quieto && relojPresentacion.value == final && reaccion == null) {
            reaccion = ReaccionKusi.entries[siguienteReaccion]
            siguienteReaccion = (siguienteReaccion + 1) % ReaccionKusi.entries.size
            alcance.launch {
                try {
                    sonar(SonidoKusi.COSQUILLAS)
                    relojReaccion.snapTo(0f)
                    relojReaccion.animateTo(MS_REACCION.toFloat(), tween(MS_REACCION, easing = LinearEasing))
                } finally {
                    reaccion = null
                }
            }
        }
        if (quieto) {
            sonar(SonidoKusi.COSQUILLAS)
            relojHojas.snapTo(0.18f)
            delay(MS_HOJITAS_QUIETAS)
            relojHojas.snapTo(1f)
        } else {
            relojHojas.snapTo(0f)
            relojHojas.animateTo(1f, tween(MS_HOJITAS, easing = LinearEasing))
        }
    }

    Canvas(modifier.tocarSiluetaKusi(silueta, "Kusi te saluda", "Hacerle cosquillas a Kusi",
        habilitado = !celebrando) { toque = ToqueKusi(it) }) {
        val escala = minOf(size.width / ANCHO_ESCENA, size.height / ALTO_ESCENA)
        val margen = Offset((size.width - ANCHO_ESCENA * escala) / 2f, (size.height - ALTO_ESCENA * escala) / 2f)
        val tiempo = relojPresentacion.value
        val pose = posturaEnPresentacion(tiempo)
        val respuesta = reaccion
        val desdeToque = relojReaccion.value
        val festejo = relojFiesta.value
        val invitacion = relojInvitacion?.value
        val alturaDelBrinco = when {
            celebrando -> interpolar(festejo, CELEBRACION_ALTURA)
            respuesta == ReaccionKusi.BRINCO -> interpolar(desdeToque, BRINCO_ALTURA)
            else -> 0f
        }
        val aire = pose.altura + alturaDelBrinco
        val pies = pose.apoyo.pies - Offset(0f, aire)
        val escalaKusi = pose.apoyo.escala
        val saludo = interpolar(tiempo - EMPIEZA_SALUDO, DESTELLOS_SALUDO)
        val fotograma = when {
            celebrando && festejo < 81f -> FotogramaKusi.CELEBRA_IMPULSO
            celebrando && festejo < 433f -> FotogramaKusi.CELEBRA_AIRE
            celebrando -> FotogramaKusi.CELEBRA_CAIDA
            respuesta != null -> fotogramaReaccion(respuesta, desdeToque)
            invitacion != null -> invitar(invitacion)
            else -> pose.fotograma
        }
        val hoja = when (fotograma.hoja) {
            HojaKusi.SALTOS -> saltos
            HojaKusi.GESTOS -> gestos
            HojaKusi.INTERMEDIOS -> intermedios
            HojaKusi.ESPERA -> espera
            HojaKusi.INVITACION -> apunta
        }

        translate(margen.x, margen.y) {
            scale(escala, escala, pivot = Offset.Zero) {
                clipRect(0f, 0f, ANCHO_ESCENA, ALTO_ESCENA) {
                    val desdeNumeros = tiempo - LLEGA_A_NUMEROS
                    val desdeLibro = tiempo - LLEGA_A_LIBRO
                    val impactoNumeros = interpolar(desdeNumeros, IMPACTO)
                    val impactoLibro = interpolar(desdeLibro, IMPACTO)
                    val luz = portalReloj?.value ?: 0f
                    dibujarPortal(PlataformaNumeros, 161, marcoPortal, MundoNumeros, luz, impactoNumeros, desdeNumeros)
                    dibujarPortal(PlataformaLibro, 143, marcoPortal, MundoLibro, luz + 0.28f, impactoLibro, desdeLibro)
                    dibujarBloques(interpolar(desdeNumeros, BAMBOLEO), impactoNumeros, pilaNumeros)
                    dibujarLibro(interpolar(desdeLibro, SALTO_LIBRO), impactoLibro, piezaLibro)

                    dibujarSombra(pose.sombra.pies, pose.sombra.escala, aire, pose.intensidadSombra)
                    val avanceToque = desdeToque / MS_REACCION
                    val balanceo = when {
                        celebrando -> 0f
                        respuesta == ReaccionKusi.RISA ->
                            0.049f * sin(avanceToque * 8f * PI.toFloat()) * sin(avanceToque * PI.toFloat())
                        respuesta == ReaccionKusi.SOMBRERO -> -0.066f * sin(avanceToque * PI.toFloat())
                        invitacion != null -> 0.014f * sin(invitacion / MS_INVITACION * 2f * PI.toFloat())
                        tiempo < final && !quieto ->
                            0.033f * sin(relojHojas.value * PI.toFloat() * 2f) * (1f - relojHojas.value)
                        else -> 0f
                    }
                    val giro = 0.025f * vozKusi.value + balanceo
                    val escalaDibujo = escala * escalaKusi
                    silueta.actualizar(hoja, fotograma, margen + pies * escala,
                        Size(TamanoDibujoKusi.width * escalaDibujo, TamanoDibujoKusi.height * escalaDibujo),
                        giro, pose.miraIzquierda)
                    rotateRad(giro, pivot = pies) {
                        dibujarKusi(hoja, pies, escalaKusi, fotograma, pose.miraIzquierda)
                    }
                    dibujarDestellos(0.85f * saludo, 0.84f + 0.12f * saludo)
                    if (celebrando) dibujarPapelitos(pose.apoyo.pies - Offset(0f, 127f), festejo)

                    val posicionHojas = toque?.posicion?.let { (it - margen) / escala }
                        ?: (pies - Offset(48f * escalaKusi, 85f * escalaKusi))
                    dibujarHojitas(posicionHojas, relojHojas.value)
                }
            }
        }
    }
}

private class Postura(
    val apoyo: Apoyo,
    val fotograma: FotogramaKusi = FotogramaKusi.REPOSO,
    val miraIzquierda: Boolean = false,
    val altura: Float = 0f,
    val sombra: Apoyo = apoyo,
    val intensidadSombra: Float = 1f,
)

private fun posturaEnPresentacion(tiempo: Float): Postura {
    return when {
        tiempo < MS_PREPARACION -> prepararSalto(Partida, Numeros, tiempo / MS_PREPARACION)
        tiempo < LLEGA_A_NUMEROS -> salto(tiempo, MS_PREPARACION, LLEGA_A_NUMEROS, Partida, Numeros, ARCO_A_NUMEROS)
        tiempo < SALE_DE_NUMEROS -> entreSaltos(tiempo, LLEGA_A_NUMEROS, SALE_DE_NUMEROS, Partida, Numeros, Libro)
        tiempo < LLEGA_A_LIBRO -> salto(tiempo, SALE_DE_NUMEROS, LLEGA_A_LIBRO, Numeros, Libro, ARCO_A_LIBRO)
        tiempo < SALE_DE_LIBRO -> entreSaltos(tiempo, LLEGA_A_LIBRO, SALE_DE_LIBRO, Numeros, Libro, Frente)
        tiempo < LLEGA_AL_FRENTE -> salto(tiempo, SALE_DE_LIBRO, LLEGA_AL_FRENTE, Libro, Frente, ARCO_AL_FRENTE)
        tiempo < EMPIEZA_SALUDO -> aterrizaje(Frente, tiempo - LLEGA_AL_FRENTE, miraIzquierda = true)
        else -> saludar(tiempo - EMPIEZA_SALUDO)
    }
}

private fun entreSaltos(tiempo: Float, llegada: Int, salida: Int, origen: Apoyo, apoyo: Apoyo, siguiente: Apoyo): Postura {
    val desdeLaLlegada = tiempo - llegada
    if (desdeLaLlegada < 116f) return aterrizaje(apoyo, desdeLaLlegada, siguienteALaIzquierda(origen, apoyo))
    // La compresión de la plataforma sigue su curso mientras Kusi prepara el siguiente salto.
    val apoyoActual = apoyoDuranteImpacto(apoyo, desdeLaLlegada)
    return prepararSalto(apoyoActual, siguiente, (desdeLaLlegada - 116f) / (salida - llegada - 116f))
}

private fun siguienteALaIzquierda(origen: Apoyo, destino: Apoyo): Boolean = destino.pies.x < origen.pies.x

private fun prepararSalto(apoyo: Apoyo, destino: Apoyo, avance: Float): Postura {
    val fotograma = when {
        avance < 0.14f -> FotogramaKusi.REPOSO
        avance < 0.34f -> FotogramaKusi.FLEXION_MEDIA
        avance < 0.80f -> FotogramaKusi.IMPULSO
        avance < 0.90f -> FotogramaKusi.FLEXION_MEDIA
        else -> FotogramaKusi.DESPEGUE
    }
    return Postura(apoyo, fotograma,
        miraIzquierda = fotograma != FotogramaKusi.REPOSO && siguienteALaIzquierda(apoyo, destino))
}

private fun salto(tiempo: Float, inicio: Int, fin: Int, origen: Apoyo, destino: Apoyo, arco: Float): Postura {
    val avance = (tiempo - inicio) / (fin - inicio)
    val pies = origen.pies + (destino.pies - origen.pies) * avance
    val escala = origen.escala + (destino.escala - origen.escala) * VaivenSuave.transform(avance)
    val fotograma = when {
        avance < 0.13f -> FotogramaKusi.DESPEGUE
        avance < 0.34f -> FotogramaKusi.SUBE
        avance < 0.59f -> FotogramaKusi.AIRE
        avance < 0.77f -> FotogramaKusi.BAJA
        else -> FotogramaKusi.DESCENSO
    }
    // La sombra se proyecta sobre el apoyo más cercano y se pierde entre plataformas.
    val sombra = if (avance < 0.5f) origen else destino
    val intensidad = (1f - 2f * minOf(avance, 1f - avance)).let { it * it }
    return Postura(Apoyo(pies, escala), fotograma, siguienteALaIzquierda(origen, destino),
        altura = 4f * arco * avance * (1f - avance),
        sombra = sombra, intensidadSombra = intensidad)
}

private fun apoyoDuranteImpacto(apoyo: Apoyo, desdeQueLlego: Float): Apoyo {
    val impacto = interpolar(desdeQueLlego, IMPACTO)
    val descensoDelApoyo = if (apoyo === Frente) 0f else 3.5f * impacto
    val pies = apoyo.pies + Offset(0f, descensoDelApoyo)
    return Apoyo(pies, apoyo.escala)
}

private fun aterrizaje(apoyo: Apoyo, desdeQueLlego: Float, miraIzquierda: Boolean): Postura {
    val fotograma = when {
        desdeQueLlego < 17f -> FotogramaKusi.DESCENSO
        desdeQueLlego < 71f -> FotogramaKusi.ATERRIZAJE
        desdeQueLlego < 114f -> FotogramaKusi.SE_RECUPERA
        else -> FotogramaKusi.REPOSO
    }
    return Postura(apoyoDuranteImpacto(apoyo, desdeQueLlego), fotograma,
        miraIzquierda = miraIzquierda && fotograma != FotogramaKusi.REPOSO)
}

private fun saludar(desdeQueEmpezo: Float): Postura {
    val fotograma = when {
        desdeQueEmpezo < 125f -> FotogramaKusi.SONRISA
        desdeQueEmpezo < 290f -> FotogramaKusi.SALUDO
        desdeQueEmpezo < 355f -> FotogramaKusi.SONRISA
        desdeQueEmpezo < 440f -> FotogramaKusi.SALUDO
        desdeQueEmpezo < MS_SALUDO -> FotogramaKusi.SONRISA
        else -> FotogramaKusi.INVITA_DESCANSA
    }
    return Postura(Frente, fotograma)
}

private fun invitar(tiempo: Float): FotogramaKusi = when {
    tiempo < 95f -> FotogramaKusi.INVITA_DESCANSA
    tiempo < 165f -> FotogramaKusi.INVITA_EMPIEZA
    tiempo < 540f -> FotogramaKusi.SENALA_ABAJO
    tiempo < 625f -> FotogramaKusi.INVITA_BAJA
    tiempo < 697f -> FotogramaKusi.INVITA_EXTIENDE
    tiempo < 822f -> FotogramaKusi.INVITA_ABRE
    tiempo < 895f -> FotogramaKusi.INVITA_RECOGE
    tiempo < 1010f -> FotogramaKusi.INVITA_ACERCA
    tiempo < 1085f -> FotogramaKusi.INVITA_RECOGE
    tiempo < 1155f -> FotogramaKusi.INVITA_EXTIENDE
    tiempo < 1275f -> FotogramaKusi.INVITA_ABRE
    tiempo < 1349f -> FotogramaKusi.INVITA_BAJA
    tiempo < 1428f -> FotogramaKusi.INVITA_EMPIEZA
    else -> FotogramaKusi.INVITA_DESCANSA
}

private fun fotogramaReaccion(reaccion: ReaccionKusi, tiempo: Float): FotogramaKusi = when (reaccion) {
    ReaccionKusi.BRINCO -> when {
        tiempo < 32f -> FotogramaKusi.FLEXION_MEDIA
        tiempo < 65f -> FotogramaKusi.IMPULSO
        tiempo < 101f -> FotogramaKusi.DESPEGUE
        tiempo < 130f -> FotogramaKusi.SUBE
        tiempo < 195f -> FotogramaKusi.AIRE
        tiempo < 241f -> FotogramaKusi.BAJA
        tiempo < 285f -> FotogramaKusi.DESCENSO
        tiempo < 327f -> FotogramaKusi.ATERRIZAJE
        tiempo < 377f -> FotogramaKusi.SE_RECUPERA
        else -> FotogramaKusi.INVITA_DESCANSA
    }
    ReaccionKusi.RISA -> when {
        tiempo < 56f -> FotogramaKusi.INVITA_RECOGE
        tiempo < 351f -> FotogramaKusi.RISA
        tiempo < 412f -> FotogramaKusi.INVITA_RECOGE
        else -> FotogramaKusi.INVITA_DESCANSA
    }
    ReaccionKusi.SOMBRERO -> when {
        tiempo < 58f -> FotogramaKusi.SONRISA
        tiempo < 336f -> FotogramaKusi.GUIÑO
        tiempo < 398f -> FotogramaKusi.SONRISA
        else -> FotogramaKusi.INVITA_DESCANSA
    }
}

/** Ajustes › Accesibilidad › Quitar animaciones (o escala de animación 0 en Opciones de desarrollador). */
internal fun animacionesDesactivadas(contexto: Context): Boolean =
    Settings.Global.getFloat(contexto.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f

// ---- Piezas de la escena (en unidades de la escena) ----

private class ColoresPortal(val fondo: Color, val remolino: Color, val luz: Color)

private fun DrawScope.dibujarPortal(
    centro: Offset, ancho: Int, marco: ImageBitmap, colores: ColoresPortal, tiempo: Float,
    impacto: Float, desdeLlegada: Float,
) {
    val alto = (ancho * marco.height.toFloat() / marco.width).toInt()
    val esquina = Offset(centro.x - ancho / 2f, centro.y - alto * 0.48f + 3.5f * impacto)
    val abertura = esquina + Offset(ancho * 0.096f, alto * 0.205f)
    val medida = Size(ancho * 0.808f, alto * 0.43f)
    val mitad = abertura + Offset(medida.width / 2f, medida.height / 2f)
    val perfil = Path().apply { addOval(Rect(abertura, medida)) }
    val ciclo = tiempo * 2f * PI.toFloat()

    drawOval(colores.fondo.copy(alpha = 0.22f), esquina + Offset(9f, alto * 0.48f),
        Size(ancho - 14f, alto * 0.53f))
    clipPath(perfil) {
        drawOval(Brush.verticalGradient(listOf(colores.fondo, colores.remolino),
            startY = abertura.y, endY = abertura.y + medida.height), abertura, medida)
        for (i in 0 until 3) {
            val factor = 0.32f + i * 0.27f
            val arco = Size(medida.width * factor, medida.height * factor)
            val desfase = i * 112f
            drawArc(colores.luz, tiempo * 360f + desfase, 164f, false,
                topLeft = mitad - Offset(arco.width / 2, arco.height / 2), size = arco,
                alpha = 0.35f + 0.14f * i, style = Stroke(1.6f + 0.38f * i, cap = StrokeCap.Round))
        }
        for (i in 0 until 6) {
            val fase = ciclo + i * 1.83f
            val distancia = 0.33f + 0.1f * (i % 4)
            val punto = mitad + Offset(cos(fase) * medida.width * distancia * 0.71f,
                sin(fase) * medida.height * distancia * 0.61f)
            drawCircle(colores.luz, 0.9f + 0.5f * (i % 3), punto, alpha = 0.75f)
        }
    }
    drawImage(marco, dstOffset = IntOffset(esquina.x.toInt(), esquina.y.toInt()),
        dstSize = IntSize(ancho, alto), filterQuality = FilterQuality.High)
    drawArc(colores.luz, 13f, 154f, false, abertura, medida,
        alpha = 0.71f, style = Stroke(width = 1.75f, cap = StrokeCap.Round))
    val chispa = mitad + Offset(-25f + 7f * cos(ciclo), -15f + 4f * sin(ciclo))
    dibujarLucero(chispa, 3.3f + 0.7f * cos(ciclo), colores.luz, 0.78f)

    if (desdeLlegada in 0f..315f) {
        val avance = desdeLlegada / 315f
        val radio = SalidaFuerte.transform(avance)
        val pulso = Size(medida.width * (0.66f + 0.53f * radio), medida.height * (0.62f + 0.75f * radio))
        drawOval(colores.luz, mitad - Offset(pulso.width / 2, pulso.height / 2), pulso,
            alpha = 0.84f * (1f - avance), style = Stroke(2.4f))
        for (i in 0 until 4) {
            val estrella = mitad + Offset((i - 1.5f) * (19f + 8f * avance), -7f - (17f + i * 5f) * radio)
            dibujarLucero(estrella, 4.1f - 1.8f * avance, colores.luz, 0.93f * (1f - avance))
        }
    }
}

private fun DrawScope.dibujarLucero(posicion: Offset, radio: Float, color: Color, alfa: Float) {
    drawCircle(color, radio * 1.8f, posicion, alpha = 0.16f * alfa)
    translate(posicion.x, posicion.y) {
        val brillo = Path().apply {
            moveTo(0f, -radio)
            quadraticTo(radio * 0.24f, -radio * 0.24f, radio * 0.86f, 0f)
            quadraticTo(radio * 0.24f, radio * 0.24f, 0f, radio)
            quadraticTo(-radio * 0.24f, radio * 0.24f, -radio * 0.86f, 0f)
            quadraticTo(-radio * 0.24f, -radio * 0.24f, 0f, -radio)
            close()
        }
        drawPath(brillo, color, alpha = alfa)
    }
}

private fun DrawScope.dibujarPapelitos(origen: Offset, tiempo: Float) {
    val avance = ((tiempo - 82f) / (MS_CELEBRACION_KUSI - 82f)).coerceIn(0f, 1f)
    if (avance <= 0f || avance >= 1f) return
    val alcance = SalidaFuerte.transform(avance)
    val alfa = minOf(avance * 8f, (1f - avance) * 3f, 1f)
    for (i in 0 until 12) {
        val lado = if (i % 2 == 0) -1 else 1
        val fila = i / 2
        val punto = origen + Offset(lado * (36f + alcance * (24f + fila * 8f)),
            (fila - 3) * 12f - 56f * alcance + 50f * avance * avance)
        val color = ColoresPapelitos[i % ColoresPapelitos.size]
        if (fila % 3 == 0) {
            dibujarLucero(punto, 5f, color, alfa)
        } else {
            rotateRad(lado * (avance + fila * 0.5f), pivot = punto) {
                drawRoundRect(color, punto - Offset(2.1f, 3.5f), Size(4.2f, 7f),
                    androidx.compose.ui.geometry.CornerRadius(1.1f), alpha = alfa)
            }
        }
    }
}

private fun DrawScope.dibujarBloques(bamboleo: Float, impacto: Float, bloques: ImageBitmap) {
    translate(CentroBloques.x, CentroBloques.y + 3.5f * impacto) {
        rotateRad(0.085f * bamboleo, pivot = Offset.Zero) {
            drawImage(bloques, dstOffset = IntOffset(-50, -94), dstSize = IntSize(100, 100),
                filterQuality = FilterQuality.High)
        }
    }
}

private fun DrawScope.dibujarLibro(salto: Float, impacto: Float, libro: ImageBitmap) {
    translate(CentroLibro.x, CentroLibro.y + 3.5f * impacto - 5f * salto) {
        rotateRad(-0.10f * salto, pivot = Offset.Zero) {
            drawImage(libro, dstOffset = IntOffset(-44, -53), dstSize = IntSize(88, 59),
                filterQuality = FilterQuality.High)
        }
    }
}

private fun DrawScope.dibujarSombra(pies: Offset, escala: Float, altura: Float, intensidad: Float) {
    val distancia = (altura / 60f).coerceAtMost(1f)
    val ancho = 112f * escala * (1f - 0.34f * distancia)
    val alto = 16f * escala
    drawOval(SombraKusi, topLeft = pies - Offset(ancho / 2f, alto / 2f - 2f),
        size = Size(ancho, alto), alpha = intensidad * (1f - 0.65f * distancia))
}


private fun DrawScope.dibujarDestellos(alfa: Float, tamano: Float) {
    if (alfa <= 0f) return
    translate(201f, 224f) {
        scale(tamano, tamano, pivot = Offset.Zero) {
            drawLine(Oro, Offset(-4f, -19f), Offset(-6f, -31f), 5f, StrokeCap.Round, alpha = alfa)
            drawLine(Oro, Offset(8f, -17f), Offset(14f, -30f), 5f, StrokeCap.Round, alpha = alfa)
            drawLine(Oro, Offset(18f, -10f), Offset(27f, -16f), 5f, StrokeCap.Round, alpha = alfa)
        }
    }
}

private fun DrawScope.dibujarHojitas(posicion: Offset, tiempo: Float) {
    if (tiempo >= 1f) return
    val avance = SalidaFuerte.transform(tiempo)
    val centro = Offset(posicion.x.coerceIn(27f, ANCHO_ESCENA - 27f), posicion.y.coerceIn(34f, ALTO_ESCENA - 14f))
    translate(centro.x, centro.y) {
        val izquierda = Offset(-6f - 12f * avance, -3f - 16f * avance)
        val derecha = Offset(7f + 10f * avance, -6f - 19f * avance)
        val alfa = 1f - tiempo * tiempo
        rotateRad(-0.72f, pivot = izquierda) {
            drawOval(VerdeHoja, izquierda - Offset(4f, 7f), Size(8f, 14f), alpha = alfa)
        }
        rotateRad(0.66f, pivot = derecha) {
            drawOval(VerdeHojaClaro, derecha - Offset(5f, 9f), Size(10f, 18f), alpha = alfa)
        }
    }
}
