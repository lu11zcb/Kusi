import test from 'node:test'
import assert from 'node:assert/strict'
import { emitirAlAnfitrion } from '../../src/logica/salidasPuente.js'
import { decir } from '../../src/logica/voz.js'
import { avisar } from '../../src/logica/avisos.js'

test('HU48: el mismo aviso viaja a la web y Android como texto JSON', () => {
  const web = [], android = []
  const ventana = { parent: { postMessage: (...datos) => web.push(datos) }, KusiPuente: { emitir: (texto) => android.push(texto) } }
  const mensaje = { tipo: 'aviso', aviso: { partida: 'prueba', orden: 2, tipo: 'ayuda' } }
  emitirAlAnfitrion(ventana, mensaje)
  assert.deepEqual(web, [[mensaje, '*']])
  assert.deepEqual(JSON.parse(android[0]), mensaje)
  ventana.parent.postMessage = () => { throw new Error('cerrado') }
  emitirAlAnfitrion(ventana, { tipo: 'listo' })
  assert.deepEqual(JSON.parse(android[1]), { tipo: 'listo' })
})
test('HU48: avisar conserva partida y orden y usa la voz nativa si está disponible', () => {
  const anterior = globalThis.window
  const mensajes = [], textos = []
  globalThis.window = { parent: { postMessage: (dato) => mensajes.push(dato) }, KusiPuente: { decir: (texto) => textos.push(texto) } }
  try {
    const aviso = avisar('inicio', { partida: 'prueba', orden: 1 })
    assert.deepEqual(mensajes[0], { tipo: 'aviso', aviso })
    assert.equal(decir('Mira el camino.'), true)
    assert.deepEqual(textos, ['Mira el camino.'])
  } finally { globalThis.window = anterior }
})

test('HU46: listo, cargado y error también llegan por el puente nativo', async () => {
  const { crearPuente } = await import('../../src/mensajes/puenteGuion.js')
  const textos = []
  const ventana = { parent: { postMessage() {} }, addEventListener() {}, removeEventListener() {}, KusiPuente: { emitir: (texto) => textos.push(JSON.parse(texto)) } }
  const puente = crearPuente(ventana)
  puente.conectar(() => {})
  puente.avisar({ tipo: 'cargado', niveles: 3 })
  puente.avisar({ tipo: 'error', motivo: 'Guion inválido' })
  assert.deepEqual(textos, [{ tipo: 'listo' }, { tipo: 'cargado', niveles: 3 }, { tipo: 'error', motivo: 'Guion inválido' }])
  puente.cerrar()
})
