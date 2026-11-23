export const ESPERA_COMENTARIO = 4000
const PROTECCION_RESPUESTA = 7000
const MAX_RESPUESTAS_PENDIENTES = 2

export function crearColaVoz() {
  return { habilitada: false, actual: null, iniciadaEn: null, pendientes: [], comentario: null }
}

function tomarTurno(cola, frase) {
  return { ...cola, actual: frase, iniciadaEn: null }
}

function tomarSiguiente(cola, ahora) {
  if (cola.pendientes.length) {
    const [siguiente, ...pendientes] = cola.pendientes
    return tomarTurno({ ...cola, pendientes }, siguiente)
  }
  const comentario = cola.comentario?.caduca > ahora ? cola.comentario : null
  return tomarTurno({ ...cola, comentario: null }, comentario)
}

// La cola decide el turno. El reproductor mide cuándo empieza a sonar y
// comunica el fin o la caducidad de un comentario que aún no sonó.
export function avanzarColaVoz(cola, { tipo, frase, ahora } = {}) {
  switch (tipo) {
    case 'tocar':
      return cola.habilitada ? cola : { ...cola, habilitada: true }
    case 'pedir': {
      if (!cola.actual) return tomarTurno(cola, frase)
      if (frase.tipo === 'comentario') return { ...cola, comentario: frase }

      const respuestaLarga = frase.tipo === 'respuesta' && cola.iniciadaEn !== null &&
        ahora - cola.iniciadaEn > PROTECCION_RESPUESTA
      if (!cola.habilitada || cola.actual.tipo !== 'respuesta' || respuestaLarga) {
        const pendientes = frase.tipo === 'respuesta' ? [] : cola.pendientes
        return tomarTurno({ ...cola, pendientes }, frase)
      }
      // Una pregunta puede esperar el fin de la explicación si aún no hay respuestas en espera.
      if (frase.tipo === 'pregunta') {
        if (cola.pendientes[0]?.tipo === 'respuesta') return cola
        return { ...cola, pendientes: [frase] }
      }
      // Las respuestas desplazan a la pregunta pendiente y conservan su orden de llegada.
      const respuestas = cola.pendientes.filter((pendiente) => pendiente.tipo === 'respuesta')
      const pendientes = [...respuestas, frase].slice(-MAX_RESPUESTAS_PENDIENTES)
      return { ...cola, pendientes }
    }
    case 'repetir':
      return tomarTurno(cola, frase)
    case 'empezar':
      return cola.actual === frase ? { ...cola, iniciadaEn: ahora } : cola
    case 'terminar':
    case 'vencer':
      return cola.actual === frase ? tomarSiguiente(cola, ahora) : cola
    case 'callar':
      return { ...crearColaVoz(), habilitada: cola.habilitada }
    default:
      return cola
  }
}
