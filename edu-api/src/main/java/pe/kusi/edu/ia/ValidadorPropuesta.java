package pe.kusi.edu.ia;

import org.springframework.stereotype.Component;
import pe.kusi.edu.laberinto.CatalogoLaberinto;
import java.util.*;

// Un JSON incompleto, truncado o con textos vacíos no cuenta como generación correcta.
@Component
public class ValidadorPropuesta {
    // reglaJuego (HU28): "orden", "solo_clase" o null si la propuesta no eligió una.
    public record Resultado(String objetivo, String origenObjetivo, String historia, List<String> acciones, List<String> reglas, List<String> retos, List<String> ayudas, List<String> recursos, String reglaJuego) {}

    private static final Set<String> REGLAS_DEL_JUEGO=Set.of(CatalogoLaberinto.REGLA_ORDEN, CatalogoLaberinto.REGLA_SOLO_CLASE);

    public Resultado validar(Map<String,Object> respuesta, String objetivoDocente) throws FalloGeneracion {
        if (respuesta == null) throw invalida();
        String historia=texto(respuesta.get("historia"), 10000);
        List<String> acciones=lista(respuesta.get("acciones")), reglas=lista(respuesta.get("reglas"));
        List<String> retos=lista(respuesta.get("retos")), ayudas=lista(respuesta.get("ayudas"));
        // HU20: los recursos son opcionales; si faltan se muestran como pendientes.
        List<String> recursos=respuesta.get("recursos") == null ? null : lista(respuesta.get("recursos"));
        String reglaJuego=reglaJuego(respuesta.get("regla_juego"));
        // El objetivo del docente nunca se sustituye por el del proveedor.
        if (objetivoDocente != null) return new Resultado(objetivoDocente, "docente", historia, acciones, reglas, retos, ayudas, recursos, reglaJuego);
        return new Resultado(texto(respuesta.get("objetivo"), 4000), "ia", historia, acciones, reglas, retos, ayudas, recursos, reglaJuego);
    }

    // HU28: la regla del juego es opcional (las propuestas anteriores no la elegían ni
    // las que edita el docente la cambian), pero si viene tiene que ser una de las dos
    // que Kusi sabe jugar. Un texto vacío cuenta como «no eligió».
    private String reglaJuego(Object valor) throws FalloGeneracion {
        if (valor == null) return null;
        if (valor instanceof String texto) {
            String elegida=texto.trim();
            if (elegida.isEmpty()) return null;
            if (REGLAS_DEL_JUEGO.contains(elegida)) return elegida;
        }
        throw invalida();
    }

    private String texto(Object valor, int limite) throws FalloGeneracion {
        if (!(valor instanceof String s) || s.isBlank() || s.length() > limite) throw invalida();
        return s;
    }

    private List<String> lista(Object valor) throws FalloGeneracion {
        if (!(valor instanceof List<?> elementos) || elementos.isEmpty() || elementos.size() > 20) throw invalida();
        List<String> textos=new ArrayList<>();
        for (Object elemento : elementos) textos.add(texto(elemento, 2000));
        return textos;
    }

    private FalloGeneracion invalida() { return new FalloGeneracion("La IA devolvió una propuesta incompleta o no válida.", false); }
}
