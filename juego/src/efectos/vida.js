// Interruptor único de la capa de vida: sombras, parpadeo y sonidos de los
// personajes del laberinto. Con ?vida=0 en la dirección se apagan todos a la
// vez, de modo que se puede comparar el juego con y sin ellos sin tocar código.
const PARAMETRO_VIDA = 'vida'
const VALOR_APAGADO = '0'

// Cualquier otro valor, o ningún parámetro, deja la capa encendida. La búsqueda
// se puede pasar a mano para probar la función sin abrir un navegador.
export function vidaActiva(busqueda = globalThis.location?.search ?? '') {
  return new URLSearchParams(busqueda).get(PARAMETRO_VIDA) !== VALOR_APAGADO
}
