package pe.kusi.edu.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import pe.kusi.edu.ia.ClienteIa;
import pe.kusi.edu.ia.FalloGeneracion;
import pe.kusi.edu.laberinto.CatalogoLaberinto;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Service
public class ConsultaKusiService {
    public record Turno(String pregunta, String respuesta) {}
    public record Pregunta(String pregunta, List<Turno> historial) {}
    public record Barra(String etiqueta, int valor, Integer total, String detalle) {}
    // «titulo» solo lo llevan los gráficos que pide el docente («propio»); los demás usan el nombre de su tipo.
    public record Grafico(String tipo, String titulo, List<Barra> barras) {}
    public record Apoyo(String nombre, List<String> motivos) {}
    /** De qué actividad habla la respuesta, para que el docente lo vea sobre los gráficos. */
    public record ActividadRespuesta(String titulo, String seccion) {}
    /** Los estudiantes de una sección del docente, con sus nombres, para la lista que muestra el panel. */
    public record EstudiantesSeccion(String seccion, List<String> nombres) {}
    public record Respuesta(String texto, ActividadRespuesta actividad, List<Grafico> graficos, List<Apoyo> quienes_necesitan_ayuda,
                            List<EstudiantesSeccion> estudiantes) {}
    /**
     * Lo que decide quien responde: el texto, de qué actividad habla (o ninguna, si la pregunta es sobre el panel),
     * qué gráficos mostrar de esa actividad y si se muestra su lista de apoyo.
     */
    public record Eleccion(String texto, UUID actividad, List<String> graficos, List<Grafico> propios, boolean mostrarApoyo,
                           boolean mostrarEstudiantes) {}

    private record Juego(String objetivo, String historia, List<String> retos, List<String> ayudas) {}
    // Una actividad del docente, solo con datos del grupo. El id es de la actividad, nunca de un estudiante.
    private record ResumenActividad(String id, String tema, String seccion, int grado, String area, List<Juego> juegos_publicados,
                                    ProgresoClaseKusi.Grupo grupo, List<EstudianteContexto> estudiantes) {}
    // Cómo va cada estudiante en una actividad. Por decisión del equipo, Kusi Sabio conoce a los estudiantes del docente por su
    // nombre, para responder como en una conversación («¿cómo le va a José?»). Nunca lleva DNI, cuentas ni ids.
    private record EstudianteContexto(String nombre, String estado, int avance_porcentaje, Map<Integer, Integer> errores_por_nivel,
                                      int ayudas, int puntos, List<String> senales) {}
    private record Curriculo(int grado, String area, String contenido) {}
    // Una sección del docente con sus estudiantes vigentes.
    private record SeccionContexto(String seccion, int cantidad, List<String> estudiantes) {}
    // Lo único que sale hacia la IA. No tiene nombres, DNI ni ids de estudiantes: solo datos de cada grupo.
    private record ContextoIa(List<SeccionContexto> secciones, List<ResumenActividad> actividades, List<Curriculo> curriculos,
                              String guia_del_panel, List<Turno> historial, String pregunta) {}
    // Los datos de una actividad ya calculados, para armar el contexto o la respuesta con nombres.
    private record Analisis(DatosConsultaKusi.Clase clase, Map<UUID, ProgresoClaseKusi> progresos, ProgresoClaseKusi actual,
                            Map<UUID, String> nombres, PrivacidadConsultaKusi privacidad, String area, String curriculo,
                            List<Juego> juegos) {}

