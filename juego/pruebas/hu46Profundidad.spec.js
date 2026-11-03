import { test, expect } from '@playwright/test'
import { abrir, estado, esperarCasilla, puntoEnLienzo, seSuperponen, servirPasillo } from './ayudas/laberinto.js'

const CASILLA_MINIMA = 40
const NIVELES = [1, 2, 3]
// En 1280 × 720 se conserva la disposición de siempre; en un celular alargado el
// lienzo se ensancha y la barra y Kusi pasan a un panel a la izquierda.
const PANTALLAS = [
  { width: 1280, height: 720, disposicion: 'clasica' },
  { width: 800, height: 360, disposicion: 'lateral' },
]

async function cajaEnPantalla(pagina, caja) {
  const inicio = await puntoEnLienzo(pagina, caja.x, caja.y)
  const fin = await puntoEnLienzo(pagina, caja.x + caja.ancho, caja.y + caja.alto)
  return { izquierda: inicio.x, arriba: inicio.y, derecha: fin.x, abajo: fin.y }
}

// Todo lo que el niño necesita ver (la barra, el mapa y la columna de Kusi) cae
// dentro de la pantalla real, aunque la cámara se haya alejado o desplazado.
async function comprobarQueTodoSeVe(pagina, pantalla) {
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
  for (const nombre of ['mapa', 'barra', 'guia', 'globo']) {
    const caja = await cajaEnPantalla(pagina, actual.presentacion[nombre])
    expect(caja.izquierda, nombre).toBeGreaterThanOrEqual(-1)
    expect(caja.arriba, nombre).toBeGreaterThanOrEqual(-1)
    expect(caja.derecha, nombre).toBeLessThanOrEqual(pantalla.width + 1)
    expect(caja.abajo, nombre).toBeLessThanOrEqual(pantalla.height + 1)
  }
  expect(seSuperponen(actual.presentacion.mapa, actual.presentacion.barra)).toBe(false)
  expect(seSuperponen(actual.presentacion.mapa, actual.presentacion.guia)).toBe(false)
  expect(seSuperponen(actual.presentacion.barra, actual.presentacion.guia)).toBe(false)
  // Los botones de la barra y el altavoz se pueden tocar sin salirse de la pantalla.
  for (const nombre of ['sonido', 'ayuda', 'altavoz']) {
    const boton = await pagina.evaluate((nombre) => window.kusi.ubicar(nombre), nombre)
    if (nombre === 'altavoz' && !actual.vida.activa) continue
    expect(boton, nombre).not.toBeNull()
    expect(boton.x, nombre).toBeGreaterThan(0)
    expect(boton.x, nombre).toBeLessThan(pantalla.width)
    expect(boton.y, nombre).toBeGreaterThan(0)
    expect(boton.y, nombre).toBeLessThan(pantalla.height)
  }
  return actual
}

async function comprobarPresentacion(pagina, pantalla) {
  const actual = await comprobarQueTodoSeVe(pagina, pantalla)
  expect(actual.presentacion.disposicion).toBe(pantalla.disposicion)

  // Se mide el tamaño que recibe el dedo, después de aplicar escala y cámara.
  const a = await puntoEnLienzo(pagina, actual.origenMapa.x, actual.origenMapa.y)
  const b = await puntoEnLienzo(pagina, actual.origenMapa.x + actual.casilla, actual.origenMapa.y + actual.casilla)
  expect(b.x - a.x).toBeGreaterThanOrEqual(CASILLA_MINIMA - 0.01)
  expect(b.y - a.y).toBeGreaterThanOrEqual(CASILLA_MINIMA - 0.01)
  expect(actual.presentacion.piso).toMatchObject({ tipo: 'TileSprite', cantidad: 1, textura: 'piso-tierra' })
  expect(actual.presentacion.vineta).toBe(true)
  expect(actual.vida.frutas).toHaveLength(actual.regla.objetos.length)
  for (const fruta of actual.vida.frutas) {
    expect(fruta.visible).toBe(true)
    expect(fruta.alpha).toBeGreaterThanOrEqual(0.95)
  }
  return actual
}

