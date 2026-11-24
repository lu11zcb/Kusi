import assert from 'node:assert/strict'
import test from 'node:test'
import { comprobarToques } from '../../taller/trabajador/comprobar.js'

function simularPagina(toques, capturas) {
  const pulsados = []
  const pagina = {
    evaluate: async () => ({ toques }),
    screenshot: async () => Buffer.from([capturas.shift()]),
    touchscreen: { tap: async (x, y) => pulsados.push({ x, y }) },
    waitForTimeout: async () => {},
  }
  return { pagina, pulsados }
}

test('avisa si tres toques sobre objetos y controles dejan la captura idéntica', async () => {
  const { pagina, pulsados } = simularPagina([
    { id: 'hud', x: 1200, y: 50, hud: true },
    { id: 'tarjeta', x: 100, y: 200 },
    { id: 'letra', x: 200, y: 100 },
  ], [0, 0, 0, 0, 0, 0])

  assert.match(await comprobarToques(pagina), /^Tocar no cambia nada en la pantalla/)
  assert.deepEqual(pulsados, [{ x: 100, y: 200 }, { x: 200, y: 100 }, { x: 1200, y: 50 }])
})

test('detecta un cambio de un toque aunque después se vuelva a la captura inicial', async () => {
  const { pagina, pulsados } = simularPagina([{ id: 'botón', x: 100, y: 100 }], [0, 1, 1, 0, 0, 0])
  assert.equal(await comprobarToques(pagina), null)
  assert.equal(pulsados.length, 3)
})

test('sin objetos que puedan recibir el toque, no acusa que la pantalla esté trabada', async () => {
  const { pagina, pulsados } = simularPagina([], [])
  assert.equal(await comprobarToques(pagina), null)
  assert.deepEqual(pulsados, [])
})
