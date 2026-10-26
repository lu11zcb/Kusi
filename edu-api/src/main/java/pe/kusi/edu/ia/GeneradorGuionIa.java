package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import pe.kusi.edu.laberinto.ProblemaLaberinto;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import static pe.kusi.edu.laberinto.CatalogoLaberinto.*;

// La llamada 2: pide a la IA el guion del laberinto con un esquema JSON estricto.
// Para que el esquema funcione con todos los proveedores no usa anyOf: la regla es
// siempre un solo objeto con tipo, secuencia, clase y meta (lo que no aplica va
// vacío), y ConstructorGuion la convierte después a la forma que lee el juego.
public class GeneradorGuionIa implements GeneradorGuion {
    private static final double TEMPERATURA = 0.8;
    private static final int NIVELES_PEDIDOS = 3;
    private static final List<String> ESQUINAS = List.of(
            "arriba a la izquierda", "arriba a la derecha", "abajo a la izquierda", "abajo a la derecha");

    private final ClienteIa cliente;
    private final ObjectMapper json;
    private final Random azar;

    // «azar» elige el plan de variación; las pruebas le pasan uno con semilla fija.
    public GeneradorGuionIa(ClienteIa cliente, ObjectMapper json, Random azar) {
        this.cliente = cliente;
        this.json = json;
        this.azar = azar;
    }

    public boolean configurado() { return true; }

    public String proveedor() { return cliente.proveedor(); }

    public String modelo() { return cliente.modelo(); }

    public JsonNode generarGuion(EntradaGuion entrada) throws FalloGeneracion {
        try {
            return cliente.pedirJson(INSTRUCCIONES, pedido(entrada), TEMPERATURA, "guion_laberinto_kusi", esquema());
        } catch (IOException e) {
            throw new FalloGeneracion("No se pudo preparar el pedido a la IA.", false);
        }
    }

    // ---------- Lo que se pide ----------

    String pedido(EntradaGuion e) throws IOException {
        StringBuilder texto = new StringBuilder("Propuesta aprobada por el docente (es todo lo que sabes del juego):");
        texto.append("\nCurso: ").append(e.cursoNombre());
        texto.append("\nGrado: ").append(e.grado()).append("° de primaria");
        texto.append("\nTema: ").append(e.tema());
        if (e.proposito() != null) texto.append("\nPropósito del juego: ").append(e.proposito());
        if (e.instrucciones() != null) texto.append("\nInstrucciones del docente: ").append(e.instrucciones());
        Map<String, Object> propuesta = e.propuesta();
        texto.append("\nObjetivo: ").append(propuesta.get("objetivo"));
        texto.append("\nHistoria: ").append(propuesta.get("historia"));
        for (String campo : List.of("acciones", "reglas", "retos", "ayudas", "recursos")) {
            if (!(propuesta.get(campo) instanceof List<?> elementos) || elementos.isEmpty()) continue;
            texto.append("\n").append(Character.toUpperCase(campo.charAt(0))).append(campo.substring(1)).append(":");
            for (Object elemento : elementos) texto.append("\n- ").append(elemento);
        }
        texto.append("\n\n").append(indicacionDeRegla(e.reglaJuego()));
        if (e.guionAnterior() == null) {
            texto.append("\n\n").append(planDeVariacion());
        } else {
            texto.append("\n\nEste es el intento ").append(e.intento()).append(" de ").append(e.intentosMaximos())
                    .append(". El guion que escribiste antes no pasó las comprobaciones. Problemas:");
            for (ProblemaLaberinto problema : e.problemas()) texto.append("\n- ").append(problema);
            texto.append("\n\nGuion anterior:\n").append(json.writeValueAsString(e.guionAnterior()));
            texto.append("\n\nEscribe el guion completo otra vez, corrigiendo todos esos problemas y cambiando lo menos posible.");
        }
        return texto.toString();
    }

