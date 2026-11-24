import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { FORMANTES, frecuenciaDeNota, planDeCanto } from '../../kit/reproductor/logica/canto.js'
import { crearCanto } from '../../kit/reproductor/efectos/canto.js'
import { guardarSilencio } from '../../kit/reproductor/efectos/silencio.js'

test('cada vocal tiene tres resonancias propias con el ancho de banda esperado', () => {
  const frecuencias = {
    a: [750, 1250, 2550], e: [480, 1950, 2600], i: [290, 2300, 3000],
    o: [500, 880, 2450], u: [320, 780, 2350],
  }
  for (const [vocal, esperadas] of Object.entries(frecuencias)) {
    const { filtros } = planDeCanto(vocal, { voz: 'grave' })
    assert.deepEqual(filtros.map(filtro => filtro.frecuencia), esperadas)
    assert.deepEqual(FORMANTES[vocal].map(formante => formante.ancho), [80, 100, 130])
    for (const [indice, filtro] of filtros.entries()) {
      assert.equal(filtro.q, filtro.frecuencia / FORMANTES[vocal][indice].ancho)
      assert.ok(filtro.ganancia > 0)
    }
  }
})

test('la voz aguda eleva el tono base y los formantes de la misma vocal', () => {
  const grave = planDeCanto('a', { voz: 'grave' })
  const media = planDeCanto('a', { voz: 'media' })
  const aguda = planDeCanto('a', { voz: 'aguda' })
  assert.deepEqual([grave.frecuencia, media.frecuencia, aguda.frecuencia], [196, 330, 523])
  assert.deepEqual(aguda.filtros.map(filtro => filtro.frecuencia), [937.5, 1562.5, 3187.5])
  assert.deepEqual(aguda.vibrato, { frecuencia: 5.5, profundidad: 0.015 })
})

test('el solfeo fija la nota pedida y las vocales desconocidas se omiten', () => {
  assert.equal(frecuenciaDeNota('la4'), 440)
  assert.equal(frecuenciaDeNota('la3'), 220)
  assert.ok(Math.abs(frecuenciaDeNota('do4') - 261.63) < 0.01)
  assert.ok(Math.abs(frecuenciaDeNota('mi4') - 329.63) < 0.01)
  assert.equal(frecuenciaDeNota('fa#4'), frecuenciaDeNota('solb4'))
  assert.equal(frecuenciaDeNota('sol'), null)
  assert.equal(planDeCanto(' A ', { voz: 'aguda', nota: 'sol3' }).frecuencia, frecuenciaDeNota('sol3'))
  assert.equal(planDeCanto('x'), null)
  assert.equal(planDeCanto('constructor'), null)
  assert.equal(planDeCanto(null), null)
})

test('la envolvente suaviza la entrada y la salida incluso en notas cortas', () => {
  assert.deepEqual(planDeCanto('a', { duracion: 0.9 }).envolvente, { duracion: 0.9, ataque: 0.08, caida: 0.2 })
  const { duracion, ataque, caida } = planDeCanto('a', { duracion: 0.1 }).envolvente
  assert.ok(ataque + caida < duracion)
  assert.equal(planDeCanto('a', { duracion: 0 }), null)
})

function escenaConAudio() {
  const nodos = []
  function nodo(clase) {
    const nuevo = {
      clase, conexiones: [], inicios: [], paradas: [],
      frequency: {}, Q: {},
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
      connect(destino) { this.conexiones.push(destino) },
      disconnect() { this.conexiones.length = 0 },
      start(tiempo) { this.inicios.push(tiempo) },
      stop(tiempo) { this.paradas.push(tiempo) },
    }
    nodos.push(nuevo)
    return nuevo
  }
  const contexto = {
    state: 'running', currentTime: 1, sampleRate: 48000,
    createBuffer: (canales, longitud) => ({ getChannelData: () => new Float32Array(longitud) }),
    createOscillator: () => nodo('oscilador'),
    createBiquadFilter: () => nodo('filtro'),
    createGain: () => nodo('ganancia'),
    createBufferSource: () => nodo('aire'),
  }
  const escena = { events: new EventEmitter(), sound: { context: contexto, destination: {} } }
  return { escena, nodos }
}

test('el audio conecta los tres formantes en paralelo y limpia la voz al terminar', () => {
  const { escena, nodos } = escenaConAudio()
  const canto = crearCanto(escena)
  assert.equal(canto.cantar('o', { duracion: 0.5 }), true)
  const tono = nodos.find(nodo => nodo.type === 'sawtooth')
  const formantes = nodos.filter(nodo => nodo.type === 'bandpass')
  const pasaBajos = nodos.find(nodo => nodo.type === 'lowpass')
  assert.equal(formantes.length, 3)
  assert.deepEqual(tono.conexiones[0].conexiones, formantes)
  assert.ok(formantes.every(nodo => nodo.conexiones[0].conexiones[0] === pasaBajos))
  assert.equal(pasaBajos.frequency.value, 4000)
  assert.equal(pasaBajos.conexiones[0].conexiones[0], escena.sound.destination)
  assert.deepEqual(tono.paradas, [1.5])
  tono.onended()
  assert.ok(nodos.every(nodo => nodo.conexiones.length === 0))
  canto.callar()
  assert.deepEqual(tono.paradas, [1.5])
})

test('el coro programa notas en orden y el cierre cancela también las futuras', () => {
  const { escena, nodos } = escenaConAudio()
  const canto = crearCanto(escena)
  assert.equal(canto.coro([{ vocal: 'a', duracion: 2 }, { vocal: 'x' }, { vocal: 'i' }], { tempo: 120 }), 2)
  const tonos = nodos.filter(nodo => nodo.type === 'sawtooth')
  assert.deepEqual(tonos.map(tono => tono.inicios), [[1], [2]])
  assert.deepEqual(tonos.map(tono => tono.paradas), [[2], [2.5]])
  escena.events.emit('shutdown')
  assert.ok(nodos.filter(nodo => nodo.inicios.length).every(nodo => nodo.paradas.at(-1) === undefined))
  assert.ok(nodos.every(nodo => nodo.conexiones.length === 0))
  assert.equal(escena.events.listenerCount('update'), 0)
  assert.equal(escena.events.listenerCount('destroy'), 0)
  assert.equal(canto.cantar('u'), false)
})

test('sin audio o con Sonido apagado no se programan notas y el silencio corta el coro', () => {
  assert.equal(crearCanto({}).cantar('a'), false)
  const { escena, nodos } = escenaConAudio()
  const canto = crearCanto(escena)
  try {
    escena.sound.locked = true
    assert.equal(canto.cantar('a'), false)
    escena.sound.locked = false
    guardarSilencio(true)
    assert.equal(canto.coro([{ vocal: 'a' }]), 0)
    assert.equal(nodos.length, 0)
    guardarSilencio(false)
    assert.equal(canto.coro([{ vocal: 'a' }, { vocal: 'e' }]), 2)
    guardarSilencio(true)
    escena.events.emit('update')
    assert.ok(nodos.every(nodo => nodo.conexiones.length === 0))
    assert.equal(canto.cantar('e'), false)
  } finally {
    canto.destruir()
    guardarSilencio(false)
  }
})
