package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.model.EtapaGeneracion;
import pe.kusi.edu.model.Generacion;
import pe.kusi.edu.model.PiezaTaller;
import pe.kusi.edu.model.TrabajoTaller;
import pe.kusi.edu.repository.EtapaGeneracionRepository;
import pe.kusi.edu.repository.GeneracionRepository;
import pe.kusi.edu.repository.PiezaTallerRepository;
import pe.kusi.edu.repository.TrabajoTallerRepository;
import pe.kusi.edu.taller.EntregaTallerInvalida;
import pe.kusi.edu.taller.ValidadorPaqueteTaller;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * El buzón del taller, del lado de Spring. El trabajador de la Mac pide el siguiente
 * trabajo, crea el juego y devuelve su resultado o su fallo. Lo que pasa por dentro
 * (motivos, intentos, evidencia) se guarda; el docente solo ve un mensaje amable.
 */
@Service
public class TallerService {

    private static final Logger registro = LoggerFactory.getLogger(TallerService.class);

    // El trabajador se limita a 75 minutos. Si a los 90 un trabajo sigue «en proceso»,
    // el trabajador se cayó: el trabajo vuelve a «pendiente» para intentarlo otra vez.
    // Un juego con su cuento, sus piezas y sus correcciones tarda más de 25 minutos.
    public static final Duration VENCIMIENTO = Duration.ofMinutes(90);
    // Al tercer vencimiento el trabajo queda «fallido»: algo lo traba siempre.
    public static final int MAX_VENCIMIENTOS = 3;
    public static final int MAX_CARACTERES_MOTIVO = 2000;
    // 1 intento y hasta 2 correcciones (reglas.md, regla 10).
    public static final int MAX_INTENTOS_JUEGO = 3;
    public static final int MAX_PIEZAS = 20;
    public static final int MAX_CARACTERES_EVIDENCIA = 64 * 1024;
    // Lo único que ve el docente cuando su juego no sale. El motivo real es interno.
    public static final String MENSAJE_PARA_EL_DOCENTE =
            "Esta vez no pudimos terminar tu juego. Puedes intentarlo de nuevo.";

    static final String TRABAJADOR = "taller";
    // Mismo formato que los nombres de archivo de la guía de estilo (olla-de-barro).
    private static final Pattern ID_PIEZA = Pattern.compile("^[a-z0-9]+(-[a-z0-9]+)*$");
    private static final int MAX_CARACTERES_ID_PIEZA = 60;
    private static final int MAX_CARACTERES_NOMBRE_PIEZA = 80;

    private final TrabajoTallerRepository trabajos;
    private final GeneracionRepository generaciones;
    private final EtapaGeneracionRepository etapas;
    private final PiezaTallerRepository piezas;
    private final ValidadorPaqueteTaller validador;
    private final ObjectMapper json;

    public TallerService(
            TrabajoTallerRepository trabajos,
            GeneracionRepository generaciones,
            EtapaGeneracionRepository etapas,
            PiezaTallerRepository piezas,
            ValidadorPaqueteTaller validador,
            ObjectMapper json) {
        this.trabajos = trabajos;
        this.generaciones = generaciones;
        this.etapas = etapas;
        this.piezas = piezas;
        this.validador = validador;
        this.json = json;
    }

    // Una pieza nueva tal como la anunció el taller, ya revisada.
    private record PiezaNueva(String id, String tipo, String nombre) {}

    /**
     * Entrega el trabajo pendiente más antiguo y lo marca «en proceso», o vacío si no
     * hay ninguno. Antes, devuelve a «pendiente» los que se vencieron.
     */
    @Transactional
    public Optional<TrabajoTaller> siguiente() {
        for (TrabajoTaller vencido : trabajos.bloquearVencidos(Instant.now().minus(VENCIMIENTO))) {
            vencer(vencido);
        }
        // La consulta del siguiente es SQL directo: tiene que ver los vencidos ya guardados.
        trabajos.flush();

        Optional<TrabajoTaller> siguiente = trabajos.tomarSiguientePendiente();
        siguiente.ifPresent(trabajo -> {
            trabajo.tomar(TRABAJADOR);
            trabajos.save(trabajo);
            if (trabajo.esDePropuesta()) {
                // Una propuesta no tiene generación: su solicitud ya está «generando».
                registro.info("[taller] Se entregó el trabajo " + trabajo.getId() + " (propuesta).");
                return;
            }
            Generacion generacion = generacionDe(trabajo);
            generacion.registrarEstado("generando", null);
            generaciones.save(generacion);
            etapas.save(new EtapaGeneracion(generacion.getId(), "taller", "en_progreso",
                    "El taller empezó a crear el juego (vez " + trabajo.getIntentos() + ")."));
            registro.info("[taller] Se entregó el trabajo " + trabajo.getId()
                    + " (vez " + trabajo.getIntentos() + ").");
        });
        return siguiente;
    }

