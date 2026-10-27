import { test, expect } from '@playwright/test'
import { abrir, estado, muestrear, servirPasillo } from './ayudas/laberinto.js'
const LEJANA={objetos:[{tipo:'fresa',fila:1,columna:10}],regla:{tipo:'orden',secuencia:['fresa']}}
async function vozBreve(page){await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(frase){frase.onstart?.();setTimeout(()=>frase.onend?.(),20)}}}))}
test('Kusi saluda al entrar y luego respira y parpadea con sus filas ilustradas',async({page})=>{
 await vozBreve(page);await abrir(page)
 const saludo=await muestrear(page,1050,e=>e.kusiAnimado)
 expect(saludo.some(e=>e.animacion==='saludar')).toBe(true)
 expect(new Set(saludo.filter(e=>e.animacion==='saludar').map(e=>e.cuadro)).size).toBe(3)
 await page.waitForTimeout(300)
 const m=await muestrear(page,6200,e=>e.kusiAnimado)
 expect(new Set(m.filter(e=>e.animacion==='respirar').map(e=>e.cuadro)).size).toBe(3)
 expect(m.some(e=>e.animacion==='parpadear'&&e.cuadro===8)).toBe(true)
})
test('respirar y parpadear no escalan, trasladan ni cortan el cuerpo de Kusi',async({page})=>{
 await vozBreve(page);const a=await abrir(page);await page.waitForTimeout(1400)
 const m=await muestrear(page,2800,e=>e.presentacion.kusi)
 for(const k of m)expect(k).toEqual(a.presentacion.kusi)
 expect(a.presentacion.kusi.x+a.presentacion.kusi.ancho).toBeLessThan(a.origenMapa.x)
})
test('Kusi puede respirar mientras el niño camina con sus propios cuadros',async({page})=>{
 await vozBreve(page);await servirPasillo(page,LEJANA);await abrir(page);await page.waitForTimeout(1400);await page.keyboard.press('ArrowRight')
 const m=await muestrear(page,1300,e=>({k:e.kusiAnimado,c:e.vida.cuerpos.cuy,camina:e.animacionCuy.estado}))
 expect(m.some(x=>x.k.animacion==='respirar')).toBe(true);expect(m.some(x=>x.camina==='caminar')).toBe(true)
 for(const x of m){expect(x.c.escalaX).toBe(x.c.escalaBaseX);expect(x.c.escalaY).toBe(x.c.escalaBaseY)}
})
test('el zorro quieto mantiene su dibujo y Kusi conserva la animación de guía',async({page})=>{
 await vozBreve(page);const a=await abrir(page,'&nivel=2');await page.waitForTimeout(1400)
 const m=await muestrear(page,2500,e=>({z:e.zorros[0].fotograma,c:e.vida.cuerpos.zorros[0],k:e.kusiAnimado}))
 for(const x of m){expect(x.z).toBe(a.zorros[0].fotograma);expect(x.c.escalaX).toBe(x.c.escalaBaseX);expect(x.c.escalaY).toBe(x.c.escalaBaseY)}
 expect(new Set(m.map(x=>x.k.cuadro)).size).toBeGreaterThanOrEqual(3)
})
test('vida=0 deja quietos a Kusi y al cuy sin desactivar la partida',async({page})=>{
 await vozBreve(page);await abrir(page,'&vida=0');const m=await muestrear(page,2000,e=>({k:e.kusiAnimado,c:e.vida.cuerpos.cuy}))
 for(const x of m){expect(x.k.cuadro).toBe(9);expect(x.c.escalaY).toBe(x.c.escalaBaseY);expect(x.c.desplazamiento).toEqual({x:0,y:0})}
})
