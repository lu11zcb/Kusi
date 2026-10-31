// La voz nativa de Kusi tiene prioridad en Android; en web se conserva la
// síntesis del navegador, sin cambiar botones ni mensajes del juego.
export function decir(texto, { alEmpezar = () => {}, alTerminar = () => {} } = {}) {
  if (typeof texto !== 'string' || !texto.trim()) return false
  try {
    if (typeof globalThis.window?.KusiPuente?.decir === 'function') {
      globalThis.window.KusiPuente.decir(texto)
      alEmpezar()
      return true
    }
  } catch { /* Si Android no está disponible, queda la voz del navegador. */ }
  const sintesis = globalThis.speechSynthesis
  const Frase = globalThis.SpeechSynthesisUtterance
  if (!sintesis || typeof Frase !== 'function' || typeof texto !== 'string' || !texto.trim()) return false
  try {
    const frase = new Frase(texto)
    frase.lang = 'es-PE'
    frase.rate = 0.9
    frase.onstart = alEmpezar
    frase.onend = alTerminar
    frase.onerror = alTerminar
    // La consigna nueva reemplaza la anterior, sin acumular voces cuando el
    // niño toca varias veces. El globo siempre conserva la alternativa escrita.
    sintesis.cancel()
    sintesis.speak(frase)
    return true
  } catch {
    return false
  }
}
