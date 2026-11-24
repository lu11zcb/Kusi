package pe.kusi.movil

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import kotlinx.coroutines.delay
import kotlin.math.PI
import kotlin.math.roundToInt
import kotlin.math.sin

internal enum class GestoDeLaPlaza(val duracion: Int, val descripcion: String) {
    SALUDO(760, "Saluda"), RISA(860, "Se ríe"), BRINCO(860, "Da un brinco"), INVITA(1_040, "Estira las patitas"),
    LIBRO(780, "Mira el libro"), TULIPANES(760, "Mira los tulipanes"), MARIPOSA(1_040, "Sigue a la mariposa"),
}

private data class PosePlaza(val cuadro: FotogramaKusi? = null, val celda: Int = 0, val espejo: Boolean = false)

private val Reposo = PosePlaza()
private val MedioParpadeo = PosePlaza(celda = 1)
private val OjosCerrados = PosePlaza(celda = 2)
private val Curiosidad = PosePlaza(celda = 3)
private val MiradaAlLibro = PosePlaza(celda = 3, espejo = true)
private val RostroAlegre = PosePlaza(FotogramaKusi.SONRISA)
private val Saluda = PosePlaza(FotogramaKusi.SALUDO)
private val Sonrie = PosePlaza(FotogramaKusi.INVITA_EMPIEZA)
private val SubeLasManos = PosePlaza(FotogramaKusi.INVITA_RECOGE)
private val AbreLasManos = PosePlaza(FotogramaKusi.INVITA_EXTIENDE)
private val BajaLasManos = PosePlaza(FotogramaKusi.INVITA_BAJA)
private val Carcajada = PosePlaza(FotogramaKusi.RISA)
private val Preparacion = PosePlaza(FotogramaKusi.FLEXION_MEDIA)
private val ImpulsoPlaza = PosePlaza(FotogramaKusi.IMPULSO)
private val DespeguePlaza = PosePlaza(FotogramaKusi.DESPEGUE)
private val SubePlaza = PosePlaza(FotogramaKusi.SUBE)
private val AirePlaza = PosePlaza(FotogramaKusi.AIRE)
private val BajaPlaza = PosePlaza(FotogramaKusi.BAJA)
private val DescensoPlaza = PosePlaza(FotogramaKusi.DESCENSO)
private val AterrizaPlaza = PosePlaza(FotogramaKusi.ATERRIZAJE)
private val SeRecuperaPlaza = PosePlaza(FotogramaKusi.SE_RECUPERA)
private val FuentePose = IntSize(LADO_FUENTE, LADO_FUENTE)

private fun parpadeo(ms: Int): PosePlaza =
    if (ms in 36..94) OjosCerrados else MedioParpadeo

private fun pasoDelBrinco(fase: Float): PosePlaza = when {
    fase < .04f -> Reposo
    fase < .14f -> Preparacion
    fase < .21f -> ImpulsoPlaza
    fase < .28f -> DespeguePlaza
    fase < .36f -> SubePlaza
    fase < .49f -> AirePlaza
    fase < .57f -> BajaPlaza
    fase < .68f -> DescensoPlaza
    fase < .75f -> AterrizaPlaza
    fase < .84f -> Preparacion
    fase < .91f -> SeRecuperaPlaza
    fase < .96f -> Sonrie
    else -> Reposo
}

private fun faseDelBrinco(gesto: GestoDeLaPlaza, fase: Float) =
    if (gesto == GestoDeLaPlaza.MARIPOSA) ((fase - .14f) / .86f).coerceAtLeast(0f) else fase

