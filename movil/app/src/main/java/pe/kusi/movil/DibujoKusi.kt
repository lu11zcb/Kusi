package pe.kusi.movil

import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.scale
import androidx.compose.ui.graphics.drawscope.translate
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize

internal enum class HojaKusi(val recurso: Int, val columnas: Int) {
    SALTOS(R.drawable.kusi_saltos, 4),
    GESTOS(R.drawable.kusi_gestos, 3),
    INTERMEDIOS(R.drawable.kusi_intermedios, 4),
    ESPERA(R.drawable.kusi_espera, 3),
    INVITACION(R.drawable.kusi_invita, 1),
}

// Los dibujos tienen el mismo punto de apoyo para cambiar de pose sin desplazar las patas.
internal enum class FotogramaKusi(val hoja: HojaKusi, val celda: Int) {
    REPOSO(HojaKusi.SALTOS, 0),
    IMPULSO(HojaKusi.SALTOS, 1),
    DESPEGUE(HojaKusi.SALTOS, 2),
    AIRE(HojaKusi.SALTOS, 3),
    DESCENSO(HojaKusi.SALTOS, 4),
    ATERRIZAJE(HojaKusi.SALTOS, 5),
    SONRISA(HojaKusi.SALTOS, 6),
    SALUDO(HojaKusi.SALTOS, 7),
    INVITA_ABRE(HojaKusi.GESTOS, 0),
    INVITA_ACERCA(HojaKusi.GESTOS, 1),
    INVITA_DESCANSA(HojaKusi.GESTOS, 2),
    CELEBRA_IMPULSO(HojaKusi.GESTOS, 3),
    CELEBRA_AIRE(HojaKusi.GESTOS, 4),
    CELEBRA_CAIDA(HojaKusi.GESTOS, 5),
    FLEXION_MEDIA(HojaKusi.INTERMEDIOS, 0),
    SUBE(HojaKusi.INTERMEDIOS, 1),
    BAJA(HojaKusi.INTERMEDIOS, 2),
    SE_RECUPERA(HojaKusi.INTERMEDIOS, 3),
    INVITA_EMPIEZA(HojaKusi.INTERMEDIOS, 4),
    INVITA_RECOGE(HojaKusi.INTERMEDIOS, 5),
    INVITA_EXTIENDE(HojaKusi.INTERMEDIOS, 6),
    INVITA_BAJA(HojaKusi.INTERMEDIOS, 7),
    ESPERA_REPOSO(HojaKusi.ESPERA, 0),
    ESPERA_MIRA(HojaKusi.ESPERA, 1),
    ESPERA_PARPADEA(HojaKusi.ESPERA, 2),
    ESPERA_LADO(HojaKusi.ESPERA, 3),
    RISA(HojaKusi.ESPERA, 4),
    GUIÑO(HojaKusi.ESPERA, 5),
    SENALA_ABAJO(HojaKusi.INVITACION, 0);

    val origen: IntOffset
        get() = IntOffset(celda % hoja.columnas * LADO_FUENTE, celda / hoja.columnas * LADO_FUENTE)
}

internal const val LADO_FUENTE = 512
internal val ApoyoCuadroKusi = Offset(0.5f, 0.9375f)
private val TamanoFuente = IntSize(LADO_FUENTE, LADO_FUENTE)
internal val TamanoDibujoKusi = IntSize(256, 256)
private val AnclaKusi = IntOffset(
    -(TamanoDibujoKusi.width * ApoyoCuadroKusi.x).toInt(),
    -(TamanoDibujoKusi.height * ApoyoCuadroKusi.y).toInt(),
)

internal fun DrawScope.dibujarCuadroKusi(
    arte: ImageBitmap,
    fotograma: FotogramaKusi,
    tamano: IntSize,
    esquina: IntOffset = IntOffset.Zero,
) {
    drawImage(arte, srcOffset = fotograma.origen, srcSize = TamanoFuente, dstOffset = esquina,
        dstSize = tamano, filterQuality = FilterQuality.High)
}

internal fun DrawScope.dibujarKusi(
    arte: ImageBitmap,
    pies: Offset,
    tamano: Float,
    fotograma: FotogramaKusi,
    miraIzquierda: Boolean,
) {
    translate(pies.x, pies.y) {
        scale(if (miraIzquierda) -tamano else tamano, tamano, pivot = Offset.Zero) {
            dibujarCuadroKusi(arte, fotograma, TamanoDibujoKusi, AnclaKusi)
        }
    }
}