for (const pantalla of PANTALLAS) {
  test.describe('HU46 ' + pantalla.width + ' × ' + pantalla.height, () => {
    test.use({ viewport: pantalla, hasTouch: pantalla.width === 800, isMobile: pantalla.width === 800 })
    for (const nivel of NIVELES) {
      for (const vida of [true, false]) {
        test('nivel ' + nivel + ': fondo completo, casillas de al menos 40 px y frutas visibles con vida=' + (vida ? 1 : 0),
          async ({ page: pagina }) => {
            const errores = []
            const fallosDeRed = []
            pagina.on('pageerror', (error) => errores.push(error.message))
            pagina.on('console', (mensaje) => {
              if (mensaje.type() === 'error') errores.push(mensaje.text())
            })
            // La limpieza de recursos debe conservar también las rutas armadas
            // con el tipo del alimento y las hojas declaradas en los manifiestos.
            pagina.on('response', (respuesta) => {
              if (respuesta.status() >= 400) fallosDeRed.push(respuesta.status() + ' ' + respuesta.url())
            })
            const inicial = await abrir(pagina, '&nivel=' + nivel + (vida ? '' : '&vida=0'))
            expect(inicial.nivel).toBe(nivel)
            const actual = await comprobarPresentacion(pagina, pantalla)
            expect(actual.vida.activa).toBe(vida)
            expect(errores).toEqual([])
            expect(fallosDeRed).toEqual([])
          })
      }
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
  // El nivel se abrió con la disposición clásica: sigue entero, centrado en la pantalla ancha.
  expect(despues.presentacion.disposicion).toBe('clasica')
  await comprobarQueTodoSeVe(pagina, { width: 800, height: 360 })

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

test.describe('de celular a escritorio', () => {
  test.use({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true })

  test('la disposición lateral se aleja para caber en un lienzo más angosto, sin perder la partida', async ({ page: pagina }) => {
    const errores = []
    pagina.on('pageerror', (error) => errores.push(error.message))
    await abrir(pagina, '&rapido=1')
    await pagina.keyboard.press('ArrowRight')
    const antes = await esperarCasilla(pagina, 1, 9)
    expect(antes.presentacion.disposicion).toBe('lateral')
    expect(antes.presentacion.zoom).toBe(1)

    await pagina.setViewportSize({ width: 1280, height: 720 })
    await expect.poll(async () => (await pagina.locator('canvas').boundingBox()).width).toBe(1280)
    await pagina.evaluate(() => new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver))))
    const despues = await estado(pagina)
    // El mundo mide 1600 de ancho y el lienzo 1280: la cámara se aleja a 0,8.
    expect(despues.presentacion.zoom).toBeCloseTo(0.8, 2)
    expect(despues.movimiento).toEqual(antes.movimiento)
    expect(despues.regla).toEqual(antes.regla)
    await comprobarQueTodoSeVe(pagina, { width: 1280, height: 720 })

    // Un toque en el centro de una casilla del mapa sigue llegando a ella.
    const punto = await pagina.evaluate(() => window.kusi.ubicarCasilla(1, 8))
    await pagina.mouse.click(punto.x, punto.y)
    const llegada = await esperarCasilla(pagina, 1, 8)
    expect(llegada.modoControl).toBe('toque')
    expect(errores).toEqual([])
  })

  test('la despedida cubre toda la pantalla alargada, también las franjas de los lados', async ({ page: pagina }) => {
    await servirPasillo(pagina, {
      mapa: ['#########', '#C.....P#', '#########'],
      objetos: [{ tipo: 'fresa', fila: 1, columna: 2 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
    })
    await abrir(pagina, '&rapido=1&vida=0')
    await pagina.keyboard.press('ArrowRight')
    await pagina.waitForFunction(() => window.kusi.estado().terminada)
    await pagina.evaluate(() => new Promise((resolver) => requestAnimationFrame(() => requestAnimationFrame(resolver))))
    // El lienzo de Canvas se puede leer tal cual: las cuatro esquinas deben ser
    // la cortina crema (255, 247, 232) y no el pueblito de atrás.
    const esquinas = await pagina.evaluate(() => {
      const lienzo = document.querySelector('canvas')
      const dibujo = lienzo.getContext('2d')
      return [[2, 2], [lienzo.width - 3, 2], [2, lienzo.height - 3], [lienzo.width - 3, lienzo.height - 3]]
        .map(([x, y]) => Array.from(dibujo.getImageData(x, y, 1, 1).data))
    })
    for (const [rojo, verde, azul] of esquinas) {
      expect(Math.abs(rojo - 255)).toBeLessThanOrEqual(12)
      expect(Math.abs(verde - 247)).toBeLessThanOrEqual(12)
      expect(Math.abs(azul - 232)).toBeLessThanOrEqual(14)
    }
  })
})
