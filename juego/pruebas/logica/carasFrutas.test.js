import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { OBJETOS_KIT } from '../../src/dibujos/kitFinal.js'
import { clavesDelPaquete, pedirDibujos, completarConFiguras } from '../../src/dibujos/dibujos.js'
import { FrutasVivas } from '../../src/efectos/FrutasVivas.js'
test('se cargan exactamente los ocho alimentos actuales como imágenes independientes sin cara',()=>{
 assert.deepEqual(OBJETOS_KIT,['fresa','platano','mango','mandarina','pina','zanahoria','papa','choclo'])
 const claves=clavesDelPaquete({retos:[]}),pedidos=[]
 pedirDibujos({load:{image:(...args)=>pedidos.push(args)}},claves)
 assert.equal(pedidos.length,8)
 for(const [tipo,ruta] of pedidos){
  assert.equal(ruta,'dibujos/'+tipo+'.png');assert.ok(!ruta.includes('-cara'))
  const p=readFileSync(new URL('../../public/'+ruta,import.meta.url));assert.equal(p.readUInt32BE(16),256);assert.equal(p.readUInt32BE(20),256)
 }
 assert.throws(()=>completarConFiguras({textures:{exists:()=>false}},claves),/Faltan ilustraciones/)
})
test('el vaivén conserva escala, eje horizontal y cuadro sin parpadeos',()=>{
 const d={visible:true,x:10,y:20,scaleX:1,scaleY:1,setFrame(){assert.fail('no se animan ojos ni caras')}}
 const frutas=new FrutasVivas({tweens:{isTweening:()=>false}},[d],[{x:10,y:20}],{casilla:70})
 const alturas=new Set()
 for(let i=0;i<360;i++){frutas.actualizar(1/60);alturas.add(d.y);assert.equal(d.x,10);assert.equal(d.scaleX,1);assert.equal(d.scaleY,1);assert.ok(Math.abs(d.y-20)<=2.8+1e-9)}
 assert.ok(alturas.size>50);assert.deepEqual(frutas.estado().parpadeos,[])
})
test('vida=0 conserva todas las posiciones y los cuadros sin crear relojes de ojos',()=>{
 const d={visible:true,x:10,y:20};const f=new FrutasVivas({tweens:{isTweening:()=>false}},[d],[{x:10,y:20}],{casilla:70,activo:false})
 const antes=f.estado();f.actualizar(100);assert.deepEqual(f.estado(),antes);assert.deepEqual(d,{visible:true,x:10,y:20})
})
