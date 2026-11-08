// Arma la lámina de piezas modelo de la guía de estilo: celdas de 256 × 256 a
// tamaño real, sobre el papel crema del juego. No redibuja nada: solo compone
// las piezas aprobadas del kit para que el dibujante y el revisor las comparen.
// Desde juego/: node kit/herramientas/armar_lamina.mjs
import { leerPng } from '../../pruebas/ayudas/png.js'
import { guardarPng } from './animaciones/png_rgba.mjs'

const dibujos = new URL('../recursos/dibujos/', import.meta.url)
const salida = new URL('../estilo/lamina-modelos.png', import.meta.url)

// Cada celda es un archivo o [archivo, columna, fila] cuando la pieza es un
// cuadro de una hoja. Fila 1: frutas. Fila 2: verduras, portal y un botón.
// Fila 3: los personajes de frente, el muro y el suelo.
const FILAS = [
  ['objetos/fresa.png', 'objetos/platano.png', 'objetos/mango.png', 'objetos/mandarina.png', 'objetos/pina.png'],
  ['objetos/zanahoria.png', 'objetos/papa.png', 'objetos/choclo.png', 'mundo/portal-cerrado.png', 'interfaz/boton-voz.png'],
  [['personajes/cuy.png', 1, 0], ['personajes/zorro.png', 1, 0], ['personajes/kusi.png', 0, 3],
    'mundo/muro-a.png', ['mundo/tierra-patio.png', 0, 0]],
]
const CELDA = 256
const MEDIANIL = 16
const PAPEL = [0xff, 0xf7, 0xe8]

const columnas = Math.max(...FILAS.map((fila) => fila.length))
const ancho = columnas * CELDA + (columnas + 1) * MEDIANIL
const alto = FILAS.length * CELDA + (FILAS.length + 1) * MEDIANIL
const datos = Buffer.alloc(ancho * alto * 4)
for (let i = 0; i < ancho * alto; i++) datos.set([...PAPEL, 255], i * 4)

FILAS.forEach((fila, f) => fila.forEach((celda, c) => {
  const [archivo, cx, cy] = typeof celda === 'string' ? [celda, 0, 0] : celda
  const imagen = leerPng(new URL(archivo, dibujos))
  // Un botón de 128 se centra en su celda; lo demás la ocupa entera.
  const lado = Math.min(CELDA, imagen.ancho, imagen.alto)
  const x0 = MEDIANIL + c * (CELDA + MEDIANIL) + (CELDA - lado) / 2
  const y0 = MEDIANIL + f * (CELDA + MEDIANIL) + (CELDA - lado) / 2
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    // Se mezcla con el papel según la transparencia de cada píxel.
    const [r, g, b, a] = imagen.pixel(cx * CELDA + x, cy * CELDA + y)
    const i = ((y0 + y) * ancho + x0 + x) * 4
    const opacidad = a / 255
    datos[i] = Math.round(r * opacidad + datos[i] * (1 - opacidad))
    datos[i + 1] = Math.round(g * opacidad + datos[i + 1] * (1 - opacidad))
    datos[i + 2] = Math.round(b * opacidad + datos[i + 2] * (1 - opacidad))
  }
}))

guardarPng(salida, { ancho, alto, datos })
console.log('Lámina de ' + ancho + ' × ' + alto + ' guardada en kit/estilo/lamina-modelos.png')
