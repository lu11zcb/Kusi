import { MAXIMO_PUNTOS } from '../logica/puntos.js'

export const FRASE_PRUEBA_DOCENTE = 'Los puntos de esta prueba no se guardan.'
export function fraseDeMonedas(monedas) {
  return '¡Ganaste ' + monedas + (monedas === 1 ? ' moneda!' : ' monedas!')
}

// Lista las variantes que el kit puede decir, incluso una práctica sin premio.
export function frasesDeKusi() {
  return [FRASE_PRUEBA_DOCENTE, ...Array.from({ length: MAXIMO_PUNTOS + 6 }, (_, monedas) => fraseDeMonedas(monedas))]
}
