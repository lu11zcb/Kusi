// Los fallos del anfitrión no deben detener el juego ni impedir la otra salida.
// El aviso no contiene credenciales; cada anfitrión valida su origen y su sesión.
export function emitirAlAnfitrion(ventana, mensaje, { nativo = true } = {}) {
  try { ventana?.parent?.postMessage(mensaje, '*') } catch { /* El juego sigue disponible. */ }
  if (nativo) emitirAlPuenteNativo(ventana, mensaje)
}

export function emitirAlPuenteNativo(ventana, mensaje) {
  try { ventana?.KusiPuente?.emitir(JSON.stringify(mensaje)) } catch { /* La web sigue recibiendo sus avisos. */ }
}

export function hayAnfitrion(ventana) {
  return ventana.parent !== ventana || typeof ventana.KusiPuente?.emitir === 'function'
}
