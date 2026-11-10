package pe.kusi.edu.taller;

import java.util.List;

/**
 * El taller entregó un resultado que no pasa la revisión de Spring. Lleva todos los
 * motivos juntos, para que el trabajador los corrija de una vez (responde 422).
 */
public class EntregaTallerInvalida extends RuntimeException {

    private final List<String> motivos;

    public EntregaTallerInvalida(List<String> motivos) {
        super("El resultado del taller no pasó la revisión: " + String.join(" ", motivos));
        this.motivos = List.copyOf(motivos);
    }

    public List<String> getMotivos() { return motivos; }
}
