package pe.kusi.movil

// Contrato de estados visuales del recorrido del Sprint 2.
data class EstadoEntradaKusi(val cuenta: Cuenta?, val ocupado: Boolean = false, val mensaje: String? = null, val validado: Boolean = false, val iniciando: Boolean = false, val claveTemporalDisponible: Boolean = false)
/** Solo datos para dibujar. La autorización y la carga pertenecen al servicio del alumno. */
data class AventuraInfantil(val id: String, val titulo: String, val curso: String, val meta: String, val consigna: String, val portada: Int = R.drawable.kusi_feria_v2, val paquete: String? = null, val icono: Int = R.drawable.ic_kusi_compass, val nuevo: Boolean = false, val enPausa: Boolean = false)
data class EstadoBibliotecaInfantil(val aventuras: List<AventuraInfantil> = emptyList(), val cargando: Boolean = false, val error: String? = null)
data class EstadoCierreInfantil(val completados: Int? = null, val total: Int? = null, val guardando: Boolean = false, val error: String? = null, val guardado: Boolean = false, val puntos: Int? = null)

data class ProgresoCursoInfantil(val nombre: String, val puntos: Long, val retos: Long)
data class ResumenLogrosInfantil(val puntos: Long, val retos: Long, val cursos: List<ProgresoCursoInfantil>)
data class PuestoSalonInfantil(
    val nombreCorto: String,
    val puntos: Long,
    val esMiPuesto: Boolean = false,
    val pelaje: Int = 0,
    val accesorios: List<String> = emptyList(),
)
/** Podio en el orden del servidor. Una lista vacía representa un salón sin puntos. */
data class RankingSalonInfantil(val podio: List<PuestoSalonInfantil>, val misPuntos: Long)
data class MetaSalonInfantil(val puntosDelSalon: Long, val objetivo: Long)

data class EstadoLogrosInfantil(
    val resumen: ResumenLogrosInfantil? = null,
    val cargando: Boolean = false,
    val error: String? = null,
    val ranking: RankingSalonInfantil? = null,
    val metaSalon: MetaSalonInfantil? = null,
)

fun aventuraLaberintoEjemplo() = AventuraInfantil("laberinto-ejemplo", "El laberinto de Kusi (ejemplo)", "Matemática",
    "Explora los caminos con Kusi.", "Mira el grupo de arriba y escucha a Kusi.")
