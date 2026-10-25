import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  crearMovimiento,
  pedirDireccion,
  avanzarMovimiento,
  direccionDelDeslizamiento,
} from '../../src/logica/movimientoLaberinto.js'

const PASILLO = [
  '########',
  '#C....P#',
  '########',
]

test('el cuy empieza quieto en C y no avanza sin una dirección solicitada', () => {
  const estado = crearMovimiento(PASILLO)
  avanzarMovimiento(estado, PASILLO, 2)
  assert.deepEqual(estado, {
    fila: 1, columna: 1, direccion: 'abajo', direccionPendiente: null,
    progreso: 0, moviendose: false,
  })
})

test('avanza tres casillas por segundo e interpola sin moverse en diagonal', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  assert.equal(estado.fila, 1)
  assert.equal(estado.columna, 2)
  assert.equal(estado.progreso, 0.5)
  assert.equal(estado.moviendose, true)
  assert.equal(estado.direccionPendiente, null)
})

test('sigue solo, atraviesa P como camino y se detiene antes de un muro', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  avanzarMovimiento(estado, PASILLO, 30)
  assert.equal(estado.columna, 6)
  assert.equal(estado.progreso, 0)
  assert.equal(estado.moviendose, false)
  assert.equal(estado.direccion, 'derecha')
})

test('una llegada exacta al muro deja de caminar en el mismo fotograma', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 5 / 3)
  assert.equal(estado.columna, 6)
  assert.equal(estado.progreso, 0)
  assert.equal(estado.moviendose, false)
})

test('una vuelta temprana se guarda y se hace en la siguiente esquina posible', () => {
  const mapa = ['#######', '#C....#', '####.##', '####P##', '#######']
  const estado = crearMovimiento(mapa)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, mapa, 0.2)
  pedirDireccion(estado, 'abajo')
  avanzarMovimiento(estado, mapa, 0.3)
  assert.equal(estado.direccion, 'derecha')
  assert.equal(estado.direccionPendiente, 'abajo')
  avanzarMovimiento(estado, mapa, 1)
  assert.equal(estado.fila, 2)
  assert.equal(estado.columna, 4)
  assert.ok(Math.abs(estado.progreso - 0.5) < 0.000000001)
  assert.equal(estado.direccion, 'abajo')
  assert.equal(estado.direccionPendiente, null)
})

test('un giro bloqueado conserva el rumbo y la petición hasta poder doblar', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  pedirDireccion(estado, 'arriba')
  avanzarMovimiento(estado, PASILLO, 0.5)
  assert.equal(estado.columna, 4)
  assert.equal(estado.direccion, 'derecha')
  assert.equal(estado.direccionPendiente, 'arriba')
})

test('una dirección nueva reemplaza la vuelta pendiente y permite dar la vuelta', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  pedirDireccion(estado, 'arriba')
  pedirDireccion(estado, 'izquierda')
  avanzarMovimiento(estado, PASILLO, 0.5)
  assert.equal(estado.columna, 2)
  assert.equal(estado.progreso, 0)
  assert.equal(estado.direccion, 'izquierda')
  assert.equal(estado.direccionPendiente, null)
})

test('tras detenerse, una dirección válida reanuda el recorrido sin otra pulsación', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 5)
  pedirDireccion(estado, 'arriba')
  avanzarMovimiento(estado, PASILLO, 1)
  assert.equal(estado.columna, 6)
  assert.equal(estado.moviendose, false)
  pedirDireccion(estado, 'izquierda')
  avanzarMovimiento(estado, PASILLO, 1 / 3)
  assert.equal(estado.columna, 5)
  assert.equal(estado.moviendose, true)
})

test('no sale de los bordes aunque el mapa no tenga un muro exterior', () => {
  const mapa = ['C.P']
  const estado = crearMovimiento(mapa)
  pedirDireccion(estado, 'izquierda')
  avanzarMovimiento(estado, mapa, 10)
  assert.equal(estado.columna, 0)
  assert.equal(estado.moviendose, false)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, mapa, 10)
  assert.equal(estado.columna, 2)
  assert.equal(estado.moviendose, false)
})

test('acepta una velocidad distinta y descarta tiempos o direcciones inválidas', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  pedirDireccion(estado, 'diagonal')
  avanzarMovimiento(estado, PASILLO, 0.25, 6)
  assert.equal(estado.columna, 2)
  assert.equal(estado.progreso, 0.5)
  const anterior = { ...estado }
  for (const segundos of [-1, Infinity, NaN]) {
    avanzarMovimiento(estado, PASILLO, segundos)
    assert.deepEqual(estado, anterior)
  }
  avanzarMovimiento(estado, PASILLO, 1, 0)
  assert.deepEqual(estado, anterior)
})

test('un mapa sin C informa que falta el punto de inicio', () => {
  assert.throws(() => crearMovimiento(['###', '#P#', '###']), /casilla C/)
})

test('los deslizamientos eligen el eje mayor, con un mínimo de 30 píxeles', () => {
  const inicio = { x: 100, y: 100 }
  assert.equal(direccionDelDeslizamiento(inicio, { x: 129, y: 129 }), null)
  assert.equal(direccionDelDeslizamiento(inicio, { x: 130, y: 105 }), 'derecha')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 60, y: 80 }), 'izquierda')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 120, y: 150 }), 'abajo')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 90, y: 50 }), 'arriba')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 130, y: 130 }), 'derecha')
})
