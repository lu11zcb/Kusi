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
    @Column(length=50000) private String recursos;
    @Column(length=80) private String proveedor;
    @Column(length=120) private String modelo;
    @Column(nullable=false, length=10) private String origen;
    @Column(name="version_base") private Integer versionBase;
    @Column(length=4000) private String observaciones;
    @Column(name="estado_revision", nullable=false, length=12) private String estadoRevision="pendiente";
    @Column(name="revisada_por") private UUID revisadaPor;
    @Column(name="revisada_en") private Instant revisadaEn;
    @Column(name="creado_en", nullable=false) private Instant creadoEn=Instant.now();
    // HU28: la regla con que se juega el laberinto ("orden" o "solo_clase"); null si la propuesta no la eligió.
    @Column(name="regla_juego", length=12) private String reglaJuego;

    protected Propuesta() {}
    // origen "ia" lleva proveedor/modelo; origen "docente" (HU23) los deja vacíos.
    public Propuesta(UUID solicitudId, int version, String origen, Integer versionBase, String observaciones,
                     String objetivo, String origenObjetivo, String historia, String acciones, String reglas, String retos,
                     String ayudas, String recursos, String proveedor, String modelo) {
        this(solicitudId, version, origen, versionBase, observaciones, objetivo, origenObjetivo, historia, acciones, reglas,
            retos, ayudas, recursos, proveedor, modelo, null);
    }

    public Propuesta(UUID solicitudId, int version, String origen, Integer versionBase, String observaciones,
                     String objetivo, String origenObjetivo, String historia, String acciones, String reglas, String retos,
                     String ayudas, String recursos, String proveedor, String modelo, String reglaJuego) {
        this.solicitudId=solicitudId; this.version=version; this.origen=origen; this.versionBase=versionBase; this.observaciones=observaciones;
        this.objetivo=objetivo; this.origenObjetivo=origenObjetivo; this.historia=historia; this.acciones=acciones; this.reglas=reglas;
        this.retos=retos; this.ayudas=ayudas; this.recursos=recursos; this.proveedor=proveedor; this.modelo=modelo;
        this.reglaJuego=reglaJuego;
    }

    // HU21/HU24: la revisión queda registrada en la versión exacta, con docente y fecha.
    public void revisar(String estado, UUID docente) { this.estadoRevision=estado; this.revisadaPor=docente; this.revisadaEn=Instant.now(); }
    public UUID getId(){return id;} public UUID getSolicitudId(){return solicitudId;} public int getVersion(){return version;}
    public String getObjetivo(){return objetivo;} public String getOrigenObjetivo(){return origenObjetivo;} public String getHistoria(){return historia;}
    public String getAcciones(){return acciones;} public String getReglas(){return reglas;} public String getRetos(){return retos;} public String getAyudas(){return ayudas;}
    public String getRecursos(){return recursos;} public String getOrigen(){return origen;} public Integer getVersionBase(){return versionBase;}
    public String getObservaciones(){return observaciones;} public String getEstadoRevision(){return estadoRevision;}
    public UUID getRevisadaPor(){return revisadaPor;} public Instant getRevisadaEn(){return revisadaEn;}
    public String getProveedor(){return proveedor;} public String getModelo(){return modelo;} public Instant getCreadoEn(){return creadoEn;}
    public String getReglaJuego(){return reglaJuego;}
}
