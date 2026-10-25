import { test, expect } from '@playwright/test'
import { PERFIL_CUY } from '../src/efectos/CuerpoVivo.js'
import { abrir, estado, muestrear, servirPasillo } from './ayudas/laberinto.js'

// El cuy camina por un pasillo con su única fruta lejos, para que ninguna fruta
// ni zorro interrumpa el recorrido mientras se mide el rebote.
const FRUTA_LEJANA = { objetos: [{ tipo: 'fresa', fila: 1, columna: 10 }], regla: { tipo: 'orden', secuencia: ['fresa'] } }

const leerCuerpoDelCuy = (e) => ({
  caminando: e.animacionCuy.estado === 'caminar', fotograma: e.animacionCuy.fotograma,
  ...e.vida.cuerpos.cuy, cuyY: e.cuyY, sombraY: e.vida.sombras.cuy?.y ?? null,
})
const leerCuerpoDelZorro = (e) => ({
  caminando: e.zorros[0].moviendose, ...e.vida.cuerpos.zorros[0], zorroY: e.zorros[0].y,
})

test('el cuy sube y se aplasta menos del 5 % con cada paso, sincronizado con sus cuadros', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  const inicial = await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForTimeout(400)
  const muestras = (await muestrear(pagina, 1600, leerCuerpoDelCuy)).filter((m) => m.caminando && m.intensidad > 0.95)
  expect(muestras.length).toBeGreaterThan(40)

  const alturas = muestras.map((m) => m.altura)
  const aplastes = muestras.map((m) => m.aplaste)
  // Sube «unos píxeles»: entre 2 y 8 en este mapa.
  expect(Math.max(...alturas)).toBeGreaterThan(2)
  expect(Math.max(...alturas)).toBeLessThan(8)
  expect(Math.min(...alturas)).toBeLessThan(1)
  // Se aplasta apenas: más ancho y más bajo, siempre por debajo del 5 %.
  expect(Math.max(...aplastes)).toBeGreaterThan(0.02)
  expect(Math.max(...aplastes)).toBeLessThan(0.05)
  for (const m of muestras) {
    expect(m.escalaX).toBeGreaterThanOrEqual(m.escalaBaseX - 1e-9)
    expect(m.escalaY).toBeLessThanOrEqual(m.escalaBaseY + 1e-9)
    expect(m.escalaX / m.escalaBaseX - 1).toBeLessThan(0.05)
    expect(1 - m.escalaY / m.escalaBaseY).toBeLessThan(0.05)
    // Nunca rota ni inclina al personaje.
    expect(m.rotacion).toBe(0)
  }

  // Sincronía: caminando de lado, los cuadros 3 y 5 apoyan un pie (fase de 0 a 0,5)
  // y el 4 es el cuadro de paso (fase de 0,5 a 1).
  for (const m of muestras) {
    expect(m.fase < 0.5).toBe([3, 5].includes(m.fotograma))
  }
  // El aplaste máximo cae en el instante del apoyo y la mayor altura a mitad del paso.
  const picoAplaste = Math.max(...aplastes)
  for (const m of muestras.filter((muestra) => muestra.aplaste >= picoAplaste * 0.9)) {
    expect(m.fase < 0.1 || m.fase > 0.95).toBe(true)
  }
  const picoAltura = Math.max(...alturas)
  for (const m of muestras.filter((muestra) => muestra.altura >= picoAltura * 0.9)) {
    expect(m.fase).toBeGreaterThan(0.3)
    expect(m.fase).toBeLessThan(0.7)
  }
  expect(inicial.vida.cuerpos.cuy.intensidad).toBe(0)
})

test('la sombra se queda en el suelo mientras el cuerpo rebota', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  const inicial = await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForTimeout(400)
  const muestras = (await muestrear(pagina, 1200, leerCuerpoDelCuy)).filter((m) => m.caminando && m.intensidad > 0.5)
  const pies = inicial.casilla * 0.1
  // El cuerpo sí se levanta del suelo...
  const visuales = muestras.map((m) => m.cuyY + m.desplazamiento.y)
  expect(Math.max(...visuales) - Math.min(...visuales)).toBeGreaterThan(2)
  // ...pero la sombra queda siempre en la línea del suelo, en la altura de los pies.
  for (const m of muestras) {
    expect(m.sombraY).toBeCloseTo(m.cuyY - pies, 6)
  }
})

test('el zorro rebota más bajo y más pesado que el cuy, también sin rotar', async ({ page: pagina }) => {
  await servirPasillo(pagina, { ...FRUTA_LEJANA, zorros: [8] })
  const inicial = await abrir(pagina)
  const alturaMaximaDelCuy = PERFIL_CUY.rebote.altura * inicial.casilla
  // La flecha hacia arriba choca con el muro: el cuy espera y el zorro empieza a patrullar.
  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForTimeout(500)
  const muestras = (await muestrear(pagina, 1500, leerCuerpoDelZorro)).filter((m) => m.caminando && m.intensidad > 0.95)
  expect(muestras.length).toBeGreaterThan(40)
  const alturas = muestras.map((m) => m.altura)
  const aplastes = muestras.map((m) => m.aplaste)
  expect(Math.max(...alturas)).toBeGreaterThan(1.5)
  expect(Math.max(...alturas)).toBeLessThan(alturaMaximaDelCuy)
  expect(Math.max(...aplastes)).toBeGreaterThan(0.025)
  expect(Math.max(...aplastes)).toBeLessThan(0.05)
  for (const m of muestras) {
    expect(m.escalaX).toBeGreaterThanOrEqual(m.escalaBaseX - 1e-9)
    expect(m.escalaY).toBeLessThanOrEqual(m.escalaBaseY + 1e-9)
    expect(m.rotacion).toBe(0)
  }
  // Un zorro que patrulla sigue ocupando su casilla: el rebote no lo desplaza de su sitio.
  const final = await estado(pagina)
  expect(final.zorros[0].fila).toBe(1)
  expect(final.vida.sombras.zorros[0].y).toBeCloseTo(final.zorros[0].y - final.casilla * 0.1, 6)
})

test('al detenerse el cuy recupera su tamaño y su altura exactos', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  // El cuy sigue hasta la puerta del final del pasillo y se detiene en ella.
  await pagina.waitForFunction(() => {
    const e = window.kusi.estado()
    return e.movimiento.columna === 11 && !e.movimiento.moviendose
  }, null, { timeout: 8000 })
  await pagina.waitForTimeout(700)
  const quieto = (await estado(pagina)).vida.cuerpos.cuy
  expect(quieto.intensidad).toBe(0)
  expect(quieto.escalaX).toBe(quieto.escalaBaseX)
  expect(quieto.escalaY).toBe(quieto.escalaBaseY)
  expect(quieto.desplazamiento).toEqual({ x: 0, y: 0 })
})

test('con ?vida=0 el cuerpo no rebota ni se aplasta', async ({ page: pagina }) => {
  await servirPasillo(pagina, FRUTA_LEJANA)
  await abrir(pagina, '&vida=0')
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForTimeout(400)
  const muestras = (await muestrear(pagina, 1000, leerCuerpoDelCuy)).filter((m) => m.caminando)
  expect(muestras.length).toBeGreaterThan(20)
  for (const m of muestras) {
    expect(m.activo).toBe(false)
    expect(m.altura).toBe(0)
    expect(m.aplaste).toBe(0)
    expect(m.escalaX).toBe(m.escalaBaseX)
    expect(m.escalaY).toBe(m.escalaBaseY)
    expect(m.desplazamiento).toEqual({ x: 0, y: 0 })
  }
})
