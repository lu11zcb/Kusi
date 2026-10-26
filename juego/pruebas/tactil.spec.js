import { test, expect } from '@playwright/test'
import { estado, esperarCasilla } from './ayudas/laberinto.js'

test.use({
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 1,
  hasTouch: true,
  isMobile: true,
})

test('el toque táctil recoge una fruta y un segundo dedo no convierte su arrastre en destino', async ({ page: pagina }, prueba) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
  expect((await estado(pagina)).familia).toBe('laberinto')
  const lienzo = await pagina.locator('canvas').boundingBox()
  expect(lienzo.width).toBe(960)
  expect(lienzo.height).toBe(540)

  // CDP entrega dos dedos reales. El primero hace un toque y el segundo se
  // arrastra; sus inicios se guardan por separado y solo el toque elige destino.
  const fruta = await pagina.evaluate(() => window.kusi.ubicarCasilla(1, 3))
  const otro = await pagina.evaluate(() => window.kusi.ubicarCasilla(3, 1))
  const punto = (id, posicion) => ({ id, ...posicion, radiusX: 8, radiusY: 8, force: 1 })
  const primero = punto(1, fruta)
  const segundo = punto(2, otro)
  const movido = { ...segundo, x: segundo.x + 35 }
  const entrada = await pagina.context().newCDPSession(pagina)
  const enviar = (type, touchPoints) => entrada.send('Input.dispatchTouchEvent', { type, touchPoints })
  try {
    await enviar('touchStart', [primero])
    await enviar('touchStart', [primero, segundo])
    await enviar('touchMove', [primero, movido])
    // En CDP, un touchMove sin el primer dedo lo levanta; touchEnd va sin puntos.
    await enviar('touchMove', [movido])
    await enviar('touchEnd', [])
    await pagina.waitForFunction(() => window.kusi.estado().movimiento.moviendose)
    const andando = await estado(pagina)
    // Solo el toque del primer dedo elige destino; el arrastre del segundo no.
    expect(andando.destino).toEqual({ fila: 1, columna: 3 })
    expect(andando.animacionCuy.clave).toContain(':derecha:caminar_lado')
    const llegado = await esperarCasilla(pagina, 1, 3)
    expect(llegado.regla.recogidos).toBe(1)
    expect(llegado.regla.errores).toBe(0)
    expect(llegado.destino).toBeNull()
    // Al comer, el cuy pone la cara feliz mirando al niño y después se queda
    // quieto de frente, sin voltear esa vista.
    await pagina.waitForFunction(() => window.kusi.estado().animacionCuy.clave.endsWith(':quieto'))
    expect((await estado(pagina)).animacionCuy).toMatchObject({
      clave: 'cuy-nino-animado-v1:frente:quieto', fotograma: 1, flipX: false,
    })
    await pagina.screenshot({ path: prueba.outputPath('cuy-laberinto-tactil.png') })

    // Un toque del botón usa el mismo control táctil, sin mover al personaje.
    const ayuda = await pagina.evaluate(() => window.kusi.ubicar('ayuda'))
    await pagina.touchscreen.tap(ayuda.x, ayuda.y)
    expect((await estado(pagina)).movimiento).toEqual(llegado.movimiento)
    await pagina.setViewportSize({ width: 1280, height: 720 })
    await pagina.waitForFunction(() => document.querySelector('canvas').getBoundingClientRect().width === 1280)
    await pagina.screenshot({ path: prueba.outputPath('cuy-laberinto.png') })
  } finally {
    // Si la prueba falló con un dedo apoyado, lo levanta; si ya no queda ninguno,
    // CDP rechaza el touchEnd y no hay nada que soltar.
    await enviar('touchEnd', []).catch(() => {})
    await entrada.detach()
  }
  expect(errores).toEqual([])
})
