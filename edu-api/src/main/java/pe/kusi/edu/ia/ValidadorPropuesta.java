package pe.kusi.edu.ia;

import org.springframework.stereotype.Component;
import java.util.*;

// Un JSON incompleto, truncado o con textos vacíos no cuenta como generación correcta.
@Component
public class ValidadorPropuesta {
    public record Resultado(String objetivo, String origenObjetivo, String historia, List<String> acciones, List<String> reglas, List<String> retos, List<String> ayudas, List<String> recursos) {}

    public Resultado validar(Map<String,Object> respuesta, String objetivoDocente) throws FalloGeneracion {
        if (respuesta == null) throw invalida();
        String historia=texto(respuesta.get("historia"), 10000);
        List<String> acciones=lista(respuesta.get("acciones")), reglas=lista(respuesta.get("reglas"));
        List<String> retos=lista(respuesta.get("retos")), ayudas=lista(respuesta.get("ayudas"));
        // HU20: los recursos son opcionales; si faltan se muestran como pendientes.
        List<String> recursos=respuesta.get("recursos") == null ? null : lista(respuesta.get("recursos"));
        // El objetivo del docente nunca se sustituye por el del proveedor.
        if (objetivoDocente != null) return new Resultado(objetivoDocente, "docente", historia, acciones, reglas, retos, ayudas, recursos);
        return new Resultado(texto(respuesta.get("objetivo"), 4000), "ia", historia, acciones, reglas, retos, ayudas, recursos);
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
