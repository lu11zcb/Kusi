package pe.kusi.edu.laberinto;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Component;

import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static pe.kusi.edu.laberinto.CatalogoLaberinto.*;

// HU31: las comprobaciones del guion del laberinto. Es código puro, sin IA ni base
// de datos: recibe el guion como JSON y devuelve la lista de problemas (vacía si el
// guion está bien), cada uno con un código estable y un motivo en español sencillo.
//
// Incluye todo lo que comprueba el juego (juego/src/datos/validarLaberinto.js) para
// que nunca se contradigan: lo que Spring aprueba el juego lo puede abrir. Además
// comprueba lo que el juego no mira: caminos, dificultad, reglas y textos.
@Component
public class ValidadorLaberinto {

    // Las palabras que una ayuda no puede decir: cualquier fruta o verdura del
    // juego, con o sin tilde, en mayúsculas o en plural («Piña», «FRESAS»).
    private static final Pattern NOMBRES_DE_OBJETOS =
            Pattern.compile("\\b(" + String.join("|", TIPOS_OBJETO) + ")(?:s|es)?\\b");

    public List<ProblemaLaberinto> validar(JsonNode guion) {
        return validar(guion, null);
    }

    // «reglaEsperada» (orden o solo_clase) es la regla que eligió la propuesta; si no
    // es null, todos los niveles deben usarla. Con null se acepta cualquiera de las dos.
    public List<ProblemaLaberinto> validar(JsonNode guion, String reglaEsperada) {
        List<ProblemaLaberinto> problemas = new ArrayList<>();
        if (guion == null || !guion.isObject()) {
            problemas.add(new ProblemaLaberinto("GUION_INVALIDO",
                    "El guion debe ser un objeto JSON con el juego completo."));
            return problemas;
        }
        if (!FORMATO.equals(texto(guion.path("formato")))) {
            problemas.add(new ProblemaLaberinto("FORMATO",
                    "El guion debe tener el formato " + FORMATO + "."));
        }
        if (!FAMILIA.equals(texto(guion.path("familia")))) {
            problemas.add(new ProblemaLaberinto("FAMILIA",
                    "El guion debe ser de la familia " + FAMILIA + "."));
        }
        if (estaVacio(texto(guion.path("titulo")))) {
            problemas.add(new ProblemaLaberinto("TITULO_FALTA", "Falta el título del juego."));
        }
        JsonNode retos = guion.path("retos");
        if (!retos.isArray()) {
            problemas.add(new ProblemaLaberinto("NIVELES_CANTIDAD",
                    "Falta la lista de niveles (retos): el juego debe tener de "
                            + MIN_NIVELES + " a " + MAX_NIVELES + "."));
            return problemas;
        }
        if (retos.size() < MIN_NIVELES || retos.size() > MAX_NIVELES) {
            problemas.add(new ProblemaLaberinto("NIVELES_CANTIDAD",
                    "El juego debe tener de " + MIN_NIVELES + " a " + MAX_NIVELES
                            + " niveles y tiene " + retos.size() + "."));
        }
        int[][] tamanos = new int[retos.size()][];
        for (int posicion = 0; posicion < retos.size(); posicion++) {
            tamanos[posicion] = comprobarNivel(posicion + 1, retos.get(posicion), reglaEsperada, problemas);
        }
        comprobarDificultad(tamanos, problemas);
        return problemas;
    }