    private static final String ERRORES = "errores_por_nivel";
    private static final String AYUDAS = "ayudas_por_nivel";
    private static final String AVANCE = "avance_por_estudiante";
    private static final String COMPARACION = "comparacion_entre_actividades";
    private static final List<String> TIPOS = List.of(ERRORES, AYUDAS, AVANCE, COMPARACION);
    private static final Set<String> AREAS = Set.of("matematica", "comunicacion", "ciencia-y-tecnologia",
            "personal-social", "arte-y-cultura", "educacion-fisica", "educacion-religiosa");
    private static final int MAX_PREGUNTA = 600;
    private static final int MAX_RESPUESTA = 2000;
    private static final int MAX_HISTORIAL = 4;
    private static final String RESPUESTA_LOCAL = "Ahora no pude preparar una respuesta para tu clase. "
            + "Puedes revisar los gráficos y las señales de apoyo que preparé con los resultados.";
    private static final String RESPUESTA_LOCAL_GENERAL = "Ahora no pude responderte. Vuelve a preguntarme en un momento.";
    // Las actividades más recientes que conoce Kusi Sabio en cada pregunta, y cuántos currículos distintos lleva.
    private static final int ACTIVIDADES_RECIENTES = 6;
    private static final int CURRICULOS = 2;
    public static final String INSTRUCCIONES = """
            Eres Kusi Sabio, el asistente del docente en Kusi. Conversa como un buen asistente: natural, cálido, claro y útil,
            en español sencillo. Si te saludan, agradecen o conversan, responde con naturalidad y breve.
            Puedes hablar de todo lo que el docente necesite de Kusi: su clase, sus estudiantes, sus actividades y resultados,
            cómo usar el panel y qué es Kusi y cómo funciona (guia_del_panel lo explica).
            Datos que conoces: secciones (cada sección del docente con sus estudiantes) y actividades (sus actividades recientes,
            de la más nueva a la más antigua, con el juego, el grupo y cómo va cada estudiante por su nombre: estado, avance,
            errores por nivel, ayudas, puntos y señales). Puedes nombrar a los estudiantes.
            Responde exactamente lo que te preguntan; no agregues ideas que no te pidieron. Si piden ideas para la clase, que sean
            concretas, con materiales y pasos. Puedes usar listas y negritas.
            Si hablas de una actividad, pon su id en actividad (la que nombre la pregunta o, si no se nota, la más reciente) y di
            cuál es. Si no hablas de una actividad, actividad va vacía.
            Si piden ver la lista de sus estudiantes, pon mostrar_lista_de_estudiantes en true (el panel la muestra por sección).
            Si piden quién necesita ayuda en una actividad, pon mostrar_quienes_necesitan_ayuda en true.
            Gráficos: graficos elige entre errores_por_nivel, ayudas_por_nivel, avance_por_estudiante y comparacion_entre_actividades
            de la actividad elegida. Si piden otro gráfico (por ejemplo, puntos por estudiante), ármalo en graficos_propios con un
            titulo y barras (etiqueta y valor) tomadas de los datos. Nunca inventes números: si no hay datos, dilo.
            Si falta información, dilo. No inventes datos, causas de los errores ni respuestas esperadas.
            El tiempo por nivel es aproximado entre avisos. Los errores y ayudas son totales de intentos.
            Donde veas [dato oculto], el docente escribió un DNI, un correo, un teléfono o un enlace: no lo pidas.
            No digas que un niño aprenderá por jugar: di qué presenta, practica o comprueba la actividad.
            Devuelve solo un JSON con texto, actividad (un id de la lista o vacío), graficos (lista, puede ir vacía),
            graficos_propios (lista, puede ir vacía), mostrar_quienes_necesitan_ayuda (booleano) y mostrar_lista_de_estudiantes
            (booleano).
            """;

    private final DatosConsultaKusi datos;
    private final JdbcTemplate jdbc;
    private final DjangoInternoClient django;
    private final ObjectProvider<ClienteIa> clientes;
    private final ObjectMapper json;
    private final Path rutaCurriculo;
    private final Path rutaGuia;

    ConsultaKusiService(DatosConsultaKusi datos, JdbcTemplate jdbc, DjangoInternoClient django, ObjectProvider<ClienteIa> clientes,
                       ObjectMapper json, @Value("${kusi.curriculo-ruta:../juego/kit/curriculo}") String rutaCurriculo,
                       @Value("${kusi.guia-panel-ruta:../web/GUIA-DEL-PANEL.md}") String rutaGuia) {
        this.datos = datos;
        this.jdbc = jdbc;
        this.django = django;
        this.clientes = clientes;
        this.json = json;
        this.rutaCurriculo = Path.of(rutaCurriculo);
        this.rutaGuia = Path.of(rutaGuia);
    }

