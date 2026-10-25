// Este es el único punto de salida de voz del laberinto. Jesús puede conectar
// KusiPuente aquí más adelante, sin cambiar los botones ni los mensajes de Kusi.
export function decir(texto) {
  if (!globalThis.speechSynthesis || !globalThis.SpeechSynthesisUtterance) return
  const frase = new SpeechSynthesisUtterance(texto)
  frase.lang = 'es-PE'
  frase.rate = 0.9
  speechSynthesis.cancel()
  speechSynthesis.speak(frase)
}
