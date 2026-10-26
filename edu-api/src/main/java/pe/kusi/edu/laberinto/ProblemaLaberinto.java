package pe.kusi.edu.laberinto;

// Un problema del guion del laberinto. El código es estable (el panel puede
// reconocerlo y agruparlo) y el motivo está en español sencillo para que lo lea el
// docente. Todos los motivos de un nivel empiezan con «Nivel N:».
public record ProblemaLaberinto(String codigo, String motivo) {

    // «CODIGO: motivo», el formato que se escribe en el mensaje de la etapa de
    // comprobación de la generación.
    @Override
    public String toString() {
        return codigo + ": " + motivo;
    }
}