    /**
     * Arma el contexto que sale hacia quien responde (el taller o la IA de reserva), como texto JSON: las actividades más
     * recientes del docente con los datos de cada grupo, el currículo, la guía del panel y la conversación. Quien responde
     * elige de cuál actividad habla; sin actividades, solo puede responder sobre el panel.
     */
    public String preparar(UUID docente, Pregunta pregunta) {
        validar(pregunta);
        String guia = guia();
        Map<UUID, String> nombresConocidos = new HashMap<>();
        List<Analisis> analisis = actividadesRecientes(docente).stream().map(id -> analizar(docente, id, nombresConocidos)).toList();
        List<Curriculo> curriculos = new ArrayList<>();
        for (Analisis a : analisis) {
            int grado = a.clase().actual().grado();
            if (curriculos.size() < CURRICULOS && !a.curriculo().isBlank()
                    && curriculos.stream().noneMatch(c -> c.grado() == grado && c.area().equals(a.area()))) {
                curriculos.add(new Curriculo(grado, a.area(), a.curriculo()));
            }
        }
        // La conversación solo oculta DNI, correos, teléfonos, enlaces e ids; los nombres pasan.
        List<SeccionDocente> secciones = seccionesDelDocente(docente);
        PrivacidadConsultaKusi privacidad = new PrivacidadConsultaKusi(List.of());
        List<ResumenActividad> actividades = analisis.stream().map(a -> {
            DatosConsultaKusi.Actividad actual = a.clase().actual();
            Map<UUID, Integer> puntos = puntosPorEstudiante(actual.id());
            List<EstudianteContexto> estudiantes = a.nombres().entrySet().stream()
                    .sorted(Map.Entry.comparingByValue(String.CASE_INSENSITIVE_ORDER)).map(e -> {
                        ProgresoClaseKusi.Estudiante progreso = a.actual().estudiantes.get(e.getKey());
                        return new EstudianteContexto(e.getValue(), progreso.estado(), progreso.avance(), progreso.errores(),
                                progreso.ayudas(), puntos.getOrDefault(e.getKey(), 0), progreso.motivos());
                    }).toList();
            return new ResumenActividad(actual.id().toString(), a.privacidad().contenido(actual.titulo()), nombreSeccion(actual.seccion()),
                    actual.grado(), a.area(), a.juegos(), a.actual().grupo(), estudiantes);
        }).toList();
        return comoTexto(new ContextoIa(secciones.stream().map(s -> new SeccionContexto(s.etiqueta(), s.estudiantes().size(),
                        nombres(new LinkedHashSet<>(s.estudiantes()), nombresConocidos).values().stream()
                                .sorted(String.CASE_INSENSITIVE_ORDER).toList())).toList(), actividades, curriculos, guia,
                historial(pregunta, privacidad),
                privacidad.conversacion(pregunta.pregunta().strip())));
    }

    /** Los ids de actividad que lleva un contexto: quien responde solo puede elegir uno de estos. */
    public List<UUID> actividadesDelContexto(String contexto) {
        List<UUID> ids = new ArrayList<>();
        try {
            json.readTree(contexto).path("actividades").forEach(a -> ids.add(UUID.fromString(a.path("id").asText())));
        } catch (JsonProcessingException | IllegalArgumentException ilegible) {
            return List.of();
        }
        return ids;
    }

    /** La respuesta que ve el docente: el texto elegido, y los gráficos y la lista armados aquí, con los nombres. */
    public Respuesta componer(UUID docente, Eleccion eleccion) {
        List<EstudiantesSeccion> estudiantes = eleccion.mostrarEstudiantes() ? listaDeEstudiantes(docente) : null;
        if (eleccion.actividad() == null) return new Respuesta(eleccion.texto(), null, eleccion.propios(), null, estudiantes);
        Analisis analisis = analizar(docente, eleccion.actividad(), new HashMap<>());
        ProgresoClaseKusi actual = analisis.actual();
        Map<UUID, String> nombres = analisis.nombres();
        List<UUID> orden = nombres.keySet().stream().sorted(Comparator.comparing(nombres::get, String.CASE_INSENSITIVE_ORDER)).toList();
        List<Grafico> graficos = new ArrayList<>(eleccion.graficos().stream()
                .map(tipo -> grafico(tipo, actual.grupo(), analisis.clase().actividades(), analisis.progresos(), actual, orden, nombres)).toList());
        graficos.addAll(eleccion.propios());
        List<Apoyo> apoyo = eleccion.mostrarApoyo() ? orden.stream()
                .map(id -> new Apoyo(nombres.get(id), actual.estudiantes.get(id).motivos()))
                .filter(fila -> !fila.motivos().isEmpty()).toList() : null;
        DatosConsultaKusi.Actividad elegida = analisis.clase().actual();
        return new Respuesta(eleccion.texto(), new ActividadRespuesta(elegida.titulo(), nombreSeccion(elegida.seccion())), graficos, apoyo,
                estudiantes);
    }

