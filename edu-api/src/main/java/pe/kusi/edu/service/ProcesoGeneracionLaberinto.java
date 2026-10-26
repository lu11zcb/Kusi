package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import pe.kusi.edu.ia.EntradaGuion;
import pe.kusi.edu.ia.FalloGeneracion;
import pe.kusi.edu.ia.GeneradorGuion;
import pe.kusi.edu.laberinto.ConstructorGuion;
import pe.kusi.edu.laberinto.MapasBase;
import pe.kusi.edu.laberinto.ProblemaLaberinto;
import pe.kusi.edu.laberinto.ValidadorLaberinto;
import pe.kusi.edu.model.EtapaGeneracion;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.Propuesta;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PropuestaRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

// HU26: la generación real del juego. Con la propuesta aprobada le pide a la IA el
// guion del laberinto (llamada 2) y lo comprueba con ValidadorLaberinto (HU31):
//
//   pendiente → generando → comprobando → lista
//                              ↓   ↑
//                           correccion   (si no pasa, se vuelve a pedir con la lista de problemas)
//
// Se pide como máximo 3 veces: el primer intento y dos correcciones. Si el guion
// sigue sin pasar, se usan los mapas base y se conserva lo aprovechable de la IA;
// las reglas, objetos y textos defectuosos se reparan sin aflojar HU31. Si la IA no responde, la
// generación queda «fallida» con su motivo.
//
// Cada paso queda como una etapa de la generación («generacion» o «correccion» para
// cada pedido a la IA, «comprobacion» y «mapa_base») y se guarda en su propia
// transacción corta: ninguna transacción queda abierta durante una llamada a la IA,
// y el panel puede ver el avance mientras se procesa. Los problemas de las
// comprobaciones van en el mensaje de la etapa «comprobacion», uno por línea con el
// formato «CODIGO: motivo».
@Service
public class ProcesoGeneracionLaberinto {
    // El primer intento y hasta dos correcciones.
    public static final int MAX_CORRECCIONES = 2;
    public static final int MAX_INTENTOS = 1 + MAX_CORRECCIONES;

    // Los nombres de las etapas y de sus estados.
    static final String ETAPA_GENERACION = "generacion";
    static final String ETAPA_COMPROBACION = "comprobacion";
    static final String ETAPA_CORRECCION = "correccion";
    static final String ETAPA_MAPA_BASE = "mapa_base";
    private static final String EN_PROGRESO = "en_progreso";
    private static final String COMPLETADA = "completada";
    private static final String FALLIDA = "fallida";

    // El mensaje de una etapa y el último error de una generación caben en 1000 caracteres.
    private static final int MAX_MENSAJE = 1000;

    private final PropuestasService propuestasService;
    private final PropuestaRepository propuestaRepository;
    private final GeneracionRepository generacionRepository;
    private final EtapaGeneracionRepository etapaRepository;
    private final GeneradorGuion generador;
    private final ValidadorLaberinto validador;
    private final MapasBase mapasBase;
    private final ObjectMapper json;

    public ProcesoGeneracionLaberinto(PropuestasService propuestasService, PropuestaRepository propuestaRepository,
                                      GeneracionRepository generacionRepository, EtapaGeneracionRepository etapaRepository,
                                      GeneradorGuion generador, ValidadorLaberinto validador, MapasBase mapasBase,
                                      ObjectMapper json) {
        this.propuestasService = propuestasService;
        this.propuestaRepository = propuestaRepository;
        this.generacionRepository = generacionRepository;
        this.etapaRepository = etapaRepository;
        this.generador = generador;
        this.validador = validador;
        this.mapasBase = mapasBase;
        this.json = json;
    }

    public boolean iaConfigurada() { return generador.configurado(); }

