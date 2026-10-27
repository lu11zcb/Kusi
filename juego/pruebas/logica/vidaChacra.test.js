import test from 'node:test'
import assert from 'node:assert/strict'
import { VidaChacra, distribuirVegetacion } from '../../src/efectos/VidaChacra.js'
import { SPRITES_CENITALES } from '../../src/dibujos/estiloFinal.js'
import { calcularDisposicion } from '../../src/logica/disposicionLaberinto.js'
import { leerPng } from '../ayudas/png.js'
import { createHash } from 'node:crypto'
const escena=()=>({disposicion:calcularDisposicion({ancho:1600,filas:9,columnas:15}),add:{image:(x,y,key,frame)=>({x,y,key,frame:{name:frame},visible:true,
 setOrigin(){return this},setDisplaySize(){return this},setDepth(){return this},setX(x){this.x=x;return this},setFrame(f){this.frame.name=f;return this},setPosition(x,y){this.x=x;this.y=y;return this},setVisible(v){this.visible=v;return this}})}})
test('el viento anima cuadros distintos del pasto, arbustos y flores sin mover sus raíces',()=>{
 const v=new VidaChacra(escena());const antes=v.estado();v.actualizar(.73);const luego=v.estado()
 assert.equal(luego.vista,'cenital');assert.notDeepEqual(luego.plantas,antes.plantas)
 assert.equal(new Set(luego.plantas.map(p=>p.clave)).size,4)
 assert.deepEqual(luego.plantas.map(({x,y,lado})=>({x,y,lado})),antes.plantas.map(({x,y,lado})=>({x,y,lado})))
 for(let i=0;i<100;i++){v.actualizar(.13);assert.ok(v.estado().plantas.every(p=>p.cuadro>=0&&p.cuadro<4))}
})
test('vida=0 conserva todas las ilustraciones y cuadros quietos en vez de quitar capas',()=>{
 const v=new VidaChacra(escena(),{activo:false}),antes=v.estado();v.actualizar(100)
 assert.deepEqual(v.estado(),antes);assert.ok(antes.plantas.length>10)
 for(const p of antes.plantas){assert.equal(p.cuadro,0);assert.equal(p.visible,true)}
})

test('el jardín deja libres todos los pasillos en pantallas y mapas de distintos tamaños',()=>{
 for(const ancho of [1280,1600,1840])for(const [filas,columnas]of[[7,11],[9,15],[13,19]]){
  const d=calcularDisposicion({ancho,filas,columnas}),m=d.mapa,plantas=distribuirVegetacion(d)
  assert.deepEqual(plantas,distribuirVegetacion(d))
  for(const p of plantas){const r=p.lado/2;assert.ok(p.x+r<=m.x||p.x-r>=m.x+m.ancho||p.y+r<=m.y||p.y-r>=m.y+m.alto)}
 }
})

test('cada hoja nueva tiene cuatro poses distintas, alfa transparente y anclas alineadas',()=>{
 for(const [clave,d]of Object.entries(SPRITES_CENITALES)){
  const im=leerPng(new URL('../../public/dibujos/cenital-v1/'+clave.replace('cenital-','')+'.png',import.meta.url))
  assert.deepEqual([im.ancho,im.alto],[d.ancho*4,d.alto])
  const hashes=[]
  for(let f=0;f<4;f++){
   const datos=Buffer.alloc(d.ancho*d.alto*4);let minX=d.ancho,maxX=-1,minY=d.alto,maxY=-1
   for(let y=0;y<d.alto;y++)for(let x=0;x<d.ancho;x++){
    const rgba=im.pixel(f*d.ancho+x,y);datos.set(rgba,(y*d.ancho+x)*4)
    if(rgba[3]>=24){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
   }
   assert.ok(minX>4&&maxX<d.ancho-5&&minY>4&&maxY<d.alto-5)
   assert.ok(Math.abs((minX+maxX)/2-d.ancho/2)<=.5)
   if(clave==='cenital-pasto')assert.equal(maxY,d.alto-32)
   else assert.ok(Math.abs((minY+maxY)/2-d.alto/2)<=.5)
   assert.equal(im.pixel(f*d.ancho,0)[3],0)
   hashes.push(createHash('sha256').update(datos).digest('hex'))
  }
  assert.equal(new Set(hashes).size,4)
 }
})