    // Un trabajo vencido vuelve a «pendiente», salvo que ya se haya vencido tres veces.
    // Cada vez que se toma suma un intento, así que «intentos» cuenta los vencimientos.
    private void vencer(TrabajoTaller trabajo) {
        Generacion generacion = generacionDe(trabajo);
        if (trabajo.getIntentos() >= MAX_VENCIMIENTOS) {
            String motivo = "Se venció el tiempo " + MAX_VENCIMIENTOS + " veces: el taller no terminó en "
                    + VENCIMIENTO.toMinutes() + " minutos.";
            trabajo.registrarFallo(motivo);
            generacion.registrarEstado("fallida", MENSAJE_PARA_EL_DOCENTE);
            etapas.save(new EtapaGeneracion(generacion.getId(), "taller", "fallida", MENSAJE_PARA_EL_DOCENTE));
            registro.warn("[taller] El trabajo " + trabajo.getId() + " quedó fallido: " + motivo);
        } else {
            trabajo.reencolar("Se venció el tiempo (vez " + trabajo.getIntentos() + " de "
                    + MAX_VENCIMIENTOS + "): volvió a pendiente.");
            generacion.registrarEstado("pendiente", null);
            registro.warn("[taller] El trabajo " + trabajo.getId() + " se venció (vez "
                    + trabajo.getIntentos() + "): vuelve a pendiente.");
        }
        trabajos.save(trabajo);
        generaciones.save(generacion);
    }

    /**
     * El taller entrega el juego. Si el guion pasa la revisión común, la generación queda
     * «lista» con su procedencia y las piezas nuevas quedan «pendientes». Si no, se lanza
     * {@link EntregaTallerInvalida} con todos los motivos y no se guarda nada.
     */
    @Transactional
    public Generacion resultado(UUID id, JsonNode cuerpo) {
        TrabajoTaller trabajo = enProceso(id);
        List<String> motivos = new ArrayList<>();
        if (cuerpo == null || !cuerpo.isObject()) {
            throw new EntregaTallerInvalida(List.of("El resultado debe ser un objeto JSON con «paquete», «piezas» y «evidencia»."));
        }

        JsonNode paquete = cuerpo.get("paquete");
        if (paquete == null || !paquete.isObject()) {
            motivos.add("Falta «paquete»: el guion del juego, como objeto JSON.");
        } else {
            motivos.addAll(validador.validar(paquete, id, comoTexto(paquete).length()));
        }
        List<PiezaNueva> nuevas = leerPiezas(cuerpo.get("piezas"), motivos);
        JsonNode evidencia = cuerpo.get("evidencia");
        int intentos = revisarEvidencia(evidencia, motivos);
        if (!motivos.isEmpty()) {
            registro.info("[taller] El resultado del trabajo " + id + " no pasó la revisión: "
                    + String.join(" ", motivos));
            throw new EntregaTallerInvalida(motivos);
        }

        // La procedencia la escribe Spring, no el taller: de dónde salió el juego, cuántos
        // intentos necesitó y cuánto tardó. Sin nombres de programas.
        ObjectNode guion = paquete.deepCopy();
        ObjectNode procedencia = guion.putObject("procedencia");
        procedencia.put("origen", "taller");
        procedencia.put("trabajo", id.toString());
        procedencia.put("intentos", intentos);
        procedencia.put("segundos", Duration.between(trabajo.getTomadoEn(), Instant.now()).toSeconds());

        Generacion generacion = generacionDe(trabajo);
        generacion.guardarPaquete(comoTexto(guion));
        generacion.registrarEstado("lista", null);
        generaciones.save(generacion);
        // Por dentro se guarda lo que entregó el taller, tal cual (con su evidencia).
        trabajo.registrarResultado(comoTexto(cuerpo));
        trabajos.save(trabajo);
        for (PiezaNueva pieza : nuevas) {
            piezas.save(new PiezaTaller(id, pieza.id(), pieza.tipo(), pieza.nombre()));
        }
        etapas.save(new EtapaGeneracion(generacion.getId(), "taller", "completada", "El juego está listo."));
        registro.info("[taller] El trabajo " + id + " quedó listo (" + nuevas.size()
                + (nuevas.size() == 1 ? " pieza nueva)." : " piezas nuevas)."));
        return generacion;
    }

