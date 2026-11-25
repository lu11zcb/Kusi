package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;

import java.text.Normalizer;
import java.util.*;
import java.util.regex.Pattern;

final class PrivacidadConsultaKusi {
    private static final Pattern PALABRA = Pattern.compile("[\\p{L}\\p{M}]+|[0-9]+");
    private static final Pattern IDENTIFICADOR = Pattern.compile(
            "(?iu)[a-z0-9._%+\\-]+@[a-z0-9.\\-]+|\\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\\b"
                    + "|(?<!\\d)(?:\\d[ .\\-]?){7}\\d|(?:https?://|www\\.)\\S+");
    static final String DATO_OCULTO = "[dato oculto]";

    private final Set<String> nombres = new HashSet<>();

    PrivacidadConsultaKusi(Collection<String> estudiantes) {
        estudiantes.forEach(nombre -> PALABRA.matcher(normalizar(nombre)).results().map(r -> r.group())
                .filter(palabra -> palabra.length() > 1 && !Set.of("de", "del", "la", "las", "los", "san", "santa").contains(palabra))
                .forEach(nombres::add));
    }

    /**
     * Lo que escribió el docente llega tal cual, como en cualquier chat, también los nombres de sus estudiantes (Kusi Sabio
     * los recibe por decisión del equipo). Solo se ocultan los datos que no hacen falta para conversar: un DNI, un correo,
     * un teléfono, un enlace o un id pasan a «[dato oculto]».
     */
    String conversacion(String texto) {
        return IDENTIFICADOR.matcher(texto).replaceAll(DATO_OCULTO).strip();
    }

    // El contenido de la propuesta (objetivo, historia, retos) pasa entero; solo se ocultan los datos personales.
    String contenido(String texto) {
        // La propuesta aprobada aporta contenido pedagógico. Se omite un
        // fragmento completo si el docente incluyó una referencia personal.
        return IDENTIFICADOR.matcher(texto).replaceAll(DATO_OCULTO);
    }

    String etiqueta(JsonNode valor, Set<String> vocabularioJuego) {
        if (!(valor.isTextual() || valor.isIntegralNumber())) return "";
        String texto = valor.asText().strip();
        if (texto.length() > 50 || !texto.matches("[\\p{L}\\p{M}0-9 _-]+")
                || IDENTIFICADOR.matcher(texto).find() || contieneNombre(texto)) return "";
        // Un aviso nunca aporta texto libre. Solo se cuenta una respuesta de
        // vocabulario conocido, o un número corto que no puede ser un DNI.
        String clave = normalizar(texto).replace('_', ' ').replace('-', ' ');
        return clave.matches("[0-9]{1,4}") || Arrays.stream(clave.split(" +")).allMatch(vocabularioJuego::contains)
                ? clave : "";
    }

    static String normalizar(String texto) {
        return Normalizer.normalize(texto, Normalizer.Form.NFD).replaceAll("\\p{M}+", "").toLowerCase(Locale.ROOT);
    }

    private boolean contieneNombre(String texto) {
        return PALABRA.matcher(normalizar(texto)).results().anyMatch(palabra -> nombres.contains(palabra.group()));
    }

    Set<String> vocabularioJuego(String texto) {
        Set<String> vocabulario = new HashSet<>();
        PALABRA.matcher(normalizar(texto)).results().forEach(r -> vocabulario.add(r.group()));
        return vocabulario;
    }
}
