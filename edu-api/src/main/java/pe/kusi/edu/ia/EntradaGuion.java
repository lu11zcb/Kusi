package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.JsonNode;
import pe.kusi.edu.laberinto.ProblemaLaberinto;

import java.util.List;
import java.util.Map;

// Lo que se le manda a la IA para escribir el guion. La IA no recuerda la llamada 1,
// así que va la propuesta aprobada completa. Solo datos del recurso educativo: nunca
// nombres ni datos personales de estudiantes.
//
// propuesta: objetivo, historia, acciones, reglas, retos, ayudas y recursos de la
//   versión aprobada (más regla_juego si la propuesta la eligió).
// reglaJuego: «orden», «solo_clase» o null si la IA debe elegir.
// En el primer intento guionAnterior es null y problemas está vacío; en una
// corrección van el guion que falló y la lista de lo que falló.
public record EntradaGuion(String cursoNombre, int grado, String tema, String proposito, String instrucciones,
                           Map<String, Object> propuesta, String reglaJuego, int intento, int intentosMaximos,
                           JsonNode guionAnterior, List<ProblemaLaberinto> problemas) {}
