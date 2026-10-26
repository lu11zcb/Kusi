package pe.kusi.edu.laberinto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// HU31: casos buenos y malos del validador del guion. El caso bueno es el paquete de
// ejemplo del juego (juego/public/paquete-laberinto-ejemplo.json); cada caso malo es
// ese mismo guion con un solo cambio, así que el código que aparece es el del cambio.
class ValidadorLaberintoTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private final ValidadorLaberinto validador = new ValidadorLaberinto();

    @FunctionalInterface
    private interface Cambio { void aplicar(ObjectNode guion) throws Exception; }

    // ---------- Ayudas de las pruebas ----------

    // El proyecto es un repositorio con carpetas hermanas: se sube desde la carpeta de
    // trabajo (edu-api) hasta encontrar juego/. Si no está, la prueba falla con un aviso claro.
    private static Path buscarEjemplo() {
        Path carpeta = Path.of("").toAbsolutePath();
        while (carpeta != null) {
            Path candidato = carpeta.resolve("juego/public/paquete-laberinto-ejemplo.json");
            if (Files.exists(candidato)) return candidato;
            carpeta = carpeta.getParent();
        }
        throw new IllegalStateException("No se encontró juego/public/paquete-laberinto-ejemplo.json "
                + "subiendo desde " + Path.of("").toAbsolutePath() + ". Ejecuta las pruebas dentro del repositorio.");
    }

    static ObjectNode ejemplo() throws IOException {
        return (ObjectNode) JSON.readTree(Files.readString(buscarEjemplo(), StandardCharsets.UTF_8));
    }

    private static ObjectNode nivel(ObjectNode guion, int numero) {
        return (ObjectNode) guion.get("retos").get(numero - 1);
    }

    private static ArrayNode lista(String... textos) {
        ArrayNode lista = JSON.createArrayNode();
        for (String texto : textos) lista.add(texto);
        return lista;
    }

    private static ObjectNode objeto(String tipo, int fila, int columna) {
        ObjectNode objeto = JSON.createObjectNode();
        objeto.put("tipo", tipo).put("fila", fila).put("columna", columna);
        return objeto;
    }

    private static ObjectNode zorro(int fila, int columna, String movimiento) {
        ObjectNode zorro = objeto("zorro", fila, columna);
        zorro.put("movimiento", movimiento);
        return zorro;
    }

    private static void ponerMapa(ObjectNode nivel, String... filas) {
        nivel.set("mapa", lista(filas));
    }

    // Un mapa vacío de «filas» × «columnas»: borde de muros, camino adentro, el inicio
    // arriba a la izquierda y la puerta abajo a la derecha.
    private static String[] mapaVacio(int filas, int columnas) {
        String[] mapa = new String[filas];
        for (int fila = 0; fila < filas; fila++) {
            StringBuilder texto = new StringBuilder();
            for (int columna = 0; columna < columnas; columna++) {
                boolean borde = fila == 0 || fila == filas - 1 || columna == 0 || columna == columnas - 1;
                if (borde) texto.append('#');
                else if (fila == 1 && columna == 1) texto.append('C');
                else if (fila == filas - 2 && columna == columnas - 2) texto.append('P');
                else texto.append('.');
            }
            mapa[fila] = texto.toString();
        }
        return mapa;
    }

    private List<ProblemaLaberinto> problemasDe(Cambio cambio) throws Exception {
        ObjectNode guion = ejemplo();
        cambio.aplicar(guion);
        return validador.validar(guion);
    }

    private static boolean tiene(List<ProblemaLaberinto> problemas, String codigo) {
        return problemas.stream().anyMatch(problema -> problema.codigo().equals(codigo));
    }

    // El cambio debe provocar este código y todos los problemas deben traer un motivo.
    private void exigir(String codigo, Cambio cambio) throws Exception {
        List<ProblemaLaberinto> problemas = problemasDe(cambio);
        assertTrue(tiene(problemas, codigo), "Debía aparecer " + codigo + " y apareció: " + problemas);
        problemas.forEach(problema -> assertFalse(problema.motivo().isBlank(), "Sin motivo: " + problema));
    }

    private void aceptar(String codigoAusente, Cambio cambio) throws Exception {
        List<ProblemaLaberinto> problemas = problemasDe(cambio);
        assertFalse(tiene(problemas, codigoAusente), "No debía aparecer " + codigoAusente + ": " + problemas);
    }

    // ---------- El caso bueno ----------

    @Test
    void elPaqueteDeEjemploDelJuegoEsUnCasoBueno() throws Exception {
        assertEquals(List.of(), validador.validar(ejemplo()));
    }

    @Test
    void elTamanoMaximoDelMapaDaCasillasDe40PxEnUnCelularDe800x360() {
        assertTrue(CatalogoLaberinto.casillaEnCelularPx(CatalogoLaberinto.MAX_FILAS, CatalogoLaberinto.MAX_COLUMNAS)
                >= CatalogoLaberinto.CASILLA_MINIMA_PX);
        // Una fila o una columna más y la casilla ya mide menos de 40 px.
        assertTrue(CatalogoLaberinto.casillaEnCelularPx(CatalogoLaberinto.MAX_FILAS + 1, CatalogoLaberinto.MAX_COLUMNAS)
                < CatalogoLaberinto.CASILLA_MINIMA_PX);
        assertTrue(CatalogoLaberinto.casillaEnCelularPx(CatalogoLaberinto.MAX_FILAS, CatalogoLaberinto.MAX_COLUMNAS + 1)
                < CatalogoLaberinto.CASILLA_MINIMA_PX);
    }

    @Test
    void unGuionQueNoEsUnObjetoSeRechazaSinFallar() throws Exception {
        assertEquals("GUION_INVALIDO", validador.validar(null).get(0).codigo());
        assertEquals("GUION_INVALIDO", validador.validar(JSON.readTree("[]")).get(0).codigo());
        assertEquals("GUION_INVALIDO", validador.validar(JSON.readTree("\"hola\"")).get(0).codigo());
    }

    // ---------- Formato, niveles y dificultad ----------

    @Test
    void exigeElFormatoLaFamiliaYElTitulo() throws Exception {
        exigir("FORMATO", guion -> guion.put("formato", "kusi-paquete/1"));
        exigir("FAMILIA", guion -> guion.put("familia", "mercado"));
        exigir("TITULO_FALTA", guion -> guion.remove("titulo"));
        exigir("TITULO_FALTA", guion -> guion.put("titulo", "   "));
    }

    @Test
    void exigeDe3a5Niveles() throws Exception {
        exigir("NIVELES_CANTIDAD", guion -> ((ArrayNode) guion.get("retos")).remove(2));
        exigir("NIVELES_CANTIDAD", guion -> {
            ArrayNode retos = (ArrayNode) guion.get("retos");
            for (int copia = 0; copia < 3; copia++) retos.add(retos.get(2).deepCopy());
        });
        exigir("NIVELES_CANTIDAD", guion -> guion.remove("retos"));
        // Cinco niveles, el máximo, está bien.
        aceptar("NIVELES_CANTIDAD", guion -> {
            ArrayNode retos = (ArrayNode) guion.get("retos");
            retos.add(retos.get(2).deepCopy());
            retos.add(retos.get(2).deepCopy());
        });
    }

    @Test
    void losMapasNoSeAchican() throws Exception {
        // El nivel 3 (9 × 15) pasa a ser el primero y el 1 (7 × 11), el último.
        exigir("DIFICULTAD_MAPA", guion -> {
            ArrayNode retos = (ArrayNode) guion.get("retos");
            JsonNode primero = retos.get(0);
            retos.set(0, retos.get(2));
            retos.set(2, primero);
        });
        // Un mapa más ancho pero con menos filas también se achica.
        exigir("DIFICULTAD_MAPA", guion -> ponerMapa(nivel(guion, 3), mapaVacio(8, 15)));
        // Igual de grande está bien.
        aceptar("DIFICULTAD_MAPA", guion -> ponerMapa(nivel(guion, 3), mapaVacio(9, 15)));
    }

    @Test
    void elPrimerNivelNoTieneEnemigos() throws Exception {
        exigir("NIVEL1_ENEMIGOS", guion -> ((ArrayNode) nivel(guion, 1).get("enemigos")).add(zorro(5, 3, "patrulla")));
        // Los niveles siguientes sí pueden tenerlos.
        aceptar("NIVEL1_ENEMIGOS", guion -> ((ArrayNode) nivel(guion, 2).get("enemigos")).add(zorro(7, 9, "patrulla")));
    }

    // ---------- Mapa ----------

    @Test
    void elMapaDebeSerRectangularYUsarSoloLosSimbolosDelJuego() throws Exception {
        exigir("MAPA_FORMA", guion -> nivel(guion, 1).remove("mapa"));
        exigir("MAPA_FORMA", guion -> nivel(guion, 1).set("mapa", lista()));
        exigir("MAPA_FORMA", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(2, JSON.nullNode()));
        exigir("MAPA_FILAS", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(2, JSON.getNodeFactory().textNode("#.###.###.")));
        exigir("MAPA_SIMBOLO", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(3, JSON.getNodeFactory().textNode("#...#.X...#")));
    }

    @Test
    void hayUnSoloInicioYUnaSolaPuerta() throws Exception {
        exigir("MAPA_INICIO", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(3, JSON.getNodeFactory().textNode("#C..#.....#")));
        exigir("MAPA_INICIO", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(1, JSON.getNodeFactory().textNode("#.........#")));
        exigir("MAPA_PUERTA", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(5, JSON.getNodeFactory().textNode("#...#.....#")));
        exigir("MAPA_PUERTA", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(5, JSON.getNodeFactory().textNode("#...#...PP#")));
    }

    @Test
    void elBordeDelMapaEsDeMuros() throws Exception {
        exigir("MAPA_BORDE", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(0, JSON.getNodeFactory().textNode("####.######")));
        exigir("MAPA_BORDE", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(3, JSON.getNodeFactory().textNode("....#.....#")));
        exigir("MAPA_BORDE", guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(3, JSON.getNodeFactory().textNode("#...#......")));
    }

    @Test
    void elMapaCabeEnLaPantallaConCasillasDeAlMenos40Px() throws Exception {
        exigir("MAPA_TAMANO", guion -> ponerMapa(nivel(guion, 3), mapaVacio(10, 15)));
        exigir("MAPA_TAMANO", guion -> ponerMapa(nivel(guion, 3), mapaVacio(9, 16)));
        aceptar("MAPA_TAMANO", guion -> ponerMapa(nivel(guion, 3), mapaVacio(9, 15)));
    }

    // ---------- Objetos y enemigos ----------

    @Test
    void losObjetosEstanSobreElCaminoYNoSeRepitenDeCasilla() throws Exception {
        // En un muro, en el inicio, en la puerta y fuera del mapa.
        exigir("OBJETO_FUERA_DEL_CAMINO", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).put("fila", 0).put("columna", 0));
        exigir("OBJETO_FUERA_DEL_CAMINO", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).put("fila", 1).put("columna", 1));
        exigir("OBJETO_FUERA_DEL_CAMINO", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).put("fila", 5).put("columna", 9));
        exigir("OBJETO_FUERA_DEL_CAMINO", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).put("fila", 40).put("columna", 3));
        // Dos objetos en la misma casilla.
        exigir("CASILLA_REPETIDA", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(1)).put("fila", 1).put("columna", 3));
        // Un objeto y un enemigo en la misma casilla.
        exigir("CASILLA_REPETIDA", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("fila", 1).put("columna", 4));
    }

    @Test
    void laPosicionDeUnObjetoSonNumerosEnteros() throws Exception {
        exigir("OBJETO_POSICION", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).put("fila", "uno"));
        exigir("OBJETO_POSICION", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).put("columna", 3.5));
        exigir("OBJETO_POSICION", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).remove("fila"));
        exigir("OBJETOS_FALTAN", guion -> nivel(guion, 1).remove("objetos"));
    }

    @Test
    void soloSeUsanLosObjetosDeLaLista() throws Exception {
        for (String desconocido : List.of("tomate", "palta", "plátano", "Fresa", "manzana", "")) {
            exigir("OBJETO_TIPO", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).put("tipo", desconocido));
        }
        // Todos los de la lista, sin tildes, son válidos.
        for (String conocido : List.of("fresa", "platano", "mango", "mandarina", "pina", "zanahoria", "papa", "choclo")) {
            aceptar("OBJETO_TIPO", guion -> ((ObjectNode) nivel(guion, 3).get("objetos").get(0)).put("tipo", conocido));
        }
        exigir("OBJETO_TIPO", guion -> ((ObjectNode) nivel(guion, 1).get("objetos").get(0)).remove("tipo"));
    }

    @Test
    void todoLoQueElCuyDebeRecogerSePuedeAlcanzarDesdeElInicio() throws Exception {
        // Un muro nuevo junto al inicio deja la fresa de arriba y la puerta aisladas del resto.
        Cambio cerrarElPasillo = guion -> ((ArrayNode) nivel(guion, 1).get("mapa")).set(1, JSON.getNodeFactory().textNode("#C#.......#"));
        exigir("OBJETO_INALCANZABLE", cerrarElPasillo);
        exigir("PUERTA_INALCANZABLE", cerrarElPasillo);
        // La puerta no se puede atravesar: un objeto detrás de ella no se alcanza.
        exigir("OBJETO_INALCANZABLE", guion -> {
            ponerMapa(nivel(guion, 1),
                    "############",
                    "#C.......P.#",
                    "############");
            ((ObjectNode) nivel(guion, 1)).set("objetos", JSON.createArrayNode().add(objeto("fresa", 1, 10)));
        });
    }

    @Test
    void elUnicoEnemigoEsElZorroYSeMueveDeDosManeras() throws Exception {
        exigir("ENEMIGO_TIPO", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("tipo", "lobo"));
        exigir("ENEMIGO_MOVIMIENTO", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("movimiento", "vuela"));
        exigir("ENEMIGO_MOVIMIENTO", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).remove("movimiento"));
        aceptar("ENEMIGO_MOVIMIENTO", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("movimiento", "patrulla"));
        exigir("ENEMIGO_FUERA_DEL_CAMINO", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("fila", 0).put("columna", 0));
        exigir("ENEMIGOS_FALTAN", guion -> nivel(guion, 2).remove("enemigos"));
    }

    @Test
    void ningunEnemigoEmpiezaAMenosDeTresCasillasDeCaminoDelCuy() throws Exception {
        // El inicio está en la fila 1, columna 1: la casilla (3, 1) queda a 2 casillas de camino.
        exigir("ENEMIGO_CERCA", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("fila", 3).put("columna", 1));
        exigir("ENEMIGO_CERCA", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("fila", 2).put("columna", 1));
        // La (3, 2) queda a 3: está bien.
        aceptar("ENEMIGO_CERCA", guion -> ((ObjectNode) nivel(guion, 2).get("enemigos").get(0)).put("fila", 3).put("columna", 2));
        // La distancia es por el camino, no en línea recta: en este mapa el zorro está pegado al
        // inicio, pero al otro lado de un muro, y para llegar a él hay que dar 6 pasos.
        aceptar("ENEMIGO_CERCA", guion -> {
            ponerMapa(nivel(guion, 2), "#######", "#C#...#", "#.#.#.#", "#...#P#", "#######");
            nivel(guion, 2).set("enemigos", JSON.createArrayNode().add(zorro(1, 3, "patrulla")));
        });
    }

    // ---------- Regla «orden» ----------

    @Test
    void laSecuenciaDeLaReglaOrdenEsUnPatronQueSeRepite() {
        assertTrue(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "b", "a", "b")));
        assertTrue(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "a", "b", "a", "a", "b")));
        assertTrue(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "b", "c", "a", "b", "c")));
        assertTrue(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "b", "c", "a", "b", "c", "a", "b")));
        assertTrue(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "b", "b", "a", "b", "b", "a", "b")));
        assertFalse(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "a", "a", "a")));
        assertFalse(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "a", "b", "b")));
        assertFalse(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "b", "c", "d")));
        assertFalse(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "b", "a", "b", "b")));
        assertFalse(ValidadorLaberinto.esPatronQueSeRepite(List.of("a", "a", "a", "b")));
    }

    @Test
    void laSecuenciaTiene4a8ElementosDeObjetosConocidos() throws Exception {
        exigir("SECUENCIA_LARGO", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).set("secuencia", lista("fresa", "platano", "fresa")));
        exigir("SECUENCIA_LARGO", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).set("secuencia",
                lista("fresa", "platano", "fresa", "platano", "fresa", "platano", "fresa", "platano", "fresa")));
        exigir("SECUENCIA_LARGO", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).remove("secuencia"));
        exigir("SECUENCIA_TIPO", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).set("secuencia", lista("fresa", "tomate", "fresa", "tomate")));
        // 8 objetos, el máximo, está bien siempre que haya objetos suficientes en el mapa.
        aceptar("SECUENCIA_LARGO", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).set("secuencia",
                lista("fresa", "platano", "fresa", "platano", "fresa", "platano", "fresa", "platano")));
    }

    @Test
    void laSecuenciaDebeRepetirseYUsarDosObjetosDistintos() throws Exception {
        exigir("SECUENCIA_NO_PATRON", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).set("secuencia", lista("fresa", "fresa", "fresa", "fresa")));
        exigir("SECUENCIA_NO_PATRON", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).set("secuencia", lista("fresa", "platano", "mango", "pina")));
        exigir("SECUENCIA_NO_PATRON", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).set("secuencia", lista("fresa", "fresa", "platano", "platano")));
    }

    @Test
    void elMapaTraeAlMenosLosObjetosQuePideLaSecuencia() throws Exception {
        // La secuencia pide 2 plátanos y el mapa solo tiene uno.
        exigir("SECUENCIA_FALTAN_OBJETOS", guion -> ((ArrayNode) nivel(guion, 1).get("objetos")).remove(3));
        // Objetos de sobra (trampas) están bien.
        aceptar("SECUENCIA_FALTAN_OBJETOS", guion -> ((ArrayNode) nivel(guion, 1).get("objetos")).add(objeto("mango", 5, 2)));
    }

    // ---------- Regla «solo_clase» ----------

    @Test
    void laReglaSoloClaseTieneClaseValidaYUnaMetaDe3a6() throws Exception {
        exigir("CLASE_INVALIDA", guion -> ((ObjectNode) nivel(guion, 3).get("regla")).put("clase", "postre"));
        exigir("CLASE_INVALIDA", guion -> ((ObjectNode) nivel(guion, 3).get("regla")).remove("clase"));
        exigir("META_RANGO", guion -> ((ObjectNode) nivel(guion, 3).get("regla")).put("meta", 2));
        exigir("META_RANGO", guion -> ((ObjectNode) nivel(guion, 3).get("regla")).put("meta", 7));
        exigir("META_RANGO", guion -> ((ObjectNode) nivel(guion, 3).get("regla")).put("meta", "cuatro"));
        aceptar("META_RANGO", guion -> ((ObjectNode) nivel(guion, 3).get("regla")).put("meta", 3));
    }

    @Test
    void elMapaTraeAlMenosMetaObjetosDeLaClaseYUnaTrampaDeLaOtra() throws Exception {
        // Quedan 2 frutas para una meta de 4.
        exigir("CLASE_FALTAN_OBJETOS", guion -> {
            ArrayNode objetos = (ArrayNode) nivel(guion, 3).get("objetos");
            objetos.remove(3);
            objetos.remove(2);
        });
        // Sin verduras no hay trampa.
        exigir("CLASE_SIN_TRAMPA", guion -> {
            ArrayNode objetos = (ArrayNode) nivel(guion, 3).get("objetos");
            objetos.remove(6);
            objetos.remove(5);
            objetos.remove(4);
        });
        // La regla al revés: recoger verduras, con frutas como trampa, está bien.
        aceptar("CLASE_FALTAN_OBJETOS", guion -> {
            ObjectNode regla = (ObjectNode) nivel(guion, 3).get("regla");
            regla.put("clase", "verdura").put("meta", 3);
        });
        exigir("CLASE_FALTAN_OBJETOS", guion -> {
            ObjectNode regla = (ObjectNode) nivel(guion, 3).get("regla");
            regla.put("clase", "verdura").put("meta", 4);
        });
    }

    @Test
    void laReglaDebeSerUnaDeLasDosQueSabeHacerElJuego() throws Exception {
        exigir("REGLA_TIPO", guion -> ((ObjectNode) nivel(guion, 1).get("regla")).put("tipo", "comprar"));
        exigir("REGLA_TIPO", guion -> nivel(guion, 1).remove("regla"));
    }

    @Test
    void siLaPropuestaEligioUnaReglaTodosLosNivelesLaUsan() throws Exception {
        // El ejemplo mezcla las dos reglas, y eso es válido si no se pide una en particular.
        assertEquals(List.of(), validador.validar(ejemplo(), null));
        List<ProblemaLaberinto> conOrden = validador.validar(ejemplo(), "orden");
        assertEquals(List.of("REGLA_DISTINTA"), conOrden.stream().map(ProblemaLaberinto::codigo).toList());
        assertTrue(conOrden.get(0).motivo().startsWith("Nivel 3:"));
        List<ProblemaLaberinto> conClase = validador.validar(ejemplo(), "solo_clase");
        assertEquals(2, conClase.size());
        assertTrue(conClase.stream().allMatch(problema -> problema.codigo().equals("REGLA_DISTINTA")));
    }

    // ---------- Textos ----------

    @Test
    void cadaNivelTieneUnaConsignaCorta() throws Exception {
        exigir("CONSIGNA_FALTA", guion -> nivel(guion, 1).remove("consigna"));
        exigir("CONSIGNA_FALTA", guion -> nivel(guion, 1).put("consigna", "  "));
        exigir("CONSIGNA_LARGA", guion -> nivel(guion, 1).put("consigna", "a".repeat(91)));
        aceptar("CONSIGNA_LARGA", guion -> nivel(guion, 1).put("consigna", "a".repeat(90)));
    }

    @Test
    void cadaNivelTieneDosAyudasCortas() throws Exception {
        exigir("AYUDAS_CANTIDAD", guion -> nivel(guion, 1).set("ayudas", lista("Mira bien.")));
        exigir("AYUDAS_CANTIDAD", guion -> nivel(guion, 1).set("ayudas", lista("Mira bien.", "Fíjate.", "Piensa.")));
        exigir("AYUDAS_CANTIDAD", guion -> nivel(guion, 1).remove("ayudas"));
        exigir("AYUDA_VACIA", guion -> nivel(guion, 1).set("ayudas", lista("Mira bien.", "  ")));
        exigir("AYUDA_LARGA", guion -> nivel(guion, 1).set("ayudas", lista("Mira bien.", "a".repeat(91))));
    }

    @Test
    void unaAyudaNoDiceLaRespuestaSinImportarTildesMayusculasNiPlural() throws Exception {
        for (String ayuda : List.of(
                "Busca la fresa.", "Las FRESAS están arriba.", "El plátano va después.", "Mira los PLATANOS.",
                "La piña es la última.", "Las pinas son dulces.", "Un mango y una mandarina.", "Mira las mandarinas.",
                "Dos zanahorias.", "Una papa grande.", "El choclo amarillo.", "Mira: ¡MANGO!")) {
            exigir("AYUDA_REVELA", guion -> nivel(guion, 1).set("ayudas", lista("Mira bien.", ayuda)));
        }
        // Hablar de «frutas» o de «verduras» en general no nombra ningún objeto.
        aceptar("AYUDA_REVELA", guion -> nivel(guion, 1).set("ayudas",
                lista("Mira la fila de frutas de arriba.", "Fíjate en lo que se repite.")));
        // «papaya» o «mangosta» no son «papa» ni «mango».
        aceptar("AYUDA_REVELA", guion -> nivel(guion, 1).set("ayudas", lista("Una papaya.", "Una mangosta.")));
    }

    @Test
    void losMotivosEmpiezanConElNumeroDeNivelYEstanEnEspanol() throws Exception {
        List<ProblemaLaberinto> problemas = problemasDe(guion -> nivel(guion, 2).put("consigna", ""));
        assertEquals(1, problemas.size());
        assertEquals("CONSIGNA_FALTA", problemas.get(0).codigo());
        assertTrue(problemas.get(0).motivo().startsWith("Nivel 2:"));
        assertEquals("CONSIGNA_FALTA: " + problemas.get(0).motivo(), problemas.get(0).toString());
    }
}
