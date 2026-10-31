import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularDisposicion } from '../../juegos/laberinto/logica/disposicionLaberinto.js'
import { PortalVivo, pulsoPortal } from '../../juegos/laberinto/efectos/PortalVivo.js'

test('el nivel 2 llena la altura bajo la barra y el nivel 1 crece centrado', () => {
  const medir = (filas, columnas) => calcularDisposicion({ ancho: 1600, alto: 720, filas, columnas })
  assert.deepEqual(medir(9, 15).origen, { x: 200, y: 88 })
  assert.equal(medir(9, 15).casilla, 70)
  assert.deepEqual(medir(7, 11).mapa, { x: 230, y: 88, ancho: 990, alto: 630 })
})
test('el portal se abre una vez, pulsa suave y nunca se levanta del suelo', () => {
  const brillo = { alpha: 0, setDepth() { return this }, setAlpha(a) { this.alpha = a; return this } }
  const escena = { add: { ellipse: () => brillo } }
  const puerta = { x: 20, y: 40, scaleX: 1, scaleY: 1, texture: { key: 'portal-abierto' } }
  const portal = new PortalVivo(escena, puerta, { casilla: 80 })
  portal.abrir(); portal.abrir(); portal.actualizar(0.3)
  assert.equal(portal.aperturas, 1)
  assert.equal(puerta.y, 40)
  assert.ok(brillo.alpha >= .05 && brillo.alpha <= .19)
  assert.ok(Math.abs(pulsoPortal(0) - pulsoPortal(1.5)) < 1e-10)
  const quieto = new PortalVivo(escena, puerta, { casilla: 80, activo: false })
  quieto.abrir(); quieto.actualizar(5)
  assert.equal(quieto.tiempo, 0)
  assert.equal(quieto.aperturas, 0)
})