private fun poseDelGesto(gesto: GestoDeLaPlaza, fase: Float): PosePlaza = when (gesto) {
    GestoDeLaPlaza.SALUDO -> when {
        fase < .08f || fase > .94f -> Sonrie
        fase < .21f || fase in 0.43f..0.57f || fase > .81f -> RostroAlegre
        else -> Saluda
    }
    GestoDeLaPlaza.INVITA -> when {
        fase < .10f || fase > .90f -> Sonrie
        fase < .22f -> SubeLasManos
        fase < .67f -> AbreLasManos
        else -> BajaLasManos
    }
    GestoDeLaPlaza.RISA -> when {
        fase < .12f || fase > .9f -> Sonrie
        fase < .24f || fase in 0.49f..0.60f || fase > .77f -> SubeLasManos
        else -> Carcajada
    }
    GestoDeLaPlaza.TULIPANES -> if (fase < .54f) Curiosidad else Sonrie
    GestoDeLaPlaza.BRINCO -> pasoDelBrinco(fase)
    GestoDeLaPlaza.MARIPOSA -> if (fase < .14f) Curiosidad else pasoDelBrinco(faseDelBrinco(gesto, fase))
    GestoDeLaPlaza.LIBRO -> when {
        fase < .80f -> MiradaAlLibro
        else -> Sonrie
    }
}

private val SenalaElMaterial = PosePlaza(FotogramaKusi.SENALA_ABAJO, espejo = true)
private val ExtiendeLosBrazos = PosePlaza(FotogramaKusi.INVITA_ABRE)
private val RecogeLosBrazos = PosePlaza(FotogramaKusi.INVITA_ACERCA)
private val DescansaLasPatitas = PosePlaza(FotogramaKusi.INVITA_DESCANSA)
private val MiraElExperimento = PosePlaza(FotogramaKusi.ESPERA_MIRA, espejo = true)
private val Sorpresa = PosePlaza(FotogramaKusi.CELEBRA_AIRE, espejo = true)

// El primer cuadro se mantiene entre interacciones. Los porcentajes marcan el fin de cada pose.
private val SecuenciasDeCurso = mapOf(
    Curso.MATEMATICA to listOf(
        12 to SenalaElMaterial, 22 to Preparacion, 33 to ImpulsoPlaza, 43 to AirePlaza, 49 to AterrizaPlaza,
        58 to Preparacion, 63 to DespeguePlaza, 74 to SubePlaza, 77 to BajaPlaza, 84 to AterrizaPlaza,
        94 to SenalaElMaterial, 100 to RostroAlegre,
    ),
    Curso.COMUNICACION to listOf(
        19 to MiradaAlLibro, 33 to SenalaElMaterial, 43 to MiraElExperimento, 49 to OjosCerrados,
        68 to MiradaAlLibro, 84 to Sonrie, 100 to MiradaAlLibro,
    ),
    Curso.PERSONAL_SOCIAL to listOf(
        13 to Sonrie, 27 to Saluda.copy(espejo = true), 37 to RecogeLosBrazos, 51 to Saluda,
        68 to ExtiendeLosBrazos, 78 to SubeLasManos, 89 to BajaLasManos, 100 to RostroAlegre,
    ),
    Curso.CIENCIA to listOf(
        23 to MiraElExperimento, 36 to Curiosidad.copy(espejo = true), 45 to MedioParpadeo,
        60 to Sorpresa, 74 to SeRecuperaPlaza, 84 to MiraElExperimento, 100 to Sonrie,
    ),
    Curso.ARTE to listOf(
        14 to SubeLasManos.copy(espejo = true), 27 to SenalaElMaterial, 37 to ExtiendeLosBrazos.copy(espejo = true),
        49 to RecogeLosBrazos.copy(espejo = true), 62 to AbreLasManos.copy(espejo = true),
        76 to BajaLasManos.copy(espejo = true), 86 to SenalaElMaterial, 100 to RostroAlegre,
    ),
    Curso.RELIGION to listOf(
        17 to DescansaLasPatitas, 32 to RecogeLosBrazos, 47 to AbreLasManos, 59 to RecogeLosBrazos,
        68 to Preparacion, 79 to OjosCerrados, 91 to SeRecuperaPlaza, 100 to DescansaLasPatitas,
    ),
    Curso.INGLES to listOf(
        12 to RostroAlegre, 23 to Saluda.copy(espejo = true), 30 to Sonrie, 42 to Carcajada,
        48 to Sonrie, 62 to Carcajada, 71 to RostroAlegre, 86 to Saluda.copy(espejo = true), 100 to Sonrie,
    ),
)

