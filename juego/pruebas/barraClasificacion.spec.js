import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { abrir, estado, leerPaquete, servirPaquete } from './ayudas/laberinto.js'

test('la barra de clasificación muestra las frutas reales y marca la elegida sin exigir orden', async ({ page }) => {
  const paquete = await leerPaquete()
  paquete.retos = [{ ...paquete.retos[0],
    mapa: ['#########', '#C..#..P#', '###.#.#.#', '#.......#', '#########'],
    regla: { tipo: 'solo_clase', clase: 'fruta', meta: 3 },
    objetos: [{ tipo: 'fresa', fila: 3, columna: 1 }, { tipo: 'mango', fila: 1, columna: 3 },
      { tipo: 'pina', fila: 1, columna: 5 }, { tipo: 'zanahoria', fila: 3, columna: 7 }],
    enemigos: [],
  }]
  await servirPaquete(page, paquete)
  const a = await abrir(page, '&vida=0')
  expect(a.barra.estados.map(f => f.tipo)).toEqual(['fresa', 'mango', 'pina'])
  expect(a.barra.estados.every(f => f.estado === 'disponible')).toBe(true)
  expect(a.barra.indicacion).toContain('En cualquier orden')
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => window.kusi.estado().regla.recogidos === 1)
  const b = await estado(page)
  expect(b.barra.estados.map(f => f.estado)).toEqual(['disponible', 'recogida', 'disponible'])
  expect(b.barra.indicacion).toContain('1/3')
})

test('la clasificación de verduras no muestra fresas como objetivos', async ({ page }) => {
  const paquete = JSON.parse(await readFile(
    new URL('./fixtures/laberinto-solo-clase.json', import.meta.url), 'utf8'))
  await servirPaquete(page, paquete)
  const e = await abrir(page, '&nivel=2&vida=0')
  expect(e.barra.estados.map(f => f.tipo)).toEqual(['zanahoria', 'papa', 'choclo'])
  expect(e.barra.estados.every(f => f.textura === f.tipo)).toBe(true)
  expect(e.barra.indicacion).toContain('0/3')
})
