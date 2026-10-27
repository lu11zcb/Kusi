import { test, expect } from '@playwright/test'
import { abrir, estado, muestrear, esperarCasilla } from './ayudas/laberinto.js'
test('los ocho dibujos no tienen ciclos de cara y la barra representa sus tres estados',async({page})=>{
 await abrir(page,'&nivel=2')
 const muestras=await muestrear(page,1600,e=>e.vida.frutas)
 expect(muestras.every(fs=>fs.every(f=>!f.textura.endsWith('-cara')&&f.cuadro==='__BASE'))).toBe(true)
 const e=await estado(page);expect(new Set(e.vida.frutas.map(f=>f.escalaX)).size).toBe(1)
 expect(e.vida.frutasVivas.parpadeos).toEqual([])
 expect(e.barra.estados.map(f=>f.estado)).toEqual(['siguiente','pendiente','pendiente','pendiente'])
 expect(e.barra.estados.map(f=>f.textura)).toEqual(['mango','mandarina','mango','mandarina'])
 await page.keyboard.press('ArrowRight');await esperarCasilla(page,1,13)
 const b=await estado(page);expect(b.barra.estados.map(f=>f.estado)).toEqual(['recogida','recogida','siguiente','pendiente'])
 expect(b.barra.estados.map(f=>f.textura)).toEqual(['mango','mandarina','mango','mandarina'])
 expect(b.barra.estados[2].destello).toBeGreaterThanOrEqual(0);expect(b.barra.estados[2].destello).toBeLessThan(3)
})
test('vida=0 mantiene dibujos y posiciones quietos sin ojos ni destellos animados',async({page})=>{
 const a=await abrir(page,'&nivel=2&vida=0');await page.waitForTimeout(2500);const b=await estado(page)
 expect(b.vida.frutas).toEqual(a.vida.frutas);expect(b.vida.frutasVivas.parpadeos).toEqual([])
 expect(b.barra.estados.every(f=>f.destello===0)).toBe(true);expect(b.kusiAnimado.cuadro).toBe(9)
})
