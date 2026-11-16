import test from 'node:test'
import assert from 'node:assert/strict'
import { puntoDelSalto, duracionDelSalto, formaDelSalto } from '../../kit/reproductor/logica/salto.js'

test('el salto sale de un punto, sube en arco y cae en el otro', () => {
  const a = { x: 0, y: 100 }, b = { x: 200, y: 100 }
  assert.deepEqual(puntoDelSalto(a, b, 0, 80), a)
  assert.deepEqual(puntoDelSalto(a, b, 1, 80), b)
  const medio = puntoDelSalto(a, b, 0.5, 80)
  assert.equal(medio.x, 100)
  assert.equal(medio.y, 100 - 80)
  // Un t fuera de rango se queda en los extremos.
  assert.deepEqual(puntoDelSalto(a, b, -1, 80), a)
  assert.deepEqual(puntoDelSalto(a, b, 2, 80), b)
})

test('el salto a una plataforma más alta o más baja también llega a su destino', () => {
  const a = { x: 0, y: 300 }, b = { x: 150, y: 120 }
  assert.deepEqual(puntoDelSalto(a, b, 1, 60), b)
  assert.ok(puntoDelSalto(a, b, 0.5, 60).y < (a.y + b.y) / 2)
})

test('la duración depende de la distancia y no se sale de sus límites', () => {
  const origen = { x: 0, y: 0 }
  assert.equal(duracionDelSalto(origen, { x: 10, y: 0 }), 380)
  assert.equal(duracionDelSalto(origen, { x: 5000, y: 0 }), 760)
  const media = duracionDelSalto(origen, { x: 550, y: 0 })
  assert.ok(media > 380 && media < 760)
})

test('el cuerpo se aplasta al despegar y al caer, y se estira en el aire', () => {
  const despegue = formaDelSalto(0), aire = formaDelSalto(0.5), aterrizaje = formaDelSalto(1)
  assert.ok(despegue.escalaY < 1 && despegue.escalaX > 1)
  assert.ok(aire.escalaY > 1 && aire.escalaX < 1)
  assert.ok(aterrizaje.escalaY < 1 && aterrizaje.escalaX > 1)
})
