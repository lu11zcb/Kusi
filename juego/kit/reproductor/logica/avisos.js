import { emitirAlAnfitrion, emitirAlPuenteNativo } from './salidasPuente.js'
// Lista de los avisos de partida: inicio, acciones, ayudas y niveles completados.
// La misma identidad y orden se conservan en consola, panel y Android.

export const avisos = []
let presentar = null

// El reproductor escucha aquí porque el laberinto y el taller llegan al
// mismo emisor, incluso cuando importan sus avisos desde rutas distintas.
export function observarAvisosPartida(alAviso) {
  presentar = alAviso
  return () => { if (presentar === alAviso) presentar = null }
}

// Guarda un aviso con su hora y lo muestra en la consola con «[Kusi]».
export function avisar(tipo, datos = {}) {
  const aviso = { tipo, ...datos, momento: new Date().toISOString() }
  avisos.push(aviso)
  // Como texto JSON para que se lea igual en el navegador y en los registros de Android.
  console.log('[Kusi] ' + JSON.stringify(aviso))
  const ventana = globalThis.window
  const mensaje = { tipo: 'aviso', aviso }
  const finNativo = aviso.tipo === 'fin' && typeof ventana?.KusiPuente?.emitir === 'function'
  let enviado = false
  const entregarFin = finNativo ? () => {
    if (enviado) return
    enviado = true
    emitirAlPuenteNativo(ventana, mensaje)
  } : null
  let aplazado = false
  try { aplazado = presentar?.(aviso, entregarFin) === true } catch (error) {
    console.error('[Kusi] No se pudo mostrar el aviso de puntos:', error)
  }
  // Android cierra el lienzo nada más recibir «fin». El panel lo recibe en
  // seguida. La tarjeta puede dar unos segundos al niño en el puente nativo.
  emitirAlAnfitrion(ventana, mensaje, { nativo: !finNativo })
  if (!aplazado) entregarFin?.()
  return aviso
}
