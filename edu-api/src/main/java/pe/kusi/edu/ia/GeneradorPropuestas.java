package pe.kusi.edu.ia;

// Separa transporte del proveedor y validación del resultado (ValidadorPropuesta).
// La prueba real de IA está aplazada por Luis: no hay proveedor ni modelo elegidos.
public interface GeneradorPropuestas {
    boolean configurado();
    String proveedor();
    String modelo();
    // Devuelve la respuesta del proveedor ya convertida a mapa, sin validar todavía.
    java.util.Map<String,Object> generar(EntradaGeneracion entrada) throws FalloGeneracion;
}
