package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;
import pe.kusi.edu.taller.EntregaTallerInvalida;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Las preguntas del docente a «Kusi Sabio». Responde el taller de la Mac (el rol «sabio»); si nadie toma la pregunta a
 * tiempo, o el taller falla, responde la IA de reserva (Groq o Tecsup); y si tampoco hay, un mensaje amable con los
 * gráficos y la lista de apoyo. El panel pregunta cada poco si ya está lista.
 */
@Service
public class KusiSabioService {
    private static final Logger registro = LoggerFactory.getLogger(KusiSabioService.class);
    private record Fila(UUID docente, UUID actividad, String contexto, String estado, String texto, String graficos, Boolean mostrarApoyo,
                        boolean mostrarEstudiantes, String graficosPropios) {}

    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaccion;
    private final ConsultaKusiService consultas;
    private final ObjectMapper json;
    // La reserva puede tardar: corre en otro hilo para que el reloj y el taller no esperen.
    private final ExecutorService reserva = Executors.newFixedThreadPool(2, tarea -> {
        Thread hilo = new Thread(tarea, "kusi-sabio-reserva");
        hilo.setDaemon(true);
        return hilo;
    });
    @Value("${kusi.sabio-espera-taller-seg:20}") private int esperaSinTomarSeg;
    @Value("${kusi.sabio-tiempo-taller-seg:150}") private int tiempoDelTallerSeg;

    public KusiSabioService(JdbcTemplate jdbc, TransactionTemplate transaccion, ConsultaKusiService consultas, ObjectMapper json) {
        this.jdbc = jdbc;
        this.transaccion = transaccion;
        this.consultas = consultas;
        this.json = json;
    }

    /**
     * Guarda la pregunta y deja su contexto (sin nombres) listo para quien responda. La actividad de la que habla la
     * respuesta la elige quien responde; se guarda en actividad_id al responder.
     */
    public Map<String, Object> crear(UUID docente, ConsultaKusiService.Pregunta pregunta) {
        String contexto = consultas.preparar(docente, pregunta);
        UUID id = UUID.randomUUID();
        jdbc.update("insert into edu.consultas_sabio(id, docente_id, contexto, estado) values (?, ?, ?, 'pendiente')",
                id, docente, contexto);
        return Map.of("id", id, "estado", "pensando");
    }

    /** «pensando» mientras nadie respondió; «lista» con el texto, los gráficos y la lista armados con los nombres. */
    public Map<String, Object> consultar(UUID docente, UUID id) {
        Fila fila = fila(id).filter(encontrada -> encontrada.docente().equals(docente))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No se encontró esta pregunta."));
        if (!fila.estado().equals("lista")) return Map.of("id", id, "estado", "pensando");
        List<String> graficos = fila.graficos() == null || fila.graficos().isBlank() ? List.of() : List.of(fila.graficos().split(","));
        ConsultaKusiService.Respuesta respuesta = consultas.componer(docente,
                new ConsultaKusiService.Eleccion(fila.texto(), fila.actividad(), graficos, propios(fila.graficosPropios()),
                        Boolean.TRUE.equals(fila.mostrarApoyo()),
                        fila.mostrarEstudiantes()));
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("id", id);
        cuerpo.put("estado", "lista");
        cuerpo.put("texto", respuesta.texto());
        cuerpo.put("actividad", respuesta.actividad());
        cuerpo.put("graficos", respuesta.graficos());
        cuerpo.put("quienes_necesitan_ayuda", respuesta.quienes_necesitan_ayuda());
        cuerpo.put("estudiantes", respuesta.estudiantes());
        return cuerpo;
    }

    /** Para el taller: la pregunta pendiente más antigua, ya marcada «en proceso». Vacío si no hay. */
    public Optional<Map<String, Object>> siguiente() {
        return transaccion.execute(estado -> {
            List<Map<String, Object>> filas = jdbc.query("select id, contexto from edu.consultas_sabio "
                    + "where estado = 'pendiente' order by creado_en, id limit 1 for update skip locked", (resultado, indice) -> {
                Map<String, Object> consulta = new LinkedHashMap<>();
                consulta.put("id", resultado.getObject(1, UUID.class));
                // Sin actividades con juego enviado, la pregunta solo puede ser sobre el panel.
                consulta.put("con_actividad", !consultas.actividadesDelContexto(resultado.getString(2)).isEmpty());
                consulta.put("contexto", resultado.getString(2));
                return consulta;
            });
            if (filas.isEmpty()) return Optional.empty();
            jdbc.update("update edu.consultas_sabio set estado = 'en_proceso', tomado_en = ? where id = ?",
                    Timestamp.from(Instant.now()), filas.get(0).get("id"));
            return Optional.of(filas.get(0));
        });
    }

