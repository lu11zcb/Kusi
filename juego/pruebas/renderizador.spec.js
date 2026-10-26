import { test, expect } from '@playwright/test'
import { abrir } from './ayudas/laberinto.js'

// En un equipo sin WebGL, AUTO también acaba en Canvas; así la prueba no depende del equipo.
const hayWebGL = (pagina) => pagina.evaluate(() => Boolean(document.createElement('canvas').getContext('webgl')))
const lienzoEs2D = (pagina) => pagina.evaluate(() => document.querySelector('canvas').getContext('2d') !== null)

test('el laberinto dibuja con Canvas por defecto', async ({ page: pagina }) => {
  const actual = await abrir(pagina)
  expect(actual.pantalla.renderizador).toEqual({ pedido: 'canvas', activo: 'canvas' })
  expect(await lienzoEs2D(pagina)).toBe(true)
})

test('?renderizador=auto devuelve el laberinto a la elección de Phaser', async ({ page: pagina }) => {
  const actual = await abrir(pagina, '&renderizador=auto')
  expect(actual.pantalla.renderizador.pedido).toBe('auto')
  const esperado = (await hayWebGL(pagina)) ? 'webgl' : 'canvas'
  expect(actual.pantalla.renderizador.activo).toBe(esperado)
  expect(await lienzoEs2D(pagina)).toBe(esperado === 'canvas')
})

test('el mercado conserva AUTO, también si la dirección pide Canvas', async ({ page: pagina }) => {
  for (const direccion of ['/', '/?renderizador=canvas']) {
    await pagina.goto(direccion)
    await pagina.waitForFunction(() => window.kusi?.listo)
    const { renderizador } = await pagina.evaluate(() => window.kusi.estado())
    const esperado = (await hayWebGL(pagina)) ? 'webgl' : 'canvas'
    expect(renderizador, direccion).toEqual({ pedido: 'auto', activo: esperado })
    expect(await lienzoEs2D(pagina), direccion).toBe(esperado === 'canvas')
  }
})

test('?nivel=N abre el nivel pedido y cualquier valor dudoso abre el primero', async ({ page: pagina }) => {
  for (const [parametro, nivel, filas] of [
    ['&nivel=2', 2, 9], ['&nivel=3', 3, 9], ['&nivel=1', 1, 7],
    ['&nivel=9', 1, 7], ['&nivel=0', 1, 7], ['&nivel=dos', 1, 7], ['&nivel=2.5', 1, 7],
  ]) {
    const actual = await abrir(pagina, parametro)
    expect(actual.nivel, parametro).toBe(nivel)
    expect(actual.mapa, parametro).toHaveLength(filas)
  }
})