    // Devuelve el tamaño {filas, columnas} del mapa del nivel, o null si no se pudo leer.
    private int[] comprobarNivel(int nivel, JsonNode reto, String reglaEsperada, List<ProblemaLaberinto> problemas) {
        String prefijo = "Nivel " + nivel + ": ";
        if (!reto.isObject()) {
            problemas.add(new ProblemaLaberinto("NIVEL_INVALIDO", prefijo + "falta la información del nivel."));
            return null;
        }
        MapaLaberinto mapa = leerMapa(prefijo, reto.path("mapa"), problemas);
        // Las casillas ya usadas por un objeto o un enemigo: dos cosas no comparten casilla.
        Set<String> ocupadas = new HashSet<>();
        List<String> tiposDeObjetos = comprobarObjetos(prefijo, reto.path("objetos"), mapa, ocupadas, problemas);
        comprobarEnemigos(prefijo, nivel, reto.path("enemigos"), mapa, ocupadas, problemas);
        if (mapa != null && mapa.tieneInicioYPuertaUnicos()
                && mapa.distancia(mapa.puerta()[0], mapa.puerta()[1]) < 0) {
            problemas.add(new ProblemaLaberinto("PUERTA_INALCANZABLE",
                    prefijo + "el cuy no puede llegar a la puerta desde el inicio."));
        }
        comprobarRegla(prefijo, reto.path("regla"), tiposDeObjetos, reglaEsperada, problemas);
        comprobarTextos(prefijo, reto, problemas);
        return mapa == null ? null : new int[] {mapa.filas(), mapa.columnas()};
    }

    // ---------- Mapa ----------

    private MapaLaberinto leerMapa(String prefijo, JsonNode nodo, List<ProblemaLaberinto> problemas) {
        if (!nodo.isArray() || nodo.isEmpty()) {
            problemas.add(new ProblemaLaberinto("MAPA_FORMA",
                    prefijo + "el mapa debe ser una lista de filas de texto."));
            return null;
        }
        List<String> filas = new ArrayList<>();
        for (JsonNode fila : nodo) {
            String texto = texto(fila);
            if (texto == null || texto.isEmpty()) {
                problemas.add(new ProblemaLaberinto("MAPA_FORMA",
                        prefijo + "el mapa debe ser una lista de filas de texto."));
                return null;
            }
            filas.add(texto);
        }
        int columnas = filas.get(0).length();
        if (filas.stream().anyMatch(fila -> fila.length() != columnas)) {
            problemas.add(new ProblemaLaberinto("MAPA_FILAS",
                    prefijo + "todas las filas del mapa deben tener el mismo largo."));
            return null;
        }
        String todo = String.join("", filas);
        if (todo.chars().anyMatch(simbolo -> "#.CP".indexOf(simbolo) < 0)) {
            problemas.add(new ProblemaLaberinto("MAPA_SIMBOLO",
                    prefijo + "el mapa solo puede usar # (muro), . (camino), C (inicio del cuy) y P (puerta)."));
        }
        long inicios = todo.chars().filter(simbolo -> simbolo == INICIO).count();
        if (inicios != 1) {
            problemas.add(new ProblemaLaberinto("MAPA_INICIO",
                    prefijo + "debe haber un solo inicio C y hay " + inicios + "."));
        }
        long puertas = todo.chars().filter(simbolo -> simbolo == PUERTA).count();
        if (puertas != 1) {
            problemas.add(new ProblemaLaberinto("MAPA_PUERTA",
                    prefijo + "debe haber una sola puerta P y hay " + puertas + "."));
        }
        if (bordeRoto(filas)) {
            problemas.add(new ProblemaLaberinto("MAPA_BORDE",
                    prefijo + "el borde del mapa debe ser todo de muros (#)."));
        }
        if (filas.size() > MAX_FILAS || columnas > MAX_COLUMNAS) {
            problemas.add(new ProblemaLaberinto("MAPA_TAMANO",
                    prefijo + "el mapa mide " + filas.size() + " filas por " + columnas
                            + " columnas y el máximo es " + MAX_FILAS + " por " + MAX_COLUMNAS
                            + ", para que cada casilla mida al menos " + CASILLA_MINIMA_PX
                            + " px en un celular de 800 × 360."));
        }
        return new MapaLaberinto(filas);
    }

