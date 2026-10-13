package pe.kusi.edu.ia;

// Separa transporte del proveedor y validación del resultado (ValidadorPropuesta).
// Proveedor real: GeneradorGroq (se activa con GROQ_API_KEY en el .env local).
public interface GeneradorPropuestas {
    boolean configurado();
    String proveedor();
    String modelo();
    // Devuelve la respuesta del proveedor ya convertida a mapa, sin validar todavía.
    java.util.Map<String,Object> generar(EntradaGeneracion entrada) throws FalloGeneracion;
}
