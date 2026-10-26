package pe.kusi.movil

// Contrato de estados visuales del recorrido del Sprint 2.
data class EstadoEntradaKusi(val cuenta: Cuenta?, val ocupado: Boolean = false, val mensaje: String? = null, val validado: Boolean = false, val iniciando: Boolean = false, val claveTemporalDisponible: Boolean = false)
/** Solo datos para dibujar. La autorización y la carga pertenecen al servicio del alumno. */
data class AventuraInfantil(val id: String, val titulo: String, val curso: String, val meta: String, val consigna: String, val portada: Int = R.drawable.kusi_feria_v2, val paquete: String? = null)
data class EstadoBibliotecaInfantil(val aventuras: List<AventuraInfantil> = emptyList(), val cargando: Boolean = false, val error: String? = null)
data class EstadoCierreInfantil(val completados: Int? = null, val total: Int? = null, val guardando: Boolean = false, val error: String? = null, val guardado: Boolean = false)

fun aventuraLaberintoEjemplo() = AventuraInfantil("laberinto-ejemplo", "El laberinto de Kusi (ejemplo)", "Matemática",
    "Explora los caminos con Kusi.", "Mira el grupo de arriba y escucha a Kusi.")
