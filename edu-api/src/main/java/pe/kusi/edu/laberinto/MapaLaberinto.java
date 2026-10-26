package pe.kusi.edu.laberinto;

import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.List;

import static pe.kusi.edu.laberinto.CatalogoLaberinto.*;

// Un mapa del laberinto ya leído: una cuadrícula rectangular de símbolos con su
// inicio (C) y su puerta (P). Mide cuántas casillas de camino hay desde el inicio
// hasta cada lugar con una búsqueda en anchura, igual que se mueve el cuy: arriba,
// abajo, izquierda y derecha, sin atravesar muros ni la puerta.
public final class MapaLaberinto {
    private final char[][] celdas;
    private final int filas;
    private final int columnas;
    private int inicios;
    private int puertas;
    private int[] inicio = null;
    private int[] puerta = null;
    private int[][] distancias = null;

    // «filasDeTexto» debe ser rectangular: todas las filas del mismo largo.
    public MapaLaberinto(List<String> filasDeTexto) {
        this.filas = filasDeTexto.size();
        this.columnas = filasDeTexto.get(0).length();
        this.celdas = new char[filas][];
        for (int fila = 0; fila < filas; fila++) {
            celdas[fila] = filasDeTexto.get(fila).toCharArray();
            for (int columna = 0; columna < columnas; columna++) {
                if (celdas[fila][columna] == INICIO) {
                    inicios++;
                    inicio = new int[] {fila, columna};
                } else if (celdas[fila][columna] == PUERTA) {
                    puertas++;
                    puerta = new int[] {fila, columna};
                }
            }
        }
    }

    public int filas() { return filas; }

    public int columnas() { return columnas; }

    public boolean dentro(int fila, int columna) {
        return fila >= 0 && fila < filas && columna >= 0 && columna < columnas;
    }

    public char celda(int fila, int columna) { return celdas[fila][columna]; }

    // Solo el camino libre admite objetos y enemigos; el inicio y la puerta no.
    public boolean esCamino(int fila, int columna) {
        return dentro(fila, columna) && celdas[fila][columna] == CAMINO;
    }

    // Hay exactamente un inicio y una puerta: sin eso no tiene sentido medir distancias.
    public boolean tieneInicioYPuertaUnicos() { return inicios == 1 && puertas == 1; }

    public int[] puerta() { return puerta; }

    // Cuántas casillas de camino hay desde el inicio hasta esta; -1 si no se puede
    // llegar, si la casilla está fuera del mapa o si el mapa no tiene un inicio único.
    public int distancia(int fila, int columna) {
        if (inicios != 1 || !dentro(fila, columna)) return -1;
        if (distancias == null) distancias = medirDesdeElInicio();
        return distancias[fila][columna];
    }

    // Una descripción corta de lo que hay en una casilla, para los motivos.
    public String describir(int fila, int columna) {
        if (!dentro(fila, columna)) return "está fuera del mapa";
        return switch (celdas[fila][columna]) {
            case MURO -> "es un muro";
            case INICIO -> "es el inicio del cuy";
            case PUERTA -> "es la puerta";
            case CAMINO -> "es camino";
            default -> "no es una casilla válida";
        };
    }

    private int[][] medirDesdeElInicio() {
        int[][] medidas = new int[filas][columnas];
        for (int[] fila : medidas) Arrays.fill(fila, -1);
        ArrayDeque<int[]> pendientes = new ArrayDeque<>();
        medidas[inicio[0]][inicio[1]] = 0;
        pendientes.add(inicio);
        int[][] pasos = {{-1, 0}, {1, 0}, {0, -1}, {0, 1}};
        while (!pendientes.isEmpty()) {
            int[] actual = pendientes.poll();
            for (int[] paso : pasos) {
                int fila = actual[0] + paso[0];
                int columna = actual[1] + paso[1];
                if (!dentro(fila, columna) || medidas[fila][columna] != -1) continue;
                char simbolo = celdas[fila][columna];
                if (simbolo != CAMINO && simbolo != PUERTA) continue;
                medidas[fila][columna] = medidas[actual[0]][actual[1]] + 1;
                // La puerta es la meta: se puede llegar a ella, pero no se pasa de largo.
                if (simbolo == CAMINO) pendientes.add(new int[] {fila, columna});
            }
        }
        return medidas;
    }
}
