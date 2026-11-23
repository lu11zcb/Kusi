// El registro de juegos: decide qué juego abre un guion y dónde están sus archivos.
// Sin Phaser, para probarlo con node --test.
//
// - Un guion sin «trabajo» es de la biblioteca: hoy, el laberinto.
// - Un guion con «trabajo» es un juego que creó el taller. Su código está en
//   taller/trabajos/<trabajo>/juego/ y sus piezas nuevas en taller/trabajos/<trabajo>/piezas/.
//
// El id del trabajo llega de afuera (del guion o de la dirección), así que solo se acepta
// un UUID: con cualquier otra cosa («../../kit», una dirección) no se arma ninguna ruta.

export const FAMILIA_BIBLIOTECA = 'laberinto'
export const CARPETA_TRABAJOS = 'taller/trabajos/'
// Como lo escribe Spring: 8-4-4-4-12 dígitos hexadecimales en minúsculas.
export const PATRON_TRABAJO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
// Minúsculas sin tildes, con guion bajo, de 3 a 41 caracteres (la misma regla que Spring).
export const PATRON_FAMILIA = /^[a-z][a-z0-9_]{2,40}$/
// El nombre de una pieza es el de su archivo: minúsculas, sin tildes y con guiones.
export const PATRON_PIEZA = /^[a-z0-9]+(-[a-z0-9]+)*$/

export function esIdTrabajo(id) {
  return typeof id === 'string' && PATRON_TRABAJO.test(id)
}

function carpetaDelTrabajo(trabajo) {
  if (!esIdTrabajo(trabajo)) throw new Error('El trabajo «' + String(trabajo) + '» no es un id válido.')
  return CARPETA_TRABAJOS + trabajo + '/'
}

// Las rutas son relativas a la página del juego, igual que dibujos/ y sonidos/.
export const rutaFicha = (trabajo) => carpetaDelTrabajo(trabajo) + 'juego/juego.js'
export const rutaGuionEjemplo = (trabajo) => carpetaDelTrabajo(trabajo) + 'juego/guion-ejemplo.json'
export const rutaVoz = (trabajo) => carpetaDelTrabajo(trabajo) + 'voz/'
export function rutaPieza(trabajo, pieza) {
  if (typeof pieza !== 'string' || !PATRON_PIEZA.test(pieza)) {
    throw new Error('La pieza «' + String(pieza) + '» no tiene un nombre válido.')
  }
  return carpetaDelTrabajo(trabajo) + 'piezas/' + pieza + '.png'
}

// Cada trabajo abre su escena con una clave propia: dos juegos del taller pueden tener
// la misma familia sin pisarse dentro de la misma página.
export function claveEscena(trabajo) {
  carpetaDelTrabajo(trabajo) // revisa que sea un id válido
  return 'taller:' + trabajo
}

// ?juego=<trabajo> abre el guion de ejemplo de ese trabajo. Devuelve el id pedido (que
// la carga revisa con esIdTrabajo) o null si no se pidió ninguno.
export function trabajoPedido(busqueda) {
  const pedido = new URLSearchParams(busqueda).get('juego')
  return pedido === null || pedido === '' ? null : pedido
}

// Qué juego abre este guion: { taller: false } para la biblioteca o { taller: true, trabajo }.
// «pedido» es el id de ?juego=: si el guion no dice su trabajo, se usa ese; si dice
// otro, es un error (sería abrir el código de un juego con el guion de otro).
export function elegirJuego(paquete, pedido = null) {
  const declarado = paquete && typeof paquete === 'object' ? paquete.trabajo : undefined
  if (pedido === null && (declarado === undefined || declarado === null)) return { taller: false }
  const trabajo = declarado ?? pedido
  if (!esIdTrabajo(trabajo)) throw new Error('El trabajo «' + String(trabajo) + '» no es un id válido.')
  if (pedido !== null && trabajo !== pedido) {
    throw new Error('El guion es del trabajo ' + trabajo + ', no del ' + pedido + '.')
  }
  return { taller: true, trabajo }
}

// Revisa la ficha (juego.js, ver taller/entrega.md §3) contra el guion que se va a abrir.
// Devuelve { valido, errores }, igual que los validadores de los juegos.
export function revisarFicha(ficha, paquete) {
  const errores = []
  if (!ficha || typeof ficha !== 'object') {
    return { valido: false, errores: ['juego.js no exporta su ficha («export default { … }»).'] }
  }
  if (typeof ficha.familia !== 'string' || !PATRON_FAMILIA.test(ficha.familia)) {
    errores.push('La ficha necesita su «familia»: minúsculas sin tildes, números o guion bajo.')
  } else if (ficha.familia === FAMILIA_BIBLIOTECA) {
    errores.push('La familia «' + FAMILIA_BIBLIOTECA + '» ya es de la biblioteca.')
  } else if (!paquete || paquete.familia !== ficha.familia) {
    errores.push('El guion es de la familia «' + String(paquete?.familia) + '» y la ficha, de «' + ficha.familia + '».')
  }
  if (typeof ficha.nombre !== 'string' || ficha.nombre.trim() === '') errores.push('La ficha necesita su «nombre».')
  if (typeof ficha.escena !== 'function') errores.push('La ficha necesita su «escena»: la clase de Phaser del juego.')
  if (typeof ficha.validar !== 'function') errores.push('La ficha necesita «validar»: recibe el guion y devuelve { valido, errores }.')
  if (!Array.isArray(ficha.piezas)) {
    errores.push('La ficha necesita «piezas»: la lista de dibujos que usa (puede estar vacía).')
  } else {
    for (const pieza of ficha.piezas) {
      if (typeof pieza !== 'string' || !PATRON_PIEZA.test(pieza)) {
        errores.push('La pieza «' + String(pieza) + '» no tiene un nombre válido.')
      }
    }
  }
  return { valido: errores.length === 0, errores }
}

// Reparte las piezas de la ficha: las que ya están en el kit (los alimentos) y las que
// dibujó el taller para este trabajo. Una pieza repetida se pide una sola vez.
export function clasificarPiezas(piezas, objetosDelKit) {
  const delKit = []
  const delTrabajo = []
  for (const pieza of new Set(piezas)) {
    if (objetosDelKit.includes(pieza)) delKit.push(pieza)
    else delTrabajo.push(pieza)
  }
  return { delKit, delTrabajo }
}

// Pasa el resultado del validar de un juego a una lista de errores. Un validar que no
// devuelve { valido, errores } también es un error: el juego no se abre a ciegas.
export function erroresDelValidar(resultado) {
  if (!resultado || typeof resultado !== 'object' || typeof resultado.valido !== 'boolean') {
    return ['El validar del juego no devolvió { valido, errores }.']
  }
  if (resultado.valido) return []
  const errores = Array.isArray(resultado.errores) ? resultado.errores.map(String) : []
  return errores.length ? errores : ['El guion no pasó el validar del juego.']
}
