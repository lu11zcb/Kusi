import { test, expect } from '@playwright/test'
import { abrir, esperarCasilla, estado, muestrear, servirPasillo } from './ayudas/laberinto.js'

// Una sola fruta en el pasillo, a cuatro casillas del inicio.
const UNA_FRUTA = { objetos: [{ tipo: 'fresa', fila: 1, columna: 5 }], regla: { tipo: 'orden', secuencia: ['fresa'] } }

const leerPop = (e) => ({
  t: performance.now(), recogidos: e.regla.recogidos, casilla: e.casilla, ...e.vida.pop, fruta: e.vida.frutas[0],
})

// Espera, cuadro a cuadro, a que el cuy coma la primera fruta.
const esperarAComer = (pagina) => pagina.waitForFunction(
  () => window.kusi.estado().regla.recogidos >= 1, null, { timeout: 8000, polling: 'raf' },
)

test('la fruta hace pop (crece y desaparece) y salen cinco estrellitas', async ({ page: pagina }) => {
  await servirPasillo(pagina, UNA_FRUTA)
  const inicial = await abrir(pagina)
  const escalaBase = inicial.vida.frutas[0].escalaX
  expect(inicial.vida.pop.pops).toBe(0)
  await pagina.keyboard.press('ArrowRight')
  await esperarAComer(pagina)
  const muestras = await muestrear(pagina, 800, leerPop)

  expect(muestras[0].pops).toBe(1)
  expect(muestras[0].estrellitas).toBe(5)
  // El pop: crece bastante antes de irse y termina sin verse.
  expect(Math.max(...muestras.map((m) => m.fruta.escalaX))).toBeGreaterThan(escalaBase * 1.3)
  expect(muestras[0].fruta.visible).toBe(true)
  const desaparecida = muestras.find((m) => !m.fruta.visible)
  expect(desaparecida).toBeDefined()
  expect(desaparecida.t - muestras[0].t).toBeLessThan(400)
  expect(muestras.at(-1).fruta.alpha).toBe(0)

  // Salen 5 estrellitas, se alejan de la fruta en todas direcciones y se apagan.
  expect(Math.max(...muestras.map((m) => m.estrellitasVivas))).toBe(5)
  expect(muestras.at(-1).estrellitasVivas).toBe(0)
  const centro = muestras[0].ultimo
  const lejos = muestras.filter((m) => m.estrellas.length === 5).map((m) => ({
    media: m.estrellas.reduce((suma, estrella) => suma + Math.hypot(estrella.x - centro.x, estrella.y - centro.y), 0) / 5,
    estrellas: m.estrellas,
  })).sort((a, b) => b.media - a.media)[0]
  expect(lejos.media).toBeGreaterThan(inicial.casilla * 0.35)
  const angulos = lejos.estrellas.map((e) => Math.atan2(e.y - centro.y, e.x - centro.x)).sort((a, b) => a - b)
  for (let indice = 0; indice < 5; indice += 1) {
    const hueco = (angulos[(indice + 1) % 5] - angulos[indice] + Math.PI * 2) % (Math.PI * 2)
    expect(hueco).toBeLessThan(Math.PI * 0.75)
  }
})

test('cada fruta correcta suelta sus propias cinco estrellitas y la equivocada no hace pop', async ({ page: pagina }) => {
  await abrir(pagina)
  // En el nivel real las dos primeras frutas del pasillo superior son correctas.
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  const comidas = (await estado(pagina)).vida.pop
  expect(comidas.pops).toBe(2)
  expect(comidas.estrellitas).toBe(10)

  // Más adelante el plátano llega antes que la fresa: rebota y se queda donde estaba.
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 5, 9)
  await pagina.keyboard.press('ArrowLeft')
  await esperarCasilla(pagina, 5, 5)
  const final = await estado(pagina)
  expect(final.regla.errores).toBeGreaterThanOrEqual(1)
  expect(final.vida.pop.pops).toBe(2)
  expect(final.vida.pop.estrellitas).toBe(10)
  expect(final.vida.frutas[3].visible).toBe(true)
  expect(final.vida.frutas[3].alpha).toBe(1)
})

