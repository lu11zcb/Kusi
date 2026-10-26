package pe.kusi.edu.ia;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

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

    // La forma de la respuesta: la historia es un texto y todo lo demás, listas de
    // textos. Se exige antes de recibirla; el validador local sigue siendo obligatorio.
    private Map<String, Object> esquema() {
        Map<String, Object> texto = Map.of("type", "string");
        Map<String, Object> lista = Map.of("type", "array", "items", texto);
        Map<String, Object> propiedades = new LinkedHashMap<>();
        propiedades.put("objetivo", texto);
        propiedades.put("historia", texto);
        for (String campo : List.of("acciones", "reglas", "retos", "ayudas", "recursos")) propiedades.put(campo, lista);
        return Map.of("type", "object", "properties", propiedades,
                "required", List.of("objetivo", "historia", "acciones", "reglas", "retos", "ayudas", "recursos"),
                "additionalProperties", false);
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
            texto.append("\nPropuesta actual: ").append(json.writeValueAsString(e.propuestaBase()));
            texto.append("\nObservaciones: ").append(e.observaciones());
        } else if ("alternativa".equals(e.tipo())) {
            texto.append("\n\nEl docente rechazó esta propuesta. Crea una alternativa claramente distinta.");
            texto.append("\nPropuesta rechazada: ").append(json.writeValueAsString(e.propuestaBase()));
            if (e.observaciones() != null) texto.append("\nMotivo: ").append(e.observaciones());
        }
        return texto.toString();
    }

    private static final String INSTRUCCIONES = """
        Eres el asistente de Kusi, una app de juegos para niños de primer grado de primaria en Perú. Propones un juego a partir del tema del docente. La propuesta la lee el docente: escribe corto, en español sencillo y sin palabras técnicas.

        Kusi sabe hacer dos juegos 2D. Propón uno de ellos:
        - El mercado (Matemática): Kusi, un cuy, le da al niño su lista de compras y 15 soles. El niño camina por una plaza, compra en puestos donde venden animales de los Andes, paga con billetes y monedas, revisa su vuelto y ayuda a los vendedores con favores: contar, sumar, restar, completar hasta 10 y comparar precios. Al final, Kusi cocina con lo que trajo.
        - El juego de ordenar (cualquier curso): el niño pone en orden escenas o pasos, por ejemplo una receta, cómo crece una planta, las partes de un cuento o la rutina del día.
        Si el tema no encaja en ninguno de los dos, propón el que más se acerque y dilo en la historia.

        Responde solo con un objeto JSON con estas claves:
        - "objetivo": una sola oración que empieza con «Los niños aprenderán a».
        - "historia": un único texto (string, nunca una lista), con 2 o 3 oraciones cortas: qué juego es y qué pasa en él.
        - "acciones": lo que hace el niño.
        - "reglas": cómo funciona el juego.
        - "retos": los desafíos o favores del juego.
        - "ayudas": pistas que guían al niño.
        - "recursos": los dibujos que usa el juego.
        Cada lista tiene 2 o 3 textos cortos.

        Reglas:
        - No hay cuenta regresiva, ni vidas, ni corazones: equivocarse no termina el juego.
        - Ninguna ayuda dice la respuesta.
        - En "recursos" usa solo nombres de esta lista. Si para el tema hace falta un dibujo que no está, escribe «Falta dibujar:» y qué falta.
          Puestos: pan, frutas, verduras, granja, granos, dulces.
          Vendedores: llama, alpaca, vicuña, vizcacha, zorro, cóndor, gallito de las rocas, oso de anteojos, cuy, perro, gato, paloma, oveja, loro.
          Productos: pan, harina, galleta, avena, alfajor, manzana, fresa, plátano, mango, piña, uva, naranja, papaya, mandarina, granadilla, lúcuma, aguaymanto, papa, choclo, zanahoria, tomate, cebolla, palta, camote, zapallo, huevo, leche, queso, yogur, mantequilla, arroz, quinua, azúcar, sal, fideos, maíz morado, chocolate, caramelo, miel, mermelada, chupetín.
        - No uses nombres de niños ni datos personales.
        """;
}
