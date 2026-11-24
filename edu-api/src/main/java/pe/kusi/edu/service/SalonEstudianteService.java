package pe.kusi.edu.service;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Lo que un estudiante ve de su salón en «Trofeos»: el podio con los tres que más puntos tienen y la meta del salón.
 * Solo cuentan los compañeros de su sección de este año que no fueron retirados. También guarda el cuy de cada
 * estudiante, porque el podio lo muestra y el cuy se arma en el celular.
 */
@Service
public class SalonEstudianteService {
    private static final int PUNTOS_POR_ACTIVIDAD = 20;
    private static final int LUGARES_DEL_PODIO = 3;
    // Las prendas de «Mi cuy» en la app y la parte del cuerpo donde van: el cuy lleva una sola prenda por parte.
    private static final Map<String, String> PRENDAS = new HashMap<>();
    static {
        for (String prenda : List.of("SOMBRERO", "GORRO", "FLOR", "BOINA", "LAZO", "GORRA_CELESTE", "GORRA")) PRENDAS.put(prenda, "cabeza");
        for (String prenda : List.of("LENTES_AZULES", "LENTES_SOL", "LENTES_MENTA", "LENTES_CORAZON", "LENTES_CUADRADOS",
                "LENTES_ESTRELLAS")) PRENDAS.put(prenda, "lentes");
        for (String prenda : List.of("BUFANDA", "POLO", "PETO_LILA", "POLERON_MENTA", "CHALECO")) PRENDAS.put(prenda, "ropa");
        for (String prenda : List.of("MOCHILA", "MOCHILA_FRESA", "MOCHILA_ESPACIO", "MOCHILA_MENTA")) PRENDAS.put(prenda, "mochila");
    }

    private final JdbcTemplate jdbc;
    private final DjangoInternoClient django;
    private final MonedasEstudianteService monedas;

    public SalonEstudianteService(JdbcTemplate jdbc, DjangoInternoClient django, MonedasEstudianteService monedas) {
        this.jdbc = jdbc;
        this.django = django;
        this.monedas = monedas;
    }

    /** Guarda el pelaje y las prendas del cuy. Una prenda de la tienda solo se acepta si el estudiante la compró. */
    public void guardarApariencia(UUID estudiante, JsonNode datos) {
        JsonNode pelaje = datos.path("pelaje");
        JsonNode accesorios = datos.path("accesorios");
        if (!datos.isObject() || datos.size() != 2 || !pelaje.isInt() || pelaje.asInt() < 0 || pelaje.asInt() > 3
                || !accesorios.isArray() || accesorios.size() > 4) {
            throw new IllegalArgumentException("Envía el pelaje y las prendas de tu cuy.");
        }
        Set<String> partes = new HashSet<>();
        List<String> prendas = new ArrayList<>();
        Set<String> compradas = monedas.compradas(estudiante);
        for (JsonNode accesorio : accesorios) {
            String prenda = accesorio.asText();
            if (!accesorio.isTextual() || !PRENDAS.containsKey(prenda) || !partes.add(PRENDAS.get(prenda))) {
                throw new IllegalArgumentException("Tu cuy lleva una prenda que no existe o dos en la misma parte.");
            }
            String idTienda = prenda.toLowerCase();
            if (MonedasEstudianteService.seVende(idTienda) && !compradas.contains(idTienda)) {
                throw new IllegalArgumentException("Primero compra esta prenda en la tienda.");
            }
            prendas.add(prenda);
        }
        String lista = String.join(",", prendas);
        int cambiadas = jdbc.update("update edu.apariencias_estudiante set pelaje = ?, accesorios = ?, actualizado_en = current_timestamp "
                + "where estudiante_id = ?", pelaje.asInt(), lista, estudiante);
        if (cambiadas > 0) return;
        try {
            jdbc.update("insert into edu.apariencias_estudiante(estudiante_id, pelaje, accesorios) values (?, ?, ?)",
                    estudiante, pelaje.asInt(), lista);
        } catch (DuplicateKeyException otraSolicitud) {
            // Dos guardados al mismo tiempo: el segundo actualiza lo que el primero acaba de crear.
            jdbc.update("update edu.apariencias_estudiante set pelaje = ?, accesorios = ?, actualizado_en = current_timestamp "
                    + "where estudiante_id = ?", pelaje.asInt(), lista, estudiante);
        }
    }

