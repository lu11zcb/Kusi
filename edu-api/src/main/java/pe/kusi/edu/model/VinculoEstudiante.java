package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="vinculos_estudiante", uniqueConstraints=@UniqueConstraint(name="uk_estudiante_seccion_anio", columnNames={"estudiante_id", "seccion_id", "anio_escolar"}))
public class VinculoEstudiante {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="estudiante_id", nullable=false) private UUID estudianteId;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="seccion_id", nullable=false) private Seccion seccion;
    @Column(name="anio_escolar", nullable=false) private int anioEscolar;
    @Column(name="creado_en", nullable=false) private Instant creadoEn=Instant.now();
    @Column(name="creado_por", nullable=false) private UUID creadoPor;
    protected VinculoEstudiante() {}
    public VinculoEstudiante(UUID estudianteId, Seccion seccion, int anioEscolar, UUID creadoPor){this.estudianteId=estudianteId;this.seccion=seccion;this.anioEscolar=anioEscolar;this.creadoPor=creadoPor;}
    public UUID getId(){return id;} public UUID getEstudianteId(){return estudianteId;} public Seccion getSeccion(){return seccion;} public int getAnioEscolar(){return anioEscolar;} public Instant getCreadoEn(){return creadoEn;}
}
