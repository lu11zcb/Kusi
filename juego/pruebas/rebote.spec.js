import { test, expect } from '@playwright/test'
import { abrir, estado, muestrear, servirPasillo } from './ayudas/laberinto.js'
const LEJANA={objetos:[{tipo:'fresa',fila:1,columna:10}],regla:{tipo:'orden',secuencia:['fresa']}}
const sinDeformar=c=>{expect(c.activo).toBe(false);expect(c.escalaX).toBe(c.escalaBaseX);expect(c.escalaY).toBe(c.escalaBaseY);expect(c.rotacion).toBe(0);expect(c.desplazamiento).toEqual({x:0,y:0});expect(c.aplaste).toBe(0);expect(c.altura).toBe(0)}
test('el caminar del cuy usa tres dibujos y conserva la forma y el apoyo',async({page})=>{
 await servirPasillo(page,LEJANA);await abrir(page);await page.keyboard.press('ArrowRight')
 const m=await muestrear(page,1300,e=>({frame:e.animacionCuy.fotograma,estado:e.animacionCuy.estado,c:e.vida.cuerpos.cuy}))
 const andando=m.filter(x=>x.estado==='caminar');expect(andando.length).toBeGreaterThan(20)
 expect(new Set(andando.map(x=>x.frame)).size).toBe(3)
 andando.forEach(x=>sinDeformar(x.c))
})
test('la sombra permanece exactamente en el apoyo mientras cambian los cuadros del cuy',async({page})=>{
 await servirPasillo(page,LEJANA);await abrir(page);await page.keyboard.press('ArrowRight')
 const m=await muestrear(page,1100,e=>({s:e.vida.sombras.cuy,x:e.cuyX,y:e.cuyY,casilla:e.casilla,c:e.vida.cuerpos.cuy}))
 for(const x of m){expect(x.s.x).toBeCloseTo(x.x,6);expect(x.s.y).toBeCloseTo(x.y-x.casilla*.1,6);sinDeformar(x.c)}
})
test('el zorro patrulla con tres poses de su hoja sin estirar el overol ni mover el anclaje',async({page})=>{
 await servirPasillo(page,{...LEJANA,zorros:[9]});await abrir(page);await page.keyboard.press('ArrowRight')
 const m=await muestrear(page,1200,e=>({frame:e.zorros[0].fotograma,c:e.vida.cuerpos.zorros[0]}))
 expect(new Set(m.map(x=>x.frame)).size).toBeGreaterThanOrEqual(3);m.forEach(x=>sinDeformar(x.c))
})
test('al detenerse conserva exactamente el tamaño y el apoyo del sprite, sin una deformación residual',async({page})=>{
 await servirPasillo(page,LEJANA);await abrir(page);await page.keyboard.press('ArrowRight')
 await page.waitForFunction(()=>{const e=window.kusi.estado();return e.movimiento.columna===11&&!e.movimiento.moviendose})
 const e=await estado(page);sinDeformar(e.vida.cuerpos.cuy);expect(e.vida.cuerpos.cuy.respiracion).toBe(0)
})
test('con vida=0 caminar sigue usando los cuadros ilustrados sin estirar ni aplastar el cuerpo',async({page})=>{
 await servirPasillo(page,LEJANA)
 const inicial=await abrir(page,'&vida=0')
 expect(inicial.animacionCuy).toMatchObject({estado:'reposo',fotograma:1})
 await page.keyboard.press('ArrowRight')
 // La tecla se procesa en el siguiente update de Phaser. Antes de ese update
 // todavía está el reposo frontal 1; no pertenece al ciclo lateral 3,4,5.
 await page.waitForFunction(()=>{
  const a=window.kusi.estado().animacionCuy
  return a.estado==='caminar'&&a.clave==='cuy-nino-animado-v1:derecha:caminar_lado'
 })
 const m=await muestrear(page,1100,e=>({a:e.animacionCuy,parpadeos:e.vida.parpadeos,c:e.vida.cuerpos.cuy}))
 expect([...new Set(m.map(x=>x.a.fotograma))].sort()).toEqual([3,4,5])
 for(const x of m){
  expect(x.a).toMatchObject({estado:'caminar',clave:'cuy-nino-animado-v1:derecha:caminar_lado'})
  expect(x.parpadeos).toBe(0);sinDeformar(x.c)
 }
})
