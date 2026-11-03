import { test, expect } from '@playwright/test'
import { abrir, servirPasillo, muestrear } from './ayudas/laberinto.js'
const FRUTA={objetos:[{tipo:'fresa',fila:1,columna:3}],regla:{tipo:'orden',secuencia:['fresa']}}
for (const vida of [true,false]) {
  test('el portal abre pegado al suelo con vida='+vida,async({page:pagina})=>{
    await servirPasillo(pagina,FRUTA)
    await abrir(pagina,vida?'':'&vida=0')
    await pagina.keyboard.press('ArrowRight')
    await pagina.waitForFunction(()=>window.kusi.estado().puertaAbierta)
    const muestras=await muestrear(pagina,1800,e=>e.vida.puerta)
    for (const m of muestras) {
      expect(m.puerta.textura).toBe('portal-abierto')
      expect(m.puerta.y).toBe(m.base.y)
      expect(m.puerta.escalaY).toBe(m.base.escalaY)
      expect(m.aperturas).toBe(vida?1:0)
    }
    if (vida) expect(Math.max(...muestras.map(m=>m.brillo))-Math.min(...muestras.map(m=>m.brillo))).toBeGreaterThan(.08)
    else expect(muestras.every(m=>m.brillo===0)).toBe(true)
  })
}
