import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { SONIDOS_LABERINTO } from '../../src/efectos/SonidosLaberinto.js'

const PUBLICOS = new URL('../../public/sonidos/', import.meta.url)
const ORIGINALES = new URL('../../arte/sonidos/origen/', import.meta.url)
const leer = async (url) => (await readFile(url, 'utf8')).replace(/\r/g, '')
const existe = async (url) => access(url).then(() => true, () => false)

// Los sonidos son de Kenney y solo se pueden usar con su licencia a la vista:
// cada paquete conserva el texto original de CC0 junto a los archivos públicos.
const PAQUETES = [
  { licencia: 'LICENCIA-KENNEY-IMPACT.txt', original: 'kenney_impact-sounds/License.txt', nombre: 'Impact Sounds' },
  { licencia: 'LICENCIA-KENNEY-INTERFACE.txt', original: 'kenney_interface-sounds/License.txt', nombre: 'Interface Sounds' },
]

test('public/sonidos tiene los ocho archivos de audio que usa el controlador', async () => {
  const archivos = Object.values(SONIDOS_LABERINTO).map((sonido) => sonido.archivo)
  assert.equal(archivos.length, 8)
  for (const archivo of archivos) assert.equal(await existe(new URL(archivo, PUBLICOS)), true, archivo)
  const alerta = await readFile(new URL('zorro-alerta.wav', PUBLICOS))
  assert.equal(alerta.toString('ascii', 0, 4), 'RIFF')
  assert.equal(alerta.toString('ascii', 8, 12), 'WAVE')
})

test('cada paquete de Kenney conserva su licencia CC0, idéntica a la original', async () => {
  for (const { licencia, original, nombre } of PAQUETES) {
    const texto = await leer(new URL(licencia, PUBLICOS))
    assert.match(texto, /Kenney/, nombre + ' debe nombrar a Kenney')
    assert.match(texto, /Creative Commons Zero, CC0/, nombre + ' debe ser CC0')
    assert.match(texto, new RegExp(nombre + ' \\(1\\.0\\)'))
    assert.equal(texto, await leer(new URL(original, ORIGINALES)), nombre + ' no debe cambiar el texto original')
  }
})

test('ORIGEN.md da el crédito, la licencia y el origen de cada sonido', async () => {
  const origen = await leer(new URL('ORIGEN.md', PUBLICOS))
  assert.match(origen, /Kenney/)
  assert.match(origen, /CC0 1\.0/)
  for (const { licencia } of PAQUETES) assert.ok(origen.includes(licencia), 'menciona ' + licencia)
  for (const { archivo } of Object.values(SONIDOS_LABERINTO)) {
    assert.ok(origen.includes(archivo), 'ORIGEN.md debe describir ' + archivo)
  }
})
