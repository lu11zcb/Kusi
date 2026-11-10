package pe.kusi.edu.taller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

// La revisión común del guion de un juego del taller: lo que Spring exige a todo juego
// antes de dejarlo «listo». Lo propio de cada juego lo revisa el validar de su ficha.
class ValidadorPaqueteTallerTest {

    private static final UUID TRABAJO = UUID.fromString("7a1f2b3c-4d5e-4f60-8a71-92b3c4d5e6f7");
    private final ObjectMapper json = new ObjectMapper();
    private final ValidadorPaqueteTaller validador = new ValidadorPaqueteTaller();

    // Un guion mínimo que pasa: dos niveles, cada uno con su consigna y sus dos ayudas.
    static ObjectNode guionBueno(ObjectMapper json, UUID trabajo) {
        ObjectNode guion = json.createObjectNode();
        guion.put("formato", "kusi-paquete/0");
        guion.put("familia", "memoria_andina");
        guion.put("trabajo", trabajo.toString());
        guion.put("titulo", "La memoria de Kusi");
        ArrayNode retos = guion.putArray("retos");
        for (int nivel = 1; nivel <= 2; nivel++) {
            ObjectNode reto = retos.addObject();
            reto.put("id", "nivel-" + nivel);
            reto.put("consigna", "Encuentra las parejas iguales.");
            reto.putArray("ayudas").add("Mira bien los colores.").add("Empieza por las esquinas.");
        }
        guion.putObject("cierre").put("mensaje", "¡Muy bien! Encontraste todas las parejas.");
        return guion;
    }

    private List<String> validar(ObjectNode guion) {
        return validador.validar(guion, TRABAJO, guion.toString().length());
    }

    @Test
    void un_guion_completo_pasa() {
        assertEquals(List.of(), validar(guionBueno(json, TRABAJO)));
    }

    @Test
    void los_ids_de_los_niveles_pueden_ser_numeros() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        ((ObjectNode) guion.get("retos").get(0)).put("id", 1);
        ((ObjectNode) guion.get("retos").get(1)).put("id", 2);
        assertEquals(List.of(), validar(guion));
    }

    @Test
    void rechaza_otro_formato_una_familia_mal_escrita_y_el_laberinto() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        guion.put("formato", "kusi-paquete/1");
        guion.put("familia", "Memoria");
        List<String> motivos = validar(guion);
        assertEquals(2, motivos.size(), motivos.toString());
        assertTrue(motivos.get(0).contains("formato"));
        assertTrue(motivos.get(1).contains("familia"));

        for (String mala : List.of("me", "1memoria", "memoria-andina", "memória", "a".repeat(42))) {
            guion = guionBueno(json, TRABAJO);
            guion.put("familia", mala);
            assertEquals(1, validar(guion).size(), "La familia «" + mala + "» no debía pasar.");
        }
        guion = guionBueno(json, TRABAJO);
        guion.put("familia", "laberinto");
        assertTrue(validar(guion).get(0).contains("laberinto"));
    }

    @Test
    void el_guion_trae_el_id_de_su_propio_trabajo() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        guion.put("trabajo", UUID.randomUUID().toString());
        assertTrue(validar(guion).get(0).contains(TRABAJO.toString()));
        guion.remove("trabajo");
        assertEquals(1, validar(guion).size());
    }

    @Test
    void tiene_de_uno_a_cinco_niveles() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        guion.putArray("retos");
        assertTrue(validar(guion).get(0).contains("de 1 a 5"));

        guion = guionBueno(json, TRABAJO);
        ArrayNode retos = (ArrayNode) guion.get("retos");
        for (int nivel = 3; nivel <= 6; nivel++) {
            ObjectNode reto = retos.addObject();
            reto.put("id", "nivel-" + nivel);
            reto.put("consigna", "Otra consigna.");
            reto.putArray("ayudas").add("Una.").add("Dos.");
        }
        assertTrue(validar(guion).get(0).contains("de 1 a 5"));
        retos.remove(5);
        assertEquals(List.of(), validar(guion));
    }

    @Test
    void cada_nivel_tiene_id_unico_consigna_y_exactamente_dos_ayudas_cortas() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        ObjectNode primero = (ObjectNode) guion.get("retos").get(0);
        ObjectNode segundo = (ObjectNode) guion.get("retos").get(1);
        primero.remove("consigna");
        segundo.put("id", "nivel-1");
        segundo.putArray("ayudas").add("Solo una.");
        List<String> motivos = validar(guion);
        assertEquals(3, motivos.size(), motivos.toString());
        assertTrue(motivos.get(0).startsWith("Nivel 1: «consigna»"));
        assertTrue(motivos.get(1).contains("repetido"));
        assertTrue(motivos.get(2).contains("exactamente 2"));
    }

    @Test
    void la_consigna_y_las_ayudas_tienen_90_caracteres_como_maximo() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        ObjectNode reto = (ObjectNode) guion.get("retos").get(0);
        reto.put("consigna", "a".repeat(90));
        reto.putArray("ayudas").add("ñ".repeat(90)).add("b".repeat(90));
        assertEquals(List.of(), validar(guion));

        reto.put("consigna", "a".repeat(91));
        reto.putArray("ayudas").add("Una ayuda corta.").add("b".repeat(91));
        List<String> motivos = validar(guion);
        assertEquals(2, motivos.size(), motivos.toString());
        assertTrue(motivos.get(0).contains("91 caracteres"));
        assertTrue(motivos.get(1).contains("la ayuda 2"));
    }

    @Test
    void los_caracteres_se_cuentan_de_verdad_aunque_ocupen_dos_unidades() {
        // 90 emojis: 180 unidades de Java, pero 90 caracteres.
        ObjectNode guion = guionBueno(json, TRABAJO);
        ((ObjectNode) guion.get("retos").get(0)).put("consigna", "🍓".repeat(90));
        assertEquals(List.of(), validar(guion));
    }

    @Test
    void falta_el_mensaje_del_cierre() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        guion.putObject("cierre");
        assertTrue(validar(guion).get(0).contains("cierre.mensaje"));
        guion.remove("cierre");
        assertTrue(validar(guion).get(0).contains("cierre.mensaje"));
    }

    @Test
    void un_guion_demasiado_grande_se_rechaza() {
        ObjectNode guion = guionBueno(json, TRABAJO);
        List<String> motivos = validador.validar(guion, TRABAJO, ValidadorPaqueteTaller.MAX_CARACTERES_PAQUETE + 1);
        assertEquals(1, motivos.size());
        assertTrue(motivos.get(0).contains("máximo"));
    }

    @Test
    void algo_que_no_es_un_objeto_no_es_un_guion() {
        assertEquals(1, validador.validar(json.createArrayNode(), TRABAJO, 2).size());
        assertEquals(1, validador.validar(null, TRABAJO, 0).size());
    }
}
