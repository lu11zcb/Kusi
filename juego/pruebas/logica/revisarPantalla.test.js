import assert from 'node:assert/strict'
import test from 'node:test'
import { revisarPantalla } from '#kit/reproductor/logica/revisarPantalla.js'

const caja = (id, tipo, extras = {}) => ({ id, tipo, x: 100, y: 100, ancho: 80, alto: 80, ...extras })
const revisar = (...cajas) => revisarPantalla({ ancho: 1280, alto: 720, cajas })

test('la regla 13.14 pide 48 px al juego y conserva los tamaños del kit', () => {
  assert.deepEqual(revisar(caja('consigna', 'texto', { texto: 'Busca la A', letra: 47 })), [
    { regla: '13.14', motivo: 'Texto chico «Busca la A» (47 px en la pantalla base, mínimo 48 px).' },
  ])
  assert.deepEqual(revisar(caja('sonido', 'texto', { letra: 20, hud: true })), [])
  assert.match(revisar(caja('sonido', 'texto', { letra: 17, hud: true }))[0].motivo, /mínimo 18 px/)
  const claro = caja('vocal', 'texto', { x: 20, y: 20, letra: 24 })
  assert.deepEqual(revisarPantalla({ ancho: 800, alto: 360, cajas: [claro] }), [])
})

test('un texto, un objeto o el HUD pueden salir por cualquiera de los bordes', () => {
  const hallazgos = revisar(caja('vocal', 'texto', { y: 641, letra: 48 }),
    caja('tarjeta', 'objeto', { x: -1 }), caja('indicador', 'hud', { x: 1201 }), caja('globo', 'hud', { y: -1 }))
  assert.deepEqual(hallazgos, [
    { regla: '13.14', motivo: '«vocal» se sale de la pantalla.' },
    { regla: '14.8', motivo: '«tarjeta» se sale de la pantalla.' },
    { regla: '14.8', motivo: '«indicador» se sale de la pantalla.' },
    { regla: '14.8', motivo: '«globo» se sale de la pantalla.' },
  ])
})

test('dos textos se enciman desde un cuarto del área de la caja más chica', () => {
  const primera = caja('primera', 'texto', { letra: 48, ancho: 40, alto: 40 })
  const segunda = caja('segunda', 'texto', { letra: 48, x: 130 })
  assert.deepEqual(revisar(primera, segunda), [
    { regla: '13.14', motivo: 'Están encimados «primera» y «segunda».' },
  ])
  assert.deepEqual(revisar(primera, { ...segunda, x: 131 }), [])
})

test('el indicador puede tapar una tarjeta o un micrófono, aunque sean más chicos', () => {
  const hud = caja('indicador Notas del coro', 'hud')
  const tarjeta = caja('tarjeta', 'objeto', { ancho: 40, alto: 40, x: 170 })
  const microfono = caja('micrófono', 'objeto', { ancho: 30, alto: 30, x: 150 })
  assert.deepEqual(revisar(hud, tarjeta, microfono), [
    { regla: '14.8', motivo: 'Están encimados «indicador Notas del coro» y «tarjeta».' },
    { regla: '14.8', motivo: 'Están encimados «indicador Notas del coro» y «micrófono».' },
  ])
})

test('la pantalla pasa con letra legible, partes propias del HUD y objetos dentro del borde', () => {
  assert.deepEqual(revisar(caja('fondo HUD', 'hud'), caja('etiqueta HUD', 'texto', { letra: 24, hud: true }),
    caja('opción', 'texto', { letra: 48, x: 250, tocable: true }), caja('tarjeta', 'objeto', { x: 1200, y: 640 })), [])
})
