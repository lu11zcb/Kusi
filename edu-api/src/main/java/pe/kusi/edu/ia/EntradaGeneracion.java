package pe.kusi.edu.ia;

import java.util.Map;

// Solo datos del recurso educativo; nunca datos personales de estudiantes.
// objetivoDocente null indica que la IA debe sugerir el objetivo.
// tipo: "nueva" (HU16), "observaciones" (HU22) o "alternativa" (HU24); en los dos
// últimos propuestaBase es la versión que se ajusta o que el docente rechazó.
public record EntradaGeneracion(String cursoNombre, int grado, String seccionNombre, Integer anioEscolar, String tema, String objetivoDocente,
                                String proposito, String instrucciones, String tipo, Map<String,Object> propuestaBase, String observaciones) {}
