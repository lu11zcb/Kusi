// Separa el atlas ilustrado en cuatro tiras con cuatro cuadros cada una.
// Solo recorta y centra el alfa; no inventa poses ni deforma las ilustraciones.
// Ejecutar desde juego: node herramientas/preparar_fondo_cenital.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { leerPng } from '../pruebas/ayudas/png.js'

const origen = new URL('../arte/fondo-cenital-v1/origen/vegetacion-4x4.png', import.meta.url)
const destino = new URL('../public/dibujos/cenital-v1/', import.meta.url)
const normalizado = new URL('../arte/fondo-cenital-v1/origen/vegetacion-1280.png', import.meta.url)
execFileSync('sips', ['-z', '1280', '1280', fileURLToPath(origen), '--out', fileURLToPath(normalizado)])
const atlas = leerPng(normalizado), lado = atlas.ancho / 4
if (atlas.ancho !== atlas.alto || !Number.isInteger(lado)) throw new Error('El atlas debe tener cuatro filas y cuatro columnas cuadradas.')
mkdirSync(destino, { recursive: true })

function crc32(datos) {
  let valor = 0xffffffff
  for (const byte of datos) {
    valor ^= byte
    for (let bit = 0; bit < 8; bit++) valor = (valor >>> 1) ^ (valor & 1 ? 0xedb88320 : 0)
  }
  return (valor ^ 0xffffffff) >>> 0
}
function bloque(tipo, datos) {
  const nombre = Buffer.from(tipo), largo = Buffer.alloc(4), crc = Buffer.alloc(4)
  largo.writeUInt32BE(datos.length); crc.writeUInt32BE(crc32(Buffer.concat([nombre, datos])))
  return Buffer.concat([largo, nombre, datos, crc])
}
function png(ancho, alto, pixeles) {
  const cabecera = Buffer.alloc(13)
  cabecera.writeUInt32BE(ancho); cabecera.writeUInt32BE(alto, 4); cabecera[8] = 8; cabecera[9] = 6
  const filas = Buffer.alloc((ancho * 4 + 1) * alto)
  for (let y = 0; y < alto; y++) pixeles.copy(filas, y * (ancho * 4 + 1) + 1, y * ancho * 4, (y + 1) * ancho * 4)
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), bloque('IHDR', cabecera), bloque('IDAT', deflateSync(filas, { level: 9 })), bloque('IEND', Buffer.alloc(0))])
}

const nombres = ['pasto', 'arbusto', 'margaritas', 'flores']
for (const [fila, nombre] of nombres.entries()) {
  const pixeles = Buffer.alloc(lado * 4 * lado * 4)
  for (let cuadro = 0; cuadro < 4; cuadro++) {
    let minX = lado, maxX = -1, minY = lado, maxY = -1
    for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
      if (atlas.pixel(cuadro * lado + x, fila * lado + y)[3] < 24) continue
      minX = Math.min(minX, x); maxX = Math.max(maxX, x)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y)
    }
    if (maxX < 0) throw new Error('Hay un cuadro vacío en ' + nombre)
    const dx = Math.round(lado / 2 - (minX + maxX) / 2)
    const dy = fila === 0 ? lado - 32 - maxY : Math.round(lado / 2 - (minY + maxY) / 2)
    for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
      const px = x + dx, py = y + dy
      if (px < 0 || px >= lado || py < 0 || py >= lado) continue
      pixeles.set(atlas.pixel(cuadro * lado + x, fila * lado + y), (py * lado * 4 + cuadro * lado + px) * 4)
    }
  }
  writeFileSync(new URL(nombre + '.png', destino), png(lado * 4, lado, pixeles))
  console.log(nombre + ': ' + lado * 4 + ' × ' + lado + ', 4 cuadros RGBA')
}
