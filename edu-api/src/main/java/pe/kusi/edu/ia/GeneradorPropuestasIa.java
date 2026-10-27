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
    // sigue siendo obligatorio. El tipo de juego y la regla van primero para que la IA los
    // elija antes de escribir el resto, que debe seguirlos. «objetos» es interno: con él Kusi
    // comprueba si puede construir el juego; el docente no lo ve.
    static Map<String, Object> esquema() {
        Map<String, Object> texto = Map.of("type", "string");
        Map<String, Object> lista = Map.of("type", "array", "items", texto);
        Map<String, Object> propiedades = new LinkedHashMap<>();
        propiedades.put("tipo_juego", Map.of("type", "string", "enum", List.of("laberinto", "otro")));
        propiedades.put("regla_juego", Map.of("type", "string", "enum", List.of(REGLA_ORDEN, REGLA_SOLO_CLASE, "ninguna")));
        propiedades.put("objetivo", texto);
        propiedades.put("historia", texto);
        for (String campo : List.of("acciones", "reglas", "retos", "ayudas", "recursos", "objetos")) propiedades.put(campo, lista);
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
            texto.append("\nSi las observaciones no piden otro juego ni otra regla, conserva «tipo_juego» y «regla_juego» como están.");
            texto.append("\nPropuesta actual: ").append(json.writeValueAsString(e.propuestaBase()));
            texto.append("\nObservaciones: ").append(e.observaciones());
        } else if ("alternativa".equals(e.tipo())) {
            texto.append("\n\nEl docente rechazó esta propuesta. Crea una alternativa claramente distinta.");
            texto.append("\nPropuesta rechazada: ").append(json.writeValueAsString(e.propuestaBase()));
            if (e.observaciones() != null) texto.append("\nMotivo: ").append(e.observaciones());
        }
        return texto.toString();
    }

    // La propuesta diseña el juego que de verdad corresponde al tema. Si ese juego es el
    // laberinto que Kusi ya sabe construir, lo marca como «laberinto» y elige su regla; si
    // el tema pide otro juego, lo diseña igual y lo marca como «otro» (se guarda, pero
    // todavía no se genera). El texto que lee el docente describe el juego como debe ser:
    // no habla de lo que la app tiene ni de lo que falta.
    // No lleva ejemplos de secuencias ni de mapas: la IA los copiaría en su propuesta y
    // de ahí pasarían al guion.
    private static final String INSTRUCCIONES = """
        Eres el asistente de Kusi, una app de juegos para niños de primer grado de primaria en Perú. A partir del tema del docente diseñas el juego que mejor enseña ese tema, con todo su sentido: qué aprende el niño, qué hace, qué ve y cómo sube la dificultad. La propuesta la lee el docente: escribe corto, en español sencillo y sin palabras técnicas. Describe el juego tal como debe ser: no hables de lo que la app tiene o no tiene, ni de dibujos que falten.

        Kusi, el cuy guía con sombrero y poncho, acompaña al niño en cualquier juego: le da la consigna con voz y lo ayuda.

        Kusi ya sabe construir un juego: el laberinto. El niño mueve a un cuy por los caminos, recoge frutas y verduras, esquiva al zorro y llega al portal. Son 3 niveles y cada uno es más grande que el anterior. En el laberinto solo hay estas frutas (fresa, plátano, mango, mandarina, piña) y estas verduras (zanahoria, papa, choclo), y se juega con una de dos reglas:
        - "orden" (patrones): el niño recoge las frutas siguiendo un patrón que se repite, por ejemplo dos frutas que se alternan o un grupo de tres que vuelve a empezar. Sirve para patrones, secuencias, qué sigue y repetir un orden.
        - "solo_clase" (clasificar): el niño recoge solo las frutas, o solo las verduras, y deja las otras en el camino. Sirve para clasificar, agrupar y reconocer a qué grupo pertenece algo.

        Cómo eliges el juego:
        - Si el tema se aprende bien con ese laberinto (patrones o clasificar con esas frutas y verduras), propón el laberinto: "tipo_juego": "laberinto" y la regla que mejor encaje.
        - Si el tema pide otra cosa (otro curso, otros dibujos u otra forma de jugar), diseña el juego que de verdad le corresponde, con sus propios dibujos y acciones: "tipo_juego": "otro" y "regla_juego": "ninguna". No metas el tema a la fuerza en el laberinto de frutas.

        Responde solo con un objeto JSON con estas claves:
        - "tipo_juego": "laberinto" u "otro".
        - "regla_juego": "orden" o "solo_clase" si es el laberinto; "ninguna" si es otro juego. Todo lo demás debe seguir lo que elegiste.
        - "objetivo": una sola oración que empieza con «Los niños aprenderán a».
        - "historia": un único texto (string, nunca una lista), con 2 o 3 oraciones cortas: de qué trata el juego y qué practica el niño.
        - "acciones": lo que hace el niño.
        - "reglas": cómo se juega.
        - "retos": los desafíos de cada nivel, de más fácil a más difícil.
        - "ayudas": pistas que guían al niño.
        - "recursos": los dibujos y elementos que se ven en el juego.
        - "objetos": los nombres de las cosas que el niño recoge, ordena o usa, sin los personajes. En el laberinto, solo de la lista de frutas y verduras.
        Cada lista tiene 2 o 3 textos cortos; "objetos" puede tener hasta 8.

        Reglas:
        - No hay cuenta regresiva, ni vidas, ni corazones: equivocarse no termina el juego.
        - Ninguna ayuda dice la respuesta.
        - En el laberinto, el único enemigo es el zorro, que es travieso y no da miedo.
        - No uses nombres de niños ni datos personales.
        """;
}
