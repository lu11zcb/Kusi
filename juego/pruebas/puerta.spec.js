import { test, expect } from '@playwright/test'
import { REBOTE, CONFETI } from '../src/efectos/PuertaViva.js'
import { abrir, muestrear, servirPasillo } from './ayudas/laberinto.js'

// Una sola fruta cerca del inicio: al comerla la puerta se abre y todavía queda
// camino por recorrer, así que el efecto se ve completo antes de entrar.
const FRUTA_CERCANA = { objetos: [{ tipo: 'fresa', fila: 1, columna: 3 }], regla: { tipo: 'orden', secuencia: ['fresa'] } }

const leerPuerta = (e) => ({
  t: performance.now(), abierta: e.puertaAbierta, casilla: e.casilla, ...e.vida.puerta,
})

const esperarAQueSeAbra = (pagina) => pagina.waitForFunction(
  () => window.kusi.estado().puertaAbierta, null, { timeout: 8000, polling: 'raf' },
)

test('al abrirse, la puerta rebota y salen dieciocho trozos de confeti', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_CERCANA)
  await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  await esperarAQueSeAbra(pagina)
  const muestras = await muestrear(pagina, 1800, leerPuerta)
  const casilla = muestras[0].casilla
  const base = muestras[0].base

  // Se abre una sola vez y cambia de dibujo enseguida.
  expect(muestras[0].aperturas).toBe(1)
  expect(muestras.at(-1).aperturas).toBe(1)
  expect(muestras[0].puerta.textura).toBe('puerta-abierta')

  // Rebota: sube unos píxeles estirándose y vuelve a su sitio con rebotes que se amortiguan.
  const elevaciones = muestras.map((m) => base.y - m.puerta.y)
  expect(Math.max(...elevaciones)).toBeGreaterThan(casilla * REBOTE.salto * 0.5)
  expect(Math.max(...elevaciones)).toBeLessThan(casilla * REBOTE.salto * 1.05)
  expect(Math.max(...muestras.map((m) => m.puerta.escalaY))).toBeGreaterThan(base.escalaY * 1.04)
  let golpes = 0
  for (let posicion = 1; posicion < elevaciones.length; posicion += 1) {
    if (elevaciones[posicion - 1] <= 1 && elevaciones[posicion] > 1) golpes += 1
  }
  expect(golpes).toBeGreaterThanOrEqual(2)
  expect(muestras.at(-1).puerta.y).toBeCloseTo(base.y, 3)
  expect(muestras.at(-1).puerta.escalaX).toBeCloseTo(base.escalaX, 6)
  expect(muestras.at(-1).puerta.escalaY).toBeCloseTo(base.escalaY, 6)

  // Salen 18 trozos de varios colores y se apagan en un poco más de un segundo.
  expect(muestras.at(-1).confetiSoltado).toBe(CONFETI.cantidad)
  expect(Math.max(...muestras.map((m) => m.confetiVivo))).toBe(CONFETI.cantidad)
  expect(muestras.at(-1).confetiVivo).toBe(0)
  expect(muestras.at(-1).colores.length).toBeGreaterThanOrEqual(4)
  const vivos = muestras.filter((m) => m.confetiVivo > 0)
  const duracion = vivos.at(-1).t - vivos[0].t
  expect(duracion).toBeGreaterThan(CONFETI.duracionMs * 0.85)
  expect(duracion).toBeLessThan(CONFETI.duracionMs * 1.4)

  // Suben en abanico, hacia los dos lados, y luego caen.
  const piezas = muestras.flatMap((m) => m.piezas)
  expect(Math.min(...piezas.map((pieza) => pieza.y))).toBeLessThan(base.y - casilla * 0.5)
  expect(piezas.some((pieza) => pieza.x < base.x - casilla * 0.4)).toBe(true)
  expect(piezas.some((pieza) => pieza.x > base.x + casilla * 0.4)).toBe(true)
  const cima = Math.min(...muestras.filter((m) => m.piezas.length).map((m) => Math.min(...m.piezas.map((pieza) => pieza.y))))
  const ultimas = muestras.filter((m) => m.piezas.length).at(-1)
  expect(Math.max(...ultimas.piezas.map((pieza) => pieza.y))).toBeGreaterThan(cima + casilla * 0.5)
})

test('la puerta rebota una sola vez por apertura aunque el cuy siga caminando', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_CERCANA)
  await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  await esperarAQueSeAbra(pagina)
  await pagina.waitForTimeout(1500)
  const puerta = await pagina.evaluate(() => window.kusi.estado().vida.puerta)
  expect(puerta.aperturas).toBe(1)
  expect(puerta.confetiSoltado).toBe(18)
})

test('con ?vida=0 la puerta solo se abre, sin rebote ni confeti', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_CERCANA)
  await abrir(pagina, '&vida=0')
  await pagina.keyboard.press('ArrowRight')
  await esperarAQueSeAbra(pagina)
  const muestras = await muestrear(pagina, 1200, leerPuerta)
  for (const m of muestras) {
    expect(m.activo).toBe(false)
    expect(m.aperturas).toBe(0)
    expect(m.confetiSoltado).toBe(0)
    expect(m.confetiVivo).toBe(0)
    expect(m.puerta.y).toBe(m.base.y)
    expect(m.puerta.escalaY).toBe(m.base.escalaY)
  }
  expect(muestras[0].puerta.textura).toBe('puerta-abierta')
})
