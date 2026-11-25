package pe.kusi.edu.service;

// El nombre de un juego en las listas del docente, del estudiante y del administrador: el
// título que propuso Kusi en la última versión que lo tiene. Las propuestas anteriores a
// los títulos (V21) no lo tienen, y entonces se muestra el tema que escribió el docente.
// Se usa dentro de consultas que llaman «s» a la solicitud (edu.solicitudes_propuesta).
final class TituloJuego {
    static final String SQL = "coalesce((select p.titulo from edu.propuestas p where p.solicitud_id = s.id "
            + "and p.titulo is not null order by p.version desc fetch first 1 rows only), s.tema)";

    private TituloJuego() {}
}