    private boolean bordeRoto(List<String> filas) {
        for (int numero = 0; numero < filas.size(); numero++) {
            String fila = filas.get(numero);
            boolean filaDelBorde = numero == 0 || numero == filas.size() - 1;
            if (filaDelBorde && fila.chars().anyMatch(simbolo -> simbolo != MURO)) return true;
            if (fila.charAt(0) != MURO || fila.charAt(fila.length() - 1) != MURO) return true;
        }
        return false;
    }

    // Los mapas no se achican de un nivel al siguiente: ni en filas ni en columnas.
    private void comprobarDificultad(int[][] tamanos, List<ProblemaLaberinto> problemas) {
        for (int posicion = 1; posicion < tamanos.length; posicion++) {
            int[] anterior = tamanos[posicion - 1];
            int[] actual = tamanos[posicion];
            if (anterior == null || actual == null) continue;
            if (actual[0] < anterior[0] || actual[1] < anterior[1]) {
                problemas.add(new ProblemaLaberinto("DIFICULTAD_MAPA",
                        "Nivel " + (posicion + 1) + ": el mapa (" + actual[0] + " × " + actual[1]
                                + ") es más chico que el del nivel anterior (" + anterior[0] + " × "
                                + anterior[1] + "); la dificultad debe subir, no bajar."));
            }
        }
    }

    // ---------- Objetos y enemigos ----------

    // Devuelve los tipos válidos de los objetos del nivel, para comprobar la regla.
    private List<String> comprobarObjetos(String prefijo, JsonNode objetos, MapaLaberinto mapa,
                                          Set<String> ocupadas, List<ProblemaLaberinto> problemas) {
        List<String> tipos = new ArrayList<>();
        if (!objetos.isArray()) {
            problemas.add(new ProblemaLaberinto("OBJETOS_FALTAN", prefijo + "falta la lista de objetos."));
            return tipos;
        }
        for (JsonNode objeto : objetos) {
            String tipo = texto(objeto.path("tipo"));
            if (tipo == null || !TIPOS_OBJETO.contains(tipo)) {
                problemas.add(new ProblemaLaberinto("OBJETO_TIPO",
                        prefijo + "hay un objeto que no existe en el juego («" + (tipo == null ? "sin tipo" : tipo)
                                + "»). Los objetos válidos son: " + String.join(", ", TIPOS_OBJETO) + "."));
            } else {
                tipos.add(tipo);
            }
            comprobarCasilla(prefijo, "el objeto «" + (tipo == null ? "sin tipo" : tipo) + "»",
                    "OBJETO", objeto, mapa, ocupadas, true, problemas);
        }
        return tipos;
    }

    private void comprobarEnemigos(String prefijo, int nivel, JsonNode enemigos, MapaLaberinto mapa,
                                   Set<String> ocupadas, List<ProblemaLaberinto> problemas) {
        if (!enemigos.isArray()) {
            problemas.add(new ProblemaLaberinto("ENEMIGOS_FALTAN", prefijo + "falta la lista de enemigos."));
            return;
        }
        if (nivel == 1 && !enemigos.isEmpty()) {
            problemas.add(new ProblemaLaberinto("NIVEL1_ENEMIGOS",
                    prefijo + "el primer nivel no puede tener enemigos: es para aprender."));
        }
        for (JsonNode enemigo : enemigos) {
            String tipo = texto(enemigo.path("tipo"));
            if (!TIPO_ENEMIGO.equals(tipo)) {
                problemas.add(new ProblemaLaberinto("ENEMIGO_TIPO",
                        prefijo + "el único enemigo que existe es el " + TIPO_ENEMIGO + " y hay uno de tipo «"
                                + (tipo == null ? "sin tipo" : tipo) + "»."));
            }
            String movimiento = texto(enemigo.path("movimiento"));
            if (movimiento == null || !MOVIMIENTOS_ENEMIGO.contains(movimiento)) {
                problemas.add(new ProblemaLaberinto("ENEMIGO_MOVIMIENTO",
                        prefijo + "el zorro debe moverse con uno de estos movimientos: "
                                + String.join(", ", MOVIMIENTOS_ENEMIGO) + "."));
            }
            int distancia = comprobarCasilla(prefijo, "el zorro", "ENEMIGO", enemigo, mapa, ocupadas, false, problemas);
            if (distancia >= 0 && distancia < DISTANCIA_MINIMA_ENEMIGO) {
                problemas.add(new ProblemaLaberinto("ENEMIGO_CERCA",
                        prefijo + "el zorro empieza a solo " + distancia + " casillas de camino del cuy; debe empezar a "
                                + DISTANCIA_MINIMA_ENEMIGO + " o más."));
            }
        }
    }

