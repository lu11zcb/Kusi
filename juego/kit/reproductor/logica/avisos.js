import { emitirAlAnfitrion } from './salidasPuente.js'
// Lista de los avisos del laberinto: inicio, acciones, ayudas y niveles completados.
// La misma identidad y orden se conservan en consola, panel y Android.

export const avisos = []

// Guarda un aviso con su hora y lo muestra en la consola con «[Kusi]».
export function avisar(tipo, datos = {}) {
  const aviso = { tipo, ...datos, momento: new Date().toISOString() }
  avisos.push(aviso)
  // Como texto JSON para que se lea igual en el navegador y en los registros de Android.
  console.log('[Kusi] ' + JSON.stringify(aviso))
  emitirAlAnfitrion(globalThis.window, { tipo: 'aviso', aviso })
  return aviso
}
