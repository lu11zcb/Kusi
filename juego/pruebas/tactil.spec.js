import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.use({
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
})

test('el joystick táctil conserva el primer dedo y anima al cuy hasta soltarlo', async ({ page: pagina }, prueba) => {
  const datos = JSON.parse(await readFile(
    new URL('../public/dibujos/cuy-nino-animado-v1.json', import.meta.url), 'utf8',
  ))
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
  const vamos = await (await pagina.waitForFunction(() => window.kusi.ubicar('vamos'))).jsonValue()
  await pagina.touchscreen.tap(vamos.x, vamos.y)
  await pagina.waitForFunction(() => window.kusi.estado().puedeMoverse)

  // CDP entrega eventos táctiles reales a Chromium, con coordenadas CSS del
  // lienzo ajustado; el juego sigue trabajando en sus 1280 × 720 internos.
  const lienzo = await pagina.locator('canvas').boundingBox()
  expect(lienzo.width).toBe(960)
  expect(lienzo.height).toBe(540)
  const punto = (id, x, y) => ({
    id, x: lienzo.x + x * lienzo.width / 1280, y: lienzo.y + y * lienzo.height / 720,
    radiusX: 8, radiusY: 8, force: 1,
  })
  const centro = punto(1, 150, 566)
  const arriba = punto(1, 150, 500)
  const segundo = punto(2, 190, 566)
  const segundoMovido = punto(2, 216, 566)
  const entrada = await pagina.context().newCDPSession(pagina)
  const enviar = (type, touchPoints) => entrada.send('Input.dispatchTouchEvent', { type, touchPoints })
  const inicio = await pagina.evaluate(() => window.kusi.estado())
  try {
    await enviar('touchStart', [centro])
    await enviar('touchMove', [arriba])
    await pagina.waitForFunction((y) => {
      const actual = window.kusi.estado()
      return actual.cuyY < y - 15 && actual.mirando === 'espaldas' && actual.animacionCuy.estado === 'caminar'
    }, inicio.cuyY)
    const antesDelSegundoDedo = await pagina.evaluate(() => window.kusi.estado())

    // El segundo dedo toca y arrastra dentro de la misma zona del joystick.
    // No debe apropiarse del control ni convertir el avance vertical en lateral.
    await enviar('touchStart', [arriba, segundo])
    await enviar('touchMove', [arriba, segundoMovido])
    await pagina.waitForFunction((y) => window.kusi.estado().cuyY < y - 70, antesDelSegundoDedo.cuyY)
    const durante = await pagina.evaluate(() => window.kusi.estado())
    expect(durante.cuyX).toBe(inicio.cuyX)
    expect(durante.mirando).toBe('espaldas')
    expect(durante.animacionCuy.estado).toBe('caminar')
    expect([0, 1, 2]).toContain(durante.animacionCuy.fotograma)
    expect(durante.animacionCuy.flipX).toBe(false)
  } finally {
    await enviar('touchEnd', [])
  }
  await pagina.waitForFunction(() => {
    const actual = window.kusi.estado()
    return actual.velocidad === 0 && actual.animacionCuy.estado === 'reposo'
  })
  const parado = await pagina.evaluate(() => window.kusi.estado())
  await pagina.waitForTimeout(200)
  const despues = await pagina.evaluate(() => window.kusi.estado())
  expect([despues.cuyX, despues.cuyY]).toEqual([parado.cuyX, parado.cuyY])
  expect(despues.animacionCuy.anclaje).toEqual(datos.anclaje)
  expect(despues.animacionCuy.fotograma).toBe(1)

  // Un arrastre breve hacia abajo deja la cara del jugador visible en las capturas.
  await enviar('touchStart', [centro])
  await enviar('touchMove', [punto(1, 150, 632)])
  await pagina.waitForFunction((y) => window.kusi.estado().cuyY > y + 20, parado.cuyY)
  await enviar('touchEnd', [])
  await pagina.waitForFunction(() => window.kusi.estado().velocidad === 0)
  await pagina.screenshot({ path: prueba.outputPath('cuy-nino-mercado-tactil-v1.png') })
  await pagina.setViewportSize({ width: 1280, height: 720 })
  await pagina.waitForFunction(() => {
    const caja = document.querySelector('canvas').getBoundingClientRect()
    return caja.width === 1280 && caja.height === 720
  })
  await pagina.screenshot({ path: prueba.outputPath('cuy-nino-mercado-v1.png') })
  await entrada.detach()
  expect(errores).toEqual([])
})