    // Comprueba la casilla de un objeto o de un enemigo: números enteros, sobre el
    // camino, sin otra cosa encima y (si «exigirAlcance») con camino desde el inicio.
    // Devuelve las casillas de camino desde el inicio, o -1 si no se pudo medir.
    private int comprobarCasilla(String prefijo, String quien, String codigo, JsonNode cosa, MapaLaberinto mapa,
                                 Set<String> ocupadas, boolean exigirAlcance, List<ProblemaLaberinto> problemas) {
        JsonNode filaNodo = cosa.path("fila");
        JsonNode columnaNodo = cosa.path("columna");
        if (!esEntero(filaNodo) || !esEntero(columnaNodo)) {
            problemas.add(new ProblemaLaberinto(codigo + "_POSICION",
                    prefijo + quien + " necesita su fila y su columna, como números enteros."));
            return -1;
        }
        int fila = filaNodo.intValue();
        int columna = columnaNodo.intValue();
        String lugar = "la fila " + fila + ", columna " + columna;
        if (!ocupadas.add(fila + "," + columna)) {
            problemas.add(new ProblemaLaberinto("CASILLA_REPETIDA",
                    prefijo + "hay dos cosas en la misma casilla (" + lugar + ")."));
        }
        if (mapa == null) return -1;
        if (!mapa.esCamino(fila, columna)) {
            problemas.add(new ProblemaLaberinto(codigo + "_FUERA_DEL_CAMINO",
                    prefijo + quien + " está en " + lugar + ", que " + mapa.describir(fila, columna)
                            + ". Solo puede estar sobre el camino (.)."));
            return -1;
        }
        int distancia = mapa.distancia(fila, columna);
        if (exigirAlcance && mapa.tieneInicioYPuertaUnicos() && distancia < 0) {
            problemas.add(new ProblemaLaberinto(codigo + "_INALCANZABLE",
                    prefijo + "el cuy no puede llegar a " + quien + " (" + lugar + ") desde el inicio."));
        }
        return distancia;
    }

    // ---------- Reglas ----------

    private void comprobarRegla(String prefijo, JsonNode regla, List<String> tiposDeObjetos,
                                String reglaEsperada, List<ProblemaLaberinto> problemas) {
        String tipo = texto(regla.path("tipo"));
        if (REGLA_ORDEN.equals(tipo)) {
            comprobarOrden(prefijo, regla, tiposDeObjetos, problemas);
        } else if (REGLA_SOLO_CLASE.equals(tipo)) {
            comprobarSoloClase(prefijo, regla, tiposDeObjetos, problemas);
        } else {
            problemas.add(new ProblemaLaberinto("REGLA_TIPO",
                    prefijo + "la regla debe ser «" + REGLA_ORDEN + "» o «" + REGLA_SOLO_CLASE + "»."));
        }
        if (reglaEsperada != null && tipo != null && !reglaEsperada.equals(tipo)) {
            problemas.add(new ProblemaLaberinto("REGLA_DISTINTA",
                    prefijo + "la regla es «" + tipo + "», pero la propuesta aprobada eligió «" + reglaEsperada + "»."));
        }
    }

