package pe.kusi.edu.ia;

public class FalloGeneracion extends Exception {
    private final boolean tiempoAgotado;
    public FalloGeneracion(String mensaje, boolean tiempoAgotado) { super(mensaje); this.tiempoAgotado=tiempoAgotado; }
    public boolean isTiempoAgotado() { return tiempoAgotado; }
}
