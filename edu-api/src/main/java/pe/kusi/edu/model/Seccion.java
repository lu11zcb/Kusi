package pe.kusi.edu.model;

import jakarta.persistence.*;
import java.text.Normalizer;
import java.util.Locale;
import java.util.UUID;

@Entity
@Table(name="secciones", uniqueConstraints=@UniqueConstraint(name="uk_seccion_nombre_anio", columnNames={"nombre_clave", "anio_escolar"}))
public class Seccion {
    @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
    @Column(nullable=false, length=80) private String nombre;
    @Column(name="nombre_clave", nullable=false, length=100) private String nombreClave;
    @Column(nullable=false) private int grado;
    @Column(name="anio_escolar", nullable=false) private int anioEscolar;
    protected Seccion() {}
    public Seccion(String nombre, int grado, int anioEscolar) { setNombre(nombre); this.grado=grado; this.anioEscolar=anioEscolar; }
    public void setNombre(String value) { this.nombre=value.trim().replaceAll("\\s+", " "); this.nombreClave=Normalizer.normalize(this.nombre, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT); }
    public UUID getId(){return id;} public String getNombre(){return nombre;} public int getGrado(){return grado;} public int getAnioEscolar(){return anioEscolar;}
}
