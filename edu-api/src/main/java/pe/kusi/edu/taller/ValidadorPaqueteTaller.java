package pe.kusi.edu.taller;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Revisa la parte común del guion de un juego del taller: la que comparten todos los
 * juegos (kusi-paquete/0, ver juego/taller/entrega.md §4). Lo propio de cada juego
 * (sus objetos, sus reglas) lo revisa el «validar» de su ficha, que corre el trabajador
 * antes de entregar. Devuelve los motivos en español, para que el taller corrija; una
 * lista vacía quiere decir que el guion pasa.
 */
@Component
public class ValidadorPaqueteTaller {

    public static final String FORMATO = "kusi-paquete/0";
    // Minúsculas, sin tildes y con guion bajo, de 3 a 41 caracteres (entrega.md §3).
    public static final Pattern FAMILIA = Pattern.compile("^[a-z][a-z0-9_]{2,40}$");
    // El laberinto tiene su propio camino (Spring con la IA): el taller no lo repite.
    public static final String FAMILIA_LABERINTO = "laberinto";
    public static final int MIN_RETOS = 1;
    public static final int MAX_RETOS = 5;
    public static final int AYUDAS_POR_RETO = 2;
    // La misma medida que el laberinto: una consigna o una ayuda cabe en el globo de Kusi.
    public static final int MAX_CARACTERES_TEXTO = 90;
    // Un guion es texto: 256 KB alcanzan de sobra y protegen a la base y a la app.
    public static final int MAX_CARACTERES_PAQUETE = 256 * 1024;

    /**
     * @param paquete            el guion que entregó el taller
     * @param trabajo            el id del trabajo: el guion lo trae en «trabajo»
     * @param caracteresPaquete  el largo del guion escrito como texto JSON
     */
    public List<String> validar(JsonNode paquete, UUID trabajo, int caracteresPaquete) {
        List<String> motivos = new ArrayList<>();
        if (paquete == null || !paquete.isObject()) {
            motivos.add("El guion debe ser un objeto JSON.");
            return motivos;
        }
        if (caracteresPaquete > MAX_CARACTERES_PAQUETE) {
            motivos.add("El guion mide " + caracteresPaquete + " caracteres; el máximo es "
                    + MAX_CARACTERES_PAQUETE + ".");
        }

        if (!FORMATO.equals(paquete.path("formato").asText(null))) {
            motivos.add("«formato» debe ser «" + FORMATO + "».");
        }

        String familia = paquete.path("familia").isTextual() ? paquete.path("familia").asText() : null;
        if (familia == null || !FAMILIA.matcher(familia).matches()) {
            motivos.add("«familia» debe tener de 3 a 41 caracteres: minúsculas sin tildes, números "
                    + "o guion bajo, y empezar con una letra (por ejemplo, «memoria»).");
        } else if (FAMILIA_LABERINTO.equals(familia)) {
            motivos.add("La familia «laberinto» ya existe y se genera por su propio camino: "
                    + "el juego del taller necesita una familia nueva.");
        }

        if (!trabajo.toString().equals(paquete.path("trabajo").asText(null))) {
            motivos.add("«trabajo» debe ser el id de este trabajo: " + trabajo + ".");
        }

        revisarRetos(paquete.get("retos"), motivos);

        JsonNode cierre = paquete.get("cierre");
        if (cierre == null || !cierre.isObject() || !textoConContenido(cierre.get("mensaje"))) {
            motivos.add("Falta «cierre.mensaje»: lo que dice Kusi al terminar el juego.");
        }
        return motivos;
    }

    private void revisarRetos(JsonNode retos, List<String> motivos) {
        if (retos == null || !retos.isArray() || retos.size() < MIN_RETOS || retos.size() > MAX_RETOS) {
            motivos.add("«retos» debe ser una lista de " + MIN_RETOS + " a " + MAX_RETOS + " niveles.");
            return;
        }
        Set<String> ids = new HashSet<>();
        for (int i = 0; i < retos.size(); i++) {
            JsonNode reto = retos.get(i);
            String nivel = "Nivel " + (i + 1) + ": ";
            if (!reto.isObject()) {
                motivos.add(nivel + "debe ser un objeto.");
                continue;
            }

            // El id puede ser un texto o un número entero, pero no se repite.
            JsonNode id = reto.get("id");
            boolean idValido = id != null
                    && ((id.isTextual() && !id.asText().isBlank()) || id.isIntegralNumber());
            if (!idValido) {
                motivos.add(nivel + "falta su «id».");
            } else if (!ids.add(id.asText())) {
                motivos.add(nivel + "el id «" + id.asText() + "» está repetido.");
            }

            revisarTexto(reto.get("consigna"), nivel + "«consigna»", motivos);

            JsonNode ayudas = reto.get("ayudas");
            if (ayudas == null || !ayudas.isArray() || ayudas.size() != AYUDAS_POR_RETO) {
                motivos.add(nivel + "debe tener exactamente " + AYUDAS_POR_RETO + " «ayudas».");
            } else {
                for (int a = 0; a < ayudas.size(); a++) {
                    revisarTexto(ayudas.get(a), nivel + "la ayuda " + (a + 1), motivos);
                }
            }
        }
    }

    // Un texto para el niño: no vacío y de 90 caracteres como máximo. Se cuentan los
    // caracteres de verdad (puntos de código), no las unidades internas de Java.
    private void revisarTexto(JsonNode texto, String donde, List<String> motivos) {
        if (!textoConContenido(texto)) {
            motivos.add(donde + " falta o está vacía.");
            return;
        }
        String valor = texto.asText();
        int largo = valor.codePointCount(0, valor.length());
        if (largo > MAX_CARACTERES_TEXTO) {
            motivos.add(donde + " tiene " + largo + " caracteres; el máximo es " + MAX_CARACTERES_TEXTO + ".");
        }
    }

    private static boolean textoConContenido(JsonNode nodo) {
        return nodo != null && nodo.isTextual() && !nodo.asText().isBlank();
    }
}
