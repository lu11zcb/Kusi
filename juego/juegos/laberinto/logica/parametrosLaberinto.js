// Parámetros de la dirección que solo sirven para revisar el laberinto con otros
// ojos: el tipo de lienzo y el nivel con el que se abre. Sin ellos el juego se
// abre igual que siempre: dibuja con Canvas y empieza en el primer nivel.
const PARAMETRO_RENDERIZADOR = 'renderizador'
const VALOR_AUTO = 'auto'
const PARAMETRO_NIVEL = 'nivel'

// El tablero es 2D y casi todo está quieto, así que Canvas gasta menos que WebGL
// en equipos sin tarjeta gráfica. ?renderizador=auto devuelve la elección a
// Phaser (WebGL si el equipo lo permite) para comparar los dos con la misma
// partida.
export function elegirRenderizador(busqueda = globalThis.location?.search ?? '') {
  return new URLSearchParams(busqueda).get(PARAMETRO_RENDERIZADOR) === VALOR_AUTO ? 'auto' : 'canvas'
}

// ?nivel=2 abre el segundo nivel sin tener que ganar el primero. Devuelve la
// posición dentro de los retos, empezando en 0. Un valor que no es un número
// entero, o que no existe en el paquete, abre el primer nivel.
export function nivelPedido(busqueda, totalNiveles) {
  const texto = new URLSearchParams(busqueda).get(PARAMETRO_NIVEL)
  if (texto === null || texto.trim() === '') return 0
  const numero = Number(texto)
  return Number.isInteger(numero) && numero >= 1 && numero <= totalNiveles ? numero - 1 : 0
}
