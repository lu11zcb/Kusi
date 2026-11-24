package pe.kusi.movil

import android.content.SharedPreferences
import androidx.compose.runtime.saveable.listSaver

internal enum class CategoriaCuy(val etiqueta: String, val sinPieza: String) {
    CABEZA("Cabeza", "Sin sombrero"),
    LENTES("Lentes", "Sin lentes"),
    ROPA("Ropa", "Sin ropa"),
    MOCHILA("Mochila", "Sin mochila"),
}

internal enum class PiezaCuy(
    val categoria: CategoriaCuy,
    val etiqueta: String,
    val icono: Int,
    // Las prendas de la tienda se compran con monedas. El precio y si ya es del niño los decide Spring
    // (`/api/edu/estudiante/tienda/`), no la app: así nadie las desbloquea cambiando el celular.
    val deTienda: Boolean = false,
) {
    SOMBRERO(CategoriaCuy.CABEZA, "Sombrero verde", R.drawable.cuy_sombrero_verde),
    GORRO(CategoriaCuy.CABEZA, "Gorro rosa", R.drawable.cuy_gorro_rosa),
    FLOR(CategoriaCuy.CABEZA, "Flor", R.drawable.cuy_flor),
    BOINA(CategoriaCuy.CABEZA, "Boina lila", R.drawable.cuy_boina_lila),
    LAZO(CategoriaCuy.CABEZA, "Lazo coral", R.drawable.cuy_lazo),
    GORRA_CELESTE(CategoriaCuy.CABEZA, "Gorra nube", R.drawable.cuy_gorra_celeste),
    GORRA(CategoriaCuy.CABEZA, "Gorra exploradora", R.drawable.cuy_gorra_exploradora, deTienda = true),
    LENTES_AZULES(CategoriaCuy.LENTES, "Lentes celestes", R.drawable.cuy_lentes_azules),
    LENTES_SOL(CategoriaCuy.LENTES, "Lentes de sol", R.drawable.cuy_lentes_sol),
    LENTES_MENTA(CategoriaCuy.LENTES, "Lentes menta", R.drawable.cuy_lentes_menta),
    LENTES_CORAZON(CategoriaCuy.LENTES, "Lentes corazón", R.drawable.cuy_lentes_corazon),
    LENTES_CUADRADOS(CategoriaCuy.LENTES, "Lentes cuadrados", R.drawable.cuy_lentes_cuadrados),
    LENTES_ESTRELLAS(CategoriaCuy.LENTES, "Lentes estrella", R.drawable.cuy_lentes_estrellas, deTienda = true),
    BUFANDA(CategoriaCuy.ROPA, "Bufanda azul", R.drawable.cuy_bufanda_azul),
    POLO(CategoriaCuy.ROPA, "Polo azul", R.drawable.cuy_polo_azul),
    PETO_LILA(CategoriaCuy.ROPA, "Jardinera lila", R.drawable.cuy_peto_lila),
    POLERON_MENTA(CategoriaCuy.ROPA, "Polerón menta", R.drawable.cuy_poleron_menta),
    CHALECO(CategoriaCuy.ROPA, "Chaleco coral", R.drawable.cuy_chaleco_coral, deTienda = true),
    MOCHILA(CategoriaCuy.MOCHILA, "Mochila miel", R.drawable.cuy_mochila_miel),
    MOCHILA_FRESA(CategoriaCuy.MOCHILA, "Mochila de fresa", R.drawable.cuy_mochila_fresa),
    MOCHILA_ESPACIO(CategoriaCuy.MOCHILA, "Mochila lunar", R.drawable.cuy_mochila_espacio),
    MOCHILA_MENTA(CategoriaCuy.MOCHILA, "Mochila menta", R.drawable.cuy_mochila_menta, deTienda = true);

    /** El id de la prenda en la tienda de Spring: su nombre en minúsculas («chaleco», «mochila_menta»…). */
    val idTienda: String? get() = if (deTienda) name.lowercase() else null

    /** Una prenda de la tienda queda bloqueada hasta que el niño la compra. Las demás son gratis. */
    fun bloqueada(compradas: Set<PiezaCuy>): Boolean = deTienda && this !in compradas
}