    /**
     * El taller no pudo crear el juego. El trabajo y la generación quedan fallidos; el
     * motivo se guarda recortado y el docente solo ve un mensaje amable.
     */
    @Transactional
    public Generacion fallo(UUID id, String motivo) {
        TrabajoTaller trabajo = enProceso(id);
        String guardado = recortar(motivo == null || motivo.isBlank()
                ? "El taller no dio un motivo." : motivo.strip(), MAX_CARACTERES_MOTIVO);
        trabajo.registrarFallo(guardado);
        trabajos.save(trabajo);

        Generacion generacion = generacionDe(trabajo);
        generacion.registrarEstado("fallida", MENSAJE_PARA_EL_DOCENTE);
        generaciones.save(generacion);
        etapas.save(new EtapaGeneracion(generacion.getId(), "taller", "fallida", MENSAJE_PARA_EL_DOCENTE));
        registro.warn("[taller] El trabajo " + id + " falló: " + guardado);
        return generacion;
    }

    /**
     * El docente envió a su clase un juego del taller: sus piezas quedan aprobadas y, desde
     * entonces, el juego y sus piezas entran en la biblioteca que recibe el supervisor.
     */
    @Transactional
    public void aprobarPiezas(Generacion generacion) {
        trabajos.findFirstByGeneracionIdOrderByCreadoEnDesc(generacion.getId()).ifPresent(trabajo -> {
            for (PiezaTaller pieza : piezas.findAllByTrabajoIdOrderByPiezaAsc(trabajo.getId())) {
                pieza.aprobar();
                piezas.save(pieza);
            }
        });
    }

    /**
     * La biblioteca del supervisor: los juegos del taller que el docente envió a su clase
     * (uno por solicitud, el último) con sus piezas aprobadas. El trabajador agrega la ruta
     * y la huella de cada pieza, que viven en su Mac.
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> biblioteca() {
        List<Map<String, Object>> juegos = new ArrayList<>();
        for (Generacion generacion : generaciones.juegosDelTallerEnviados()) {
            Optional<TrabajoTaller> trabajo = trabajos.findFirstByGeneracionIdOrderByCreadoEnDesc(generacion.getId());
            if (trabajo.isEmpty()) continue;
            Map<String, Object> juego = new LinkedHashMap<>();
            juego.put("trabajo", trabajo.get().getId());
            try {
                JsonNode paquete = json.readTree(generacion.getPaquete());
                juego.put("familia", paquete.path("familia").asText(null));
                juego.put("titulo", paquete.path("titulo").asText(null));
            } catch (JsonProcessingException ex) {
                continue;
            }
            List<Map<String, Object>> lista = new ArrayList<>();
            for (PiezaTaller pieza : piezas.findAllByTrabajoIdOrderByPiezaAsc(trabajo.get().getId())) {
                if (!"aprobada".equals(pieza.getEstado())) continue;
                Map<String, Object> datos = new LinkedHashMap<>();
                datos.put("id", pieza.getPieza());
                datos.put("tipo", pieza.getTipo());
                datos.put("nombre", pieza.getNombre());
                lista.add(datos);
            }
            juego.put("piezas", lista);
            juegos.add(juego);
        }
        return juegos;
    }

    // Solo se cierra un trabajo que está «en proceso». Si se venció y volvió a la cola,
    // el resultado tardío se rechaza: lo entregará la próxima vez que lo tomen.
    private TrabajoTaller enProceso(UUID id) {
        TrabajoTaller trabajo = trabajos.bloquearPorId(id).orElseThrow(() ->
                new ResponseStatusException(HttpStatus.NOT_FOUND, "No existe ese trabajo del taller."));
        if (!"en_proceso".equals(trabajo.getEstado())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "El trabajo no está en proceso (está «" + trabajo.getEstado() + "»).");
        }
        if (trabajo.esDePropuesta()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Ese trabajo es una propuesta: se entrega en «propuesta» o «fallo», no en «resultado».");
        }
        return trabajo;
    }

    /** Si el trabajo pide una propuesta (y no un juego). Un trabajo que no existe no lo es. */
    @Transactional(readOnly = true)
    public boolean esDePropuesta(UUID id) {
        return trabajos.findById(id).map(TrabajoTaller::esDePropuesta).orElse(false);
    }