    /** La reserva: la IA directa (Groq o Tecsup). Vacío si no está configurada o si su respuesta no sirve. */
    public Optional<Eleccion> pedirALaReserva(String contexto) {
        ClienteIa cliente = clientes.getIfAvailable();
        if (cliente == null) return Optional.empty();
        try {
            return leerEleccion(cliente.pedirJson(INSTRUCCIONES, contexto, 0.3, "consulta_kusi", esquema()), actividadesDelContexto(contexto));
        } catch (FalloGeneracion | IllegalArgumentException noDisponible) {
            return Optional.empty();
        }
    }

    /** Cuando nadie pudo responder: un mensaje amable y, si hay actividades, los gráficos y la lista de la más reciente. */
    public static Eleccion local(List<UUID> actividades) {
        return actividades.isEmpty() ? new Eleccion(RESPUESTA_LOCAL_GENERAL, null, List.of(), List.of(), false, false)
                : new Eleccion(RESPUESTA_LOCAL, actividades.get(0), TIPOS, List.of(), true, false);
    }

    /**
     * Revisa la respuesta de quien contestó. Solo pasan una actividad de las que llevaba el contexto y los gráficos de la
     * lista cerrada; sin actividad, no hay gráficos ni lista.
     */
    public static Optional<Eleccion> leerEleccion(JsonNode datos, List<UUID> actividades) {
        if (datos == null || !datos.path("texto").isTextual() || !textoValido(datos.path("texto").asText(), MAX_RESPUESTA)
                || !datos.path("graficos").isArray() || !datos.path("mostrar_quienes_necesitan_ayuda").isBoolean()) {
            return Optional.empty();
        }
        UUID actividad = actividades.stream().filter(id -> id.toString().equals(datos.path("actividad").asText(""))).findFirst().orElse(null);
        Set<String> graficos = new LinkedHashSet<>();
        if (actividad != null) datos.path("graficos").forEach(grafico -> {
            if (grafico.isTextual() && TIPOS.contains(grafico.asText())) graficos.add(grafico.asText());
        });
        // La lista de estudiantes es opcional en la respuesta: si no viene, no se muestra.
        return Optional.of(new Eleccion(datos.path("texto").asText().strip(), actividad, List.copyOf(graficos),
                graficosPropios(datos.path("graficos_propios")), actividad != null && datos.path("mostrar_quienes_necesitan_ayuda").booleanValue(),
                datos.path("mostrar_lista_de_estudiantes").asBoolean(false)));
    }

    /**
     * Los gráficos que pidió el docente («hazme un gráfico de…»): quien responde los arma con los datos del contexto. Se
     * aceptan hasta 4, con un título y de 1 a 30 barras; lo que no tenga esa forma se descarta sin romper la respuesta.
     */
    public static List<Grafico> graficosPropios(JsonNode lista) {
        List<Grafico> graficos = new ArrayList<>();
        if (!lista.isArray()) return graficos;
        for (JsonNode grafico : lista) {
            if (graficos.size() == 4) break;
            String titulo = grafico.path("titulo").asText("").strip();
            JsonNode barras = grafico.path("barras");
            if (titulo.isEmpty() || titulo.length() > 80 || !barras.isArray() || barras.isEmpty() || barras.size() > 30) continue;
            List<Barra> validas = new ArrayList<>();
            for (JsonNode barra : barras) {
                String etiqueta = barra.path("etiqueta").asText("").strip();
                JsonNode valor = barra.path("valor");
                JsonNode total = barra.path("total");
                if (etiqueta.isEmpty() || etiqueta.length() > 60 || !valor.canConvertToInt() || valor.asInt() < 0 || valor.asInt() > 100_000
                        || (total.isNumber() && (total.asInt() < 1 || total.asInt() > 100_000))) {
                    validas = null;
                    break;
                }
                validas.add(new Barra(etiqueta, valor.asInt(), total.isNumber() ? total.asInt() : null, null));
            }
            if (validas != null) graficos.add(new Grafico("propio", titulo, List.copyOf(validas)));
        }
        return List.copyOf(graficos);
    }

