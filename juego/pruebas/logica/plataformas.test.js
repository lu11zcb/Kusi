import test from 'node:test'
import assert from 'node:assert/strict'
import { FISICA, crearCuerpo, avanzarCuerpo, alcanceDelSalto, separacionComoda } from '../../kit/reproductor/logica/plataformas.js'

// Un mundo de prueba: tres plataformas a la misma altura, separadas.
const PLATAFORMAS = [{ x: 0, y: 500, ancho: 300 }, { x: 460, y: 500, ancho: 300 }, { x: 920, y: 420, ancho: 300 }]
const MUNDO = { limites: { izquierda: 0, derecha: 1400, abajo: 900 } }

// Avanza «cuadros» cuadros de 1/60 s con una entrada fija (o una función de la entrada por cuadro).
function simular(cuerpo, entrada, cuadros) {
  for (let i = 0; i < cuadros; i++) avanzarCuerpo(cuerpo, typeof entrada === 'function' ? entrada(i) : entrada, PLATAFORMAS, 1 / 60, MUNDO)
  return cuerpo
}

test('el protagonista cae sobre una plataforma y se queda quieto sobre ella', () => {
  const cuerpo = crearCuerpo({ x: 100, y: 300 })
  simular(cuerpo, { x: 0 }, 90)
  assert.equal(cuerpo.enSuelo, true)
  assert.equal(cuerpo.y, 500)
  assert.equal(cuerpo.plataforma, PLATAFORMAS[0])
})

test('camina con el joystick y salta con el botón', () => {
  const cuerpo = simular(crearCuerpo({ x: 100, y: 500 }), { x: 0 }, 5)
  assert.equal(cuerpo.enSuelo, true)
  simular(cuerpo, { x: 1 }, 30)
  assert.ok(cuerpo.x > 200)
  let salto = false
  simular(cuerpo, (i) => { const e = { x: 0, saltar: i === 0 }; return e }, 1)
  salto = cuerpo.salto
  assert.equal(salto, true)
  assert.ok(cuerpo.vy < 0)
  assert.equal(cuerpo.enSuelo, false)
})

test('un salto con carrerilla cruza el hueco entre dos plataformas, a la distancia cómoda', () => {
  const { hueco } = separacionComoda()
  assert.ok(hueco >= 160, 'el hueco cómodo es muy chico: ' + hueco)
  // Plataforma de salida y de llegada separadas justo ese hueco.
  const llegada = [{ x: 0, y: 500, ancho: 300 }, { x: 300 + hueco, y: 500, ancho: 300 }]
  const cuerpo = crearCuerpo({ x: 270, y: 500 })
  for (let i = 0; i < 4; i++) avanzarCuerpo(cuerpo, { x: 0 }, llegada, 1 / 60, MUNDO)
  let aterrizo = false
  for (let i = 0; i < 120; i++) {
    avanzarCuerpo(cuerpo, { x: 1, saltar: i === 0 }, llegada, 1 / 60, MUNDO)
    if (cuerpo.aterrizo && cuerpo.plataforma === llegada[1]) aterrizo = true
  }
  assert.equal(aterrizo, true)
})

test('cae a la plataforma de abajo y no la atraviesa al subir desde abajo', () => {
  // Desde abajo de una plataforma se salta a través de ella y se aterriza arriba.
  const alta = [{ x: 0, y: 380, ancho: 300 }, { x: 0, y: 500, ancho: 300 }]
  const cuerpo = crearCuerpo({ x: 150, y: 500 })
  for (let i = 0; i < 5; i++) avanzarCuerpo(cuerpo, { x: 0 }, alta, 1 / 60, MUNDO)
  avanzarCuerpo(cuerpo, { x: 0, saltar: true }, alta, 1 / 60, MUNDO)
  for (let i = 0; i < 120; i++) avanzarCuerpo(cuerpo, { x: 0 }, alta, 1 / 60, MUNDO)
  assert.equal(cuerpo.y, 380)
  assert.equal(cuerpo.plataforma, alta[0])
})

test('perdona un salto pedido un poco después de salir del borde y uno pedido un poco antes de aterrizar', () => {
  // Gracia: camina fuera del borde y pide el salto 0,08 s después.
  const una = [{ x: 0, y: 500, ancho: 300 }]
  const cuerpo = crearCuerpo({ x: 290, y: 500 })
  for (let i = 0; i < 3; i++) avanzarCuerpo(cuerpo, { x: 0 }, una, 1 / 60, MUNDO)
  let saltoRegistrado = false
  for (let i = 0; i < 40; i++) {
    avanzarCuerpo(cuerpo, { x: 1, saltar: cuerpo.x > 320 && !saltoRegistrado }, una, 1 / 60, MUNDO)
    if (cuerpo.salto) saltoRegistrado = true
  }
  assert.equal(saltoRegistrado, true)
  // Guarda: el salto pedido en el aire queda esperando y sale al aterrizar.
  const caida = crearCuerpo({ x: 100, y: 480 })
  caida.sinSuelo = 1 // lleva un rato en el aire: ya no vale la gracia del borde
  avanzarCuerpo(caida, { x: 0, saltar: true }, una, 1 / 60, MUNDO)
  let salto = false
  for (let i = 0; i < 20; i++) { avanzarCuerpo(caida, { x: 0 }, una, 1 / 60, MUNDO); if (caida.salto) salto = true }
  assert.equal(salto, true)
})

test('si cae al vacío vuelve a la última plataforma, sin quedarse atascado', () => {
  const cuerpo = crearCuerpo({ x: 100, y: 500 })
  simular(cuerpo, { x: 0 }, 5)
  let reaparecio = false
  simular(cuerpo, (i) => { return { x: 1 } }, 140)
  for (let i = 0; i < 200; i++) { avanzarCuerpo(cuerpo, { x: 1 }, PLATAFORMAS, 1 / 60, MUNDO); if (cuerpo.reaparecio) reaparecio = true }
  // Caminando sin saltar el hueco, en algún momento se cae y reaparece en una plataforma.
  assert.equal(reaparecio, true)
  assert.equal(cuerpo.enSuelo || cuerpo.y <= 900, true)
  assert.ok(cuerpo.x >= 0 && cuerpo.x <= 1400)
})

test('el alcance del salto es el que usa el supervisor para planear los huecos del nivel', () => {
  const { alcanceX, alturaMaxima } = alcanceDelSalto()
  assert.ok(alcanceX > 250 && alcanceX < 400, String(alcanceX))
  assert.ok(alturaMaxima > 150 && alturaMaxima < 300, String(alturaMaxima))
  const { hueco, subida } = separacionComoda()
  assert.ok(hueco < alcanceX && subida < alturaMaxima)
  assert.equal(FISICA.velocidad > 0, true)
})

