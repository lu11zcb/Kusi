package pe.kusi.edu.ia;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static pe.kusi.edu.laberinto.CatalogoLaberinto.REGLA_ORDEN;
import static pe.kusi.edu.laberinto.CatalogoLaberinto.REGLA_SOLO_CLASE;

// La llamada 1: la propuesta de juego a partir del tema del docente. Usa el
// adaptador de IA compartido (ClienteIa); aquí solo están lo que se le pide a la IA
// y la forma de la respuesta. El resultado se valida después con ValidadorPropuesta.
public class GeneradorPropuestasIa implements GeneradorPropuestas {
    private final ClienteIa cliente;
    private final ObjectMapper json;

    public GeneradorPropuestasIa(ClienteIa cliente, ObjectMapper json) {
        this.cliente = cliente;
        this.json = json;
    }

    public boolean configurado() { return true; }

    public String proveedor() { return cliente.proveedor(); }

    public String modelo() { return cliente.modelo(); }

    public Map<String, Object> generar(EntradaGeneracion entrada) throws FalloGeneracion {
        try {
            return json.convertValue(
                    cliente.pedirJson(INSTRUCCIONES, pedido(entrada), 0.7, "propuesta_kusi", esquema()),
                    new TypeReference<Map<String, Object>>() {});
        } catch (IOException e) {
            throw new FalloGeneracion("No se pudo preparar el pedido a la IA.", false);
        }
    }

    // La forma de la respuesta: la regla del juego es una de dos, la historia es un texto
    // y todo lo demás, listas de textos. Se exige antes de recibirla; el validador local
    // sigue siendo obligatorio. La regla va primero para que la IA la elija antes de
    // escribir el resto, que debe seguirla.
    static Map<String, Object> esquema() {
        Map<String, Object> texto = Map.of("type", "string");
        Map<String, Object> lista = Map.of("type", "array", "items", texto);
        Map<String, Object> propiedades = new LinkedHashMap<>();
        propiedades.put("regla_juego", Map.of("type", "string", "enum", List.of(REGLA_ORDEN, REGLA_SOLO_CLASE)));
        propiedades.put("objetivo", texto);
        propiedades.put("historia", texto);
        for (String campo : List.of("acciones", "reglas", "retos", "ayudas", "recursos")) propiedades.put(campo, lista);
        return Map.of("type", "object", "properties", propiedades,
                "required", List.copyOf(propiedades.keySet()), "additionalProperties", false);
    }

    private String pedido(EntradaGeneracion e) throws IOException {
        StringBuilder texto = new StringBuilder();
        texto.append("Curso: ").append(e.cursoNombre()).append("\nGrado: ").append(e.grado()).append("° de primaria");
        if (e.seccionNombre() != null) texto.append("\nSección: ").append(e.seccionNombre());
        texto.append("\nTema: ").append(e.tema());
        texto.append("\nObjetivo: ").append(e.objetivoDocente() == null ? "propón uno adecuado al tema y al grado" : e.objetivoDocente());
        if (e.proposito() != null) texto.append("\nPropósito del juego: ").append(e.proposito());
        if (e.instrucciones() != null) texto.append("\nInstrucciones del docente: ").append(e.instrucciones());
        if ("observaciones".equals(e.tipo())) {
            texto.append("\n\nAjusta esta propuesta según las observaciones del docente, sin cambiar lo que no menciona.");
            texto.append("\nSi las observaciones no piden otra regla, conserva en «regla_juego» la que ya tiene.");
            texto.append("\nPropuesta actual: ").append(json.writeValueAsString(e.propuestaBase()));
            texto.append("\nObservaciones: ").append(e.observaciones());
        } else if ("alternativa".equals(e.tipo())) {
            texto.append("\n\nEl docente rechazó esta propuesta. Crea una alternativa claramente distinta.");
            texto.append("\nPropuesta rechazada: ").append(json.writeValueAsString(e.propuestaBase()));
            if (e.observaciones() != null) texto.append("\nMotivo: ").append(e.observaciones());
        }
        return texto.toString();
    }

    // Kusi hoy hace un solo juego, el laberinto, con dos reglas. La IA elige la regla que
    // mejor encaja con el tema; si el tema no encaja en ninguna, lo dice en la historia.
    // No lleva ejemplos de secuencias ni de mapas: la IA los copiaría en su propuesta y
    // de ahí pasarían al guion.
    private static final String INSTRUCCIONES = """
        Eres el asistente de Kusi, una app de juegos para niños de primer grado de primaria en Perú. Propones un juego a partir del tema del docente. La propuesta la lee el docente: escribe corto, en español sencillo y sin palabras técnicas.

        Kusi hoy hace un solo juego: el laberinto. El niño mueve a un cuy por los caminos de un laberinto, recoge frutas y verduras, esquiva zorros y llega a la puerta. Son 3 niveles y cada uno es más grande que el anterior. El laberinto se juega con una de estas dos reglas, y tú eliges la que mejor encaja con el tema:
        - "orden" (patrones): el niño recoge las frutas siguiendo un patrón que se repite, por ejemplo dos frutas que se alternan o un grupo de tres que vuelve a empezar. Sirve para temas de patrones, secuencias, qué sigue y repetir un orden.
        - "solo_clase" (clasificar): el niño recoge solo las frutas, o solo las verduras, y deja las otras en el camino. Sirve para temas de clasificar, agrupar y reconocer a qué grupo pertenece algo.
        Elige según lo que el tema pide practicar. Si el tema no encaja en ninguna de las dos reglas, elige la que más se acerque y dilo con claridad en la historia: qué parte del tema practica el juego y qué parte no.

        Responde solo con un objeto JSON con estas claves:
        - "regla_juego": "orden" o "solo_clase", la regla que elegiste. Todo lo demás debe seguir esa regla.
        - "objetivo": una sola oración que empieza con «Los niños aprenderán a».
        - "historia": un único texto (string, nunca una lista), con 2 o 3 oraciones cortas: qué pasa en el laberinto y qué practica el niño.
        - "acciones": lo que hace el niño.
        - "reglas": cómo se juega con la regla que elegiste.
        - "retos": los desafíos de los niveles.
        - "ayudas": pistas que guían al niño.
        - "recursos": los dibujos que usa el juego.
        Cada lista tiene 2 o 3 textos cortos.

        Reglas:
        - No hay cuenta regresiva, ni vidas, ni corazones: equivocarse no termina el juego.
        - Ninguna ayuda dice la respuesta.
        - Solo existen estos objetos: frutas (fresa, plátano, mango, mandarina, piña) y verduras (zanahoria, papa, choclo). El único enemigo es el zorro. No inventes otros objetos ni otros juegos.
        - En "recursos" usa solo esos nombres y el cuy, que es quien juega. Si para el tema hace falta un dibujo que no está, escribe «Falta dibujar:» y qué falta.
        - No uses nombres de niños ni datos personales.
        """;
}
