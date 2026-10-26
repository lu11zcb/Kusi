package pe.kusi.edu.laberinto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

// HU26: el constructor pasa la respuesta de la IA a la forma que lee el juego y arma el
// guion de respaldo con los mapas base. Todo se comprueba con el validador de la HU31.
class ConstructorGuionTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String CURSO = "Matemática";

    private final ValidadorLaberinto validador = new ValidadorLaberinto();
    private final List<JsonNode> mapasBase = new MapasBase(JSON).niveles();

    private static List<String> nombresDeCampos(JsonNode objeto) {
        List<String> nombres = new ArrayList<>();
        objeto.fieldNames().forEachRemaining(nombres::add);
        return nombres;
    }

    private static MapaLaberinto mapaDe(JsonNode mapa) {
        List<String> filas = new ArrayList<>();
        mapa.forEach(fila -> filas.add(fila.asText()));
        return new MapaLaberinto(filas);
    }

    // ---------- desdeLaIa ----------

    @Test
    void laRespuestaDeLaIaSeConvierteEnElGuionQueLeeElJuego() throws Exception {
        ObjectNode guion = ConstructorGuion.desdeLaIa(GuionesDePrueba.respuestaBuena(), CURSO);

        assertEquals(List.of(), validador.validar(guion));
        assertEquals("kusi-paquete/0", guion.get("formato").asText());
        assertEquals("laberinto", guion.get("familia").asText());
        assertEquals("horizontal", guion.get("orientacion").asText());
        assertEquals(CURSO, guion.get("curso").asText());
        assertEquals("¡Lo lograste! Gracias por recorrer los caminos con Kusi.", guion.get("cierre").get("mensaje").asText());
        List<String> ids = new ArrayList<>();
        guion.get("retos").forEach(reto -> ids.add(reto.get("id").asText()));
        assertEquals(List.of("laberinto-1", "laberinto-2", "laberinto-3"), ids);
    }

    @Test
    void elEjemploDelJuegoEnFormaDeRespuestaDeLaIaVuelveAserElMismoGuion() throws Exception {
        ObjectNode ejemplo = GuionesDePrueba.ejemplo();

        assertEquals(ejemplo, ConstructorGuion.desdeLaIa(GuionesDePrueba.respuestaDeLaIa(ejemplo), CURSO));
    }

    @Test
    void cadaReglaSoloLlevaLoQueLeAplica() throws Exception {
        ObjectNode guion = ConstructorGuion.desdeLaIa(GuionesDePrueba.respuestaBuena(), CURSO);

        // «orden» lleva su secuencia; «solo_clase», su clase y su meta (sin campos vacíos).
        assertEquals(List.of("tipo", "secuencia"), nombresDeCampos(guion.get("retos").get(0).get("regla")));
        assertEquals(List.of("tipo", "clase", "meta"), nombresDeCampos(guion.get("retos").get(2).get("regla")));
    }

    @Test
    void lasRespuestasDeUnaSolaReglaPasanLasComprobacionesDeEsaReglaYNoLasDeLaOtra() throws Exception {
        for (String regla : List.of("orden", "solo_clase")) {
            String otra = regla.equals("orden") ? "solo_clase" : "orden";
            ObjectNode guion = ConstructorGuion.desdeLaIa(GuionesDePrueba.respuestaConLaRegla(regla), CURSO);

            assertEquals(List.of(), validador.validar(guion, regla), regla);
            guion.get("retos").forEach(reto -> assertEquals(regla, reto.get("regla").get("tipo").asText()));
            // Contra la otra regla, cada uno de los tres niveles se señala como distinto.
            long distintos = validador.validar(guion, otra).stream().filter(problema -> problema.codigo().equals("REGLA_DISTINTA")).count();
            assertEquals(3, distintos, regla + " contra " + otra);
        }
    }

    // El juego prueba en el navegador estos mismos guiones (juego/pruebas/fixtures): si Spring
    // y el juego dejaran de entenderse, esta prueba lo avisa antes de que lo note un niño.
    @Test
    void losGuionesDeUnaSolaReglaSonLosQueElJuegoPruebaEnElNavegador() throws Exception {
        assertEquals(GuionesDePrueba.guionDelJuego("laberinto-orden.json"),
            ConstructorGuion.desdeLaIa(GuionesDePrueba.respuestaConLaRegla("orden"), CURSO));
        assertEquals(GuionesDePrueba.guionDelJuego("laberinto-solo-clase.json"),
            ConstructorGuion.desdeLaIa(GuionesDePrueba.respuestaConLaRegla("solo_clase"), CURSO));
    }

    @Test
    void unaReglaDeTipoDesconocidoSeDejaTalCualParaQueElValidadorLaSenale() throws Exception {
        ObjectNode respuesta = GuionesDePrueba.respuestaBuena();
        ((ObjectNode) respuesta.get("retos").get(0).get("regla")).put("tipo", "mercado");

        ObjectNode guion = ConstructorGuion.desdeLaIa(respuesta, CURSO);

        assertEquals(4, guion.get("retos").get(0).get("regla").size());
        assertTrue(validador.validar(guion).stream().anyMatch(problema -> problema.codigo().equals("REGLA_TIPO")));
    }

    @Test
    void loQueNoEsUnObjetoNoEsUnGuion() throws Exception {
        assertNull(ConstructorGuion.desdeLaIa(null, CURSO));
        assertNull(ConstructorGuion.desdeLaIa(JSON.readTree("[1, 2]"), CURSO));
        assertNull(ConstructorGuion.desdeLaIa(JSON.readTree("\"hola\""), CURSO));
    }

    @Test
    void unaRespuestaIncompletaSeConvierteSinFallarYElValidadorLaRechaza() throws Exception {
        ObjectNode vacio = ConstructorGuion.desdeLaIa(JSON.readTree("{}"), CURSO);
        assertTrue(validador.validar(vacio).stream().anyMatch(problema -> problema.codigo().equals("NIVELES_CANTIDAD")));

        ObjectNode nivelesRaros = ConstructorGuion.desdeLaIa(JSON.readTree("{\"titulo\":\"x\",\"retos\":[1,\"a\",null]}"), CURSO);
        assertFalse(validador.validar(nivelesRaros).isEmpty());
    }

    @Test
    void sinCursoNoSeInventaUnoYUnCierreVacioNoCreaElBloque() throws Exception {
        ObjectNode respuesta = GuionesDePrueba.respuestaBuena();
        respuesta.put("cierre", "");

        ObjectNode guion = ConstructorGuion.desdeLaIa(respuesta, null);

        assertFalse(guion.has("curso"));
        assertFalse(guion.has("cierre"));
    }

    // ---------- conMapasBase ----------

    @Test
    void conMapasRotosElRespaldoDaUnGuionQuePasaTodasLasComprobaciones() throws Exception {
        ObjectNode respuesta = GuionesDePrueba.respuestaConMapasRotos();
        ObjectNode ejemplo = GuionesDePrueba.ejemplo();
        // Tal cual, la respuesta no pasa: ese es el caso que resuelve el respaldo.
        assertFalse(validador.validar(ConstructorGuion.desdeLaIa(respuesta, CURSO)).isEmpty());

        ObjectNode guion = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase).orElseThrow();

        assertEquals(List.of(), validador.validar(guion));
        for (int nivel = 0; nivel < 3; nivel++) {
            JsonNode reto = guion.get("retos").get(nivel);
            JsonNode delEjemplo = ejemplo.get("retos").get(nivel);
            String cual = "nivel " + (nivel + 1);
            // De los mapas base: el mapa y los enemigos.
            assertEquals(mapasBase.get(nivel).get("mapa"), reto.get("mapa"), cual);
            assertEquals(mapasBase.get(nivel).get("enemigos"), reto.get("enemigos"), cual);
            // De la IA: la regla, la consigna, las ayudas y cuántos objetos y de qué tipo.
            assertEquals(delEjemplo.get("regla"), reto.get("regla"), cual);
            assertEquals(delEjemplo.get("consigna"), reto.get("consigna"), cual);
            assertEquals(delEjemplo.get("ayudas"), reto.get("ayudas"), cual);
            List<String> tiposDelEjemplo = new ArrayList<>();
            delEjemplo.get("objetos").forEach(objeto -> tiposDelEjemplo.add(objeto.get("tipo").asText()));
            List<String> tiposColocados = new ArrayList<>();
            reto.get("objetos").forEach(objeto -> tiposColocados.add(objeto.get("tipo").asText()));
            assertEquals(tiposDelEjemplo.stream().sorted().toList(), tiposColocados.stream().sorted().toList(), cual);
        }
    }

    @Test
    void conLaReglaOrdenLosObjetosVanEnElOrdenDeLaSecuenciaDeCercaALejos() throws Exception {
        ObjectNode guion = ConstructorGuion.conMapasBase(GuionesDePrueba.respuestaConMapasRotos(), CURSO, mapasBase).orElseThrow();
        JsonNode nivel = guion.get("retos").get(0);
        MapaLaberinto mapa = mapaDe(nivel.get("mapa"));

        List<String> tipos = new ArrayList<>();
        nivel.get("objetos").forEach(objeto -> tipos.add(objeto.get("tipo").asText()));
        List<String> secuencia = new ArrayList<>();
        nivel.get("regla").get("secuencia").forEach(tipo -> secuencia.add(tipo.asText()));
        assertEquals(secuencia, tipos);

        int distanciaAnterior = 0;
        for (JsonNode objeto : nivel.get("objetos")) {
            int distancia = mapa.distancia(objeto.get("fila").asInt(), objeto.get("columna").asInt());
            assertTrue(distancia >= distanciaAnterior, "Los objetos deben ir de cerca a lejos del inicio.");
            distanciaAnterior = distancia;
        }
    }

    @Test
    void losObjetosRecolocadosNoPisanEnemigosNiSeRepitenNiEstanPegadosAlInicio() throws Exception {
        ObjectNode guion = ConstructorGuion.conMapasBase(GuionesDePrueba.respuestaConMapasRotos(), CURSO, mapasBase).orElseThrow();

        for (JsonNode nivel : guion.get("retos")) {
            MapaLaberinto mapa = mapaDe(nivel.get("mapa"));
            Set<String> ocupadas = new HashSet<>();
            nivel.get("enemigos").forEach(enemigo -> ocupadas.add(enemigo.get("fila").asInt() + "," + enemigo.get("columna").asInt()));
            for (JsonNode objeto : nivel.get("objetos")) {
                int fila = objeto.get("fila").asInt();
                int columna = objeto.get("columna").asInt();
                assertTrue(mapa.esCamino(fila, columna));
                assertTrue(mapa.distancia(fila, columna) >= 2, "Un objeto quedó pegado al inicio.");
                assertTrue(ocupadas.add(fila + "," + columna), "Dos cosas quedaron en la casilla " + fila + "," + columna);
            }
        }
    }

    @Test
    void siSobranObjetosSoloSeColocanLosQueCaben() {
        ArrayNode muchos = JSON.createArrayNode();
        for (int numero = 0; numero < 200; numero++) muchos.addObject().put("tipo", "fresa");

        ArrayNode colocados = ConstructorGuion.recolocarObjetos(muchos, JSON.createObjectNode(), mapasBase.get(0));

        Set<String> casillas = new HashSet<>();
        colocados.forEach(objeto -> casillas.add(objeto.get("fila").asInt() + "," + objeto.get("columna").asInt()));
        assertTrue(colocados.size() > 0 && colocados.size() < 200);
        assertEquals(colocados.size(), casillas.size(), "Hay casillas repetidas.");
    }

    @Test
    void unTituloVacioSeCompletaEnElRespaldo() throws Exception {
        ObjectNode respuesta = GuionesDePrueba.respuestaConMapasRotos();
        respuesta.put("titulo", "");

        ObjectNode guion = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase).orElseThrow();

        assertFalse(guion.get("titulo").asText().isBlank());
        assertEquals(List.of(), validador.validar(guion));
    }

    @Test
    void completaLosNivelesAusentesYNoNecesitaUnaRespuestaBienFormada() throws Exception {
        ObjectNode dosNiveles = GuionesDePrueba.respuestaConMapasRotos();
        ((ArrayNode) dosNiveles.get("retos")).remove(2);
        assertEquals(List.of(), validador.validar(ConstructorGuion.conMapasBase(dosNiveles, CURSO, mapasBase).orElseThrow()));

        ObjectNode nivelRaro = GuionesDePrueba.respuestaConMapasRotos();
        ((ArrayNode) nivelRaro.get("retos")).set(1, JSON.getNodeFactory().textNode("no soy un nivel"));
        assertEquals(List.of(), validador.validar(ConstructorGuion.conMapasBase(nivelRaro, CURSO, mapasBase).orElseThrow()));

        assertEquals(List.of(), validador.validar(ConstructorGuion.conMapasBase(JSON.readTree("[]"), CURSO, mapasBase).orElseThrow()));
        assertEquals(Optional.empty(), ConstructorGuion.conMapasBase(GuionesDePrueba.respuestaConMapasRotos(), CURSO, mapasBase.subList(0, 2)));
    }

    @Test
    void reparaLosDefectosRealesSinAflojarHU31() throws Exception {
        for (String tipo : List.of("orden", "solo_clase")) {
            for (String defecto : List.of("tres", "nueve", "iguales", "sinPatron", "desconocidos", "meta", "sinObjetos", "consigna", "ayuda", "dosNiveles", "sinAyudas")) {
                ObjectNode respuesta = GuionesDePrueba.respuestaConLaRegla(tipo);
                for (JsonNode nivel : respuesta.path("retos")) {
                    ObjectNode regla = (ObjectNode) nivel.get("regla");
                    if (List.of("tres", "nueve", "iguales", "sinPatron", "desconocidos").contains(defecto)) {
                        ArrayNode secuencia = regla.putArray("secuencia");
                        List<String> valores = switch (defecto) {
                            case "tres" -> List.of("fresa", "platano", "fresa");
                            case "nueve" -> List.of("fresa", "platano", "fresa", "platano", "fresa", "platano", "fresa", "platano", "fresa");
                            case "iguales" -> List.of("fresa", "fresa", "fresa", "fresa");
                            case "sinPatron" -> List.of("fresa", "platano", "mango", "pina");
                            default -> List.of("inventado", "otro", "inventado", "otro");
                        };
                        valores.forEach(secuencia::add);
                        if (defecto.equals("desconocidos")) ((ObjectNode) nivel).putArray("objetos").addObject().put("tipo", "inventado");
                    }
                    if (defecto.equals("meta")) regla.put("meta", 10);
                    if (defecto.equals("sinObjetos")) ((ObjectNode) nivel).putArray("objetos");
                    if (defecto.equals("consigna")) ((ObjectNode) nivel).put("consigna", "x".repeat(120));
                    if (defecto.equals("ayuda")) ((ArrayNode) nivel.get("ayudas")).set(0, JSON.getNodeFactory().textNode("Busca la fresa"));
                    if (defecto.equals("sinAyudas")) ((ObjectNode) nivel).putArray("ayudas");
                }
                if (defecto.equals("dosNiveles")) ((ArrayNode) respuesta.get("retos")).remove(2);
                ObjectNode guion = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase, tipo).orElseThrow();
                assertEquals(List.of(), validador.validar(guion, tipo), tipo + ": " + defecto);
                // Puede conservar textos válidos de la respuesta: HU31 admite
                // el límite del catálogo, aunque superen los 80 del respaldo.
                for (JsonNode nivel : guion.path("retos")) {
                    assertTrue(nivel.path("consigna").asText().length() <= CatalogoLaberinto.MAX_CARACTERES_TEXTO);
                }
            }
        }
    }

    @Test
    void conservaLaConsignaValidaAunqueSupereOchentaCaracteres() throws Exception {
        ObjectNode respuesta = GuionesDePrueba.respuestaConMapasRotos();
        JsonNode consigna = respuesta.path("retos").path(1).path("consigna");
        assertTrue(consigna.asText().length() > 80);
        assertTrue(consigna.asText().length() <= CatalogoLaberinto.MAX_CARACTERES_TEXTO);
        ObjectNode guion = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase).orElseThrow();
        assertEquals(consigna, guion.path("retos").path(1).path("consigna"));
        assertEquals(List.of(), validador.validar(guion));
    }

    @Test
    void variaElPatronPorNivelYUsaPrimeroLosTiposConocidosDeLaRespuesta() throws Exception {
        ObjectNode respuesta = JSON.createObjectNode();
        ArrayNode retos = respuesta.putArray("retos");
        for (int indice = 0; indice < 3; indice++) {
            ObjectNode nivel = retos.addObject();
            nivel.putObject("regla").put("tipo", "orden").putArray("secuencia").add("mandarina").add("papa").add("mandarina");
        }
        ObjectNode guion = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase, "orden").orElseThrow();
        List<List<String>> esperadas = List.of(List.of("mandarina", "papa", "mandarina", "papa"),
                List.of("mandarina", "papa", "mandarina", "papa", "mandarina", "papa"),
                List.of("mandarina", "mandarina", "papa", "mandarina", "mandarina", "papa"));
        for (int indice = 0; indice < 3; indice++) {
            List<String> secuencia = new ArrayList<>();
            guion.path("retos").path(indice).path("regla").path("secuencia").forEach(tipo -> secuencia.add(tipo.asText()));
            assertEquals(esperadas.get(indice), secuencia);
            JsonNode nivel = guion.path("retos").path(indice);
            assertTrue(nivel.path("consigna").asText().length() <= 80);
            for (JsonNode ayuda : nivel.path("ayudas")) assertTrue(ayuda.asText().length() <= 80);
        }
        assertEquals(List.of(), validador.validar(guion, "orden"));
    }

    @Test
    void respetaLaPropuestaYConservaUnaReglaBuenaSinMutarLaRespuesta() throws Exception {
        ObjectNode respuesta = GuionesDePrueba.respuestaConLaRegla("orden");
        ObjectNode copia = respuesta.deepCopy();
        ObjectNode guion = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase, "orden").orElseThrow();
        for (int indice = 0; indice < 3; indice++) {
            assertEquals(ConstructorGuion.reglaDelJuego(respuesta.path("retos").path(indice).path("regla")), guion.path("retos").path(indice).path("regla"));
        }
        assertEquals(copia, respuesta);
        ObjectNode cambiado = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase, "solo_clase").orElseThrow();
        assertEquals(List.of(), validador.validar(cambiado, "solo_clase"));
        assertTrue(ConstructorGuion.cambiosDelRespaldo(respuesta, cambiado).contains("Nivel 1: se rehízo la regla y los textos."));
    }

    // ---------- procedencia ----------

    @Test
    void registraPorNivelLoRehechoYUsaTextosSinPosicionDeLaBarra() throws Exception {
        for (String tipo : List.of("orden", "solo_clase")) {
            ObjectNode respuesta = GuionesDePrueba.respuestaConLaRegla(tipo);
            ObjectNode regla = (ObjectNode) respuesta.path("retos").path(0).path("regla");
            if (tipo.equals("orden")) regla.putArray("secuencia").add("fresa").add("platano").add("fresa");
            else regla.put("meta", 10);
            ((ObjectNode) respuesta.path("retos").path(1)).put("consigna", "x".repeat(120));
            ObjectNode guion = ConstructorGuion.conMapasBase(respuesta, CURSO, mapasBase, tipo).orElseThrow();
            JsonNode nivel = guion.path("retos").path(0);
            assertEquals(tipo.equals("orden") ? "Sigue el patrón de la barra. Después busca la puerta." : "Recoge 6 frutas. Después busca la puerta.", nivel.path("consigna").asText());
            assertEquals(tipo.equals("orden") ? "Mira la barra. ¿Cuál sigue en el patrón?" : "Recoge solo las del grupo que pide Kusi.", nivel.path("ayudas").path(0).asText());
            assertEquals(tipo.equals("orden") ? "El patrón se repite. Busca dónde vuelve a empezar." : "Deja los del otro grupo. Puedes mirar antes de elegir.", nivel.path("ayudas").path(1).asText());
            assertTrue(nivel.path("consigna").asText().length() <= 80);
            for (JsonNode ayuda : nivel.path("ayudas")) {
                assertTrue(ayuda.asText().length() <= 80);
                assertTrue(ValidadorLaberinto.nombresQueRevela(ayuda.asText()).isEmpty());
            }
            assertEquals(List.of(), validador.validar(guion, tipo));
        }
    }

    @Test
    void laProcedenciaSeGuardaJuntoAlGuionSinEstorbarlo() throws Exception {
        ObjectNode guion = ConstructorGuion.desdeLaIa(GuionesDePrueba.respuestaBuena(), CURSO);

        ConstructorGuion.ponerProcedencia(guion, "groq", "openai/gpt-oss-120b", 2, true);

        JsonNode procedencia = guion.get("procedencia");
        assertEquals("groq", procedencia.get("proveedor").asText());
        assertEquals("openai/gpt-oss-120b", procedencia.get("modelo").asText());
        assertEquals(2, procedencia.get("intentos").asInt());
        assertTrue(procedencia.get("mapa_base").isBoolean() && procedencia.get("mapa_base").asBoolean());
        // El bloque no cuenta como un defecto del guion.
        assertEquals(List.of(), validador.validar(guion));
    }
}
