import { PersonajeAnimado, pedirHojaPersonaje, registrarAnimacionesPersonaje } from './personajeAnimado.js'
import { validarMolde } from '../datos/protagonistas.js'

// El protagonista que el reproductor le da a cada juego. La hoja y el manifiesto
// se guardan siempre con las mismas claves, sea cual sea el personaje, así que un
// juego nuevo solo hace esto, y nunca nombra al cuy:
//
//   import { crearProtagonista, ALTURA_PROTAGONISTA } from '#kit/reproductor/dibujos/protagonista.js'
//   this.protagonista = crearProtagonista(this, { alto: this.casilla * ALTURA_PROTAGONISTA })
//
// El reproductor ya cargó y revisó al protagonista antes de abrir el juego.

export const CLAVE_PROTAGONISTA = 'protagonista'
export const CLAVE_MANIFIESTO_PROTAGONISTA = 'protagonista-manifiesto'

// El protagonista mide 1,2 casillas de alto, como el cuy del laberinto.
export const ALTURA_PROTAGONISTA = 1.2

// Los efectos del cuerpo y el parpadeo sirven para cualquier personaje del molde.
// Se ofrecen con nombres neutrales para que un juego nuevo no importe nada que
// diga «cuy»; los valores son los mismos que usa el laberinto.
export { PERFIL_CUY as PERFIL_PROTAGONISTA } from '../efectos/CuerpoVivo.js'
export { ParpadeoCuy as ParpadeoProtagonista } from '../efectos/ParpadeoCuy.js'

// Paso 1 de la carga: pide el manifiesto del protagonista elegido.
export function pedirManifiestoProtagonista(escena, protagonista) {
  escena.load.json(CLAVE_MANIFIESTO_PROTAGONISTA, protagonista.manifiesto)
}

// Paso 2: revisa el manifiesto contra el molde y pide su hoja. Devuelve los
// datos revisados, que la carga necesita para registrar las animaciones.
export function prepararProtagonista(escena, protagonista) {
  const datos = validarMolde(escena.cache.json.get(CLAVE_MANIFIESTO_PROTAGONISTA), protagonista.id)
  pedirHojaPersonaje(escena, datos, CLAVE_PROTAGONISTA)
  return datos
}

// Paso 3, con la hoja ya descargada: crea sus animaciones con claves neutrales
// («protagonista:frente:caminar»).
export function registrarProtagonista(escena, datos) {
  registrarAnimacionesPersonaje(escena, datos, CLAVE_PROTAGONISTA)
}

// Lo que usa el juego. Devuelve un personaje animado con reloj manual, igual
// que el cuy del laberinto: el juego avanza su animación con animarMovimiento
// después de mover al personaje. «alto» es la altura en píxeles desde los pies.
export function crearProtagonista(escena, { alto = null } = {}) {
  const datos = escena.cache.json.get(CLAVE_MANIFIESTO_PROTAGONISTA)
  if (!datos || !escena.textures.exists(CLAVE_PROTAGONISTA)) {
    throw new Error('[protagonista] El reproductor todavía no cargó al protagonista')
  }
  const personaje = new PersonajeAnimado(escena, datos, CLAVE_PROTAGONISTA, { relojManual: true })
  if (alto !== null) personaje.setScale(alto / datos.anclaje.y)
  return personaje
}
