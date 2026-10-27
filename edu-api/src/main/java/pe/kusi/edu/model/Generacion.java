
package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "generaciones")
public class Generacion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "solicitud_id", nullable = false)
    private UUID solicitudId;

    @Column(name = "propuesta_id", nullable = false)
    private UUID propuestaId;

    @Column(name = "version_propuesta", nullable = false)
    private int versionPropuesta;

    @Column(nullable = false, length = 24)
    private String estado;

    @Column(columnDefinition = "TEXT")
    private String paquete;

    @Column(name = "ultimo_error", length = 1000)
    private String ultimoError;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    // El docente le dio el OK: el juego aparece en la app de sus estudiantes.
    @Column(name = "publicada", nullable = false)
    private boolean publicada;

    @Column(name = "publicada_en")
    private Instant publicadaEn;

    @Column(name = "actualizado_en", nullable = false)
    private Instant actualizadoEn;

    protected Generacion() {}

    public Generacion(UUID solicitudId, UUID propuestaId, int versionPropuesta) {
        this.solicitudId = solicitudId;
        this.propuestaId = propuestaId;
        this.versionPropuesta = versionPropuesta;
        this.estado = "pendiente";
        this.creadoEn = Instant.now();
        this.actualizadoEn = this.creadoEn;
    }

    public UUID getId() { return id; }
    public UUID getSolicitudId() { return solicitudId; }
    public UUID getPropuestaId() { return propuestaId; }
    public int getVersionPropuesta() { return versionPropuesta; }
    public String getEstado() { return estado; }
    public String getPaquete() { return paquete; }
    public String getUltimoError() { return ultimoError; }
    public Instant getCreadoEn() { return creadoEn; }
    public Instant getActualizadoEn() { return actualizadoEn; }

    public void registrarEstado(String estado, String error) {
        this.estado = estado;
        this.ultimoError = error;
        this.actualizadoEn = Instant.now();
    }

    public void guardarPaquete(String paquete) {
        this.paquete = paquete;
        this.actualizadoEn = Instant.now();
    }

    public boolean isPublicada() { return publicada; }
    public Instant getPublicadaEn() { return publicadaEn; }

    // Enviar el juego a los estudiantes. Volver a enviarlo no cambia la fecha del primer envío.
    public void publicar() {
        if (publicada) return;
        this.publicada = true;
        this.publicadaEn = Instant.now();
        this.actualizadoEn = this.publicadaEn;
    }
}
