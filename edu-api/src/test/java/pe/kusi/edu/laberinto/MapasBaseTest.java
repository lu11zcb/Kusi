package pe.kusi.edu.laberinto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

// HU26: los mapas base son el respaldo cuando la IA no logra un mapa que pase las
// comprobaciones. Tienen que ser los del paquete de ejemplo del juego y tienen que
// servir de verdad.
class MapasBaseTest {
    private static final int CASILLA_MINIMA_PX = 40;

    private final MapasBase mapasBase = new MapasBase(new ObjectMapper());

    private static MapaLaberinto mapaDe(JsonNode nivel) {
        List<String> filas = new ArrayList<>();
        nivel.get("mapa").forEach(fila -> filas.add(fila.asText()));
        return new MapaLaberinto(filas);
    }

    @Test
    void sonLosTresMapasYLosEnemigosDelEjemploDelJuego() throws Exception {
        JsonNode ejemplo = GuionesDePrueba.ejemplo();

        assertEquals(3, mapasBase.niveles().size());
        for (int posicion = 0; posicion < 3; posicion++) {
            JsonNode reto = ejemplo.get("retos").get(posicion);
            JsonNode base = mapasBase.niveles().get(posicion);
            assertEquals(reto.get("mapa"), base.get("mapa"), "El mapa del nivel " + (posicion + 1) + " cambió.");
            assertEquals(reto.get("enemigos"), base.get("enemigos"), "Los enemigos del nivel " + (posicion + 1) + " cambiaron.");
        }
    }

    @Test
    void cadaMapaBaseTieneInicioYPuertaQueSeAlcanzanYCabeEnElCelular() {
        for (JsonNode nivel : mapasBase.niveles()) {
            MapaLaberinto mapa = mapaDe(nivel);

            assertTrue(mapa.tieneInicioYPuertaUnicos());
            assertTrue(mapa.distancia(mapa.puerta()[0], mapa.puerta()[1]) > 0, "Desde el inicio no se llega a la puerta.");
            assertTrue(mapa.filas() <= CatalogoLaberinto.MAX_FILAS && mapa.columnas() <= CatalogoLaberinto.MAX_COLUMNAS);
            assertTrue(CatalogoLaberinto.casillaEnCelularPx(mapa.filas(), mapa.columnas()) >= CASILLA_MINIMA_PX);
        }
    }

    @Test
    void losMapasBaseNoSeAchicanDeUnNivelAOtro() {
        MapaLaberinto anterior = null;
        for (JsonNode nivel : mapasBase.niveles()) {
            MapaLaberinto actual = mapaDe(nivel);
            if (anterior != null) {
                assertTrue(actual.filas() >= anterior.filas() && actual.columnas() >= anterior.columnas());
            }
            anterior = actual;
        }
    }

    @Test
    void ningunEnemigoBaseEmpiezaCercaDelInicio() {
        for (JsonNode nivel : mapasBase.niveles()) {
            MapaLaberinto mapa = mapaDe(nivel);
            for (JsonNode enemigo : nivel.get("enemigos")) {
                int distancia = mapa.distancia(enemigo.get("fila").asInt(), enemigo.get("columna").asInt());
                assertTrue(distancia >= CatalogoLaberinto.DISTANCIA_MINIMA_ENEMIGO,
                        "Un enemigo base empieza a solo " + distancia + " casillas del inicio.");
            }
        }
        // El primer nivel no tiene enemigos.
        assertEquals(0, mapasBase.niveles().get(0).get("enemigos").size());
    }
}
