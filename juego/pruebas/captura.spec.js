import { test, expect } from '@playwright/test'
import { CONGELADO, TEMBLOR } from '../src/efectos/CapturaLaberinto.js'
import { abrir, muestrear, servirPasillo } from './ayudas/laberinto.js'

// Un zorro pegado al cuy en un pasillo: al elegir un rumbo lo alcanza en un instante.
const PASILLO_CON_ZORRO = {
  objetos: [{ tipo: 'fresa', fila: 1, columna: 2 }, { tipo: 'platano', fila: 1, columna: 10 }],
  regla: { tipo: 'orden', secuencia: ['fresa', 'platano'] },
  zorros: [2],
}

const leerCaptura = (e) => ({
  t: performance.now(),
  ...e.vida.captura,
  capturas: e.capturas, invulnerable: e.invulnerable, segundosInvulnerable: e.segundosInvulnerable,
  movimiento: { fila: e.movimiento.fila, columna: e.movimiento.columna, progreso: e.movimiento.progreso },
  zorro: { fila: e.zorros[0].fila, columna: e.zorros[0].columna, progreso: e.zorros[0].progreso, fotograma: e.zorros[0].fotograma },
  cuy: { fotograma: e.animacionCuy.fotograma, clave: e.animacionCuy.clave },
  gritos: e.vida.sonidos.reproducciones.captura ?? 0,
})

test('al ser atrapado el juego se congela un instante y la pantalla tiembla muy suave', async ({ page: pagina }) => {
  await servirPasillo(pagina, PASILLO_CON_ZORRO)
  const inicial = await abrir(pagina)
  const camaraInicial = inicial.vida.captura.camara
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(
    () => window.kusi.estado().vida.captura.congelado, null, { timeout: 8000, polling: 'raf' },
  )
  const muestras = await muestrear(pagina, 900, leerCaptura)

  const congeladas = muestras.filter((m) => m.congelado)
  expect(congeladas.length).toBeGreaterThanOrEqual(3)
  // Congelado de verdad: ni se mueven los personajes, ni cambian sus dibujos, ni se
  // aplica todavía la captura. El quejido suena en el instante del golpe.
  const primera = congeladas[0]
  for (const m of congeladas) {
    expect(m.movimiento).toEqual(primera.movimiento)
    expect(m.zorro).toEqual(primera.zorro)
    expect(m.cuy).toEqual(primera.cuy)
    expect(m.capturas).toBe(0)
    expect(m.cuy.clave).not.toContain('asustado')
    expect(m.gritos).toBe(1)
  }
  // Un instante: lo que dura el congelado, según el reloj del propio efecto.
  const descongelada = muestras.find((m) => !m.congelado)
  expect(descongelada).toBeDefined()
  expect(descongelada.transcurrido).toBeGreaterThanOrEqual(CONGELADO.segundos - 0.001)
  expect(descongelada.transcurrido).toBeLessThan(CONGELADO.segundos + 0.15)

  // Después, la captura de siempre: de vuelta al inicio, asustado y protegido.
  const despues = muestras.filter((m) => !m.congelado)
  expect(despues.every((m) => m.capturas === 1)).toBe(true)
  expect(despues[0].movimiento).toEqual({ fila: 1, columna: 1, progreso: 0 })
  // El zorro vuelve a su casilla y retoma la patrulla: en el primer cuadro apenas se movió.
  expect(despues[0].zorro).toMatchObject({ fila: 1, columna: 2 })
  expect(despues[0].zorro.progreso).toBeLessThan(0.2)
  expect(despues[0].cuy.clave).toContain(':asustado')
  expect(despues[0].invulnerable).toBe(true)
  expect(despues[0].segundosInvulnerable).toBeGreaterThan(1.7)

  // El temblor: unos pocos píxeles, sin girar ni acercar, que sigue un poco después
  // del congelado y termina con la cámara en su sitio.
  const maximoX = Math.max(...muestras.map((m) => Math.abs(m.scroll.x)))
  const maximoY = Math.max(...muestras.map((m) => Math.abs(m.scroll.y)))
  expect(maximoX).toBeGreaterThan(1)
  expect(maximoX).toBeLessThanOrEqual(TEMBLOR.amplitud * 1280 + 1e-6)
  expect(maximoY).toBeLessThanOrEqual(TEMBLOR.amplitud * 1280 * TEMBLOR.alto + 1e-6)
  for (const m of muestras) {
    expect(m.camara.rotacion).toBe(0)
    expect(m.camara.zoom).toBe(camaraInicial.zoom)
    expect(m.camara.scrollX).toBeCloseTo(camaraInicial.scrollX + m.scroll.x, 6)
    expect(m.camara.scrollY).toBeCloseTo(camaraInicial.scrollY + m.scroll.y, 6)
  }
  expect(muestras.some((m) => !m.congelado && m.temblando)).toBe(true)
  let saltoMaximo = 0
  for (let posicion = 1; posicion < muestras.length; posicion += 1) {
    saltoMaximo = Math.max(saltoMaximo, Math.abs(muestras[posicion].scroll.x - muestras[posicion - 1].scroll.x))
  }
  expect(saltoMaximo).toBeLessThan(5)
  expect(muestras.at(-1).temblando).toBe(false)
  expect(muestras.at(-1).camara.scrollX).toBe(camaraInicial.scrollX)
  expect(muestras.at(-1).camara.scrollY).toBe(camaraInicial.scrollY)
})

test('tras el congelado el juego sigue: el zorro patrulla y el cuy ya no se queda atrapado', async ({ page: pagina }) => {
  await servirPasillo(pagina, PASILLO_CON_ZORRO)
  await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().capturas === 1, null, { timeout: 8000 })
  // Con el cuy protegido el zorro vuelve a caminar y las animaciones se reanudan.
  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForFunction(() => {
    const e = window.kusi.estado()
    return e.zorros[0].columna !== 2 || e.zorros[0].progreso > 0.2
  }, null, { timeout: 5000 })
  const e = await pagina.evaluate(() => window.kusi.estado())
  expect(e.vida.captura.congelado).toBe(false)
  expect(e.vida.captura.congelados).toBe(1)
  expect(e.capturas).toBe(1)
})

test('con ?vida=0 la captura es inmediata, sin congelar ni temblar', async ({ page: pagina }) => {
  await servirPasillo(pagina, PASILLO_CON_ZORRO)
  const inicial = await abrir(pagina, '&vida=0')
  const camaraInicial = inicial.vida.captura.camara
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().capturas === 1, null, { timeout: 8000, polling: 'raf' })
  const muestras = await muestrear(pagina, 600, leerCaptura)
  for (const m of muestras) {
    expect(m.activo).toBe(false)
    expect(m.congelado).toBe(false)
    expect(m.congelados).toBe(0)
    expect(m.scroll).toEqual({ x: 0, y: 0 })
    expect(m.camara.scrollX).toBe(camaraInicial.scrollX)
    expect(m.camara.scrollY).toBe(camaraInicial.scrollY)
    expect(m.camara.zoom).toBe(camaraInicial.zoom)
  }
  expect(muestras[0].cuy.clave).toContain(':asustado')
  expect(muestras[0].invulnerable).toBe(true)
})