test('con ?vida=0 la fruta desaparece de golpe, sin pop ni estrellitas', async ({ page: pagina }) => {
  await servirPasillo(pagina, UNA_FRUTA)
  await abrir(pagina, '&vida=0')
  await pagina.keyboard.press('ArrowRight')
  await esperarAComer(pagina)
  const muestras = await muestrear(pagina, 500, leerPop)
  expect(muestras[0].activo).toBe(false)
  for (const m of muestras) {
    expect(m.fruta.visible).toBe(false)
    expect(m.pops).toBe(0)
    expect(m.estrellitas).toBe(0)
    expect(m.estrellitasVivas).toBe(0)
  }
})

// Recorrido del nivel 1 hasta el plátano equivocado: dos frutas correctas arriba y, al
// volver por el pasillo inferior, el plátano llega antes que la fresa.
async function caminarHastaElError(pagina) {
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 5, 9)
  await pagina.keyboard.press('ArrowLeft')
  await pagina.waitForFunction(
    () => window.kusi.estado().regla.errores >= 1, null, { timeout: 8000, polling: 'raf' },
  )
}

const leerSacudida = (e) => ({
  t: performance.now(),
  dx: e.vida.cuerpos.cuy.desplazamiento.x, dy: e.vida.cuerpos.cuy.desplazamiento.y,
  sacudiendo: e.vida.cuerpos.cuy.sacudiendo, sacudidas: e.vida.cuerpos.cuy.sacudidas,
  rotacion: e.vida.cuerpos.cuy.rotacion, escalaX: e.vida.cuerpos.cuy.escalaX, escalaBaseX: e.vida.cuerpos.cuy.escalaBaseX,
  moviendose: e.movimiento.moviendose, fruta: e.vida.frutas[3], casilla: e.casilla,
})

test('al comer mal la fruta rebota y el cuy sigue con su sprite sin deformarse', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  const base = inicial.vida.frutas[3]
  await caminarHastaElError(pagina)
  const muestras = await muestrear(pagina, 600, leerSacudida)

  for(const m of muestras){
    expect(m.sacudidas).toBe(0);expect(m.sacudiendo).toBe(false)
    expect(m.dx).toBe(0);expect(m.dy).toBe(0);expect(m.rotacion).toBe(0)
    expect(m.escalaX).toBe(m.escalaBaseX)
  }
  expect(muestras[0].moviendose).toBe(true)

  // La fruta equivocada rebota como siempre: sube y vuelve a su casilla, sin desaparecer.
  // Después sigue flotando unos píxeles alrededor de su sitio, como las demás.
  expect(Math.min(...muestras.map((m) => m.fruta.y))).toBeLessThan(base.y - inicial.casilla * 0.1)
  expect(Math.abs(muestras.at(-1).fruta.y - base.y)).toBeLessThan(inicial.casilla * 0.05)
  expect(muestras.at(-1).fruta.visible).toBe(true)
})

test('con ?vida=0 la fruta equivocada rebota y el cuy no se sacude', async ({ page: pagina }) => {
  const inicial = await abrir(pagina, '&vida=0')
  const base = inicial.vida.frutas[3]
  await caminarHastaElError(pagina)
  const muestras = await muestrear(pagina, 500, leerSacudida)
  for (const m of muestras) {
    expect(m.sacudidas).toBe(0)
    expect(m.sacudiendo).toBe(false)
    expect(m.dx).toBe(0)
  }
  expect(Math.min(...muestras.map((m) => m.fruta.y))).toBeLessThan(base.y - inicial.casilla * 0.1)
  expect(muestras.at(-1).fruta.y).toBeCloseTo(base.y, 1)
})
