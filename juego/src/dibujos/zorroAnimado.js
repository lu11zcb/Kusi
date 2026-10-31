import { PersonajeAnimado, pedirHojaPersonaje, registrarAnimacionesPersonaje } from './personajeAnimado.js'

export const CLAVE_ZORRO_ANIMADO = 'zorro-animado-v1'
export const CLAVE_MANIFIESTO_ZORRO = 'zorro-manifiesto'
// La revisión en la URL renueva también el manifiesto guardado por el navegador.
export const ARCHIVO_MANIFIESTO_ZORRO = 'dibujos/zorro-animado-v1.json?v=4'

export const pedirHojaZorro = (escena, datos) => pedirHojaPersonaje(escena, datos, CLAVE_ZORRO_ANIMADO)
export const registrarAnimacionesZorro = (escena, datos) => registrarAnimacionesPersonaje(escena, datos, CLAVE_ZORRO_ANIMADO)

export class ZorroAnimado extends PersonajeAnimado {
  constructor(escena, datos) {
    super(escena, datos, CLAVE_ZORRO_ANIMADO)
  }
}