    // «generacion» ya pasó a «generando» (la tomó GeneracionesService). Devuelve la
    // generación en su estado final: lista o fallida.
    public Generacion procesar(UUID docenteId, Generacion generacion) {
        try {
            return generar(docenteId, generacion);
        } catch (RuntimeException error) {
            // Nada puede dejar una generación en «generando» para siempre.
            etapa(generacion.getId(), ETAPA_GENERACION, FALLIDA, "No se pudo completar la generación.");
            return fallar(generacion, "No se pudo completar la generación del juego. Puedes pedir una generación nueva.");
        }
    }

    private Generacion generar(UUID docenteId, Generacion generacion) {
        UUID id = generacion.getId();
        Propuesta propuesta = propuestaRepository.findById(generacion.getPropuestaId()).orElseThrow();
        PropuestasService.ContextoSolicitud contexto = propuestasService.contextoDe(docenteId, generacion.getSolicitudId());
        Map<String, Object> contenido = propuestasService.contenido(propuesta);
        // La regla que eligió la propuesta (orden o solo_clase); null si no eligió.
        String reglaJuego = contenido.get("regla_juego") instanceof String elegida ? elegida : null;

        JsonNode guionAnterior = null;
        List<ProblemaLaberinto> problemas = List.of();
        JsonNode ultimaRespuesta = null;
        int intentos = 0;
        for (int intento = 1; intento <= MAX_INTENTOS; intento++) {
            // El primer intento es la generación; los demás son correcciones. La generación
            // queda «generando» mientras se pide el guion y «correccion» mientras se pide
            // corregirlo, y cada pedido es una etapa con su propio nombre.
            boolean esCorreccion = intento > 1;
            String etapaDeLaIa = esCorreccion ? ETAPA_CORRECCION : ETAPA_GENERACION;
            cambiarEstado(generacion, esCorreccion ? "correccion" : "generando", null);
            etapa(id, etapaDeLaIa, EN_PROGRESO, "Intento " + intento + " de " + MAX_INTENTOS
                    + (esCorreccion ? ": se pide a la IA corregir el guion." : ": se pide el guion a la IA."));
            JsonNode respuesta;
            try {
                respuesta = generador.generarGuion(new EntradaGuion(contexto.cursoNombre(), contexto.grado(), contexto.tema(),
                        contexto.proposito(), contexto.instrucciones(), contenido, reglaJuego,
                        intento, MAX_INTENTOS, guionAnterior, problemas));
            } catch (FalloGeneracion fallo) {
                etapa(id, etapaDeLaIa, FALLIDA, "Intento " + intento + ": " + fallo.getMessage());
                // Sin ninguna respuesta de la IA no hay con qué trabajar. Si ya hubo una, se sigue con el respaldo.
                if (ultimaRespuesta == null) return fallar(generacion, fallo.getMessage());
                break;
            }
            intentos = intento;
            ultimaRespuesta = respuesta;
            etapa(id, etapaDeLaIa, COMPLETADA, "Intento " + intento
                    + (esCorreccion ? ": la IA devolvió un guion corregido." : ": la IA devolvió un guion."));

            ObjectNode guion = ConstructorGuion.desdeLaIa(respuesta, contexto.cursoNombre());
            cambiarEstado(generacion, "comprobando", null);
            problemas = guion == null
                    ? List.of(new ProblemaLaberinto("GUION_INVALIDO", "La IA no devolvió un guion en formato JSON."))
                    : validador.validar(guion, reglaJuego);
            if (problemas.isEmpty()) {
                etapa(id, ETAPA_COMPROBACION, COMPLETADA, "Intento " + intento + ": el guion pasó todas las comprobaciones.");
                return terminar(generacion, guion, intento, false);
            }
            etapa(id, ETAPA_COMPROBACION, FALLIDA, mensajeDeProblemas("Intento " + intento, problemas));
            // En la corrección la IA recibe su propia respuesta, tal como la escribió.
            guionAnterior = respuesta;
        }
        return conMapasBase(generacion, contexto.cursoNombre(), reglaJuego, ultimaRespuesta, intentos, problemas);
    }

