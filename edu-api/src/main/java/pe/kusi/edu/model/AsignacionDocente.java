package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="asignaciones_docente", uniqueConstraints=@UniqueConstraint(name="uk_docente_curso_seccion_anio", columnNames={"docente_id", "curso_id", "seccion_id", "anio_escolar"}))
public class AsignacionDocente {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(name="docente_id", nullable=false) private UUID docenteId;
    @Column(name="curso_id", nullable=false) private UUID cursoId;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="seccion_id", nullable=false) private Seccion seccion;
    @Column(name="anio_escolar", nullable=false) private int anioEscolar;
    @Column(name="creado_en", nullable=false) private Instant creadoEn=Instant.now();
    @Column(name="creado_por", nullable=false) private UUID creadoPor;
    protected AsignacionDocente() {}
    public AsignacionDocente(UUID docenteId, UUID cursoId, Seccion seccion, int anioEscolar, UUID creadoPor){this.docenteId=docenteId;this.cursoId=cursoId;this.seccion=seccion;this.anioEscolar=anioEscolar;this.creadoPor=creadoPor;}
    public UUID getId(){return id;} public UUID getDocenteId(){return docenteId;} public UUID getCursoId(){return cursoId;} public Seccion getSeccion(){return seccion;} public int getAnioEscolar(){return anioEscolar;} public Instant getCreadoEn(){return creadoEn;}
}