    /** La respuesta del taller. 422 si no tiene la forma pedida; 409 si la pregunta ya no la espera. */
    public void responder(UUID id, JsonNode cuerpo) {
        Fila fila = fila(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No existe esa pregunta."));
        ConsultaKusiService.Eleccion eleccion = ConsultaKusiService.leerEleccion(cuerpo, consultas.actividadesDelContexto(fila.contexto()))
                .orElseThrow(() -> new EntregaTallerInvalida(List.of("La respuesta necesita «texto» (hasta 2000 caracteres), "
                        + "«actividad» (un id de la lista o vacío), «graficos» y «graficos_propios» (listas), "
                        + "«mostrar_quienes_necesitan_ayuda» y «mostrar_lista_de_estudiantes» (verdadero o falso).")));
        if (guardar(id, "en_proceso", eleccion, "taller") == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta pregunta ya no espera respuesta del taller.");
        }
    }

    /** El taller no pudo (sin cupo, error, tiempo): responde la reserva. */
    public void fallar(UUID id, String motivo) {
        int cambiadas = jdbc.update("update edu.consultas_sabio set estado = 'respaldo' where id = ? and estado = 'en_proceso'", id);
        if (cambiadas == 0) throw new ResponseStatusException(HttpStatus.CONFLICT, "Esta pregunta ya no espera respuesta del taller.");
        registro.warn("[kusi-sabio] El taller no respondió la pregunta " + id + ": " + (motivo == null ? "sin motivo" : motivo));
        reserva.execute(() -> responderConReserva(id));
    }

    // Cada 3 segundos: una pregunta que nadie tomó (taller apagado u ocupado) o que el taller no respondió no deja al
    // docente esperando.
    @Scheduled(fixedDelay = 3_000, initialDelay = 10_000)
    void revisarEsperasDelTaller() {
        try { revisarEsperas(Instant.now()).forEach(id -> reserva.execute(() -> responderConReserva(id))); }
        catch (RuntimeException fallo) { registro.warn("[kusi-sabio] No se pudo revisar la espera del taller: " + fallo.getMessage()); }
    }

    /** Pasa a la reserva las preguntas que esperaron demasiado y devuelve cuáles. */
    public List<UUID> revisarEsperas(Instant ahora) {
        return transaccion.execute(estado -> {
            List<UUID> vencidas = jdbc.query("select id from edu.consultas_sabio where (estado = 'pendiente' and creado_en < ?) "
                            + "or (estado = 'en_proceso' and tomado_en < ?) for update skip locked",
                    (fila, indice) -> fila.getObject(1, UUID.class),
                    Timestamp.from(ahora.minusSeconds(esperaSinTomarSeg)), Timestamp.from(ahora.minusSeconds(tiempoDelTallerSeg)));
            for (UUID id : vencidas) jdbc.update("update edu.consultas_sabio set estado = 'respaldo' where id = ?", id);
            return vencidas;
        });
    }

    /** La IA de reserva responde; sin ella, el mensaje amable. Público para poder probarlo sin hilos. */
    public void responderConReserva(UUID id) {
        Optional<Fila> fila = fila(id);
        if (fila.isEmpty() || !fila.get().estado().equals("respaldo")) return;
        Optional<ConsultaKusiService.Eleccion> eleccion = consultas.pedirALaReserva(fila.get().contexto());
        guardar(id, "respaldo", eleccion.orElse(ConsultaKusiService.local(consultas.actividadesDelContexto(fila.get().contexto()))),
                eleccion.isPresent() ? "respaldo" : "local");
    }

    private int guardar(UUID id, String estadoEsperado, ConsultaKusiService.Eleccion eleccion, String respondio) {
        String propios;
        try { propios = json.writeValueAsString(eleccion.propios()); }
        catch (JsonProcessingException noSePudo) { propios = "[]"; }
        return jdbc.update("update edu.consultas_sabio set estado = 'lista', texto = ?, actividad_id = ?, graficos = ?, graficos_propios = ?, "
                        + "mostrar_apoyo = ?, mostrar_estudiantes = ?, respondio = ?, respondido_en = ? where id = ? and estado = ?",
                eleccion.texto(), eleccion.actividad(), String.join(",", eleccion.graficos()), propios, eleccion.mostrarApoyo(),
                eleccion.mostrarEstudiantes(), respondio, Timestamp.from(Instant.now()), id, estadoEsperado);
    }

    private List<ConsultaKusiService.Grafico> propios(String guardados) {
        if (guardados == null || guardados.isBlank()) return List.of();
        try { return ConsultaKusiService.graficosPropios(json.readTree(guardados)); }
        catch (JsonProcessingException ilegible) { return List.of(); }
    }

    private Optional<Fila> fila(UUID id) {
        return jdbc.query("select docente_id, actividad_id, contexto, estado, texto, graficos, mostrar_apoyo, mostrar_estudiantes, "
                        + "graficos_propios from edu.consultas_sabio where id = ?",
                (fila, indice) -> new Fila(fila.getObject(1, UUID.class), fila.getObject(2, UUID.class), fila.getString(3),
                        fila.getString(4), fila.getString(5), fila.getString(6), (Boolean) fila.getObject(7), fila.getBoolean(8),
                        fila.getString(9)), id)
                .stream().findFirst();
    }
}
