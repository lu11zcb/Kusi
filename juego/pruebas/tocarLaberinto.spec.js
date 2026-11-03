import { test, expect } from '@playwright/test'
import { abrir, estado, esperarCasilla, servirPasillo, avanzarConJoystick } from './ayudas/laberinto.js'

test('un toque sin arrastre no elige un destino ni mueve al cuy', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  const fruta = await pagina.evaluate(() => window.kusi.ubicarCasilla(1, 3))
  await pagina.mouse.click(fruta.x, fruta.y)
  await pagina.waitForTimeout(250)
  const final = await estado(pagina)
  expect(final.movimiento.fila).toBe(inicial.movimiento.fila)
  expect(final.movimiento.columna).toBe(inicial.movimiento.columna)
  expect(final.movimiento.moviendose).toBe(false)
  expect(final.joystick.visible).toBe(true)
  expect(final.regla.recogidos).toBe(0)
})

test('el joystick recoge lo que pisa y al soltar se detiene en el siguiente centro', async ({ page: pagina }) => {
  await abrir(pagina)
  const final = await avanzarConJoystick(pagina, 'derecha', 2)
  expect(final.modoControl).toBe('joystick')
  expect(final.movimiento).toMatchObject({ fila: 1, columna: 3, progreso: 0, moviendose: false })
  expect(final.regla.recogidos).toBe(1)
  expect(final.joystick.visible).toBe(true)
  await pagina.waitForTimeout(300)
  expect((await estado(pagina)).movimiento).toEqual(final.movimiento)
})

test('la zona muerta no camina y Escuchar y Ayuda no abren el joystick', async ({ page: pagina }) => {
  await abrir(pagina)
  const punto = await pagina.evaluate(() => { const c=window.kusi.estado().joystick.centro; return window.kusi.proyectar(c.x,c.y) })
  await pagina.mouse.move(punto.x, punto.y)
  await pagina.mouse.down()
  expect((await estado(pagina)).joystick).toMatchObject({ visible: true, radio: 92 })
  await pagina.mouse.move(punto.x + 12, punto.y)
  await pagina.waitForTimeout(250)
  expect((await estado(pagina)).movimiento.moviendose).toBe(false)
  await pagina.mouse.up()
  for (const nombre of ['sonido', 'ayuda']) {
    const boton = await pagina.evaluate((nombre) => window.kusi.ubicar(nombre), nombre)
    await pagina.mouse.click(boton.x, boton.y)
    expect((await estado(pagina)).joystick.visible).toBe(true)
  }
})

test('una flecha recupera el control sin dejar un giro táctil pendiente', async ({ page: pagina }) => {
  await servirPasillo(pagina)
  await abrir(pagina)
  await avanzarConJoystick(pagina, 'derecha', 2)
  await pagina.keyboard.press('ArrowLeft')
  // La tecla entra en el siguiente cuadro de Phaser: esperar solo reposo
  // podía devolver el reposo anterior, todavía en la columna 3.
  const final = await esperarCasilla(pagina, 1, 1)
  expect(final.modoControl).toBe('teclado')
  expect(final.movimiento.columna).toBe(1)
  expect(final.joystick.visible).toBe(true)
})

test('mantener el dedo permite guardar una vuelta hasta la esquina', async ({ page: pagina }) => {
  await abrir(pagina)
  const punto = await pagina.evaluate(() => { const c=window.kusi.estado().joystick.centro; return window.kusi.proyectar(c.x,c.y) })
  await pagina.mouse.move(punto.x, punto.y)
  await pagina.mouse.down()
  await pagina.mouse.move(punto.x + 45, punto.y)
  await pagina.waitForFunction(() => window.kusi.estado().movimiento.columna >= 2)
  await pagina.mouse.move(punto.x, punto.y + 45)
  await pagina.waitForFunction(() => window.kusi.estado().movimiento.fila >= 2)
  await pagina.mouse.up()
  await pagina.waitForFunction(() => !window.kusi.estado().movimiento.moviendose)
  const final = await estado(pagina)
  expect(final.movimiento.columna).toBe(5)
  expect(final.movimiento.progreso).toBe(0)
  expect(final.movimiento.direccion).toBe('abajo')
})
