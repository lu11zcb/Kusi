// Los fallos del anfitrión no deben detener el juego ni impedir la otra salida.
// El aviso no contiene credenciales; cada anfitrión valida su origen y su sesión.
export function emitirAlAnfitrion(ventana, mensaje) {
  try { ventana?.parent?.postMessage(mensaje, '*') } catch { /* El juego sigue disponible. */ }
  try { ventana?.KusiPuente?.emitir(JSON.stringify(mensaje)) } catch { /* La web sigue recibiendo sus avisos. */ }
}
