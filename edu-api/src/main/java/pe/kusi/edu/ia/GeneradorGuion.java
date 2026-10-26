package pe.kusi.edu.ia;

import com.fasterxml.jackson.databind.JsonNode;

// La llamada 2: el guion del laberinto a partir de la propuesta aprobada. Va aparte
// de GeneradorPropuestas porque pide otra cosa a la IA, pero ambas usan el mismo
// adaptador (ClienteIa). Lo que devuelve es la respuesta de la IA tal cual: todavía
// no es el guion del juego ni está validado (eso lo hacen ConstructorGuion y
// ValidadorLaberinto).
public interface GeneradorGuion {
    boolean configurado();

    String proveedor();

    String modelo();

    JsonNode generarGuion(EntradaGuion entrada) throws FalloGeneracion;
}