    // Las actividades con juego enviado y no retiradas del docente, de la más reciente a la más antigua.
    private List<UUID> actividadesRecientes(UUID docente) {
        return jdbc.query("select s.id" + ResultadosService.ALCANCE + "and s.retirada_en is null order by "
                + "(select max(g.publicada_en) from edu.generaciones g where g.solicitud_id = s.id and g.publicada = true) desc, s.id "
                + "fetch first " + ACTIVIDADES_RECIENTES + " rows only", (fila, indice) -> fila.getObject(1, UUID.class), docente, docente);
    }

    // «1.º A»: el grado y el nombre de la sección, como los ve el docente.
    private String nombreSeccion(UUID seccion) {
        return jdbc.query("select grado, nombre from edu.secciones where id = ?",
                (fila, indice) -> etiquetaSeccion(fila.getInt(1), fila.getString(2)), seccion).stream().findFirst().orElse("");
    }

    private static String etiquetaSeccion(int grado, String nombre) {
        return grado + ".º " + nombre;
    }

    private record SeccionDocente(String etiqueta, List<UUID> estudiantes) {}

    // Los puntos de cada estudiante en una actividad (hasta 20), de sus mejores intentos.
    private Map<UUID, Integer> puntosPorEstudiante(UUID actividad) {
        Map<UUID, Integer> puntos = new HashMap<>();
        jdbc.query("select estudiante_id, sum(puntos) from edu.puntos_reto where actividad_id = ? group by estudiante_id",
                fila -> { puntos.put(fila.getObject(1, UUID.class), fila.getInt(2)); }, actividad);
        return puntos;
    }

    // Las secciones del docente este año, con sus estudiantes vigentes (sin los retirados).
    private List<SeccionDocente> seccionesDelDocente(UUID docente) {
        Map<UUID, SeccionDocente> secciones = new LinkedHashMap<>();
        jdbc.query("select distinct sec.id, sec.grado, sec.nombre from edu.asignaciones_docente a join edu.secciones sec "
                + "on sec.id = a.seccion_id and sec.anio_escolar = a.anio_escolar where a.docente_id = ? order by sec.grado, sec.nombre", fila -> {
            secciones.put(fila.getObject(1, UUID.class), new SeccionDocente(etiquetaSeccion(fila.getInt(2), fila.getString(3)), new ArrayList<>()));
        }, docente);
        for (Map.Entry<UUID, SeccionDocente> seccion : secciones.entrySet()) {
            seccion.getValue().estudiantes().addAll(jdbc.query("select v.estudiante_id from edu.vinculos_estudiante v "
                    + "join edu.secciones sec on sec.id = v.seccion_id and sec.anio_escolar = v.anio_escolar "
                    + "where v.seccion_id = ? and v.retirado_en is null", (fila, indice) -> fila.getObject(1, UUID.class), seccion.getKey()));
        }
        return List.copyOf(secciones.values());
    }

    // La lista que ve el docente en su panel: los nombres salen de Django aquí y nunca viajan hacia la IA.
    private List<EstudiantesSeccion> listaDeEstudiantes(UUID docente) {
        Map<UUID, String> conocidos = new HashMap<>();
        return seccionesDelDocente(docente).stream().map(seccion -> new EstudiantesSeccion(seccion.etiqueta(),
                nombres(new LinkedHashSet<>(seccion.estudiantes()), conocidos).values().stream()
                        .sorted(String.CASE_INSENSITIVE_ORDER).toList())).toList();
    }