    private void comprobarOrden(String prefijo, JsonNode regla, List<String> tiposDeObjetos,
                                List<ProblemaLaberinto> problemas) {
        JsonNode nodo = regla.path("secuencia");
        if (!nodo.isArray() || nodo.size() < MIN_SECUENCIA || nodo.size() > MAX_SECUENCIA) {
            problemas.add(new ProblemaLaberinto("SECUENCIA_LARGO",
                    prefijo + "la secuencia debe tener de " + MIN_SECUENCIA + " a " + MAX_SECUENCIA + " objetos."));
            return;
        }
        List<String> secuencia = new ArrayList<>();
        for (JsonNode elemento : nodo) {
            String tipo = texto(elemento);
            if (tipo == null || !TIPOS_OBJETO.contains(tipo)) {
                problemas.add(new ProblemaLaberinto("SECUENCIA_TIPO",
                        prefijo + "la secuencia nombra un objeto que no existe en el juego («"
                                + (tipo == null ? "sin tipo" : tipo) + "»)."));
                return;
            }
            secuencia.add(tipo);
        }
        if (!esPatronQueSeRepite(secuencia)) {
            problemas.add(new ProblemaLaberinto("SECUENCIA_NO_PATRON",
                    prefijo + "la secuencia debe ser un patrón que se repite con al menos dos objetos distintos, "
                            + "como ABAB o AABAAB."));
        }
        // El mapa tiene que traer, al menos, los objetos que pide la secuencia.
        Map<String, Integer> pedidos = new LinkedHashMap<>();
        for (String tipo : secuencia) pedidos.merge(tipo, 1, Integer::sum);
        for (Map.Entry<String, Integer> pedido : pedidos.entrySet()) {
            int hay = (int) tiposDeObjetos.stream().filter(pedido.getKey()::equals).count();
            if (hay < pedido.getValue()) {
                problemas.add(new ProblemaLaberinto("SECUENCIA_FALTAN_OBJETOS",
                        prefijo + "la secuencia pide " + pedido.getValue() + " «" + pedido.getKey()
                                + "» y el mapa solo tiene " + hay + "."));
            }
        }
    }

    // ¿Es la secuencia un patrón que se repite? Debe haber una unidad de 2 o más
    // objetos, de a lo más la mitad de la secuencia, que repetida forme toda la
    // secuencia (la última repetición puede quedar incompleta), y la secuencia debe
    // usar al menos dos objetos distintos. ABAB, AABAAB y ABCABC lo son; AAAA y ABCD no.
    static boolean esPatronQueSeRepite(List<String> secuencia) {
        int largo = secuencia.size();
        if (new HashSet<>(secuencia).size() < 2) return false;
        for (int unidad = 2; unidad <= largo / 2; unidad++) {
            boolean seRepite = true;
            for (int posicion = unidad; posicion < largo && seRepite; posicion++) {
                seRepite = secuencia.get(posicion).equals(secuencia.get(posicion - unidad));
            }
            if (seRepite) return true;
        }
        return false;
    }

    private void comprobarSoloClase(String prefijo, JsonNode regla, List<String> tiposDeObjetos,
                                    List<ProblemaLaberinto> problemas) {
        String clase = texto(regla.path("clase"));
        boolean claseValida = clase != null && CLASES.containsKey(clase);
        if (!claseValida) {
            problemas.add(new ProblemaLaberinto("CLASE_INVALIDA",
                    prefijo + "la clase debe ser una de estas: " + String.join(", ", CLASES.keySet()) + "."));
        }
        JsonNode metaNodo = regla.path("meta");
        boolean metaValida = esEntero(metaNodo) && metaNodo.intValue() >= MIN_META && metaNodo.intValue() <= MAX_META;
        if (!metaValida) {
            problemas.add(new ProblemaLaberinto("META_RANGO",
                    prefijo + "la meta debe ser un número entero de " + MIN_META + " a " + MAX_META + "."));
        }
        if (!claseValida) return;
        long deLaClase = tiposDeObjetos.stream().filter(tipo -> clase.equals(claseDe(tipo))).count();
        long deLaOtra = tiposDeObjetos.size() - deLaClase;
        if (metaValida && deLaClase < metaNodo.intValue()) {
            problemas.add(new ProblemaLaberinto("CLASE_FALTAN_OBJETOS",
                    prefijo + "la meta es recoger " + metaNodo.intValue() + " objetos de la clase «" + clase
                            + "» y el mapa solo tiene " + deLaClase + "."));
        }
        if (deLaOtra < 1) {
            problemas.add(new ProblemaLaberinto("CLASE_SIN_TRAMPA",
                    prefijo + "falta al menos un objeto de la otra clase para que el niño pueda equivocarse."));
        }
    }

