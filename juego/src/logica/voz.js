// Este es el único punto de salida de voz del laberinto. Jesús puede conectar
// KusiPuente aquí más adelante, sin cambiar los botones ni los mensajes de Kusi.
export function decir(texto) {
  const sintesis = globalThis.speechSynthesis
  const Frase = globalThis.SpeechSynthesisUtterance
  if (!sintesis || typeof Frase !== 'function' || typeof texto !== 'string' || !texto.trim()) return false
  try {
    const frase = new Frase(texto)
    frase.lang = 'es-PE'
    frase.rate = 0.9
    // La consigna nueva reemplaza la anterior, sin acumular voces cuando el
    // niño toca varias veces. El globo siempre conserva la alternativa escrita.
    sintesis.cancel()
    sintesis.speak(frase)
    return true
  } catch {
    return false
  }
}
