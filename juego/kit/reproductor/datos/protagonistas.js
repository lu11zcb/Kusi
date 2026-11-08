import { DIRECCIONES_PERSONAJE, validarSpritePersonaje } from './validarSpritePersonaje.js'

// Los protagonistas que el reproductor le puede dar a un juego. Un juego nunca
// nombra al cuy: pide «el protagonista» y recibe el que corresponda. Hoy solo
// existe el cuy; las opciones que elegirá el niño se dibujan sobre este mismo
// molde (ver kit/estilo/molde-personaje.md), así que ningún juego cambia cuando
// lleguen. La lista vive en código para que el juego y las pruebas la lean igual;
// kit/catalogo.json la repite para quien solo lee el catálogo, y una prueba
// revisa que las dos digan lo mismo.

export const PROTAGONISTA_POR_OMISION = 'cuy'

export const PROTAGONISTAS = Object.freeze([
  Object.freeze({
    id: 'cuy',
    nombre: 'Cuy',
    // «?v=9» renueva el manifiesto guardado por el navegador cuando cambia la hoja.
    manifiesto: 'dibujos/personajes/cuy.json?v=9',
    // Los sonidos son los del catálogo: el paso y el quejido cuando lo atrapan.
    sonidos: Object.freeze({ paso: 'paso_cuy', quejido: 'captura' }),
  }),
])

// Las medidas del molde. Todas las opciones usan la misma hoja de 3 × 6 celdas
// de 256 px, con los pies en (128, 244), para que un juego no tenga que saber
// qué personaje está dibujando.
export const MEDIDAS_MOLDE = Object.freeze({
  fotograma: Object.freeze({ ancho: 256, alto: 256 }),
  cuadricula: Object.freeze({ columnas: 3, filas: 6 }),
  anclaje: Object.freeze({ x: 128, y: 244 }),
})

// Los estados que todo protagonista debe tener en cada vista. Son los que usan
// los juegos: caminar en las cuatro direcciones, alegrarse al acertar, asustarse
// cuando lo atrapan y parpadear mientras espera de frente.
export const ESTADOS_MOLDE = Object.freeze({
  frente: Object.freeze(['reposo', 'quieto', 'caminar', 'feliz', 'asustado', 'parpadeo']),
  espaldas: Object.freeze(['reposo', 'quieto', 'caminar', 'caminar_espalda']),
  derecha: Object.freeze(['reposo', 'quieto', 'caminar', 'caminar_lado']),
  izquierda: Object.freeze(['reposo', 'quieto', 'caminar', 'caminar_lado']),
})

// Elige el protagonista pedido. Un pedido vacío da el de siempre. Un pedido que
// no existe también da el de siempre, junto con un aviso para la consola: el niño
// nunca ve un error por esto, y el juego se abre igual.
export function elegirProtagonista(pedido, lista = PROTAGONISTAS) {
  const porOmision = lista.find((protagonista) => protagonista.id === PROTAGONISTA_POR_OMISION)
  if (pedido === null || pedido === undefined || String(pedido).trim() === '') {
    return { protagonista: porOmision, aviso: null }
  }
  const encontrado = lista.find((protagonista) => protagonista.id === String(pedido).trim())
  if (encontrado) return { protagonista: encontrado, aviso: null }
  return {
    protagonista: porOmision,
    aviso: 'El protagonista «' + String(pedido).trim() + '» no existe; se usa «' + porOmision.id + '».',
  }
}

// Revisa que un manifiesto cumpla el molde completo. Primero pasa el contrato
// común de las hojas (validarSpritePersonaje), que solo exige reposo y caminar;
// después exige las medidas y todos los estados del molde. Así un protagonista
// al que le falte «feliz» se rechaza al cargar, en vez de quedarse quieto en
// silencio cuando el niño acierta.
export function validarMolde(datos, id = 'protagonista') {
  const nombre = 'protagonista ' + id
  validarSpritePersonaje(datos, nombre)
  const exigir = (condicion, mensaje) => {
    if (!condicion) throw new Error('[' + nombre + '] ' + mensaje)
  }
  const { fotograma, cuadricula, anclaje } = MEDIDAS_MOLDE
  exigir(datos.fotograma.ancho === fotograma.ancho && datos.fotograma.alto === fotograma.alto,
    'Cada celda del molde mide ' + fotograma.ancho + ' × ' + fotograma.alto)
  exigir(datos.cuadricula.columnas === cuadricula.columnas && datos.cuadricula.filas === cuadricula.filas,
    'La hoja del molde tiene ' + cuadricula.columnas + ' columnas y ' + cuadricula.filas + ' filas')
  exigir(datos.anclaje.x === anclaje.x && datos.anclaje.y === anclaje.y,
    'Los pies del molde están en (' + anclaje.x + ', ' + anclaje.y + ')')
  for (const direccion of DIRECCIONES_PERSONAJE) {
    for (const estado of ESTADOS_MOLDE[direccion]) {
      exigir(datos.animaciones[direccion][estado] != null, 'Falta el estado ' + direccion + '/' + estado)
    }
  }
  return datos
}
