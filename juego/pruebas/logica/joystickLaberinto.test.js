import test from 'node:test'
import assert from 'node:assert/strict'
import { leerGestoJoystick } from '../../juegos/laberinto/logica/joystickLaberinto.js'
import { crearMovimiento, pedirDireccion, avanzarMovimiento, detenerEnCentro } from '../../juegos/laberinto/logica/movimientoLaberinto.js'

const INICIO = { x: 100, y: 100 }
const MAPA = ['#######', '#C....#', '####.##', '####P##', '#######']

test('el joystick respeta 18 px de zona muerta y elige el eje dominante', () => {
  assert.equal(leerGestoJoystick(INICIO, { x: 117, y: 100 }).direccion, null)
  for (const [x, y, direccion] of [[118, 100, 'derecha'], [60, 110, 'izquierda'],
    [120, 150, 'abajo'], [110, 50, 'arriba'], [130, 130, 'derecha']]) {
    assert.equal(leerGestoJoystick(INICIO, { x, y }).direccion, direccion)
  }
  assert.deepEqual(leerGestoJoystick(INICIO, { x: NaN, y: 5 }), { direccion: null, x: 0, y: 0 })
})

test('la perilla nunca sale de la base aunque el dedo se aleje mucho', () => {
  const gesto = leerGestoJoystick(INICIO, { x: 1000, y: 1000 })
  assert.ok(Math.abs(Math.hypot(gesto.x, gesto.y) - 33) < 0.000001)
})

test('soltar entre centros termina solo el tramo actual y borra el giro pendiente', () => {
  const estado = crearMovimiento(MAPA)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, MAPA, 0.1)
  pedirDireccion(estado, 'abajo')
  detenerEnCentro(estado)
  avanzarMovimiento(estado, MAPA, 10)
  assert.deepEqual([estado.fila, estado.columna, estado.progreso, estado.moviendose], [1, 2, 0, false])
  assert.equal(estado.direccionPendiente, null)
  avanzarMovimiento(estado, MAPA, 10)
  assert.equal(estado.columna, 2)
})

test('soltar en el centro no da un paso más y una flecha posterior reanuda', () => {
  const estado = crearMovimiento(MAPA)
  pedirDireccion(estado, 'derecha')
  detenerEnCentro(estado)
  avanzarMovimiento(estado, MAPA, 10)
  assert.equal(estado.columna, 1)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, MAPA, 1 / 3)
  assert.equal(estado.columna, 2)
})

test('mantener el rumbo permite guardar un giro hasta la próxima esquina', () => {
  const estado = crearMovimiento(MAPA)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, MAPA, 0.1)
  pedirDireccion(estado, 'abajo')
  avanzarMovimiento(estado, MAPA, 1.1)
  assert.equal(estado.columna, 4)
  assert.equal(estado.direccion, 'abajo')
})
