// Lector mínimo de PNG RGBA de 8 bits para comprobar el arte real sin Chrome,
// Canvas ni paquetes nativos. Reconstruye los cinco filtros definidos por PNG.
import { readFileSync } from 'node:fs'
import { inflateSync } from 'node:zlib'

export function leerPng(ruta) {
  const archivo = readFileSync(ruta)
  const ancho = archivo.readUInt32BE(16), alto = archivo.readUInt32BE(20)
  if (archivo[24] !== 8 || archivo[25] !== 6 || archivo[28] !== 0) throw new Error('Se esperaba PNG RGBA sin entrelazado.')
  const partes = []
  for (let p = 8; p < archivo.length;) {
    const cantidad = archivo.readUInt32BE(p)
    if (archivo.toString('ascii', p + 4, p + 8) === 'IDAT') partes.push(archivo.subarray(p + 8, p + 8 + cantidad))
    p += cantidad + 12
  }
  const datos = inflateSync(Buffer.concat(partes)), pixeles = Buffer.alloc(ancho * alto * 4)
  const fila = ancho * 4
  let entrada = 0
  for (let y = 0; y < alto; y += 1) {
    const filtro = datos[entrada++]
    for (let x = 0; x < fila; x += 1) {
      const i = y * fila + x
      const a = x >= 4 ? pixeles[i - 4] : 0
      const b = y > 0 ? pixeles[i - fila] : 0
      const c = y > 0 && x >= 4 ? pixeles[i - fila - 4] : 0
      const p = a + b - c
      const predictor = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c)
        ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c
      const suma = [0, a, b, Math.floor((a + b) / 2), predictor][filtro]
      if (suma === undefined) throw new Error('Filtro PNG desconocido.')
      pixeles[i] = (datos[entrada++] + suma) & 255
    }
  }
  return { ancho, alto, pixel: (x, y) => Array.from(pixeles.subarray((y * ancho + x) * 4, (y * ancho + x + 1) * 4)) }
}