private fun arcoMateria(fase: Float, desde: Float, hasta: Float): Float {
    if (fase <= desde || fase >= hasta) return 0f
    return sin(PI * ((fase - desde) / (hasta - desde))).toFloat()
}

private fun movimientoDeMateria(curso: Curso, fase: Float): Offset {
    val arco = arcoMateria(fase, 0f, 1f)
    return when (curso) {
        Curso.MATEMATICA -> Offset(
            -.047f * arco,
            -.16f * arcoMateria(fase, .22f, .48f) - .21f * arcoMateria(fase, .56f, .83f),
        )
        Curso.COMUNICACION -> Offset(-.05f * arco, .023f * arcoMateria(fase, .23f, .68f))
        Curso.PERSONAL_SOCIAL -> Offset(
            -.042f * arcoMateria(fase, .10f, .39f) + .042f * arcoMateria(fase, .34f, .66f),
            -.038f * arcoMateria(fase, .54f, .84f),
        )
        Curso.CIENCIA -> Offset(
            -.07f * arcoMateria(fase, .03f, .43f) + .044f * arcoMateria(fase, .43f, .78f),
            -.16f * arcoMateria(fase, .45f, .73f),
        )
        Curso.ARTE -> Offset(
            -.06f * arcoMateria(fase, .09f, .46f) - .04f * arcoMateria(fase, .46f, .80f),
            -.023f * arcoMateria(fase, .40f, .82f),
        )
        Curso.RELIGION -> Offset(0f, .035f * arcoMateria(fase, .53f, .88f))
        Curso.INGLES -> Offset(
            -.034f * arco,
            -.031f * arcoMateria(fase, .15f, .40f) - .048f * arcoMateria(fase, .46f, .70f),
        )
    }
}

