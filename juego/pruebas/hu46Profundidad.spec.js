import { test, expect } from '@playwright/test'
import { abrir, estado, esperarCasilla, puntoEnLienzo, seSuperponen } from './ayudas/laberinto.js'

async function cajaEnPantalla(pagina, caja) {
  const inicio = await puntoEnLienzo(pagina, caja.x, caja.y)
  const fin = await puntoEnLienzo(pagina, caja.x + caja.ancho, caja.y + caja.alto)
  return { izquierda: inicio.x, arriba: inicio.y, derecha: fin.x, abajo: fin.y }
}

async function comprobarPresentacion(pagina, pantalla) {
  const actual = await estado(pagina)
  const lienzo = await pagina.locator('canvas').boundingBox()
  expect(lienzo).not.toBeNull()
  expect(lienzo.x).toBeCloseTo(0, 0)
  expect(lienzo.y).toBeCloseTo(0, 0)
  expect(lienzo.width).toBeCloseTo(pantalla.width, 0)
  expect(lienzo.height).toBeCloseTo(pantalla.height, 0)

  const fondo = await cajaEnPantalla(pagina, actual.presentacion.fondo)
  expect(fondo.izquierda).toBeLessThanOrEqual(1)
  expect(fondo.arriba).toBeLessThanOrEqual(1)
  expect(fondo.derecha).toBeGreaterThanOrEqual(pantalla.width - 1)
  expect(fondo.abajo).toBeGreaterThanOrEqual(pantalla.height - 1)
  for (const nombre of ['mapa', 'barra', 'guia']) {
    const caja = await cajaEnPantalla(pagina, actual.presentacion[nombre])
    expect(caja.izquierda, nombre).toBeGreaterThanOrEqual(-1)
    expect(caja.arriba, nombre).toBeGreaterThanOrEqual(-1)
    expect(caja.derecha, nombre).toBeLessThanOrEqual(pantalla.width + 1)
    expect(caja.abajo, nombre).toBeLessThanOrEqual(pantalla.height + 1)
  }
  expect(seSuperponen(actual.presentacion.mapa, actual.presentacion.barra)).toBe(false)
  expect(seSuperponen(actual.presentacion.mapa, actual.presentacion.guia)).toBe(false)

  // Se mide el tamaño que recibe el dedo, después de aplicar escala y cámara.
  const a = await puntoEnLienzo(pagina, actual.origenMapa.x, actual.origenMapa.y)
  const b = await puntoEnLienzo(pagina, actual.origenMapa.x + actual.casilla, actual.origenMapa.y + actual.casilla)
  expect(b.x - a.x).toBeGreaterThanOrEqual(40 - 0.01)
  expect(b.y - a.y).toBeGreaterThanOrEqual(40 - 0.01)
  expect(actual.presentacion.piso).toMatchObject({ tipo: 'TileSprite', cantidad: 1, textura: 'piso-tierra' })
  expect(actual.presentacion.vineta).toBe(true)
  expect(actual.vida.frutas).toHaveLength(actual.regla.objetos.length)
  for (const fruta of actual.vida.frutas) {
    expect(fruta.visible).toBe(true)
    expect(fruta.alpha).toBeGreaterThanOrEqual(0.95)
  }
  return actual
}

for (const pantalla of [{ width: 1280, height: 720 }, { width: 800, height: 360 }]) {
  test.describe(`HU46 ${pantalla.width} × ${pantalla.height}`, () => {
    test.use({ viewport: pantalla, hasTouch: pantalla.width === 800, isMobile: pantalla.width === 800 })
    for (const vida of [true, false]) {
      test(`fondo completo, casillas grandes y frutas visibles con vida=${vida ? 1 : 0}`, async ({ page: pagina }) => {
        const errores = []
        pagina.on('pageerror', (error) => errores.push(error.message))
        await abrir(pagina, vida ? '' : '&vida=0')
        const actual = await comprobarPresentacion(pagina, pantalla)
        expect(actual.vida.activa).toBe(vida)
        expect(errores).toEqual([])
      })
    }
  })
}

test('los muros conservan dos variantes por nivel y se ordenan por fila sobre el piso', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  const muros = inicial.presentacion.muros
  const totalMuros = inicial.mapa.join('').split('#').length - 1
  expect(muros).toHaveLength(totalMuros)
  expect(new Set(muros.map((muro) => muro.variante)).size).toBe(2)
  const sombras = inicial.presentacion.sombrasMuros
  const totalPuertas = inicial.mapa.join('').split('P').length - 1
  expect(Array.isArray(sombras) ? sombras.length : sombras).toBe(totalMuros + totalPuertas)
  const porFila = new Map()
  for (const muro of muros) {
    expect(inicial.mapa[muro.fila][muro.columna]).toBe('#')
    expect(muro.profundidad).toBeGreaterThan(1)
    expect(muro.profundidad).toBeLessThan(3)
    if (porFila.has(muro.fila)) expect(muro.profundidad).toBe(porFila.get(muro.fila))
    porFila.set(muro.fila, muro.profundidad)
  }
  const filas = [...porFila].sort(([a], [b]) => a - b)
  for (let indice = 1; indice < filas.length; indice++) expect(filas[indice][1]).toBeGreaterThan(filas[indice - 1][1])

  // Una recarga no reordena el mosaico ni vuelve a sortear los adobes.
  await pagina.reload()
  await pagina.waitForFunction(() => window.kusi?.listo)
  expect((await estado(pagina)).presentacion.muros).toEqual(muros)
})

test('cambiar de escritorio a celular conserva la partida, los adobes y el control táctil proyectado', async ({ page: pagina }) => {
  await abrir(pagina, '&rapido=1')
  await pagina.keyboard.press('ArrowRight')
  const antes = await esperarCasilla(pagina, 1, 9)
  const partida = await pagina.evaluate(() => window.kusi.avisos[0].partida)
  await pagina.setViewportSize({ width: 800, height: 360 })
  await expect.poll(async () => (await pagina.locator('canvas').boundingBox()).width).toBe(800)
  await pagina.evaluate(() => new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver))))
  const despues = await estado(pagina)
  expect(despues.movimiento).toEqual(antes.movimiento)
  expect(despues.regla).toEqual(antes.regla)
  expect(despues.presentacion.muros).toEqual(antes.presentacion.muros)
  expect(await pagina.evaluate(() => window.kusi.avisos[0].partida)).toBe(partida)

  const punto = await pagina.evaluate(() => window.kusi.ubicarCasilla(1, 8))
  expect(punto.x).toBeGreaterThan(0)
  expect(punto.x).toBeLessThan(800)
  expect(punto.y).toBeGreaterThan(0)
  expect(punto.y).toBeLessThan(360)
  await pagina.mouse.click(punto.x, punto.y)
  const llegada = await esperarCasilla(pagina, 1, 8)
  expect(llegada.modoControl).toBe('toque')
  expect(llegada.regla.recogidos).toBe(antes.regla.recogidos)
})