    private String indicacionDeRegla(String reglaJuego) {
        if (REGLA_ORDEN.equals(reglaJuego)) {
            return "Regla del juego: la propuesta eligió «orden». Usa «orden» en todos los niveles.";
        }
        if (REGLA_SOLO_CLASE.equals(reglaJuego)) {
            return "Regla del juego: la propuesta eligió «solo_clase». Usa «solo_clase» en todos los niveles.";
        }
        return "Regla del juego: la propuesta no eligió una. Elige la que mejor encaje con el tema, «orden» o "
                + "«solo_clase», y úsala en todos los niveles.";
    }

    // Las IA no eligen bien «al azar»: tienden a repetir el mismo laberinto. El
    // azar lo pone el servidor, que sortea para cada nivel en qué esquina empieza el
    // cuy, en cuál está la puerta y por qué zonas repartir los objetos.
    String planDeVariacion() {
        String plan = "Plan de variación (síguelo, para que cada juego sea distinto):";
        for (int nivel = 1; nivel <= NIVELES_PEDIDOS; nivel++) {
            List<String> zonas = new ArrayList<>(ESQUINAS);
            Collections.shuffle(zonas, azar);
            plan += "\nNivel " + nivel + ": el cuy empieza cerca de la esquina " + zonas.get(0)
                    + " y la puerta está cerca de la esquina " + zonas.get(1)
                    + "; reparte los objetos empezando por la zona " + zonas.get(2) + " y terminando por la zona "
                    + zonas.get(3) + ".";
        }
        return plan;
    }

    // ---------- La forma de la respuesta ----------

    // Solo se usan palabras clave que admiten todos los proveedores de esquema
    // estricto: type, properties, required, additionalProperties, items y enum.
    static Map<String, Object> esquema() {
        Map<String, Object> cadena = Map.of("type", "string");
        Map<String, Object> entero = Map.of("type", "integer");
        Map<String, Object> tipoDeObjeto = Map.of("type", "string", "enum", TIPOS_OBJETO);

        Map<String, Object> regla = objeto(propiedades(
                "tipo", Map.of("type", "string", "enum", List.of(REGLA_ORDEN, REGLA_SOLO_CLASE)),
                "secuencia", lista(tipoDeObjeto),
                "clase", Map.of("type", "string", "enum", List.of("fruta", "verdura", "")),
                "meta", entero));
        Map<String, Object> objetoDelMapa = objeto(propiedades(
                "tipo", tipoDeObjeto, "fila", entero, "columna", entero));
        Map<String, Object> enemigo = objeto(propiedades(
                "tipo", Map.of("type", "string", "enum", List.of(TIPO_ENEMIGO)),
                "fila", entero, "columna", entero,
                "movimiento", Map.of("type", "string", "enum", MOVIMIENTOS_ENEMIGO)));
        Map<String, Object> nivel = objeto(propiedades(
                "mapa", lista(cadena), "regla", regla, "objetos", lista(objetoDelMapa),
                "enemigos", lista(enemigo), "consigna", cadena, "ayudas", lista(cadena)));
        return objeto(propiedades(
                "titulo", cadena, "meta", cadena, "consigna", cadena, "historia", cadena, "cierre", cadena,
                "retos", lista(nivel)));
    }

    private static Map<String, Object> lista(Map<String, Object> elementos) {
        return Map.of("type", "array", "items", elementos);
    }

    // Un objeto estricto: todas sus propiedades son obligatorias y no admite otras.
    private static Map<String, Object> objeto(Map<String, Object> propiedades) {
        return Map.of("type", "object", "properties", propiedades,
                "required", List.copyOf(propiedades.keySet()), "additionalProperties", false);
    }

    private static Map<String, Object> propiedades(Object... paresNombreYEsquema) {
        Map<String, Object> propiedades = new LinkedHashMap<>();
        for (int posicion = 0; posicion < paresNombreYEsquema.length; posicion += 2) {
            propiedades.put((String) paresNombreYEsquema[posicion], paresNombreYEsquema[posicion + 1]);
        }
        return propiedades;
    }

    // ---------- Las instrucciones ----------

