import { avisar } from './avisos.js'

// La carga y la escena comparten esta referencia: incluso un fallo anterior al
// primer mapa conserva el mismo identificador y su posición en la partida.
export function crearPartidaLaberinto() {
  const id = globalThis.crypto?.randomUUID?.() ??
    'laberinto-' + Date.now() + '-' + Math.random().toString(36).slice(2)
  return { id, orden: 0 }
}

export function avisarPartida(partida, tipo, datos = {}) {
  partida.orden += 1
  return avisar(tipo, { ...datos, partida: partida.id, orden: partida.orden })
}
