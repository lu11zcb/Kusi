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

test('sin alias se abre el laberinto y respeta el lienzo y el nivel pedidos', async ({ page: pagina }) => {
  for (const [direccion, nivel] of [['/', 1], ['/?renderizador=canvas', 1], ['/?nivel=2', 2], ['/?nivel=3&vida=0', 3]]) {
    await pagina.goto(direccion)
    await pagina.waitForFunction(() => window.kusi?.listo)
    const actual = await pagina.evaluate(() => window.kusi.estado())
    expect(actual.familia, direccion).toBe('laberinto')
    expect(actual.nivel, direccion).toBe(nivel)
    expect(actual.pantalla.renderizador, direccion).toEqual({ pedido: 'canvas', activo: 'canvas' })
    expect(await lienzoEs2D(pagina), direccion).toBe(true)
    if (direccion.includes('vida=0')) expect(actual.vida.activa).toBe(false)
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
