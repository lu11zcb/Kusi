import { test, expect } from '@playwright/test'
import { FLOTAR } from '../kit/reproductor/efectos/FrutasVivas.js'
import { abrir, esperarCasilla, estado, muestrear } from './ayudas/laberinto.js'

// El tiempo del navegador y lo que se alejó cada fruta de su casilla, en píxeles.
const leerFrutas = (e) => ({
  // El reloj del propio efecto, en milisegundos: no depende de cuánto tarde en dibujar el navegador.
  t: e.vida.frutasVivas.tiempo * 1000, desplazamientos: e.vida.frutasVivas.desplazamientos,
  frutas: e.vida.frutas.map((fruta) => ({ x: fruta.x, y: fruta.y, visible: fruta.visible })),
})

// Instantes, en milisegundos, en que una serie cruza el cero hacia arriba (hacia y menor).
function cruces(muestras, indice) {
  const instantes = []
  for (let posicion = 1; posicion < muestras.length; posicion += 1) {
    if (muestras[posicion - 1].desplazamientos[indice] > 0 && muestras[posicion].desplazamientos[indice] <= 0) {
      instantes.push(muestras[posicion].t)
    }
  }
  return instantes
}

test('las frutas suben y bajan muy despacio, cada una con un desfase distinto', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  const amplitud = FLOTAR.amplitud * inicial.casilla
  const muestras = await muestrear(pagina, 8200, leerFrutas)
  const cantidad = inicial.vida.frutas.length
  expect(cantidad).toBe(4)

  for (let indice = 0; indice < cantidad; indice += 1) {
    const serie = muestras.map((m) => m.desplazamientos[indice])
    // Unos píxeles hacia cada lado de su sitio.
    expect(Math.max(...serie)).toBeGreaterThan(amplitud * 0.9)
    expect(Math.max(...serie)).toBeLessThan(amplitud + 0.05)
    expect(Math.min(...serie)).toBeLessThan(-amplitud * 0.9)
    expect(Math.min(...serie)).toBeGreaterThan(-amplitud - 0.05)
    // Se quedan en su columna: solo suben y bajan.
    expect(new Set(muestras.map((m) => m.frutas[indice].x)).size).toBe(1)
    // Muy despacio: la velocidad máxima es de pocos píxeles por segundo. Se mide en
    // ventanas de 150 ms, porque dos muestras del mismo cuadro tienen casi el mismo
    // instante y dividir entre un tiempo tan corto exagera la velocidad.
    let velocidadMaxima = 0
    for (let desde = 0, hasta = 0; desde < muestras.length; desde += 1) {
      while (hasta < muestras.length - 1 && muestras[hasta].t - muestras[desde].t < 150) hasta += 1
      const segundos = (muestras[hasta].t - muestras[desde].t) / 1000
      if (segundos >= 0.15) velocidadMaxima = Math.max(velocidadMaxima, Math.abs(serie[hasta] - serie[desde]) / segundos)
    }
    expect(velocidadMaxima).toBeGreaterThan(1)
    expect(velocidadMaxima).toBeLessThan(10)
    // Una subida y bajada completa cada 3 segundos.
    const entradas = cruces(muestras, indice)
    expect(entradas.length).toBeGreaterThanOrEqual(2)
    for (let posicion = 1; posicion < entradas.length; posicion += 1) {
      expect(entradas[posicion] - entradas[posicion - 1]).toBeGreaterThan(FLOTAR.periodo * 1000 * 0.93)
      expect(entradas[posicion] - entradas[posicion - 1]).toBeLessThan(FLOTAR.periodo * 1000 * 1.07)
    }
  }

  // Ninguna pareja se mueve a la par: sus alturas se separan al menos 0,4 de la amplitud.
  for (let primera = 0; primera < cantidad; primera += 1) {
    for (let segunda = primera + 1; segunda < cantidad; segunda += 1) {
      const separacion = Math.max(...muestras.map((m) => Math.abs(m.desplazamientos[primera] - m.desplazamientos[segunda])))
      expect(separacion).toBeGreaterThan(amplitud * 0.4)
    }
  }
})

test('la fruta comida deja de flotar y las demás siguen', async ({ page: pagina }) => {
  await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  // Las dos primeras frutas ya se comieron; se espera a que termine su pop.
  await pagina.waitForTimeout(400)
  const muestras = await muestrear(pagina, 1800, leerFrutas)
  for (const indice of [0, 1]) {
    expect(muestras.every((m) => !m.frutas[indice].visible)).toBe(true)
  }
  for (const indice of [2, 3]) {
    const ys = muestras.map((m) => m.frutas[indice].y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(1)
    expect(muestras.every((m) => m.frutas[indice].visible)).toBe(true)
  }
})

test('al terminar el rebote de la fruta equivocada vuelve a flotar sin saltos', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 5, 9)
  await pagina.keyboard.press('ArrowLeft')
  await pagina.waitForFunction(
    () => window.kusi.estado().regla.errores >= 1, null, { timeout: 8000, polling: 'raf' },
  )
  const muestras = await muestrear(pagina, 1500, leerFrutas)
  // El rebote dura 0,22 s; en lo que sigue la fruta vuelve a su vaivén con suavidad.
  const despues = muestras.filter((m) => m.t - muestras[0].t > 350)
  let saltoMaximo = 0
  for (let posicion = 1; posicion < despues.length; posicion += 1) {
    saltoMaximo = Math.max(saltoMaximo, Math.abs(despues[posicion].frutas[3].y - despues[posicion - 1].frutas[3].y))
  }
  expect(saltoMaximo).toBeLessThan(1.2)
  expect(Math.abs(despues.at(-1).desplazamientos[3])).toBeLessThanOrEqual(FLOTAR.amplitud * inicial.casilla + 0.05)
})

test('con ?vida=0 las frutas se quedan quietas en su casilla', async ({ page: pagina }) => {
  await abrir(pagina, '&vida=0')
  const muestras = await muestrear(pagina, 3200, leerFrutas)
  for (const m of muestras) {
    for (const desplazamiento of m.desplazamientos) expect(desplazamiento).toBe(0)
  }
  expect((await estado(pagina)).vida.frutasVivas.activo).toBe(false)
})
