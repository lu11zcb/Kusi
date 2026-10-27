import { test, expect } from '@playwright/test'
import { abrir, estado, leerPaquete, servirPaquete, muestrear } from './ayudas/laberinto.js'
test('Kusi y el globo están a la derecha, el mando a la izquierda y la barra arriba',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{cancel(){},speak(frase){frase.onstart?.();setTimeout(()=>frase.onend?.(),2500)}}}))
 const e=await abrir(page,'&nivel=2')
 expect(e.casilla).toBe(70);expect(e.origenMapa).toEqual({x:200,y:88})
 expect(e.presentacion.guia.x).toBeGreaterThan(e.presentacion.mapa.x+e.presentacion.mapa.ancho)
 expect(e.presentacion.barra.y).toBe(4)
 expect(e.joystick.centro.x+e.joystick.radio).toBeLessThan(e.presentacion.mapa.x)
 const ayuda=await page.evaluate(()=>window.kusi.ubicar('ayuda'));await page.mouse.click(ayuda.x,ayuda.y)
 expect((await estado(page)).consigna).not.toBe(e.consigna)
 await page.waitForFunction(()=>window.kusi.estado().kusiAnimado.animacion==='hablar')
 const boca=await muestrear(page,650,s=>s.kusiAnimado.cuadro)
 expect(new Set(boca).size).toBe(3);expect(boca.every(f=>f>=0&&f<3)).toBe(true)
 const escuchar=await page.evaluate(()=>window.kusi.ubicar('sonido'));await page.mouse.click(escuchar.x,escuchar.y)
 expect((await estado(page)).consigna).toBe(e.consigna)
})
test('la consigna de 90 caracteres cabe completa con margen en la columna derecha',async({page})=>{
 const larga='Sigue el patrón de la barra y busca el camino. Mira con calma antes de llegar a la puerta.'
 expect(larga.length).toBe(90);const p=await leerPaquete();p.retos[0].consigna=larga;p.retos[0].ayudas[0]=larga;await servirPaquete(page,p)
 const comprobar=e=>{
  expect(e.consigna).toBe(larga);const {texto,interior}=e.presentacion.textoKusi
  expect(texto.x).toBeGreaterThanOrEqual(interior.x);expect(texto.y).toBeGreaterThanOrEqual(interior.y)
  expect(texto.ancho).toBeLessThanOrEqual(interior.ancho);expect(texto.alto).toBeLessThanOrEqual(interior.alto)
  expect(e.presentacion.globo.x).toBeGreaterThan(e.presentacion.mapa.x+e.presentacion.mapa.ancho)
  expect(e.presentacion.globo.y+e.presentacion.globo.alto).toBeLessThan(e.presentacion.kusi.y)
 }
 comprobar(await abrir(page,'&vida=0'));const ayuda=await page.evaluate(()=>window.kusi.ubicar('ayuda'));await page.mouse.click(ayuda.x,ayuda.y);comprobar(await estado(page))
})
