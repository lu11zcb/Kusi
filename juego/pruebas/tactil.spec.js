import { test, expect } from '@playwright/test'
import { estado } from './ayudas/laberinto.js'

test.use({ viewport: { width: 960, height: 540 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true })

test('un dedo conduce y el segundo no roba el joystick; al levantarlo se detiene', async ({ page: pagina }, prueba) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await pagina.goto('/')
  await pagina.waitForFunction(() => window.kusi?.listo)
  const inicio = await pagina.evaluate(() => { const c=window.kusi.estado().joystick.centro; return window.kusi.proyectar(c.x,c.y) })
  const otro = await pagina.evaluate(() => window.kusi.ubicarCasilla(3, 1))
  const punto = (id, posicion) => ({ id, ...posicion, radiusX: 8, radiusY: 8, force: 1 })
  const primero = punto(1, inicio)
  const segundo = punto(2, otro)
  const movido = { ...primero, x: primero.x + 45 }
  const entrada = await pagina.context().newCDPSession(pagina)
  const enviar = (type, touchPoints) => entrada.send('Input.dispatchTouchEvent', { type, touchPoints })
  try {
    await enviar('touchStart', [primero])
    // CDP recibe la lista de dedos activos. TouchMove añade o retira solo los
    // identificadores que cambiaron; TouchEnd termina el conjunto completo.
    // https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchTouchEvent
    await enviar('touchMove', [primero, segundo])
    await enviar('touchMove', [movido, segundo])
    await pagina.waitForFunction(() => window.kusi.estado().movimiento.columna >= 2)
    // Levantar el segundo dedo no cambia el rumbo del primero.
    const conductor = (await estado(pagina)).joystick.puntero
    expect(conductor).not.toBeNull()
    await enviar('touchMove', [movido])
    await expect.poll(async () => (await estado(pagina)).joystick).toMatchObject({
      visible: true, direccion: 'derecha', puntero: conductor,
    })
    await enviar('touchEnd', [])
    await pagina.waitForFunction(() => !window.kusi.estado().movimiento.moviendose)
    const final = await estado(pagina)
    expect(final.movimiento.progreso).toBe(0)
    expect(final.joystick.visible).toBe(true)
    await pagina.waitForTimeout(250)
    expect((await estado(pagina)).movimiento).toEqual(final.movimiento)
    await pagina.screenshot({ path: prueba.outputPath('joystick-tactil.png') })
  } finally {
    await enviar('touchEnd', []).catch(() => {})
    await entrada.detach()
  }
  expect(errores).toEqual([])
})
