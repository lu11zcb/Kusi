import { test, expect } from '@playwright/test'
import { capturar } from '../../taller/trabajador/comprobar.js'
import { medirCaptura, motivosDePantalla } from '../../taller/trabajador/pantalla.js'

// La captura de pantalla del taller (taller/trabajador/pantalla.js): se prueba con páginas inventadas, sin ningún
// juego, que la captura reducida a 320 × 180 llega bien y que se distinguen las franjas del color del lienzo.

const LIENZO = '#8fd0ef'
const pagina = (cuerpo) => '<body style="margin:0;width:1280px;height:720px;background:' + LIENZO + ';position:relative">' + cuerpo + '</body>'
const mundo = (arriba, abajo) =>
  '<div style="position:absolute;left:0;right:0;top:' + arriba + 'px;bottom:' + abajo + 'px;background:linear-gradient(90deg,#3a7d44,#d9a441,#a64b2a,#6b4c9a,#2f6f8f)"></div>'

test.use({ viewport: { width: 1280, height: 720 } })

test('un mundo que llena la pantalla se captura sin franjas del color del lienzo', async ({ page }) => {
  await page.setContent(pagina(mundo(0, 0)))
  const captura = await capturar(page)
  expect(captura.ancho).toBe(320)
  expect(captura.alto).toBe(180)
  expect(captura.datos.length).toBe(320 * 180 * 4)
  const medida = medirCaptura(captura)
  expect(medida.lienzo).toBeLessThan(0.01)
  expect(medida.colores).toBeGreaterThanOrEqual(4)
})

test('un mundo recortado a una tira deja franjas del color del lienzo y se rechaza', async ({ page }) => {
  // Como el juego de los títeres: el mundo entre 170 y 520 px de 720.
  await page.setContent(pagina(mundo(170, 200)))
  const inicio = await capturar(page)
  expect(medirCaptura(inicio).lienzo).toBeGreaterThan(0.25)
  const motivos = motivosDePantalla({ inicio })
  expect(motivos).toHaveLength(1)
  expect(motivos[0]).toMatch(/no llena la pantalla/)
})

test('una página quieta se ve congelada y una que cambia con las flechas, no', async ({ page }) => {
  await page.setContent(pagina(mundo(0, 0)) + '<script>let x = 0; addEventListener("keydown", () => { document.querySelector("div").style.transform = "translateX(" + (x += 120) + "px)" })</script>')
  const inicio = await capturar(page)
  const reposo = await capturar(page)
  const quieta = await capturar(page)
  expect(motivosDePantalla({ inicio, reposo, conFlechas: quieta }).join(' ')).toMatch(/congelado/)
  await page.keyboard.press('ArrowRight')
  const conFlechas = await capturar(page)
  expect(motivosDePantalla({ inicio, reposo, conFlechas })).toEqual([])
})
