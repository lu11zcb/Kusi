import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { IMAGENES_KIT, OBJETOS_KIT, PIEZAS_MURO, RUTAS_KIT, texturaMuro, varianteMuro } from '../../kit/reproductor/dibujos/kitFinal.js'
const folder=new URL('../../kit/recursos/dibujos/',import.meta.url)
function medidas(ruta){const p=readFileSync(new URL(ruta,folder));assert.equal(p.toString('ascii',1,4),'PNG');return{ancho:p.readUInt32BE(16),alto:p.readUInt32BE(20),tipo:p[25]}}
test('el kit contiene los 2 cubos de muro y los ocho alimentos sin cara',()=>{
 assert.deepEqual([...PIEZAS_MURO],['muro-a','muro-b'])
 for(const pieza of PIEZAS_MURO)assert.deepEqual(medidas(RUTAS_KIT[pieza]),{ancho:256,alto:256,tipo:6})
 assert.equal(OBJETOS_KIT.length,8)
 for(const tipo of OBJETOS_KIT)assert.deepEqual(medidas('objetos/'+tipo+'.png'),{ancho:256,alto:256,tipo:6})
 for(const clave of IMAGENES_KIT)assert.ok(readFileSync(new URL(RUTAS_KIT[clave],folder)).length>100)
})
test('cada pieza del kit está en la carpeta de su tipo: mundo o interfaz',()=>{
 for(const ruta of Object.values(RUTAS_KIT))assert.match(ruta,/^(mundo|interfaz)\/[a-z0-9-]+\.png$/)
})
test('el muro solo depende de la variante del nivel y siempre da la misma para la misma casilla',()=>{
 const m=['###','#.#','###']
 for(let fila=0;fila<3;fila++)for(let columna=0;columna<3;columna++){
  const k=texturaMuro(m,fila,columna,'nivel2')
  assert.equal(k,'muro-'+varianteMuro('nivel2',fila,columna));assert.equal(k,texturaMuro(m,fila,columna,'nivel2'))
 }
 assert.equal(texturaMuro(['#'],0,0,'nivel1'),texturaMuro(['###','###','###'],0,0,'nivel1'))
})
