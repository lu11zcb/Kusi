import { avisar } from '../../../kit/reproductor/logica/avisos.js'

// La carga y la escena comparten esta referencia: incluso un fallo anterior al
// primer mapa conserva el mismo identificador y su posición en la partida.
export function crearPartidaLaberinto(semilla = null) {
  // La semilla procede del avance confirmado por el anfitrión. Se copia para no
  // compartir con él el conjunto mutable de avisos ya emitidos.
  if (semilla !== null) {
    if (!semilla || typeof semilla.id !== 'string' || !/^[A-Za-z0-9-]{1,120}$/.test(semilla.id) ||
        !Number.isSafeInteger(semilla.orden) || semilla.orden < 0 || semilla.orden > 100000 ||
        !Array.isArray(semilla.avisados) || semilla.avisados.some((aviso) => typeof aviso !== 'string' ||
          !/^(listo|inicio|reto_completado:[1-5])$/.test(aviso)) || semilla.cerrada !== false) {
      throw new Error('El avance confirmado no tiene una partida válida.')
    }
    return { id: semilla.id, orden: semilla.orden, avisados: new Set(semilla.avisados), cerrada: false, reanudada: true }
  }
  const id = globalThis.crypto?.randomUUID?.() ??
    'laberinto-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  return { id, orden: 0, avisados: new Set(), cerrada: false }
}

export function avisarPartida(partida, tipo, datos = {}) {
  // El contexto viaja entre niveles. Las entradas repetidas de una escena o un
  // último cuadro en la puerta no deben duplicar el inicio, el cierre ni el
  // reto completado. Las acciones y las ayudas sí pueden repetirse.
  if (partida.cerrada) return null
  const unico = ['listo', 'inicio', 'fin', 'fallo'].includes(tipo) ? tipo
    : tipo === 'reto_completado' ? tipo + ':' + datos.nivel : null
  if (unico && partida.avisados.has(unico)) return null
  if (unico) partida.avisados.add(unico)
  partida.orden += 1
  const aviso = avisar(tipo, { ...datos, partida: partida.id, orden: partida.orden })
  if (tipo === 'fin' || tipo === 'fallo') partida.cerrada = true
  return aviso
}
