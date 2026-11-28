import { PersonajeAnimado, pedirHojaPersonaje, registrarAnimacionesPersonaje } from './personajeAnimado.js'
import { validarMolde } from '../datos/protagonistas.js'
import { CARPETA_PRENDAS, PRENDAS_CUY, teñirPelaje } from '../datos/aparienciaCuy.js'

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

// El cuy del niño se arma con capas: su hoja base y cada prenda llegan aparte y se juntan al terminar la carga.
const CLAVE_BASE = 'protagonista-base'
const clavePrenda = (prenda, quita = false) => 'protagonista-prenda-' + prenda + (quita ? '-quita' : '')
const aparienciaPorEscena = new WeakMap()

// Paso 2: revisa el manifiesto contra el molde y pide su hoja. Devuelve los
// datos revisados, que la carga necesita para registrar las animaciones.
// «apariencia» es el cuy que armó el niño ({ pelaje, prendas }, datos/aparienciaCuy.js) o null.
export function prepararProtagonista(escena, protagonista, apariencia = null) {
  const datos = validarMolde(escena.cache.json.get(CLAVE_MANIFIESTO_PROTAGONISTA), protagonista.id)
  if (!apariencia) {
    pedirHojaPersonaje(escena, datos, CLAVE_PROTAGONISTA)
    return datos
  }
  aparienciaPorEscena.set(escena, apariencia)
  pedirHojaPersonaje(escena, datos, CLAVE_BASE)
  for (const prenda of apariencia.prendas) {
    const { archivo } = PRENDAS_CUY[prenda]
    escena.load.image(clavePrenda(prenda), CARPETA_PRENDAS + archivo + '.png')
    escena.load.image(clavePrenda(prenda, true), CARPETA_PRENDAS + archivo + '-quita.png')
  }
  return datos
}

// Paso 3, con la hoja ya descargada: crea sus animaciones con claves neutrales
// («protagonista:frente:caminar»). Al cuy del niño antes le pone sus prendas y su pelaje.
export function registrarProtagonista(escena, datos) {
  const apariencia = aparienciaPorEscena.get(escena)
  if (apariencia) vestirProtagonista(escena, datos, apariencia)
  registrarAnimacionesPersonaje(escena, datos, CLAVE_PROTAGONISTA)
}

// Junta en un lienzo la hoja base, lo que tapa cada prenda (se borra), cada prenda encima (en el orden de sus
// capas: ropa, lentes, cabeza) y el color del pelaje. El resultado queda con la clave de siempre y los mismos
// cuadros que una hoja cargada, así que ningún juego nota la diferencia.
function vestirProtagonista(escena, datos, apariencia) {
  const base = escena.textures.get(CLAVE_BASE).getSourceImage()
  if (escena.textures.exists(CLAVE_PROTAGONISTA)) escena.textures.remove(CLAVE_PROTAGONISTA)
  const textura = escena.textures.createCanvas(CLAVE_PROTAGONISTA, base.width, base.height)
  const lienzo = textura.getContext()
  lienzo.drawImage(base, 0, 0)
  const prendas = apariencia.prendas.filter((prenda) => {
    const llego = escena.textures.exists(clavePrenda(prenda)) && escena.textures.exists(clavePrenda(prenda, true))
    if (!llego) console.warn('[protagonista] No llegó el dibujo de la prenda «' + prenda + '»: el cuy sale sin ella.')
    return llego
  })
  lienzo.globalCompositeOperation = 'destination-out'
  for (const prenda of prendas) lienzo.drawImage(escena.textures.get(clavePrenda(prenda, true)).getSourceImage(), 0, 0)
  lienzo.globalCompositeOperation = 'source-over'
  for (const prenda of prendas) lienzo.drawImage(escena.textures.get(clavePrenda(prenda)).getSourceImage(), 0, 0)
  if (apariencia.pelaje !== 'cafe') {
    const imagen = lienzo.getImageData(0, 0, base.width, base.height)
    teñirPelaje(imagen.data, apariencia.pelaje)
    lienzo.putImageData(imagen, 0, 0)
  }
  const { ancho, alto } = datos.fotograma
  let cuadro = 0
  for (let fila = 0; fila < datos.cuadricula.filas; fila += 1) {
    for (let columna = 0; columna < datos.cuadricula.columnas; columna += 1) {
      textura.add(cuadro, 0, columna * ancho, fila * alto, ancho, alto)
      cuadro += 1
    }
  }
  textura.refresh()
  console.info('[protagonista] El cuy del niño: pelaje ' + apariencia.pelaje + (prendas.length ? ', con ' + prendas.join(', ') : '') + '.')
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
