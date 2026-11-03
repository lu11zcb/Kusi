import { PersonajeAnimado, pedirHojaPersonaje, registrarAnimacionesPersonaje } from './personajeAnimado.js'

export const CLAVE_CUY_ANIMADO = 'cuy-nino-animado-v1'
export const CLAVE_MANIFIESTO_CUY = 'cuy-nino-manifiesto'
export const ARCHIVO_MANIFIESTO_CUY = 'dibujos/cuy-nino-animado-v1.json'

// El adaptador conserva las importaciones del jugador; cuadros, giros y reloj
// se implementan una sola vez en PersonajeAnimado para todas las especies.
export const pedirHojaCuy = (escena, datos) => pedirHojaPersonaje(escena, datos, CLAVE_CUY_ANIMADO)
export const registrarAnimacionesCuy = (escena, datos) => registrarAnimacionesPersonaje(escena, datos, CLAVE_CUY_ANIMADO)

export class CuyAnimado extends PersonajeAnimado {
  constructor(escena, datos) {
    super(escena, datos, CLAVE_CUY_ANIMADO, { relojManual: true })
  }
}