@Composable
internal fun KusiDeLaPlaza(
    modifier: Modifier,
    gesto: GestoDeLaPlaza?,
    pulso: Int,
    quieto: Boolean,
    brisa: State<Float>?,
    descripcion: String,
    materia: Curso? = null,
    tocar: () -> Unit,
) {
    val gestosSuaves = ImageBitmap.imageResource(R.drawable.kusi_plaza_poses)
    val saltos = ImageBitmap.imageResource(R.drawable.kusi_saltos)
    val transiciones = ImageBitmap.imageResource(R.drawable.kusi_intermedios)
    val expresiones = ImageBitmap.imageResource(R.drawable.kusi_espera)
    val brazos = if (materia != null) ImageBitmap.imageResource(R.drawable.kusi_gestos) else null
    val senala = when (materia) {
        Curso.MATEMATICA, Curso.COMUNICACION, Curso.ARTE -> ImageBitmap.imageResource(R.drawable.kusi_invita)
        else -> null
    }
    val duracion = materia?.duracionAnimacion ?: gesto?.duracion
    val secuencia = materia?.let { SecuenciasDeCurso.getValue(it) }
    val silueta = remember { SiluetaKusi() }
    val progreso = remember(pulso) { Animatable(0f) }
    var responde by remember(pulso) { mutableStateOf(pulso > 0) }
    LaunchedEffect(pulso, quieto, duracion) {
        if (duracion != null && pulso > 0) {
            if (quieto) delay(400) else progreso.animateTo(1f, tween(duracion, easing = LinearEasing))
            responde = false
        }
    }
    Canvas(
        modifier.tocarSiluetaKusi(silueta, descripcion, "Jugar con Kusi") { if (!responde) tocar() }
            .semantics {
                if (responde) (materia?.gestoDeKusi ?: gesto?.descripcion)?.let { stateDescription = it }
            },
    ) {
        val ms = ((brisa?.value ?: 0f) * 16_000).toInt()
        val fase = if (quieto) .54f else progreso.value
        val saltoSolo = ms in 11_850 until 12_710
        val gestoActual = gesto.takeIf { responde }
        val saltando = !quieto && if (gestoActual != null) {
            gestoActual == GestoDeLaPlaza.BRINCO || gestoActual == GestoDeLaPlaza.MARIPOSA
        } else saltoSolo
        val faseSalto = if (gestoActual != null) faseDelBrinco(gestoActual, fase) else (ms - 11_850) / 860f
        val cuadro = when {
            secuencia != null -> {
                val avance = if (responde) (fase * 100).toInt() else 0
                (secuencia.firstOrNull { avance < it.first } ?: secuencia.last()).second
            }
            gestoActual != null -> poseDelGesto(gestoActual, fase)
            ms in 1_155..1_290 -> parpadeo(ms - 1_155)
            ms in 2_290..3_330 -> poseDelGesto(GestoDeLaPlaza.INVITA, (ms - 2_290) / 1_040f)
            ms in 3_690..4_730 -> MiradaAlLibro
            ms in 5_660..5_795 -> parpadeo(ms - 5_660)
            ms in 6_390..7_120 -> Curiosidad
            ms in 7_950..8_790 -> poseDelGesto(GestoDeLaPlaza.RISA, (ms - 7_950) / 840f)
            saltoSolo -> pasoDelBrinco(faseSalto)
            ms in 14_170..14_305 -> parpadeo(ms - 14_170)
            else -> Reposo
        }
        val fotograma = cuadro.cuadro
        val arte = when (fotograma?.hoja) {
            HojaKusi.SALTOS -> saltos
            HojaKusi.INTERMEDIOS -> transiciones
            HojaKusi.ESPERA -> expresiones
            HojaKusi.GESTOS -> brazos ?: gestosSuaves
            HojaKusi.INVITACION -> senala ?: gestosSuaves
            else -> gestosSuaves
        }
        val fuente = fotograma?.origen ?: IntOffset(cuadro.celda % 2 * LADO_FUENTE, cuadro.celda / 2 * LADO_FUENTE)
        val arco = if (saltando) {
            val vuelo = ((faseSalto - .21f) / .47f).coerceIn(0f, 1f)
            4f * vuelo * (1f - vuelo)
        } else 0f
        val lado = size.width.roundToInt()
        val movimiento = if (materia != null && responde && !quieto) movimientoDeMateria(materia, fase) else Offset.Zero
        val pies = Offset(
            size.width * (ApoyoCuadroKusi.x + .049f * arco + movimiento.x),
            size.height * (ApoyoCuadroKusi.y - .105f * arco + movimiento.y),
        )
        val esquina = Offset(
            pies.x - lado * ApoyoCuadroKusi.x,
            pies.y - lado * ApoyoCuadroKusi.y,
        )
        val altura = (arco - 4f * movimiento.y).coerceIn(0f, 1f)
        val anchoSombra = size.width * (.40f - .05f * altura)
        drawOval(
            Color(0x42714519), Offset(pies.x - anchoSombra / 2f, size.height * .914f),
            Size(anchoSombra, size.height * .044f), alpha = 1f - .42f * altura,
        )
        if (saltando && faseSalto in 0.68f..0.91f) {
            val polvo = SalidaPlaza.transform((faseSalto - .68f) / .23f).coerceIn(0f, 1f)
            for (ladoPolvo in listOf(-1f, 1f)) {
                drawCircle(
                    Color(0xFFFFE6A8), size.width * (.011f + .006f * polvo),
                    Offset(pies.x + size.width * (.15f + .12f * polvo) * ladoPolvo, size.height * (.933f - .04f * polvo)),
                    alpha = .8f * (1f - polvo),
                )
            }
        }
        val espejo = cuadro.espejo
        silueta.actualizar(arte, fuente, FuentePose, pies, size, 0f, reflejado = espejo)
        scale(if (espejo) -1f else 1f, 1f, pivot = pies) {
            translate(esquina.x, esquina.y) {
                drawImage(arte, fuente, FuentePose, dstSize = IntSize(lado, lado), filterQuality = FilterQuality.High)
            }
        }
    }
}
