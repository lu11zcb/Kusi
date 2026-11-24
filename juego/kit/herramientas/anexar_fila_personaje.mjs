import { guardarPng, leerRgba } from './animaciones/png_rgba.mjs'

const [rutaHoja, rutaFila, rutaSalida] = process.argv.slice(2)
if (!rutaHoja || !rutaFila || !rutaSalida) {
  throw new Error('Uso: node kit/herramientas/anexar_fila_personaje.mjs <hoja.png> <fila.png> <salida.png>')
}

const lado = 256
const ancho = 3 * lado
const hoja = leerRgba(rutaHoja)
const fila = leerRgba(rutaFila)
if (hoja.ancho !== ancho || hoja.alto % lado !== 0 || fila.ancho !== ancho || fila.alto !== lado) {
  throw new Error('La hoja debe tener tres columnas de 256 px y la tira debe medir 768 × 256 px')
}

// La tira ocupa todo el ancho. Anexar su bloque RGBA conserva cada píxel
// existente, incluso los transparentes, y mantiene los índices anteriores.
guardarPng(rutaSalida, {
  ancho,
  alto: hoja.alto + fila.alto,
  datos: Buffer.concat([hoja.datos, fila.datos]),
})
