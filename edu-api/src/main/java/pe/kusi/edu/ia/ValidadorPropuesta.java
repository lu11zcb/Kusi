package pe.kusi.edu.ia;

import org.springframework.stereotype.Component;
import pe.kusi.edu.laberinto.CatalogoLaberinto;
import java.text.Normalizer;
import java.util.*;

// Un JSON incompleto, truncado o con textos vacíos no cuenta como generación correcta.
@Component
public class ValidadorPropuesta {
    // reglaJuego (HU28): "orden", "solo_clase" o null si la propuesta no eligió una.
    // tipoJuego: "laberinto" si Kusi ya sabe construir el juego que se propone, "otro" si el
    // tema pide otro juego u otros dibujos, o null si la respuesta no lo dice (las ediciones
    // del docente y las propuestas anteriores), y entonces se hereda.
    public record Resultado(String objetivo, String origenObjetivo, String historia, List<String> acciones, List<String> reglas, List<String> retos, List<String> ayudas, List<String> recursos, String reglaJuego, String tipoJuego) {}

    private static final Set<String> REGLAS_DEL_JUEGO=Set.of(CatalogoLaberinto.REGLA_ORDEN, CatalogoLaberinto.REGLA_SOLO_CLASE);
    public static final String TIPO_LABERINTO="laberinto";
    public static final String TIPO_OTRO="otro";
    // La IA responde «ninguna» cuando el juego no es el laberinto: no tiene regla de laberinto.
    private static final String SIN_REGLA="ninguna";
    // Lo que puede aparecer en «objetos» sin ser un alimento: los personajes y la salida.
    private static final Set<String> PERSONAJES=Set.of("cuy", "kusi", "zorro", "portal", "puerta");

    public Resultado validar(Map<String,Object> respuesta, String objetivoDocente) throws FalloGeneracion {
        if (respuesta == null) throw invalida();
        String historia=texto(respuesta.get("historia"), 10000);
        List<String> acciones=lista(respuesta.get("acciones")), reglas=lista(respuesta.get("reglas"));
        List<String> retos=lista(respuesta.get("retos")), ayudas=lista(respuesta.get("ayudas"));
        // HU20: los recursos son opcionales; si faltan se muestran como pendientes.
        List<String> recursos=respuesta.get("recursos") == null ? null : lista(respuesta.get("recursos"));
        String reglaJuego=reglaJuego(respuesta.get("regla_juego"));
        List<String> objetos=respuesta.get("objetos") == null ? null : listaDeObjetos(respuesta.get("objetos"));
        String tipoJuego=tipoJuego(tipoPedido(respuesta.get("tipo_juego")), reglaJuego, objetos);
        // Otro juego no tiene regla de laberinto, aunque la IA haya escrito una.
        if (TIPO_OTRO.equals(tipoJuego)) reglaJuego=null;
        // El objetivo del docente nunca se sustituye por el del proveedor.
        if (objetivoDocente != null) return new Resultado(objetivoDocente, "docente", historia, acciones, reglas, retos, ayudas, recursos, reglaJuego, tipoJuego);
        return new Resultado(texto(respuesta.get("objetivo"), 4000), "ia", historia, acciones, reglas, retos, ayudas, recursos, reglaJuego, tipoJuego);
    }

    // HU28: la regla del juego es opcional (las propuestas anteriores no la elegían ni
    // las que edita el docente la cambian), pero si viene tiene que ser una de las dos
    // que Kusi sabe jugar o «ninguna». Un texto vacío o «ninguna» cuentan como «no eligió».
    private String reglaJuego(Object valor) throws FalloGeneracion {
        if (valor == null) return null;
        if (valor instanceof String texto) {
            String elegida=texto.trim();
            if (elegida.isEmpty() || elegida.equals(SIN_REGLA)) return null;
            if (REGLAS_DEL_JUEGO.contains(elegida)) return elegida;
        }
        throw invalida();
    }

    private String tipoPedido(Object valor) throws FalloGeneracion {
        if (valor == null) return null;
        if (valor instanceof String texto && (texto.trim().equals(TIPO_LABERINTO) || texto.trim().equals(TIPO_OTRO))) return texto.trim();
        throw invalida();
    }

    // Kusi decide si puede construir el juego; no se fía solo de lo que dice la IA. Un
    // laberinto necesita una de sus dos reglas, y cada objeto tiene que nombrar al menos
    // una fruta o verdura del catálogo (o un personaje). «Fresas y plátanos» sirve; «el sol»
    // o «los días de la creación» no, y entonces el juego es «otro».
    static String tipoJuego(String pedido, String reglaJuego, List<String> objetos) {
        if (pedido == null) return null;
        if (TIPO_OTRO.equals(pedido) || reglaJuego == null) return TIPO_OTRO;
        if (objetos != null && !objetos.stream().allMatch(ValidadorPropuesta::nombraAlgoDelCatalogo)) return TIPO_OTRO;
        return TIPO_LABERINTO;
    }

    static boolean nombraAlgoDelCatalogo(String objeto) {
        String simple=Normalizer.normalize(objeto.toLowerCase(Locale.ROOT), Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        for (String palabra : simple.split("[^a-z]+")) {
            if (palabra.isEmpty()) continue;
            // Se prueba la palabra tal cual y sin su plural («plátanos», «papas», «verduras»).
            List<String> formas=new ArrayList<>(List.of(palabra));
            if (palabra.endsWith("es")) formas.add(palabra.substring(0, palabra.length()-2));
            if (palabra.endsWith("s")) formas.add(palabra.substring(0, palabra.length()-1));
            for (String forma : formas) {
                if (CatalogoLaberinto.TIPOS_OBJETO.contains(forma) || CatalogoLaberinto.CLASES.containsKey(forma) || PERSONAJES.contains(forma)) return true;
            }
        }
        return false;
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

    // Los objetos son internos (el docente no los ve): pueden venir vacíos en otro juego.
    private List<String> listaDeObjetos(Object valor) throws FalloGeneracion {
        if (!(valor instanceof List<?> elementos) || elementos.size() > 20) throw invalida();
        List<String> textos=new ArrayList<>();
        for (Object elemento : elementos) textos.add(texto(elemento, 200));
        return textos;
    }

    private FalloGeneracion invalida() { return new FalloGeneracion("La IA devolvió una propuesta incompleta o no válida.", false); }
}
