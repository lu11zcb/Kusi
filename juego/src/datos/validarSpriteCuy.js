import { DIRECCIONES_PERSONAJE, ESTADOS_PERSONAJE, validarSpritePersonaje } from './validarSpritePersonaje.js'

// Se mantienen los nombres usados por las escenas y las pruebas del jugador;
// el contrato se comprueba una sola vez, también para el zorro y futuros dibujos.
export const DIRECCIONES_CUY = DIRECCIONES_PERSONAJE
export const ESTADOS_CUY = ESTADOS_PERSONAJE
export const validarSpriteCuy = (datos) => validarSpritePersonaje(datos, 'cuy')
