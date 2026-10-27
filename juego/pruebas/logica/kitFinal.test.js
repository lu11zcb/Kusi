import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { IMAGENES_KIT, OBJETOS_KIT, PIEZAS_MURO, vecinosMuro, texturaMuro } from '../../src/dibujos/kitFinal.js'
const folder=new URL('../../public/dibujos/',import.meta.url)
function medidas(ruta){const p=readFileSync(new URL(ruta,folder));assert.equal(p.toString('ascii',1,4),'PNG');return{ancho:p.readUInt32BE(16),alto:p.readUInt32BE(20),tipo:p[25]}}
test('el kit contiene las 32 claves de cubo y los ocho alimentos sin cara',()=>{
 assert.equal(new Set(PIEZAS_MURO).size,32)
 for(const pieza of PIEZAS_MURO)assert.deepEqual(medidas('kit-final/'+pieza+'.png'),{ancho:256,alto:256,tipo:6})
 assert.equal(OBJETOS_KIT.length,8)
 for(const tipo of OBJETOS_KIT)assert.deepEqual(medidas(tipo+'.png'),{ancho:256,alto:256,tipo:6})
 for(const clave of IMAGENES_KIT)assert.ok(readFileSync(new URL('kit-final/'+clave+'.png',folder)).length>100)
})
test('ADBI respeta extremos, cruces y límites sin inventar vecinos',()=>{
 assert.equal(vecinosMuro(['#'],0,0),'0000');assert.equal(vecinosMuro(['###','###','###'],1,1),'1111')
 assert.equal(vecinosMuro(['###','#..'],0,0),'0110')
 const m=['###','#.#','###'],k=texturaMuro(m,0,1,'nivel2');assert.match(k,/^muro-0101-[ab]$/);assert.equal(k,texturaMuro(m,0,1,'nivel2'))
})
