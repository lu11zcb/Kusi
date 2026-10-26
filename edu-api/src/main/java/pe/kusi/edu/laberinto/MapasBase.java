package pe.kusi.edu.laberinto;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

// Los tres mapas base de respaldo (laberinto/mapas-base.json). Son los mismos del
// paquete de ejemplo del juego: pasan todas las comprobaciones. Si la IA no logra un
// mapa que las pase tras corregirlo, el constructor usa estos y conserva solo lo
// aprovechable de la IA; repara el contenido defectuoso antes de comprobarlo otra vez.
@Component
public class MapasBase {
    private static final String RECURSO = "laberinto/mapas-base.json";

    // Cada nivel base trae su «mapa» (lista de filas) y sus «enemigos» ya colocados.
    private final List<JsonNode> niveles;

    public MapasBase(ObjectMapper json) {
        try (InputStream entrada = new ClassPathResource(RECURSO).getInputStream()) {
            List<JsonNode> leidos = new ArrayList<>();
            json.readTree(entrada).path("niveles").forEach(leidos::add);
            this.niveles = List.copyOf(leidos);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudieron leer los mapas base (" + RECURSO + ").", e);
        }
        if (niveles.size() < CatalogoLaberinto.MIN_NIVELES) {
            throw new IllegalStateException("Los mapas base deben ser al menos " + CatalogoLaberinto.MIN_NIVELES + ".");
        }
    }

    public List<JsonNode> niveles() { return niveles; }
}
