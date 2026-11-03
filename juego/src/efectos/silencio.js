// El niño (o la maestra) apaga los sonidos del laberinto una vez y se queda
// apagado en los niveles siguientes y al volver a abrir el juego. La marca se
// guarda en localStorage; si el WebView no permite almacenamiento, se recuerda
// durante la sesión, igual que la mano que enseña a deslizar.
const CLAVE_SILENCIO = 'kusi-laberinto-silencio-v1'
const SILENCIADO = 'si'
const ACTIVADO = 'no'
let silenciadoEnEstaSesion = false

export function leerSilencio() {
  try {
    const guardado = globalThis.localStorage.getItem(CLAVE_SILENCIO)
    return guardado === null ? silenciadoEnEstaSesion : guardado === SILENCIADO
  } catch {
    return silenciadoEnEstaSesion
  }
}

export function guardarSilencio(silenciado) {
  silenciadoEnEstaSesion = Boolean(silenciado)
  try {
    globalThis.localStorage.setItem(CLAVE_SILENCIO, silenciado ? SILENCIADO : ACTIVADO)
  } catch {
    // Sin almacenamiento basta la memoria del módulo para esta sesión.
  }
}
