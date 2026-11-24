package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Representa un trabajo pendiente de ejecución en el taller de juegos.
 * El trabajador externo recoge el trabajo y devuelve el resultado.
 */
@Entity
@Table(name = "trabajos_taller")
public class TrabajoTaller {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // Un trabajo es de una generación (crear o corregir un juego) o de una solicitud
    // (pedir una propuesta): exactamente uno de los dos.
    @Column(name = "generacion_id")
    private UUID generacionId;

    @Column(name = "solicitud_id")
    private UUID solicitudId;

    @Column(nullable = false, length = 30)
    private String tipo;

    @Column(nullable = false, length = 20)
    private String estado;

    @Column(name = "datos_entrada", nullable = false, columnDefinition = "TEXT")
    private String datosEntrada;

    @Column(columnDefinition = "TEXT")
    private String resultado;

    @Column(name = "motivo_fallo", length = 2000)
    private String motivoFallo;

    @Column(name = "motivo_pausa", length = 2000)
    private String motivoPausa;

    @Column(name = "disponible_desde")
    private Instant disponibleDesde;

    @Column(nullable = false)
    private int intentos;

    @Column(name = "tomado_por", length = 120)
    private String tomadoPor;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    @Column(name = "tomado_en")
    private Instant tomadoEn;

    @Column(name = "terminado_en")
    private Instant terminadoEn;

    protected TrabajoTaller() {}

    public TrabajoTaller(UUID generacionId, String tipo, String datosEntrada) {
        this.generacionId = generacionId;
        this.tipo = tipo;
        this.estado = "pendiente";
        this.datosEntrada = datosEntrada;
        this.intentos = 0;
        this.creadoEn = Instant.now();
    }

    // El tipo del trabajo que pide una propuesta al taller.
    public static final String TIPO_PROPONER = "proponer";

    /**
     * Un trabajo que pide al taller la propuesta de una solicitud. Los datos de entrada
     * son lo que el taller necesita (curso, grado, tema…), nunca datos de estudiantes.
     */
    public static TrabajoTaller paraPropuesta(UUID solicitudId, String datosEntrada) {
        TrabajoTaller trabajo = new TrabajoTaller(null, TIPO_PROPONER, datosEntrada);
        trabajo.solicitudId = solicitudId;
        return trabajo;
    }

    public boolean esDePropuesta() { return TIPO_PROPONER.equals(tipo); }

    public UUID getId() { return id; }
    public UUID getGeneracionId() { return generacionId; }
    public UUID getSolicitudId() { return solicitudId; }
    public String getTipo() { return tipo; }
    public String getEstado() { return estado; }
    public String getDatosEntrada() { return datosEntrada; }
    public String getResultado() { return resultado; }
    public String getMotivoFallo() { return motivoFallo; }
    public Instant getDisponibleDesde() { return disponibleDesde; }
    public int getIntentos() { return intentos; }
    public String getTomadoPor() { return tomadoPor; }
    public Instant getCreadoEn() { return creadoEn; }
    public Instant getTomadoEn() { return tomadoEn; }
    public Instant getTerminadoEn() { return terminadoEn; }

    /**
     * Marca el trabajo como recogido por un trabajador.
     * Cada recogida incrementa el número de intentos.
     */
    public void tomar(String trabajador) {
        this.estado = "en_proceso";
        this.tomadoPor = trabajador;
        // La hora también identifica esta toma. Se devuelve con la precisión que guarda la base.
        this.tomadoEn = Instant.now().truncatedTo(ChronoUnit.MICROS);
        this.terminadoEn = null;
        this.disponibleDesde = null;
        this.intentos++;
    }

    /**
     * Registra el paquete generado y finaliza el trabajo.
     */
    public void registrarResultado(String resultado) {
        this.resultado = resultado;
        this.estado = "listo";
        this.motivoFallo = null;
        this.terminadoEn = Instant.now();
    }

    /**
     * Registra un fallo definitivo del trabajo.
     */
    public void registrarFallo(String motivo) {
        this.estado = "fallido";
        this.motivoFallo = motivo;
        this.terminadoEn = Instant.now();
    }

    /**
     * Devuelve el trabajo a la cola para permitir una corrección.
     */
    public void reencolar(String motivo) {
        dejarPendiente();
        this.motivoFallo = motivo;
    }

    public void pausar(String motivo, Instant disponibleDesde) {
        dejarPendiente();
        this.motivoPausa = motivo;
        this.disponibleDesde = disponibleDesde.truncatedTo(ChronoUnit.MICROS);
        // Se devuelve el intento sumado al tomarlo: esperar al rol no gasta un vencimiento.
        this.intentos--;
    }

    private void dejarPendiente() {
        this.estado = "pendiente";
        this.tomadoPor = null;
        this.tomadoEn = null;
        this.terminadoEn = null;
    }
}
