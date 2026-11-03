import { test, expect } from '@playwright/test'
import { abrir, estado, servirPasillo } from './ayudas/laberinto.js'
import { ESTRELLITAS } from '../src/efectos/PopFruta.js'
import { CONFETI } from '../src/efectos/PuertaViva.js'

// El laberinto dibuja con Canvas. Estas pruebas leen los puntos del lienzo tal
// como se ven y comprueban que la capa de vida de verdad se pinta en él, no solo
// que su estado cambie. Con 1280 × 720 un punto del mundo es un punto del lienzo.
const TOLERANCIA = 6

// Cuenta los puntos de la región cuyo color está cerca de alguno de «colores»
// (números 0xRRGGBB). Se ejecuta en la página; devuelve el total.
function contarColores({ region, colores, tolerancia }) {
  const lienzo = document.querySelector('canvas')
  const x = Math.max(0, Math.round(region.x))
  const y = Math.max(0, Math.round(region.y))
  const ancho = Math.min(lienzo.width - x, Math.round(region.ancho))
  const alto = Math.min(lienzo.height - y, Math.round(region.alto))
  const { data } = lienzo.getContext('2d').getImageData(x, y, ancho, alto)
  let cuenta = 0
  for (let punto = 0; punto < data.length; punto += 4) {
    for (const color of colores) {
      if (Math.abs(data[punto] - ((color >> 16) & 255)) <= tolerancia &&
        Math.abs(data[punto + 1] - ((color >> 8) & 255)) <= tolerancia &&
        Math.abs(data[punto + 2] - (color & 255)) <= tolerancia) {
        cuenta += 1
        break
      }
    }
  }
  return cuenta
}

// Brillo medio (0 a 255) de una región del lienzo.
function brilloMedio({ region }) {
  const lienzo = document.querySelector('canvas')
  const { data } = lienzo.getContext('2d').getImageData(Math.round(region.x), Math.round(region.y),
    Math.round(region.ancho), Math.round(region.alto))
  let suma = 0
  for (let punto = 0; punto < data.length; punto += 4) suma += (data[punto] + data[punto + 1] + data[punto + 2]) / 3
  return suma / (data.length / 4)
}

const contar = (pagina, region, colores) => pagina.evaluate(contarColores, { region, colores, tolerancia: TOLERANCIA })

// Espera a que, en algún cuadro, la región tenga al menos «minimo» puntos de esos
// colores, y devuelve cuántos tenía.
async function esperarColores(pagina, region, colores, minimo) {
  const total = await pagina.waitForFunction(({ funcion, argumentos, minimo }) => {
    const cuenta = new Function('argumentos', 'return (' + funcion + ')(argumentos)')(argumentos)
    return cuenta >= minimo ? cuenta : false
  }, { funcion: contarColores.toString(), argumentos: { region, colores, tolerancia: TOLERANCIA }, minimo },
  { polling: 'raf', timeout: 8000 })
  return total.jsonValue()
}

test('la sombra del cuy oscurece el piso en el lienzo, y con ?vida=0 no hay nada', async ({ page: pagina }) => {
  const conVida = await abrir(pagina)
  const sombra = conVida.vida.sombras.cuy
  const region = { x: sombra.x - sombra.ancho / 2, y: sombra.y - sombra.alto / 2, ancho: sombra.ancho, alto: sombra.alto }
  await pagina.waitForTimeout(300)
  const brilloConVida = await pagina.evaluate(brilloMedio, { region })

  const otra = await pagina.context().newPage()
  const sinVida = await abrir(otra, '&vida=0')
  expect(sinVida.vida.sombras.cuy).toBeNull()
  await otra.waitForTimeout(300)
  const brilloSinVida = await otra.evaluate(brilloMedio, { region })
  // La sombra de 0,15 de opacidad aclara menos de lo que oscurece: baja el brillo medio.
  expect(brilloConVida).toBeLessThan(brilloSinVida - 4)
})

test('al comer bien, las estrellitas se pintan en el lienzo', async ({ page: pagina }) => {
  await servirPasillo(pagina, {
    objetos: [{ tipo: 'fresa', fila: 1, columna: 5 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
  })
  const inicial = await abrir(pagina)
  const fruta = inicial.vida.frutas[0]
  const region = { x: fruta.x - 130, y: fruta.y - 120, ancho: 260, alto: 240 }
  expect(await contar(pagina, region, ESTRELLITAS.colores)).toBeLessThan(5)
  await pagina.keyboard.press('ArrowRight')
  const pintados = await esperarColores(pagina, region, ESTRELLITAS.colores, 60)
  expect(pintados).toBeGreaterThanOrEqual(60)
  expect((await estado(pagina)).vida.pop.estrellitasVivas).toBeGreaterThan(0)
})

test('al abrirse la puerta, el confeti se pinta en el lienzo', async ({ page: pagina }) => {
  await servirPasillo(pagina, {
    objetos: [{ tipo: 'fresa', fila: 1, columna: 3 }], regla: { tipo: 'orden', secuencia: ['fresa'] },
  })
  const inicial = await abrir(pagina)
  const base = inicial.vida.puerta.base
  const region = { x: base.x - 130, y: base.y - 260, ancho: 260, alto: 300 }
  // Rosa, celeste y verde: colores que no tiene el piso, el adobe ni la puerta.
  const colores = [0xf28ab2, 0x8fd0ef, 0x5aa04a]
  const antes = await contar(pagina, region, colores)
  await pagina.keyboard.press('ArrowRight')
  const pintados = await esperarColores(pagina, region, colores, antes + 30)
  expect(pintados).toBeGreaterThanOrEqual(antes + 30)
  expect((await estado(pagina)).vida.puerta.confetiVivo).toBeGreaterThan(0)
  expect(CONFETI.colores).toContain(0xf28ab2)
})