    // ---------- Textos ----------

    private void comprobarTextos(String prefijo, JsonNode reto, List<ProblemaLaberinto> problemas) {
        String consigna = texto(reto.path("consigna"));
        if (estaVacio(consigna)) {
            problemas.add(new ProblemaLaberinto("CONSIGNA_FALTA", prefijo + "falta la consigna."));
        } else if (consigna.length() > MAX_CARACTERES_TEXTO) {
            problemas.add(new ProblemaLaberinto("CONSIGNA_LARGA",
                    prefijo + "la consigna tiene " + consigna.length() + " caracteres; debe ser corta, de "
                            + MAX_CARACTERES_TEXTO + " como máximo."));
        }
        JsonNode ayudas = reto.path("ayudas");
        if (!ayudas.isArray() || ayudas.size() != CANTIDAD_AYUDAS) {
            problemas.add(new ProblemaLaberinto("AYUDAS_CANTIDAD",
                    prefijo + "debe tener exactamente " + CANTIDAD_AYUDAS + " ayudas."));
            return;
        }
        for (int posicion = 0; posicion < ayudas.size(); posicion++) {
            String ayuda = texto(ayudas.get(posicion));
            String etiqueta = prefijo + "la ayuda " + (posicion + 1);
            if (estaVacio(ayuda)) {
                problemas.add(new ProblemaLaberinto("AYUDA_VACIA", etiqueta + " está vacía."));
                continue;
            }
            if (ayuda.length() > MAX_CARACTERES_TEXTO) {
                problemas.add(new ProblemaLaberinto("AYUDA_LARGA",
                        etiqueta + " tiene " + ayuda.length() + " caracteres; debe ser corta, de "
                                + MAX_CARACTERES_TEXTO + " como máximo."));
            }
            List<String> reveladas = nombresQueRevela(ayuda);
            if (!reveladas.isEmpty()) {
                problemas.add(new ProblemaLaberinto("AYUDA_REVELA",
                        etiqueta + " dice la respuesta: nombra " + String.join(", ", reveladas)
                                + ". Una ayuda guía al niño sin decirle qué objeto buscar ni en qué orden."));
            }
        }
    }

    // Los objetos que un texto nombra, sin importar tildes, mayúsculas ni plural.
    static List<String> nombresQueRevela(String texto) {
        String simple = Normalizer.normalize(texto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "");
        List<String> nombres = new ArrayList<>();
        Matcher encontrado = NOMBRES_DE_OBJETOS.matcher(simple);
        while (encontrado.find()) {
            if (!nombres.contains(encontrado.group(1))) nombres.add(encontrado.group(1));
        }
        return nombres;
    }

    // ---------- Ayudas pequeñas ----------

    private static String texto(JsonNode nodo) {
        return nodo != null && nodo.isTextual() ? nodo.asText() : null;
    }

    private static boolean estaVacio(String texto) {
        return texto == null || texto.isBlank();
    }

    private static boolean esEntero(JsonNode nodo) {
        return nodo != null && nodo.isIntegralNumber() && nodo.canConvertToInt();
    }
}
