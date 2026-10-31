package pe.kusi.edu.laberinto;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// Lo que el juego del laberinto sabe dibujar y los límites que Kusi le pone a un
// guion. Debe coincidir con juego/juegos/laberinto/datos/validarLaberinto.js (tipos de objeto,
// enemigos y movimientos) y con juego/juegos/laberinto/logica/disposicionLaberinto.js (tamaño
// máximo del mapa); si uno cambia, el otro también.
public final class CatalogoLaberinto {
    private CatalogoLaberinto() {}

    public static final String NOMBRE = "laberinto";
    public static final int VERSION = 1;

    public static final String FORMATO = "kusi-paquete/0";
    public static final String FAMILIA = "laberinto";

    // Los símbolos de un mapa: muro, camino, inicio del cuy y puerta.
    public static final char MURO = '#';
    public static final char CAMINO = '.';
    public static final char INICIO = 'C';
    public static final char PUERTA = 'P';

    // Las dos reglas que sabe hacer el juego.
    public static final String REGLA_ORDEN = "orden";
    public static final String REGLA_SOLO_CLASE = "solo_clase";

    // Objetos del mapa por clase, escritos sin tildes tal como los lee el juego
    // (no hay tomate ni palta: el juego no tiene su dibujo).
    public static final Map<String, List<String>> CLASES;
    static {
        Map<String, List<String>> clases = new LinkedHashMap<>();
        clases.put("fruta", List.of("fresa", "platano", "mango", "mandarina", "pina"));
        clases.put("verdura", List.of("zanahoria", "papa", "choclo"));
        CLASES = Collections.unmodifiableMap(clases);
    }

    // Todos los tipos de objeto, primero las frutas y después las verduras.
    public static final List<String> TIPOS_OBJETO =
            CLASES.values().stream().flatMap(List::stream).toList();

    // El único enemigo es el zorro y solo se mueve de estas dos maneras.
    public static final String TIPO_ENEMIGO = "zorro";
    public static final List<String> MOVIMIENTOS_ENEMIGO = List.of("patrulla", "persigue_cerca");

    // Cuántos niveles tiene un juego.
    public static final int MIN_NIVELES = 3;
    public static final int MAX_NIVELES = 5;

    // Tamaño máximo del mapa. En un celular de 800 × 360 el juego dibuja un lienzo
    // de 1600 × 720 unidades que se ve a la mitad de su tamaño. La disposición
    // lateral reserva 340 + 12 unidades al panel de Kusi, y la casilla mide
    // mínimo(720 / filas, (1600 - 340 - 12) / columnas) unidades. Para que mida al
    // menos 40 px en pantalla hacen falta 80 unidades: hasta 9 filas y 15 columnas.
    public static final int ANCHO_LIENZO_CELULAR = 1600;
    public static final int ALTO_LIENZO_CELULAR = 720;
    public static final int RESERVA_PANEL = 340 + 12;
    public static final double ESCALA_CELULAR = 0.5;
    public static final int CASILLA_MINIMA_PX = 40;
    public static final int MAX_FILAS = 9;
    public static final int MAX_COLUMNAS = 15;

    // Un enemigo no puede empezar a menos de estas casillas de camino del cuy.
    public static final int DISTANCIA_MINIMA_ENEMIGO = 3;

    // Regla «orden»: la secuencia que se repite tiene de 4 a 8 objetos.
    public static final int MIN_SECUENCIA = 4;
    public static final int MAX_SECUENCIA = 8;

    // Regla «solo_clase»: cuántos objetos hay que recoger.
    public static final int MIN_META = 3;
    public static final int MAX_META = 6;

    // Cada nivel tiene una consigna y dos ayudas. La burbuja de Kusi muestra unas
    // 7 líneas de unas 14 letras; un texto de más de 90 caracteres no cabe.
    public static final int CANTIDAD_AYUDAS = 2;
    public static final int MAX_CARACTERES_TEXTO = 90;

    // La clase a la que pertenece un tipo de objeto, o null si no existe.
    public static String claseDe(String tipo) {
        for (Map.Entry<String, List<String>> clase : CLASES.entrySet()) {
            if (clase.getValue().contains(tipo)) return clase.getKey();
        }
        return null;
    }

    // Tamaño en píxeles de una casilla en un celular de 800 × 360 para un mapa de
    // «filas» × «columnas»; sirve para comprobar que el máximo de arriba es cierto.
    public static double casillaEnCelularPx(int filas, int columnas) {
        double unidades = Math.min(
                (double) ALTO_LIENZO_CELULAR / filas,
                (double) (ANCHO_LIENZO_CELULAR - RESERVA_PANEL) / columnas);
        return Math.floor(unidades) * ESCALA_CELULAR;
    }
}
