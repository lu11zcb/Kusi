import { test, expect } from '@playwright/test'
import { abrir, estado, muestrear, servirPasillo } from './ayudas/laberinto.js'

const FRUTA_LEJANA = { objetos: [{ tipo: 'fresa', fila: 1, columna: 10 }], regla: { tipo: 'orden', secuencia: ['fresa'] } }

// Cuánto se estiró el cuerpo respecto de su alto base, con la hora del navegador.
const leerRespiracionDelCuy = (e) => ({
  t: performance.now(),
  cambio: e.vida.cuerpos.cuy.escalaY / e.vida.cuerpos.cuy.escalaBaseY - 1,
  ...e.vida.cuerpos.cuy,
})

// Instantes, en milisegundos, en que la respiración cruza el tamaño base hacia arriba.
function cruces(muestras) {
  const instantes = []
  for (let indice = 1; indice < muestras.length; indice += 1) {
    if (muestras[indice - 1].cambio < 0 && muestras[indice].cambio >= 0) instantes.push(muestras[indice].t)
  }
  return instantes
}

test('quieto, el cuy se estira y se encoge entre un 2 % y un 3 % cada 2 segundos', async ({ page: pagina }) => {
  await abrir(pagina)
  // El primer segundo y medio la respiración se está asentando.
  await pagina.waitForTimeout(1500)
  const muestras = await muestrear(pagina, 6200, leerRespiracionDelCuy)
  const cambios = muestras.map((m) => m.cambio)
  expect(Math.max(...cambios)).toBeGreaterThan(0.02)
  expect(Math.max(...cambios)).toBeLessThan(0.03)
  expect(Math.min(...cambios)).toBeLessThan(-0.02)
  expect(Math.min(...cambios)).toBeGreaterThan(-0.03)

  // Una respiración completa cada 2 segundos.
  const entradas = cruces(muestras)
  expect(entradas.length).toBeGreaterThanOrEqual(2)
  for (let indice = 1; indice < entradas.length; indice += 1) {
    expect(entradas[indice] - entradas[indice - 1]).toBeGreaterThan(1850)
    expect(entradas[indice] - entradas[indice - 1]).toBeLessThan(2150)
  }
})

test('al respirar solo cambia el alto: ni se ensancha, ni se despega del suelo, ni gira', async ({ page: pagina }) => {
  await abrir(pagina)
  await pagina.waitForTimeout(800)
  const muestras = await muestrear(pagina, 2500, leerRespiracionDelCuy)
  for (const m of muestras) {
    expect(m.escalaX).toBe(m.escalaBaseX)
    expect(m.desplazamiento).toEqual({ x: 0, y: 0 })
    expect(m.rotacion).toBe(0)
    expect(m.aplaste).toBe(0)
  }
})

test('al caminar la respiración se apaga y al detenerse vuelve', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  await abrir(pagina)
  await pagina.waitForTimeout(1200)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForTimeout(1200)
  const caminando = (await estado(pagina)).vida.cuerpos.cuy
  expect(caminando.quietud).toBeLessThan(0.02)
  expect(Math.abs(caminando.respiracion)).toBeLessThan(0.001)

  // El pasillo termina en la puerta: el cuy se detiene y vuelve a respirar.
  await pagina.waitForFunction(() => {
    const e = window.kusi.estado()
    return e.movimiento.columna === 11 && !e.movimiento.moviendose
  }, null, { timeout: 8000 })
  await pagina.waitForTimeout(1500)
  const muestras = await muestrear(pagina, 2200, leerRespiracionDelCuy)
  expect(Math.max(...muestras.map((m) => m.cambio))).toBeGreaterThan(0.02)
  expect(Math.min(...muestras.map((m) => m.cambio))).toBeLessThan(-0.02)
})

test('el zorro quieto no respira: solo el cuy espera respirando', async ({ page: pagina }) => {
  await servirPasillo(pagina, { ...FRUTA_LEJANA, zorros: [8] })
  await abrir(pagina)
  // El zorro espera quieto hasta que el niño elige un rumbo.
  const muestras = await muestrear(pagina, 2500, (e) => ({ ...e.vida.cuerpos.zorros[0], caminando: e.zorros[0].moviendose }))
  for (const m of muestras) {
    expect(m.respiracion).toBe(0)
    expect(m.escalaY).toBe(m.escalaBaseY)
  }
})

test('con ?vida=0 el cuy quieto no respira', async ({ page: pagina }) => {
  await abrir(pagina, '&vida=0')
  await pagina.waitForTimeout(500)
  const muestras = await muestrear(pagina, 2500, leerRespiracionDelCuy)
  for (const m of muestras) {
    expect(m.activo).toBe(false)
    expect(m.respiracion).toBe(0)
    expect(m.escalaY).toBe(m.escalaBaseY)
  }
})