    // El respaldo conserva lo válido y repara lo que HU31 rechazó.
    private Generacion conMapasBase(Generacion generacion, String curso, String reglaJuego, JsonNode respuesta,
                                    int intentos, List<ProblemaLaberinto> ultimosProblemas) {
        UUID id = generacion.getId();
        etapa(id, ETAPA_MAPA_BASE, EN_PROGRESO, "No se logró un guion que pase las comprobaciones con la IA ("
                + intentos + (intentos == 1 ? " intento" : " intentos") + "): se usan los mapas base.");
        Optional<ObjectNode> guion = ConstructorGuion.conMapasBase(respuesta, curso, mapasBase.niveles(), reglaJuego);
        if (guion.isEmpty()) {
            etapa(id, ETAPA_MAPA_BASE, FALLIDA, "No hay una respuesta o no se pudieron obtener los mapas de respaldo.");
            return fallar(generacion, mensajeDeProblemas("El guion de la IA no sirve", ultimosProblemas));
        }
        cambiarEstado(generacion, "comprobando", null);
        List<ProblemaLaberinto> problemas = validador.validar(guion.get(), reglaJuego);
        if (!problemas.isEmpty()) {
            etapa(id, ETAPA_MAPA_BASE, FALLIDA, "Ni con los mapas base el guion pasa las comprobaciones.");
            etapa(id, ETAPA_COMPROBACION, FALLIDA, mensajeDeProblemas("Con los mapas base", problemas));
            return fallar(generacion, mensajeDeProblemas("Ni con los mapas base pasa las comprobaciones", problemas));
        }
        etapa(id, ETAPA_MAPA_BASE, COMPLETADA, ConstructorGuion.cambiosDelRespaldo(respuesta, guion.get()));
        etapa(id, ETAPA_COMPROBACION, COMPLETADA, "Con los mapas base: el guion pasó todas las comprobaciones.");
        return terminar(generacion, guion.get(), intentos, true);
    }

    // Guarda el guion con su procedencia y deja la generación «lista».
    private Generacion terminar(Generacion generacion, ObjectNode guion, int intentos, boolean mapaBase) {
        ConstructorGuion.ponerProcedencia(guion, generador.proveedor(), generador.modelo(), intentos, mapaBase);
        try {
            generacion.guardarPaquete(json.writeValueAsString(guion));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("No se pudo guardar el guion.", e);
        }
        generacion.registrarEstado("lista", null);
        return generacionRepository.save(generacion);
    }

    private Generacion fallar(Generacion generacion, String motivo) {
        generacion.registrarEstado("fallida", recortar(motivo));
        return generacionRepository.save(generacion);
    }

    private void cambiarEstado(Generacion generacion, String estado, String error) {
        generacion.registrarEstado(estado, error);
        generacionRepository.save(generacion);
    }

    private void etapa(UUID generacionId, String etapa, String estado, String mensaje) {
        etapaRepository.save(new EtapaGeneracion(generacionId, etapa, estado, recortar(mensaje)));
    }

    // «Intento 2: 3 problemas» y, debajo, un problema por línea como «CODIGO: motivo».
    // Si no caben en 1000 caracteres se corta y se dice cuántos quedaron fuera.
    static String mensajeDeProblemas(String encabezado, List<ProblemaLaberinto> problemas) {
        String texto = encabezado + ": " + problemas.size() + (problemas.size() == 1 ? " problema" : " problemas");
        for (int posicion = 0; posicion < problemas.size(); posicion++) {
            String linea = "\n" + problemas.get(posicion);
            int quedan = problemas.size() - posicion;
            // Se deja sitio para el aviso de «y N más» si esta línea no es la última.
            int reserva = quedan > 1 ? 24 : 0;
            if (texto.length() + linea.length() + reserva > MAX_MENSAJE) {
                return texto + "\n(y " + quedan + " más)";
            }
            texto += linea;
        }
        return texto;
    }

    private static String recortar(String texto) {
        return texto.length() > MAX_MENSAJE ? texto.substring(0, MAX_MENSAJE) : texto;
    }
}
