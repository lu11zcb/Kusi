import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFile, mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { aligerarCarpeta, aligerarPieza } from '../../kit/herramientas/aligerar_pieza.mjs'
import { leerPng } from '../../kit/herramientas/comprobar_pieza.mjs'

// Un dibujo de prueba con colores variados y un borde transparente, como una pieza real.
async function dibujoDePrueba(archivo, ancho = 320, alto = 180) {
  const pixeles = Buffer.alloc(ancho * alto * 4)
  for (let y = 0; y < alto; y++) for (let x = 0; x < ancho; x++) {
    const i = (y * ancho + x) * 4
    pixeles[i] = (x * 7) & 255; pixeles[i + 1] = (y * 5) & 255; pixeles[i + 2] = ((x + y) * 3) & 255
    pixeles[i + 3] = x < 10 ? 0 : 255
  }
  await sharp(pixeles, { raw: { width: ancho, height: alto, channels: 4 } }).png({ compressionLevel: 0 }).toFile(archivo)
}

test('una pieza aligerada pesa menos, conserva su tamaño y el kit la sigue leyendo', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-aligerar-'))
  try {
    const pieza = path.join(carpeta, 'fondo-plaza.png')
    await dibujoDePrueba(pieza)
    const resultado = await aligerarPieza(pieza)
    assert.equal(resultado.cambio, true)
    assert.ok(resultado.despues < resultado.antes)
    const imagen = leerPng(await readFile(pieza))
    assert.equal(imagen.ancho, 320)
    assert.equal(imagen.alto, 180)
    assert.ok(imagen.pixeles, 'el lector del kit entiende el PNG con paleta')
    // Aligerar otra vez no la toca: ya tiene paleta.
    assert.equal((await aligerarPieza(pieza)).cambio, false)
    // El borde transparente sigue transparente y el resto, visible.
    assert.equal(imagen.pixeles[3], 0)
    assert.equal(imagen.pixeles[(20 * 320 + 100) * 4 + 3], 255)
  } finally { await rm(carpeta, { recursive: true, force: true }) }
})

test('las figuras enteras (cuadradas) no se tocan, las tiras figura-* sí, y una carpeta no entra a «origen»', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-aligerar-'))
  try {
    const figura = path.join(carpeta, 'figura-inti.png')
    await dibujoDePrueba(figura, 200, 200)
    const peso = (await stat(figura)).size
    await dibujoDePrueba(path.join(carpeta, 'figura-inti-baila.png'), 600, 200)
    await copyFile(figura, path.join(carpeta, 'tambor.png'))
    const resultados = await aligerarCarpeta(carpeta)
    assert.equal(resultados.length, 3)
    assert.equal((await stat(figura)).size, peso)
    assert.equal(resultados.find((r) => r.archivo.endsWith('figura-inti-baila.png')).cambio, true)
    assert.equal(resultados.find((r) => r.archivo.endsWith('tambor.png')).cambio, true)
  } finally { await rm(carpeta, { recursive: true, force: true }) }
})