    /** El podio y la meta de la sección del estudiante. Sin sección vigente no hay salón que mostrar. */
    public Map<String, Object> salon(UUID estudiante) {
        List<UUID> seccion = jdbc.query("select v.seccion_id from edu.vinculos_estudiante v join edu.secciones sec on sec.id = v.seccion_id "
                + "where v.estudiante_id = ? and v.anio_escolar = sec.anio_escolar and v.retirado_en is null order by v.creado_en desc",
                (fila, indice) -> fila.getObject(1, UUID.class), estudiante);
        Map<String, Object> resultado = new LinkedHashMap<>();
        if (seccion.isEmpty()) return resultado;
        UUID id = seccion.get(0);
        List<UUID> companeros = jdbc.query("select v.estudiante_id from edu.vinculos_estudiante v join edu.secciones sec on sec.id = v.seccion_id "
                + "where v.seccion_id = ? and v.anio_escolar = sec.anio_escolar and v.retirado_en is null",
                (fila, indice) -> fila.getObject(1, UUID.class), id);
        Set<UUID> salon = new HashSet<>(companeros);

        // El podio cuenta todos los puntos ganados en las actividades de la sección, también las que el docente retiró.
        Map<UUID, Long> puntos = puntosPorEstudiante(id, false, salon);
        List<Map.Entry<UUID, Long>> orden = puntos.entrySet().stream().filter(entrada -> entrada.getValue() > 0)
                .sorted(Comparator.<Map.Entry<UUID, Long>>comparingLong(Map.Entry::getValue).reversed()
                        .thenComparing(entrada -> entrada.getKey().toString()))
                .limit(LUGARES_DEL_PODIO).toList();
        List<Map<String, Object>> podio = new ArrayList<>();
        for (Map.Entry<UUID, Long> puesto : orden) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("nombre_corto", nombreDelPodio(puesto.getKey()));
            fila.put("puntos", puesto.getValue());
            fila.put("es_mi_puesto", puesto.getKey().equals(estudiante));
            fila.putAll(apariencia(puesto.getKey()));
            podio.add(fila);
        }
        resultado.put("ranking", Map.of("podio", podio, "mis_puntos", puntos.getOrDefault(estudiante, 0L)));

        // La meta solo mira las actividades vigentes: es lo que el salón todavía puede jugar.
        long objetivo = (long) PUNTOS_POR_ACTIVIDAD * actividadesAsignadas(id, salon);
        if (objetivo > 0) {
            long delSalon = puntosPorEstudiante(id, true, salon).values().stream().mapToLong(Long::longValue).sum();
            resultado.put("meta_salon", Map.of("puntos_del_salon", delSalon, "objetivo", objetivo));
        }
        return resultado;
    }

    private Map<UUID, Long> puntosPorEstudiante(UUID seccion, boolean soloVigentes, Set<UUID> salon) {
        Map<UUID, Long> puntos = new HashMap<>();
        for (UUID companero : salon) puntos.put(companero, 0L);
        jdbc.query("select p.estudiante_id, sum(p.puntos) from edu.puntos_reto p join edu.solicitudes_propuesta s on s.id = p.actividad_id "
                + "where s.seccion_id = ?" + (soloVigentes ? " and s.retirada_en is null" : "") + " group by p.estudiante_id", fila -> {
            UUID estudiante = fila.getObject(1, UUID.class);
            if (salon.contains(estudiante)) puntos.put(estudiante, fila.getLong(2));
        }, seccion);
        return puntos;
    }

    // Cada actividad vigente que recibió cada compañero vale 20 puntos: la meta es todo lo que el salón puede ganar.
    private long actividadesAsignadas(UUID seccion, Set<UUID> salon) {
        Set<String> asignadas = new HashSet<>();
        jdbc.query("select distinct g.solicitud_id, d.estudiante_id from edu.destinatarios_actividad d "
                + "join edu.generaciones g on g.id = d.generacion_id join edu.solicitudes_propuesta s on s.id = g.solicitud_id "
                + "where s.seccion_id = ? and g.publicada = true and s.retirada_en is null", fila -> {
            UUID estudiante = fila.getObject(2, UUID.class);
            if (salon.contains(estudiante)) asignadas.add(fila.getObject(1, UUID.class) + ":" + estudiante);
        }, seccion);
        return asignadas.size();
    }

    private String nombreDelPodio(UUID estudiante) {
        try {
            Object nombre = django.validarCuenta(estudiante, "estudiante").get("nombre");
            return nombre == null || nombre.toString().isBlank() ? "Compañero" : nombreYApellido(nombre.toString());
        } catch (RuntimeException cuentaNoDisponible) {
            // Una cuenta desactivada o un Django apagado no deben dejar a todo el salón sin podio.
            return "Compañero";
        }
    }

    /**
     * Django guarda «nombres y apellidos» en un solo campo. En el podio va el primer nombre y el apellido paterno,
     * que en Perú es la penúltima palabra cuando hay dos apellidos: «Ana Lucía Pérez García» → «Ana Pérez».
     */
    public static String nombreYApellido(String completo) {
        String[] partes = completo.trim().split("\\s+");
        if (partes.length <= 2) return String.join(" ", partes);
        return partes[0] + " " + partes[partes.length - 2];
    }

    private Map<String, Object> apariencia(UUID estudiante) {
        List<Map<String, Object>> filas = jdbc.query("select pelaje, accesorios from edu.apariencias_estudiante where estudiante_id = ?",
                (fila, indice) -> {
                    String lista = fila.getString(2);
                    return Map.<String, Object>of("pelaje", fila.getInt(1),
                            "accesorios", lista == null || lista.isBlank() ? List.of() : Arrays.asList(lista.split(",")));
                }, estudiante);
        return filas.isEmpty() ? Map.of("pelaje", 0, "accesorios", List.of()) : filas.get(0);
    }
}