    private Analisis analizar(UUID docente, UUID actividad, Map<UUID, String> nombresConocidos) {
        DatosConsultaKusi.Clase clase = datos.cargar(docente, actividad);
        String area = nombreArea(clase);
        String curriculo = curriculo(clase.actual().grado(), area);
        Map<UUID, ProgresoClaseKusi> progresos = new LinkedHashMap<>();
        clase.actividades().forEach(a -> progresos.put(a.id(), new ProgresoClaseKusi()));
        clase.envios().forEach((id, envio) -> progresos.get(envio.actividad().id()).incluir(
                clase.destinatarios().getOrDefault(id, Set.of()), Math.min(envio.paquete().path("retos").size(), 5)));
        ProgresoClaseKusi actual = progresos.get(actividad);

        // Las cuentas se resuelven localmente. El contexto saliente se construye
        // con un tipo distinto que no admite filas por estudiante ni sus cuentas.
        Map<UUID, String> nombres = nombres(actual.estudiantes.keySet(), nombresConocidos);
        PrivacidadConsultaKusi privacidad = new PrivacidadConsultaKusi(nombres.values());
        Map<DatosConsultaKusi.Envio, Set<String>> vocabularios = new IdentityHashMap<>();
        List<Juego> juegos = clase.envios().values().stream().filter(e -> e.actividad().id().equals(actividad)).map(e -> {
            Juego juego = new Juego(privacidad.contenido(e.objetivo()), privacidad.contenido(e.historia()),
                    textos(e.retos(), privacidad), textos(e.ayudas(), privacidad));
            String palabras = juego.objetivo() + " " + juego.historia() + " " + juego.retos() + " " + juego.ayudas();
            Set<String> etiquetas = privacidad.vocabularioJuego(palabras + " " + e.paquete() + " " + curriculo);
            if (e.paquete().path("familia").asText().equals("laberinto")) {
                etiquetas.addAll(CatalogoLaberinto.TIPOS_OBJETO);
                etiquetas.addAll(CatalogoLaberinto.CLASES.keySet());
            }
            vocabularios.put(e, etiquetas);
            return juego;
        }).distinct().toList();
        for (DatosConsultaKusi.Partida partida : clase.partidas()) {
            ProgresoClaseKusi progreso = progresos.get(partida.envio().actividad().id());
            progreso.registrar(partida, privacidad, vocabularios.getOrDefault(partida.envio(), Set.of()), progreso == actual);
        }
        return new Analisis(clase, progresos, actual, nombres, privacidad, area, curriculo, juegos);
    }

    private String guia() {
        try { return Files.readString(rutaGuia); }
        catch (IOException noDisponible) { return ""; }
    }

    private String comoTexto(Object contexto) {
        try { return json.writeValueAsString(contexto); }
        catch (JsonProcessingException noSePudo) { throw new IllegalStateException("No se pudo preparar la consulta."); }
    }

    // «conocidos» guarda los nombres ya pedidos a Django en esta pregunta: varias actividades comparten estudiantes.
    private Map<UUID, String> nombres(Set<UUID> estudiantes, Map<UUID, String> conocidos) {
        Map<UUID, String> nombres = new LinkedHashMap<>();
        for (UUID id : estudiantes) {
            if (conocidos.containsKey(id)) { nombres.put(id, conocidos.get(id)); continue; }
            String nombre = "Estudiante " + (nombres.size() + 1);
            try {
                Object dato = django.validarCuenta(id, "estudiante").get("nombre");
                if (dato instanceof String texto && !texto.isBlank()) nombre = texto;
            } catch (IllegalArgumentException noDisponible) {
                // Un resultado histórico puede pertenecer a una cuenta inactiva.
            }
            nombres.put(id, nombre);
            conocidos.put(id, nombre);
        }
        return nombres;
    }

    private static void validar(Pregunta pregunta) {
        if (pregunta == null || !textoValido(pregunta.pregunta(), MAX_PREGUNTA))
            throw new IllegalArgumentException("Escribe una pregunta de hasta 600 caracteres.");
        if (pregunta.historial() != null && (pregunta.historial().size() > MAX_HISTORIAL || pregunta.historial().stream()
                .anyMatch(t -> t == null || !textoValido(t.pregunta(), MAX_PREGUNTA) || !textoValido(t.respuesta(), MAX_RESPUESTA))))
            throw new IllegalArgumentException("El historial debe tener hasta cuatro intercambios breves.");
    }

    private static boolean textoValido(String texto, int maximo) {
        return texto != null && !texto.isBlank() && texto.length() <= maximo;
    }

