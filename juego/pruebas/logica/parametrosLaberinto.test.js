import { test } from 'node:test'
import assert from 'node:assert/strict'
import { elegirRenderizador, nivelPedido } from '../../src/logica/parametrosLaberinto.js'

test('el laberinto dibuja con Canvas salvo que se pida ?renderizador=auto', () => {
  assert.equal(elegirRenderizador(''), 'canvas')
  assert.equal(elegirRenderizador('?paquete=laberinto'), 'canvas')
  assert.equal(elegirRenderizador('?paquete=laberinto&renderizador=canvas'), 'canvas')
  assert.equal(elegirRenderizador('?paquete=laberinto&renderizador=auto'), 'auto')
  assert.equal(elegirRenderizador('?renderizador=AUTO'), 'canvas')
  assert.equal(elegirRenderizador('?renderizador=webgl'), 'canvas')
  // Fuera de un navegador no hay dirección que leer.
  assert.equal(elegirRenderizador(), 'canvas')
})

test('?nivel=N abre el nivel N y cualquier valor dudoso abre el primero', () => {
  assert.equal(nivelPedido('', 3), 0)
  assert.equal(nivelPedido('?paquete=laberinto', 3), 0)
  assert.equal(nivelPedido('?nivel=1', 3), 0)
  assert.equal(nivelPedido('?nivel=2', 3), 1)
  assert.equal(nivelPedido('?paquete=laberinto&nivel=3&vida=0', 3), 2)
  for (const dudoso of ['0', '4', '-1', '1.5', 'dos', '', ' ', 'NaN', '2x']) {
    assert.equal(nivelPedido('?nivel=' + encodeURIComponent(dudoso), 3), 0, 'nivel=' + dudoso)
  }
})