    // No lleva ejemplos con valores reales (ni un mapa ni un objeto de muestra): la
    // IA los copiaría. Solo describe la forma y los límites.
    private static final String INSTRUCCIONES = """
        Eres el diseñador de niveles de Kusi, una app de juegos para niños de primer grado de primaria en Perú. A partir de la propuesta que aprobó el docente, escribes el guion de un juego de laberinto con 3 niveles. El niño mueve a un cuy por el laberinto, recoge frutas y verduras y llega a la puerta.

        Responde solo con un objeto JSON con estas claves:
        - "titulo": el nombre del juego, corto.
        - "meta": una frase corta con lo que el niño logra.
        - "consigna": una frase corta que explica el juego.
        - "historia": 1 o 2 oraciones sobre el juego.
        - "cierre": un mensaje corto y alegre para cuando el niño termina todos los niveles.
        - "retos": la lista de los 3 niveles. Cada nivel es un objeto con "mapa", "regla", "objetos", "enemigos", "consigna" y "ayudas".

        El mapa de cada nivel:
        - Es una lista de filas de texto, todas del mismo largo. Cada casilla es un símbolo: # muro, . camino, C inicio del cuy (uno solo) y P puerta (una sola).
        - Todo el borde del mapa es #. Máximo 9 filas y 15 columnas.
        - El camino es un laberinto de pasillos de una casilla de ancho, con vueltas y algunos callejones sin salida. No dejes salas abiertas.
        - Desde C se debe poder llegar a la puerta y a cada objeto caminando hacia arriba, abajo, izquierda o derecha. No se puede pasar por los muros ni a través de la puerta.
        - Cada nivel es igual o más grande que el anterior, en filas y en columnas. El primer nivel es el más pequeño.

        Los objetos de cada nivel: una lista de objetos con "tipo", "fila" y "columna". La fila y la columna empiezan en 0. La casilla debe ser camino (.), no el inicio ni la puerta, y dos cosas no pueden estar en la misma casilla. Los tipos son: fresa, platano, mango, mandarina y pina (frutas); zanahoria, papa y choclo (verduras). Escríbelos exactamente así, sin tildes.

        Los enemigos de cada nivel: una lista de objetos con "tipo" (siempre "zorro"), "fila", "columna" y "movimiento" ("patrulla" o "persigue_cerca"). El primer nivel no tiene enemigos (lista vacía). En los otros niveles pon de 0 a 2 zorros que empiecen a 3 o más casillas de camino del inicio.

        La regla de cada nivel es un objeto con "tipo", "secuencia", "clase" y "meta" (los cuatro, siempre):
        - Con "tipo": "orden", el niño recoge los objetos en el orden de la "secuencia". La secuencia es un patrón que se repite, de 4 a 8 objetos, con al menos dos tipos distintos (por ejemplo, dos tipos que se alternan, o un grupo de tres que se repite). El mapa debe tener al menos los objetos que pide la secuencia; puedes sumar otros como trampas. Pon "clase": "" y "meta": 0.
        - Con "tipo": "solo_clase", el niño recoge solo objetos de una clase. "clase" es "fruta" o "verdura" y "meta" es cuántos debe recoger, de 3 a 6. El mapa debe tener al menos "meta" objetos de esa clase y al menos uno de la otra clase, como trampa. Pon "secuencia": [].

        Los textos de cada nivel: una "consigna" que dice qué hacer y exactamente 2 "ayudas". Cada texto tiene 80 caracteres o menos, en español sencillo para un niño de 6 años. Las ayudas guían sin decir la respuesta: no nombran ninguna fruta ni verdura (ni en singular ni en plural) y no dicen el orden. Pueden hablar de «la fila de arriba», de «lo que se repite», de «las frutas» o de «las verduras» en general.

        Variedad: varía de verdad. No pongas todos los objetos en la misma fila ni en la misma columna, ni siempre en el mismo lado. Cada nivel debe tener otra forma de laberinto, otro lugar para el inicio y otro lugar para la puerta. Sigue el plan de variación que recibes.

        Otras reglas: no hay cuenta regresiva ni vidas; equivocarse no termina el juego. No uses nombres de niños ni datos personales. Todo en español.
        """;
}
