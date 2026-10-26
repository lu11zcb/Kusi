package pe.kusi.edu.ia;

// La llamada 1: la propuesta. Separa transporte del proveedor y validación del resultado
// (ValidadorPropuesta). Implementación real: GeneradorPropuestasIa, sobre el adaptador
// único ClienteIa (se activa con IA_CLAVE, o GROQ_API_KEY, en el .env local).
public interface GeneradorPropuestas {
    boolean configurado();
    String proveedor();
    String modelo();
    // Devuelve la respuesta del proveedor ya convertida a mapa, sin validar todavía.
    java.util.Map<String,Object> generar(EntradaGeneracion entrada) throws FalloGeneracion;
}
