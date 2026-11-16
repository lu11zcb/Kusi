import test from 'node:test'
import assert from 'node:assert/strict'
import { VEHICULO, crearVehiculo, avanzarVehiculo, avanzarParada, enZona, diferenciaDeAngulo } from '../../kit/reproductor/logica/vehiculo.js'

function manejar(vehiculo, entrada, segundos, contexto = {}) {
  let choques = 0
  for (let i = 0; i < Math.round(segundos * 60); i++) {
    avanzarVehiculo(vehiculo, entrada, 1 / 60, contexto)
    if (vehiculo.choco) choques++
  }
  return choques
}

test('la diferencia entre ángulos toma el camino más corto', () => {
  assert.ok(Math.abs(diferenciaDeAngulo(0, Math.PI / 2) - Math.PI / 2) < 1e-9)
  assert.ok(Math.abs(diferenciaDeAngulo(Math.PI - 0.1, -Math.PI + 0.1) - 0.2) < 1e-9)
  assert.ok(Math.abs(diferenciaDeAngulo(-Math.PI + 0.1, Math.PI - 0.1) + 0.2) < 1e-9)
})

test('el vehículo acelera con el joystick, no pasa de su velocidad máxima y frena solo al soltar', () => {
  const v = crearVehiculo({ x: 0, y: 0 })
  manejar(v, { x: 1, y: 0 }, 0.3)
  assert.ok(v.velocidad > 0 && v.velocidad < VEHICULO.velocidadMaxima)
  manejar(v, { x: 1, y: 0 }, 3)
  assert.ok(Math.abs(v.velocidad - VEHICULO.velocidadMaxima) < 1e-6)
  assert.ok(v.x > 500)
  manejar(v, { x: 0, y: 0 }, 1.2)
  assert.equal(v.velocidad, 0)
})

test('con el joystick a medias va más despacio', () => {
  const v = crearVehiculo({ x: 0, y: 0 })
  manejar(v, { x: 0.5, y: 0 }, 3)
  assert.ok(Math.abs(v.velocidad - VEHICULO.velocidadMaxima * 0.5) < 1e-6)
})

test('gira poco a poco hacia donde se empuja, por el lado más corto', () => {
  const v = crearVehiculo({ x: 0, y: 0, angulo: 0 })
  manejar(v, { x: 0, y: 1 }, 0.1)
  assert.ok(v.angulo > 0 && v.angulo < Math.PI / 2, 'giró de golpe: ' + v.angulo)
  manejar(v, { x: 0, y: 1 }, 2)
  assert.ok(Math.abs(v.angulo - Math.PI / 2) < 1e-6)
  // Hacia la izquierda desde casi -π gira por el camino corto.
  const w = crearVehiculo({ x: 0, y: 0, angulo: -Math.PI + 0.2 })
  manejar(w, { x: -1, y: 0.0001 }, 0.2)
  assert.ok(Math.abs(Math.abs(w.angulo) - Math.PI) < 0.3)
})

test('si choca con una isla rebota despacio, sin atravesarla ni quedarse pegado', () => {
  const isla = { x: 500, y: -300, ancho: 400, alto: 600 }
  const v = crearVehiculo({ x: 100, y: 0 })
  const choques = manejar(v, { x: 1, y: 0 }, 4, { obstaculos: [isla] })
  assert.ok(choques >= 1)
  assert.ok(v.x <= 500 - VEHICULO.radio + 0.001, 'atravesó la isla: ' + v.x)
  // Un empujón en diagonal resbala a lo largo de ella.
  const w = crearVehiculo({ x: 400, y: 100, angulo: -Math.PI / 4 })
  manejar(w, { x: 1, y: -1 }, 1.5, { obstaculos: [isla] })
  assert.ok(w.y < 100)
})

test('una corriente empuja al vehículo aunque no se maneje', () => {
  const v = crearVehiculo({ x: 0, y: 0 })
  manejar(v, { x: 0, y: 0 }, 1, { corriente: { x: 0, y: 100 } })
  assert.ok(v.y > 90 && v.y < 110)
})

test('detenerse en una zona la confirma solo tras esperar, y pasar de largo o salirse la reinicia', () => {
  const estado = {}
  let confirmaciones = 0
  const paso = (dentro, velocidad, veces) => { for (let i = 0; i < veces; i++) { avanzarParada(estado, { dentro, velocidad }, 1 / 60); if (estado.confirmada) confirmaciones++ } }
  paso(true, 300, 120) // pasa a toda velocidad por la zona: no cuenta
  assert.equal(confirmaciones, 0)
  paso(true, 10, 30) // medio segundo quieto: todavía no
  assert.equal(confirmaciones, 0)
  assert.ok(estado.progreso > 0.5 && estado.progreso < 1)
  paso(false, 0, 5) // se sale: se reinicia
  assert.equal(estado.progreso, 0)
  paso(true, 10, 60) // un segundo quieto: se confirma una vez
  assert.equal(confirmaciones, 1)
})

test('la zona incluye sus bordes', () => {
  const zona = { x: 10, y: 10, ancho: 100, alto: 50 }
  assert.equal(enZona({ x: 10, y: 60 }, zona), true)
  assert.equal(enZona({ x: 111, y: 30 }, zona), false)
})
