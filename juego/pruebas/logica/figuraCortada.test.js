import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { deflateSync } from 'node:zlib'
import { revisarPartes, marcosDeFigura, desplazamientoDeParte } from '../../kit/reproductor/logica/partesDeFigura.js'
import { analizarFigura, coberturaDePartes } from '../../kit/herramientas/analizar_figura.mjs'

const PARTES = {
  cabeza: { x: 0.25, y: 0, ancho: 0.5, alto: 0.25 },
  cuerpo: { x: 0.25, y: 0.25, ancho: 0.5, alto: 0.75 },
}

test('los rectángulos de las partes se revisan y se pasan a píxeles', () => {
  assert.deepEqual(revisarPartes(PARTES), [])
  assert.deepEqual(marcosDeFigura(PARTES, 768).map((marco) => [marco.nombre, marco.x, marco.y, marco.ancho, marco.alto]),
    [['cabeza', 192, 0, 384, 192], ['cuerpo', 192, 192, 384, 576]])
  assert.match(revisarPartes({ solo: { x: 0, y: 0, ancho: 1, alto: 1 } })[0], /al menos 2 partes/)
  assert.match(revisarPartes({ ...PARTES, mala: { x: 0.8, y: 0, ancho: 0.5, alto: 0.2 } }).join(' '), /se sale de la imagen/)
  assert.match(revisarPartes({ ...PARTES, Mala: { x: 0, y: 0, ancho: 0.1, alto: 0.1 } }).join(' '), /minúsculas/)
  assert.throws(() => marcosDeFigura({ a: 1 }))
})

test('cada parte armada vuelve al lugar que tenía en la figura entera', () => {
  // La cabeza ocupa de y = 0 a 0,25: su centro está 0,375 (de 768) por encima del centro de la imagen.
  const { dx, dy } = desplazamientoDeParte(PARTES.cabeza, 1)
  assert.equal(dx, 0)
  assert.equal(dy, (0.125 * 768) - 384)
  // A media escala, lo mismo a la mitad.
  assert.equal(desplazamientoDeParte(PARTES.cabeza, 0.5).dy, dy / 2)
})

// Un PNG de mentira de 40 × 40: un cuadrado opaco de 10 a 29, con un «cuello» angosto.
async function pngDePrueba() {
  const lado = 40
  const bruto = Buffer.alloc((lado * 4 + 1) * lado)
  for (let y = 0; y < lado; y++) {
    bruto[y * (lado * 4 + 1)] = 0
    for (let x = 0; x < lado; x++) {
      const dentro = y >= 5 && y < 35 && ((y < 15 && x >= 10 && x < 30) || (y >= 15 && y < 20 && x >= 18 && x < 22) || (y >= 20 && x >= 8 && x < 32))
      if (dentro) bruto.set([200, 100, 50, 255], y * (lado * 4 + 1) + 1 + x * 4)
    }
  }
  const crc = (buffer) => { let c, tabla = [], r = 0xffffffff
    for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; tabla[n] = c >>> 0 }
    for (const byte of buffer) r = tabla[(r ^ byte) & 255] ^ (r >>> 8)
    return (r ^ 0xffffffff) >>> 0 }
  const trozo = (tipo, datos) => { const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length)
    const cuerpo = Buffer.concat([Buffer.from(tipo, 'latin1'), datos]); const suma = Buffer.alloc(4); suma.writeUInt32BE(crc(cuerpo))
    return Buffer.concat([largo, cuerpo, suma]) }
  const cabecera = Buffer.alloc(13); cabecera.writeUInt32BE(lado, 0); cabecera.writeUInt32BE(lado, 4); cabecera[8] = 8; cabecera[9] = 6
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), trozo('IHDR', cabecera), trozo('IDAT', deflateSync(bruto)), trozo('IEND', Buffer.alloc(0))])
}

test('el perfil de la figura muestra el cuello y la cobertura dice si los cortes pierden algo', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-figura-'))
  const archivo = path.join(carpeta, 'figura.png')
  await writeFile(archivo, await pngDePrueba())
  const perfil = analizarFigura(archivo, { banda: 5 })
  assert.deepEqual(perfil.caja, { x: 0.2, y: 0.125, ancho: 0.6, alto: 0.75 })
  const cuello = perfil.bandas.find((banda) => banda.y === 0.375)
  assert.deepEqual(cuello.tramos, [[0.45, 0.55]])
  // Dos cortes que cubren todo, sin repetir nada.
  const bien = coberturaDePartes(archivo, { cabeza: { x: 0, y: 0, ancho: 1, alto: 0.5 }, cuerpo: { x: 0, y: 0.5, ancho: 1, alto: 0.5 } })
  assert.equal(bien.sinCubrir, 0)
  assert.equal(bien.repetido, 0)
  // Un corte que se queda corto pierde figura; uno que se pasa la repite.
  assert.ok(coberturaDePartes(archivo, { a: { x: 0, y: 0, ancho: 1, alto: 0.3 }, b: { x: 0, y: 0.6, ancho: 1, alto: 0.4 } }).sinCubrir > 0.1)
  assert.ok(coberturaDePartes(archivo, { a: { x: 0, y: 0, ancho: 1, alto: 0.6 }, b: { x: 0, y: 0.4, ancho: 1, alto: 0.6 } }).repetido > 0.1)
  await rm(carpeta, { recursive: true })
})
