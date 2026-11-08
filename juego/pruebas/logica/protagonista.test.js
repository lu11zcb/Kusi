import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import {
  PROTAGONISTAS, PROTAGONISTA_POR_OMISION, MEDIDAS_MOLDE, ESTADOS_MOLDE, elegirProtagonista, validarMolde,
} from '../../kit/reproductor/datos/protagonistas.js'

// El protagonista es el personaje que el reproductor le da a cada juego. Estas
// pruebas cuidan que la elección nunca deje al niño sin personaje y que todo
// protagonista cumpla el molde completo que usan los juegos.
const recursos = new URL('../../kit/recursos/', import.meta.url)
const leerJson = (ruta) => JSON.parse(readFileSync(new URL(ruta.split('?')[0], recursos), 'utf8'))
const copia = (datos) => structuredClone(datos)

test('sin pedido, o con un pedido que no existe, el protagonista es el cuy', () => {
  for (const pedido of [null, undefined, '', '   ']) {
    const { protagonista, aviso } = elegirProtagonista(pedido)
    assert.equal(protagonista.id, PROTAGONISTA_POR_OMISION)
    assert.equal(aviso, null)
  }
  assert.equal(elegirProtagonista('cuy').protagonista.id, 'cuy')
  const desconocido = elegirProtagonista('dragon')
  assert.equal(desconocido.protagonista.id, 'cuy')
  assert.match(desconocido.aviso, /«dragon» no existe/)
})

test('se elige el protagonista pedido cuando está en la lista', () => {
  const lista = [...PROTAGONISTAS, { id: 'llama', nombre: 'Llama', manifiesto: 'dibujos/llama.json' }]
  assert.equal(elegirProtagonista('llama', lista).protagonista.id, 'llama')
  assert.equal(elegirProtagonista(' llama ', lista).protagonista.id, 'llama')
})

test('cada protagonista de la lista cumple el molde completo y su hoja existe', () => {
  for (const protagonista of PROTAGONISTAS) {
    const datos = validarMolde(leerJson(protagonista.manifiesto), protagonista.id)
    assert.ok(existsSync(new URL('dibujos/personajes/' + datos.imagen, recursos)), 'falta la hoja de ' + protagonista.id)
    assert.ok(protagonista.sonidos.paso && protagonista.sonidos.quejido)
  }
})

test('el molde rechaza un manifiesto sin «feliz» de frente, aunque pase el contrato común', () => {
  const cuy = leerJson(PROTAGONISTAS[0].manifiesto)
  const sinFeliz = copia(cuy)
  delete sinFeliz.animaciones.frente.feliz
  assert.throws(() => validarMolde(sinFeliz, 'prueba'), /Falta el estado frente\/feliz/)
  const sinLado = copia(cuy)
  delete sinLado.animaciones.derecha.caminar_lado
  assert.throws(() => validarMolde(sinLado, 'prueba'), /Falta el estado derecha\/caminar_lado/)
})

test('el molde rechaza otra cuadrícula u otros pies: el zorro no sirve de protagonista', () => {
  const zorro = leerJson('dibujos/personajes/zorro.json?v=4')
  assert.throws(() => validarMolde(zorro, 'zorro'), /3 columnas y 6 filas/)
  const otrosPies = copia(leerJson(PROTAGONISTAS[0].manifiesto))
  otrosPies.anclaje = { x: 128, y: 240 }
  assert.throws(() => validarMolde(otrosPies, 'prueba'), /pies del molde/)
})

test('el catálogo del kit repite la misma lista de protagonistas y el mismo molde', () => {
  const catalogo = JSON.parse(readFileSync(new URL('../../kit/catalogo.json', import.meta.url), 'utf8'))
  assert.deepEqual(catalogo.protagonistas.map((protagonista) => protagonista.id), PROTAGONISTAS.map((protagonista) => protagonista.id))
  for (const protagonista of PROTAGONISTAS) {
    const entrada = catalogo.protagonistas.find((otro) => otro.id === protagonista.id)
    assert.equal(entrada.manifiesto, protagonista.manifiesto.split('?')[0])
    assert.equal(entrada.imagen, 'dibujos/personajes/' + leerJson(protagonista.manifiesto).imagen)
  }
  assert.equal(catalogo.protagonistas.filter((protagonista) => protagonista.por_omision).map((protagonista) => protagonista.id).join(), PROTAGONISTA_POR_OMISION)
  assert.deepEqual(catalogo.molde.fotograma, MEDIDAS_MOLDE.fotograma)
  assert.deepEqual(catalogo.molde.cuadricula, MEDIDAS_MOLDE.cuadricula)
  assert.deepEqual(catalogo.molde.anclaje, MEDIDAS_MOLDE.anclaje)
  assert.deepEqual(catalogo.molde.estados, JSON.parse(JSON.stringify(ESTADOS_MOLDE)))
})