internal fun piezaDeTienda(id: String): PiezaCuy? = PiezaCuy.entries.firstOrNull { it.idTienda == id }

/** Las prendas que el niño ya compró, según lo que respondió la tienda. */
internal fun piezasCompradas(tienda: EstadoTiendaInfantil): Set<PiezaCuy> =
    tienda.prendas.filter { it.comprada }.mapNotNull { piezaDeTienda(it.id) }.toSet()

internal data class AparienciaCuy(
    val pelaje: PelajeCuy = PelajeCuy.CAFE,
    val piezas: Map<CategoriaCuy, PiezaCuy> = emptyMap(),
) {
    fun vestir(categoria: CategoriaCuy, pieza: PiezaCuy?, compradas: Set<PiezaCuy> = emptySet()): AparienciaCuy = when {
        pieza == null -> copy(piezas = piezas - categoria)
        pieza.bloqueada(compradas) || pieza.categoria != categoria -> this
        else -> copy(piezas = piezas + (categoria to pieza))
    }

    val archivo: String
        get() = CategoriaCuy.entries.joinToString("-") { piezas[it]?.name ?: "0" }

    /**
     * El nombre de la hoja ya armada que sí existe en `assets/vestidor/`. Si todavía no está el dibujo de una
     * combinación con prendas de la tienda, se muestra el cuy sin ellas: así la app nunca se cierra por un dibujo.
     */
    fun hojaDisponible(hojas: Set<String>): String =
        if (archivo + ".webp" in hojas) archivo else copy(piezas = piezas.filterValues { !it.deTienda }).archivo

    val descripcion: String
        get() = buildString {
            append("Pelaje ")
            append(pelaje.etiqueta.lowercase())
            if (piezas.isNotEmpty()) {
                append(", con ")
                append(CategoriaCuy.entries.mapNotNull { piezas[it]?.etiqueta?.lowercase() }.joinToString())
            }
        }
}

// Se respeta lo guardado: una prenda de la tienda solo llega aquí si el niño la compró y se la puso.
internal fun piezasGuardadas(ids: Collection<String>): Map<CategoriaCuy, PiezaCuy> =
    PiezaCuy.entries.filter { it.name in ids }.associateBy { it.categoria }

private val conjuntosAnteriores = mapOf(
    "jardin" to listOf("SOMBRERO", "LENTES_SOL", "MOCHILA"),
    "invierno" to listOf("GORRO", "BUFANDA"),
    "flor" to listOf("FLOR", "LENTES_MENTA"),
    "artista" to listOf("BOINA", "POLO"),
    "escolar" to listOf("GORRO", "LENTES_AZULES", "POLO", "MOCHILA"),
    "verano" to listOf("FLOR", "LENTES_SOL", "POLO"),
)

internal val AparienciaCuySaver = listSaver<AparienciaCuy, Any>(
    save = { listOf(it.pelaje.codigo) + it.piezas.values.map(PiezaCuy::name) },
    restore = {
        val ids = it.drop(1).filterIsInstance<String>()
        AparienciaCuy(pelajeCuyGuardado(it.first() as Int), piezasGuardadas(conjuntosAnteriores[ids.singleOrNull()] ?: ids))
    },
)

internal fun aparienciaGuardada(preferencias: SharedPreferences, id: String): AparienciaCuy =
    AparienciaCuy(
        pelajeCuyGuardado(preferencias.getInt("pelaje_$id", 0)),
        piezasGuardadas(preferencias.getStringSet("accesorios_$id", null)
            ?: conjuntosAnteriores[preferencias.getString("conjunto_$id", null)].orEmpty()),
    )

internal fun guardarApariencia(preferencias: SharedPreferences, id: String, apariencia: AparienciaCuy) {
    preferencias.edit()
        .putInt("pelaje_$id", apariencia.pelaje.codigo)
        .putStringSet("accesorios_$id", apariencia.piezas.values.map(PiezaCuy::name).toSet())
        .remove("conjunto_$id")
        .putBoolean("creado_$id", true)
        .apply()
}
