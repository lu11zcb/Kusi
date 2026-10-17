
package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "etapas_generacion")
public class EtapaGeneracion {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "generacion_id", nullable = false)
    private UUID generacionId;

    @Column(nullable = false, length = 40)
    private String etapa;

    @Column(nullable = false, length = 20)
    private String estado;

    @Column(length = 1000)
    private String mensaje;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    protected EtapaGeneracion() {}

    public EtapaGeneracion(UUID generacionId, String etapa,
                           String estado, String mensaje) {
        this.generacionId = generacionId;
        this.etapa = etapa;
        this.estado = estado;
        this.mensaje = mensaje;
        this.creadoEn = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getGeneracionId() { return generacionId; }
    public String getEtapa() { return etapa; }
    public String getEstado() { return estado; }
    public String getMensaje() { return mensaje; }
    public Instant getCreadoEn() { return creadoEn; }
}
