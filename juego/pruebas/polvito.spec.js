import { test, expect } from '@playwright/test'
import { abrir, esperarCasilla, estado, muestrear, servirPasillo } from './ayudas/laberinto.js'

const FRUTA_LEJANA = { objetos: [{ tipo: 'fresa', fila: 1, columna: 10 }], regla: { tipo: 'orden', secuencia: ['fresa'] } }

const leerPolvito = (e) => ({
  t: performance.now(), caminando: e.animacionCuy.estado === 'caminar', ...e.vida.polvito,
})

test('cada dos pasos sale una nube de tres o cuatro bolitas detrás de los pies', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  const inicial = await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  const muestras = await muestrear(pagina, 2300, leerPolvito)
  const final = muestras[muestras.length - 1]
  expect(final.pasosContados).toBeGreaterThanOrEqual(6)
  // El primer paso ya levanta una nube y después sale una cada dos pasos.
  expect(final.nubes).toBe(Math.ceil(final.pasosContados / 2))

  expect(final.historial.length).toBeGreaterThanOrEqual(3)
  for (const nube of final.historial) {
    expect([3, 4]).toContain(nube.cantidad)
    expect(nube.inicios).toHaveLength(nube.cantidad)
    expect(nube.direccion).toBe('derecha')
    for (const inicio of nube.inicios) {
      // Detrás de los pies, a ras de suelo: a la izquierda de un cuy que va a la derecha.
      expect(inicio.x).toBeLessThan(nube.x)
      expect(Math.abs(inicio.y - nube.y)).toBeLessThan(inicial.casilla * 0.2)
    }
  }
})

test('las bolitas se desvanecen en medio segundo y no quedan restos', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  // El pasillo termina en la puerta: después de detenerse se espera a que se apague la última nube.
  const muestras = await muestrear(pagina, 5200, leerPolvito)
  expect(Math.max(...muestras.map((m) => m.particulasVivas))).toBeLessThanOrEqual(8)
  expect(Math.max(...muestras.map((m) => m.particulasVivas))).toBeGreaterThanOrEqual(3)

  // La última nube nace en la primera muestra que ya la cuenta; se apaga en la
  // primera donde no queda ninguna bolita viva.
  const ultimaNube = muestras.findIndex((m) => m.nubes === muestras.at(-1).nubes)
  const nacimiento = muestras[ultimaNube].t
  const apagada = muestras.slice(ultimaNube).find((m) => m.particulasVivas === 0)
  expect(apagada).toBeDefined()
  // Medio segundo de vida, con el margen de un par de cuadros de dibujo.
  expect(apagada.t - nacimiento).toBeGreaterThan(430)
  expect(apagada.t - nacimiento).toBeLessThan(620)
  expect(muestras.at(-1).particulasVivas).toBe(0)
})

test('al caminar hacia abajo la nube queda arriba de los pies y se abre a los lados', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 3, 1)
  const nubes = (await estado(pagina)).vida.polvito.historial
  expect(nubes.length).toBeGreaterThanOrEqual(1)
  for (const nube of nubes) {
    expect(nube.direccion).toBe('abajo')
    const xs = nube.inicios.map((inicio) => inicio.x)
    for (const inicio of nube.inicios) expect(inicio.y).toBeLessThan(nube.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(inicial.casilla * 0.3)
  }
})

test('el zorro también levanta polvo, más grande porque pesa más', async ({ page: pagina }) => {
  await servirPasillo(pagina, { ...FRUTA_LEJANA, zorros: [8] })
  await abrir(pagina)
  // El cuy espera contra el muro y solo camina el zorro: todas las nubes son suyas.
  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForFunction(() => window.kusi.estado().vida.polvito.nubes >= 2, null, { timeout: 5000 })
  const polvito = (await estado(pagina)).vida.polvito
  for (const nube of polvito.historial) {
    expect(nube.tamano).toBeGreaterThan(1)
    expect([3, 4]).toContain(nube.cantidad)
  }
})

test('con ?vida=0 no sale ningún polvo', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  await abrir(pagina, '&vida=0')
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForTimeout(1800)
  const polvito = (await estado(pagina)).vida.polvito
  expect(polvito.activo).toBe(false)
  expect(polvito.nubes).toBe(0)
  expect(polvito.pasosContados).toBe(0)
  expect(polvito.particulasEmitidas).toBe(0)
  expect(polvito.particulasVivas).toBe(0)
})
