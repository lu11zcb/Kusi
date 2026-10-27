import { test, expect } from '@playwright/test'
import { abrir, estado } from './ayudas/laberinto.js'
test('pasto, arbustos y flores avanzan sus sprites sin empezar la partida ni mover sus raíces',async({page})=>{
 const a=await abrir(page,'&nivel=2');await page.waitForTimeout(750);const b=await estado(page)
 expect(b.vida.chacra.tiempo).toBeGreaterThan(a.vida.chacra.tiempo)
 expect(b.vida.chacra.plantas).not.toEqual(a.vida.chacra.plantas)
 expect(b.vida.chacra.vista).toBe('cenital')
 expect(b.vida.chacra.plantas.map(({x,y,lado})=>({x,y,lado}))).toEqual(a.vida.chacra.plantas.map(({x,y,lado})=>({x,y,lado})))
 expect(b.movimiento.moviendose).toBe(false)
 for(const p of b.vida.chacra.plantas){expect(p.cuadro).toBeGreaterThanOrEqual(0);expect(p.cuadro).toBeLessThan(4)}
 expect(new Set(b.vida.chacra.plantas.map(p=>p.clave)).size).toBe(4)
})
test('vida=0 conserva todas las capas visibles y quietas con sus cuadros iniciales',async({page})=>{
 const a=await abrir(page,'&nivel=2&vida=0');await page.waitForTimeout(1000);expect((await estado(page)).vida.chacra).toEqual(a.vida.chacra)
 expect(a.vida.chacra.plantas.length).toBeGreaterThan(10)
 for(const p of a.vida.chacra.plantas)expect(p.cuadro).toBe(0)
})

test('el zorro del nivel 2 explora aunque el cuy no reciba ninguna acción',async({page})=>{
 const a=await abrir(page,'&nivel=2')
 await page.waitForFunction(()=>Object.keys(window.kusi.estado().zorros[0].visitas).length>=4)
 const b=await estado(page)
 expect(b.movimiento).toEqual(a.movimiento)
 expect(b.zorros[0].x!==a.zorros[0].x||b.zorros[0].y!==a.zorros[0].y).toBe(true)
 expect(await page.evaluate(()=>window.kusi.avisos.some(a=>a.tipo==='inicio'))).toBe(false)
})
