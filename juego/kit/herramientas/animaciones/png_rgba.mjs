// Recorte y escritura sin pérdida para preparar atlas ilustrados RGBA.
import { writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { leerPng } from '../../../pruebas/ayudas/png.js'

export function leerRgba(ruta) {
  const im = leerPng(ruta), datos = Buffer.alloc(im.ancho * im.alto * 4)
  for (let y = 0; y < im.alto; y++) for (let x = 0; x < im.ancho; x++) datos.set(im.pixel(x, y), (y * im.ancho + x) * 4)
  return { ancho: im.ancho, alto: im.alto, datos }
}
export function recortar(im, x, y, ancho, alto) {
  if (![x,y,ancho,alto].every(Number.isInteger) || x < 0 || y < 0 || x + ancho > im.ancho || y + alto > im.alto) throw new Error('Recorte fuera de la imagen')
  const datos = Buffer.alloc(ancho * alto * 4)
  for (let fila = 0; fila < alto; fila++) im.datos.copy(datos, fila * ancho * 4,
    ((y + fila) * im.ancho + x) * 4, ((y + fila) * im.ancho + x + ancho) * 4)
  return { ancho, alto, datos }
}
export function medirSilueta(im, umbral = 32) {
  let minX = im.ancho, minY = im.alto, maxX = -1, maxY = -1
  for (let y = 0; y < im.alto; y++) for (let x = 0; x < im.ancho; x++) {
    if (im.datos[(y * im.ancho + x) * 4 + 3] < umbral) continue
    minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
  }
  if (maxX < 0) throw new Error('Cuadro transparente')
  let cabezaMin = im.ancho, cabezaMax = -1
  const fin = minY + Math.round((maxY - minY + 1) * .42)
  for (let y = minY; y < fin; y++) for (let x = 0; x < im.ancho; x++) {
    if (im.datos[(y * im.ancho + x) * 4 + 3] >= umbral) {
      cabezaMin = Math.min(cabezaMin, x); cabezaMax = Math.max(cabezaMax, x)
    }
  }
  return { minX, minY, maxX, maxY, centroCabeza: (cabezaMin + cabezaMax) / 2 }
}
function crc32(datos) {
  let crc = 0xffffffff
  for (const byte of datos) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function bloque(tipo, datos) {
  const nombre = Buffer.from(tipo), largo = Buffer.alloc(4), crc = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length); crc.writeUInt32BE(crc32(Buffer.concat([nombre, datos])))
  return Buffer.concat([largo, nombre, datos, crc])
}
export function guardarPng(ruta, { ancho, alto, datos }) {
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(ancho); cabecera.writeUInt32BE(alto, 4); cabecera[8] = 8; cabecera[9] = 6
  const filas = Buffer.alloc((ancho * 4 + 1) * alto)
  for (let y = 0; y < alto; y++) datos.copy(filas, y * (ancho * 4 + 1) + 1, y * ancho * 4, (y + 1) * ancho * 4)
  writeFileSync(ruta, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), bloque('IHDR', cabecera),
    bloque('IDAT', deflateSync(filas, { level: 9 })), bloque('IEND', Buffer.alloc(0))]))
}
