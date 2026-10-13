package pe.kusi.edu.model;

import jakarta.persistence.*;
import org.springframework.data.domain.Persistable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

// El UUID lo genera el cliente para reintentar sin duplicar. Persistable obliga a
// insertar (persist) en vez de fusionar, así dos envíos simultáneos chocan con la PK.
@Entity
@Table(name="solicitudes_propuesta")
public class SolicitudPropuesta implements Persistable<UUID> {
    @Id private UUID id;
    @Column(name="docente_id", nullable=false) private UUID docenteId;
    @Column(name="curso_id", nullable=false) private UUID cursoId;
    @Column(name="seccion_id") private UUID seccionId;
    @Column(nullable=false, length=2000) private String tema;
    @Column(name="objetivo_docente", length=4000) private String objetivoDocente;
    @Column(nullable=false, length=20) private String estado="pendiente";
    @Column(nullable=false, length=20) private String proposito="preparacion";
    @Column(length=4000) private String instrucciones;
    @Column(nullable=false) private int intentos;
    @Column(name="ultimo_error", length=300) private String ultimoError;
    @Column(name="creado_en", nullable=false) private Instant creadoEn=Instant.now();
    @Column(name="actualizado_en", nullable=false) private Instant actualizadoEn=creadoEn;
    @Transient private boolean nueva;

    protected SolicitudPropuesta() {}
    public SolicitudPropuesta(UUID id, UUID docenteId, UUID cursoId, UUID seccionId, String tema, String objetivoDocente, String proposito, String instrucciones) {
        this.id=id; this.docenteId=docenteId; this.cursoId=cursoId; this.seccionId=seccionId; this.tema=tema; this.objetivoDocente=objetivoDocente;
        this.proposito=proposito; this.instrucciones=instrucciones; this.nueva=true;
    }

    // Misma solicitud solo si coinciden propietario y contenido exacto.
    public boolean mismaEntrada(UUID docente, UUID curso, UUID seccion, String temaRecibido, String objetivoRecibido, String propositoRecibido, String instruccionesRecibidas) {
        return docenteId.equals(docente) && cursoId.equals(curso) && Objects.equals(seccionId, seccion)
            && tema.equals(temaRecibido) && Objects.equals(objetivoDocente, objetivoRecibido)
            && proposito.equals(propositoRecibido) && Objects.equals(instrucciones, instruccionesRecibidas);
    }

    @Override public UUID getId(){return id;}
    @Override public boolean isNew(){return nueva;}
    @PostLoad @PostPersist void marcarGuardada(){nueva=false;}
    public UUID getDocenteId(){return docenteId;} public UUID getCursoId(){return cursoId;} public UUID getSeccionId(){return seccionId;}
    public String getTema(){return tema;} public String getObjetivoDocente(){return objetivoDocente;} public String getEstado(){return estado;}
    public String getProposito(){return proposito;} public String getInstrucciones(){return instrucciones;}
    public int getIntentos(){return intentos;} public String getUltimoError(){return ultimoError;} public Instant getCreadoEn(){return creadoEn;}
}
