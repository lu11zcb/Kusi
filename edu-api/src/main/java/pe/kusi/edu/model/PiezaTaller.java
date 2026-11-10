package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Una pieza nueva (un objeto o un fondo) que dibujó el taller para un juego.
 * El archivo vive en la carpeta del trabajo, en la Mac del taller; aquí se guarda
 * solo su estado. Queda «pendiente» hasta que el docente la aprueba.
 */
@Entity
@Table(name = "piezas_taller")
public class PiezaTaller {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "trabajo_id", nullable = false)
    private UUID trabajoId;

    // El id de la pieza, que también es el nombre de su archivo (olla-de-barro.png).
    @Column(nullable = false, length = 60)
    private String pieza;

    // «objeto» o «fondo»: el taller nunca dibuja personajes.
    @Column(nullable = false, length = 12)
    private String tipo;

    @Column(length = 80)
    private String nombre;

    @Column(nullable = false, length = 12)
    private String estado;

    @Column(name = "creado_en", nullable = false)
    private Instant creadoEn;

    @Column(name = "aprobada_en")
    private Instant aprobadaEn;

    protected PiezaTaller() {}

    public PiezaTaller(UUID trabajoId, String pieza, String tipo, String nombre) {
        this.trabajoId = trabajoId;
        this.pieza = pieza;
        this.tipo = tipo;
        this.nombre = nombre;
        this.estado = "pendiente";
        this.creadoEn = Instant.now();
    }

    public UUID getId() { return id; }
    public UUID getTrabajoId() { return trabajoId; }
    public String getPieza() { return pieza; }
    public String getTipo() { return tipo; }
    public String getNombre() { return nombre; }
    public String getEstado() { return estado; }
    public Instant getCreadoEn() { return creadoEn; }
    public Instant getAprobadaEn() { return aprobadaEn; }
}
