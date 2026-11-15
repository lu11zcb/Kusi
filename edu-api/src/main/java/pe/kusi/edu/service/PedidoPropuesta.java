package pe.kusi.edu.service;

import pe.kusi.edu.ia.EntradaGeneracion;

// Lo que viaja en el buzón cuando se pide una propuesta al taller: lo mismo que la IA
// directa recibiría (EntradaGeneracion, solo datos del recurso educativo) más lo que
// Spring necesita recordar para guardar la versión cuando el taller responda, o para
// usar el respaldo si el taller no puede.
//   versionBase    la versión que se ajusta (null si es la primera).
//   reglaHeredada  la regla de esa versión, por si la propuesta nueva no elige otra.
//   tipoHeredado   el tipo de juego de esa versión, por la misma razón.
//   objetivoFijo   el objetivo que escribió el docente y que no se puede cambiar (o null).
public record PedidoPropuesta(EntradaGeneracion entrada, Integer versionBase, String reglaHeredada,
                              String tipoHeredado, String objetivoFijo) {}
