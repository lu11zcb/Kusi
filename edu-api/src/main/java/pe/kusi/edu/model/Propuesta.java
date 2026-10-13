package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

// Versión de una propuesta. Las listas se guardan como JSON validado previamente.
// Queda pendiente de revisión docente: no existe aprobación ni publicación automática.
@Entity
@Table(name="propuestas", uniqueConstraints=@UniqueConstraint(name="uk_propuesta_solicitud_version", columnNames={"solicitud_id", "version"}))
public class Propuesta {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="solicitud_id", nullable=false) private UUID solicitudId;
    @Column(nullable=false) private int version;
    @Column(nullable=false, length=4000) private String objetivo;
    @Column(name="origen_objetivo", nullable=false, length=10) private String origenObjetivo;
    @Column(nullable=false, length=10000) private String historia;
    @Column(nullable=false, length=50000) private String acciones;
    @Column(nullable=false, length=50000) private String reglas;
    @Column(nullable=false, length=50000) private String retos;
    @Column(nullable=false, length=50000) private String ayudas;
    @Column(nullable=false, length=80) private String proveedor;
    @Column(nullable=false, length=120) private String modelo;
    @Column(name="creado_en", nullable=false) private Instant creadoEn=Instant.now();

    protected Propuesta() {}
    public Propuesta(UUID solicitudId, int version, String objetivo, String origenObjetivo, String historia,
                     String acciones, String reglas, String retos, String ayudas, String proveedor, String modelo) {
        this.solicitudId=solicitudId; this.version=version; this.objetivo=objetivo; this.origenObjetivo=origenObjetivo; this.historia=historia;
        this.acciones=acciones; this.reglas=reglas; this.retos=retos; this.ayudas=ayudas; this.proveedor=proveedor; this.modelo=modelo;
    }
    public UUID getId(){return id;} public UUID getSolicitudId(){return solicitudId;} public int getVersion(){return version;}
    public String getObjetivo(){return objetivo;} public String getOrigenObjetivo(){return origenObjetivo;} public String getHistoria(){return historia;}
    public String getAcciones(){return acciones;} public String getReglas(){return reglas;} public String getRetos(){return retos;} public String getAyudas(){return ayudas;}
    public String getProveedor(){return proveedor;} public String getModelo(){return modelo;} public Instant getCreadoEn(){return creadoEn;}
}
