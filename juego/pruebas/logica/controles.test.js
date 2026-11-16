import test from 'node:test'
import assert from 'node:assert/strict'
import { vectorDeJoystick, combinarEntradas, vectorDeTeclas, moverLibre, vistaDelMovimiento } from '../../kit/reproductor/logica/controles.js'

test('el joystick no mueve nada dentro de la zona muerta y llega a 1 en el borde', () => {
  assert.deepEqual(vectorDeJoystick(3, 2, 60), { x: 0, y: 0 })
  const casi = vectorDeJoystick(60, 0, 60)
  assert.equal(casi.x, 1)
  assert.equal(casi.y, 0)
  const lejos = vectorDeJoystick(0, 600, 60)
  assert.equal(lejos.y, 1)
  const medio = vectorDeJoystick(30, 0, 60)
  assert.ok(medio.x > 0 && medio.x < 1)
  assert.deepEqual(vectorDeJoystick(NaN, 0, 60), { x: 0, y: 0 })
  assert.deepEqual(vectorDeJoystick(10, 10, 0), { x: 0, y: 0 })
})

test('el teclado y el joystick se unen y gana el que empuja más', () => {
  assert.deepEqual(vectorDeTeclas({ derecha: true, arriba: true }), { x: 1, y: -1 })
  assert.deepEqual(vectorDeTeclas({ izquierda: true, derecha: true }), { x: 0, y: 0 })
  assert.deepEqual(combinarEntradas({ x: 0.3, y: 0 }, { x: -1, y: 0.5 }), { x: -1, y: 0.5 })
})

test('mover libre respeta los límites y no corre más en diagonal', () => {
  const recto = moverLibre({ x: 0, y: 0 }, { x: 1, y: 0 }, 100, 1)
  const diagonal = moverLibre({ x: 0, y: 0 }, { x: 1, y: 1 }, 100, 1)
  assert.equal(recto.x, 100)
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 100) < 1e-9)
  assert.deepEqual(moverLibre({ x: 95, y: 5 }, { x: 1, y: -1 }, 100, 1, { izquierda: 0, derecha: 100, arriba: 0, abajo: 50 }), { x: 100, y: 0 })
})

test('la vista del personaje usa los nombres del molde y conserva la de antes si no se mueve', () => {
  assert.equal(vistaDelMovimiento(5, 1), 'derecha')
  assert.equal(vistaDelMovimiento(-5, 1), 'izquierda')
  assert.equal(vistaDelMovimiento(1, 5), 'frente')
  assert.equal(vistaDelMovimiento(1, -5), 'espaldas')
  assert.equal(vistaDelMovimiento(0, 0, 'espaldas'), 'espaldas')
  assert.equal(vistaDelMovimiento(0, 0), 'frente')
})
