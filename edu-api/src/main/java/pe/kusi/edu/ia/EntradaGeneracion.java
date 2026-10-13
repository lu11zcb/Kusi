package pe.kusi.edu.ia;

// Solo datos del recurso educativo; nunca datos personales de estudiantes.
// objetivoDocente null indica que la IA debe sugerir el objetivo.
public record EntradaGeneracion(String cursoNombre, int grado, String seccionNombre, Integer anioEscolar, String tema, String objetivoDocente) {}