    private Generacion generacionDe(TrabajoTaller trabajo) {
        return generaciones.findById(trabajo.getGeneracionId()).orElseThrow(() ->
                new IllegalStateException("El trabajo " + trabajo.getId() + " no tiene su generación."));
    }

    // Las piezas son opcionales: [{ "id": "olla-de-barro", "tipo": "objeto", "nombre": "Olla de barro" }].
    private List<PiezaNueva> leerPiezas(JsonNode lista, List<String> motivos) {
        List<PiezaNueva> nuevas = new ArrayList<>();
        if (lista == null || lista.isNull()) return nuevas;
        if (!lista.isArray()) {
            motivos.add("«piezas» debe ser una lista.");
            return nuevas;
        }
        if (lista.size() > MAX_PIEZAS) {
            motivos.add("Hay " + lista.size() + " piezas nuevas; el máximo es " + MAX_PIEZAS + ".");
            return nuevas;
        }
        Set<String> vistas = new HashSet<>();
        for (int i = 0; i < lista.size(); i++) {
            JsonNode pieza = lista.get(i);
            String donde = "Pieza " + (i + 1) + ": ";
            String id = pieza.path("id").isTextual() ? pieza.path("id").asText() : "";
            if (id.length() > MAX_CARACTERES_ID_PIEZA || !ID_PIEZA.matcher(id).matches()) {
                motivos.add(donde + "su «id» debe ir en minúsculas, sin tildes y con guiones (por ejemplo, «olla-de-barro»).");
                continue;
            }
            if (!vistas.add(id)) {
                motivos.add(donde + "la pieza «" + id + "» está repetida.");
                continue;
            }
            String tipo = pieza.path("tipo").asText("objeto");
            if (!tipo.equals("objeto") && !tipo.equals("fondo")) {
                motivos.add(donde + "su «tipo» debe ser «objeto» o «fondo»: el taller no dibuja personajes.");
                continue;
            }
            String nombre = pieza.path("nombre").isTextual() ? pieza.path("nombre").asText().strip() : null;
            if (nombre != null && nombre.length() > MAX_CARACTERES_NOMBRE_PIEZA) {
                motivos.add(donde + "su «nombre» tiene más de " + MAX_CARACTERES_NOMBRE_PIEZA + " caracteres.");
                continue;
            }
            nuevas.add(new PiezaNueva(id, tipo, nombre == null || nombre.isEmpty() ? null : nombre));
        }
        return nuevas;
    }

    // La evidencia es el contenido de evidencia.json (entrega.md §8). Devuelve los intentos
    // que necesitó el juego (1 si no lo dice).
    private int revisarEvidencia(JsonNode evidencia, List<String> motivos) {
        if (evidencia == null || !evidencia.isObject()) {
            motivos.add("Falta «evidencia»: el contenido de evidencia.json, como objeto JSON.");
            return 1;
        }
        int largo = comoTexto(evidencia).length();
        if (largo > MAX_CARACTERES_EVIDENCIA) {
            motivos.add("La evidencia mide " + largo + " caracteres; el máximo es " + MAX_CARACTERES_EVIDENCIA + ".");
        }
        JsonNode intentos = evidencia.path("intentos").path("juego");
        if (intentos.isMissingNode() || intentos.isNull()) return 1;
        if (!intentos.isIntegralNumber() || intentos.asInt() < 1 || intentos.asInt() > MAX_INTENTOS_JUEGO) {
            motivos.add("«evidencia.intentos.juego» debe ser un número de 1 a " + MAX_INTENTOS_JUEGO
                    + ": un intento y hasta dos correcciones.");
            return 1;
        }
        return intentos.asInt();
    }

    private String comoTexto(JsonNode nodo) {
        try {
            return json.writeValueAsString(nodo);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("No se pudo leer el resultado del taller.", ex);
        }
    }

    // Recorta por caracteres de verdad, sin partir una letra que ocupa dos unidades.
    static String recortar(String texto, int maximo) {
        if (texto.codePointCount(0, texto.length()) <= maximo) return texto;
        return texto.substring(0, texto.offsetByCodePoints(0, maximo));
    }
}