    private static List<Turno> historial(Pregunta pregunta, PrivacidadConsultaKusi privacidad) {
        if (pregunta.historial() == null) return List.of();
        return pregunta.historial().stream().map(t -> new Turno(privacidad.conversacion(t.pregunta()),
                privacidad.conversacion(t.respuesta()))).toList();
    }

    private static List<String> textos(JsonNode lista, PrivacidadConsultaKusi privacidad) {
        List<String> resultado = new ArrayList<>();
        if (lista.isArray()) lista.forEach(nodo -> {
            if (nodo.isTextual()) resultado.add(privacidad.contenido(nodo.textValue()));
        });
        return resultado.stream().filter(texto -> !texto.isBlank()).toList();
    }

    private String nombreArea(DatosConsultaKusi.Clase clase) {
        try {
            String nombre = django.nombreCurso(clase.actual().curso());
            if (nombre != null && !nombre.isBlank()) return nombre;
        } catch (IllegalArgumentException | IllegalStateException noDisponible) {
            // El área guardada al publicar el juego permite usar el currículo
            // aunque el nombre actual del catálogo no pueda consultarse.
        }
        return clase.envios().values().stream().filter(e -> e.actividad().id().equals(clase.actual().id()))
                .map(e -> e.paquete().path("curso").asText()).filter(curso -> !curso.isBlank()).reduce((a, b) -> b).orElse("");
    }

    private String curriculo(int grado, String area) {
        String clave = PrivacidadConsultaKusi.normalizar(area).strip().replaceAll("\\s+", "-");
        if ((grado != 1 && grado != 2) || !AREAS.contains(clave)) return "";
        try { return Files.readString(rutaCurriculo.resolve(grado + "-" + clave + ".md")); }
        catch (IOException noDisponible) { return ""; }
    }

    private static Map<String, Object> esquema() {
        Map<String, Object> barra = Map.of("type", "object", "additionalProperties", false, "required", List.of("etiqueta", "valor"),
                "properties", Map.of("etiqueta", Map.of("type", "string"), "valor", Map.of("type", "integer")));
        Map<String, Object> propio = Map.of("type", "object", "additionalProperties", false, "required", List.of("titulo", "barras"),
                "properties", Map.of("titulo", Map.of("type", "string"), "barras", Map.of("type", "array", "items", barra)));
        return Map.of("type", "object", "additionalProperties", false,
                "required", List.of("texto", "actividad", "graficos", "graficos_propios", "mostrar_quienes_necesitan_ayuda",
                        "mostrar_lista_de_estudiantes"),
                "properties", Map.of("texto", Map.of("type", "string"), "actividad", Map.of("type", "string"),
                        "graficos", Map.of("type", "array", "items", Map.of("type", "string", "enum", TIPOS)),
                        "graficos_propios", Map.of("type", "array", "items", propio),
                        "mostrar_quienes_necesitan_ayuda", Map.of("type", "boolean"),
                        "mostrar_lista_de_estudiantes", Map.of("type", "boolean")));
    }

    private static Grafico grafico(String tipo, ProgresoClaseKusi.Grupo grupo, List<DatosConsultaKusi.Actividad> actividades,
                                  Map<UUID, ProgresoClaseKusi> progresos, ProgresoClaseKusi actual,
                                  List<UUID> orden, Map<UUID, String> nombres) {
        return new Grafico(tipo, null, switch (tipo) {
            case ERRORES, AYUDAS -> grupo.niveles().stream().map(n -> new Barra("Nivel " + n.nivel(),
                    tipo.equals(ERRORES) ? n.errores() : n.ayudas(), null, null)).toList();
            case AVANCE -> orden.stream().map(id -> {
                ProgresoClaseKusi.Estudiante estudiante = actual.estudiantes.get(id);
                return new Barra(nombres.get(id), estudiante.avance(), 100, estudiante.estado());
            }).toList();
            case COMPARACION -> actividades.stream().map(a -> {
                ProgresoClaseKusi progreso = progresos.get(a.id());
                return new Barra(a.titulo(), progreso.terminaron(), progreso.estudiantes.size(), progreso.jugaron() + " jugaron");
            }).toList();
            default -> throw new IllegalArgumentException("El gráfico solicitado no está disponible.");
        });
    }
}
