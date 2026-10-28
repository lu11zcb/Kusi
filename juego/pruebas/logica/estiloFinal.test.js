import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { leerPng } from '../ayudas/png.js'
import { pedirEstiloFinal, cuadroIlustrado } from '../../src/dibujos/estiloFinal.js'
import { BarraFrutas } from '../../src/interfaz/BarraFrutas.js'
import { OBJETOS_KIT } from '../../src/dibujos/kitFinal.js'
import { calcularDisposicion } from '../../src/logica/disposicionLaberinto.js'
const carpeta=new URL('../../public/dibujos/',import.meta.url)
const {capas:CAPAS_FONDO,sprites:SPRITES_FONDO}=JSON.parse(readFileSync(new URL('../../arte/estilo-anterior.json',import.meta.url),'utf8'))
function anclas(im,c,f){
 let minx=256,miny=256,maxx=-1,maxy=-1
 for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(im.pixel(c*256+x,f*256+y)[3]>=32){minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y)}
 let hx=256,hX=-1;const end=miny+Math.round((maxy-miny+1)*.42)
 for(let y=miny;y<end;y++)for(let x=0;x<256;x++)if(im.pixel(c*256+x,f*256+y)[3]>=32){hx=Math.min(hx,x);hX=Math.max(hX,x)}
 return{centro:(hx+hX)/2,cima:miny,pies:maxy,minx,maxx}
}
for(const [archivo,filas]of[['cuy-nino-cuadros-v9.png',6],['zorro-cuadros-v4.png',5],['estilo-final/kusi-cuadros-v1.png',4]]){
 test(archivo+': todas las filas tienen tres poses dibujadas y anclas medidas a 2 px',()=>{
  const im=leerPng(new URL(archivo,carpeta));assert.deepEqual([im.ancho,im.alto],[768,256*filas])
  for(let f=0;f<filas;f++){
   const a=[0,1,2].map(c=>anclas(im,c,f))
   for(const p of a){assert.ok(Math.abs(p.centro-128)<=.5);assert.equal(p.pies,244);assert.ok(p.minx>=2&&p.maxx<=253)}
   assert.ok(Math.max(...a.map(p=>p.cima))-Math.min(...a.map(p=>p.cima))<=2)
   const hashes=[0,1,2].map(c=>{const b=Buffer.alloc(256*256*4);for(let y=0;y<256;y++)for(let x=0;x<256;x++)b.set(im.pixel(c*256+x,f*256+y),(y*256+x)*4);return createHash('sha256').update(b).digest('hex')})
   assert.equal(new Set(hashes).size,3)
  }
 })
}
test('el manifiesto del niño solo cambia el nombre de su imagen',()=>{
 const antes=JSON.parse(readFileSync(new URL('../fixtures/cuy-manifiesto-base.json',import.meta.url)))
 const ahora=JSON.parse(readFileSync(new URL('cuy-nino-animado-v1.json',carpeta)))
 antes.imagen='cuy-nino-cuadros-v9.png';assert.deepEqual(ahora,antes)
})
test('las once tiras del fondo tienen el número de celdas de su contrato',()=>{
 assert.equal(Object.keys(SPRITES_FONDO).length,11)
 for(const [clave,d]of Object.entries(SPRITES_FONDO)){
  const im=leerPng(new URL('estilo-final/'+clave+'.png',carpeta));assert.deepEqual([im.ancho,im.alto],[d.ancho*d.cuadros,d.alto])
  for(let t=0;t<20;t+=.043){const f=cuadroIlustrado(t,d);assert.ok(Number.isInteger(f)&&f>=0&&f<d.cuadros)}
 }
 const pedidos=[];pedirEstiloFinal({load:{image:(k,r)=>pedidos.push(r),spritesheet:(k,r)=>pedidos.push(r)}})
 assert.ok(CAPAS_FONDO.length>=8);assert.equal(pedidos.filter(r=>r.includes('alimentos-nuevos')).length,0)
 for(const ruta of pedidos)assert.ok(readFileSync(new URL('../../public/'+ruta,import.meta.url)).length>100)
})
function mockImagen(x,y,key,frame=0){return{x,y,key,texture:{key},frame:{name:frame},visible:true,setOrigin(){return this},setDepth(){return this},setDisplaySize(w,h){this.w=w;this.h=h;return this},setVisible(v){this.visible=v;return this},setFrame(f){this.frame.name=f;return this},setTexture(key){this.texture.key=key;return this},setText(t){this.text=t;return this}}}
test('la barra representa recogida, siguiente y pendiente con check y destellos de sprite',()=>{
 const e={add:{image:mockImagen,text:mockImagen}},d=calcularDisposicion({ancho:1600,filas:9,columnas:15})
 const b=new BarraFrutas(e,d,{tipo:'orden',secuencia:['mango','mandarina','mango','mandarina']})
 b.actualizar(1);assert.deepEqual(b.estado().map(f=>f.estado),['recogida','siguiente','pendiente','pendiente'])
 assert.equal(b.fichas[0].marca.visible,true);assert.equal(b.fichas[1].destello.visible,true);assert.equal(b.fichas[0].imagen.texture.key,'mango');assert.equal(b.fichas[1].imagen.texture.key,'mandarina');assert.equal(b.fichas[2].imagen.texture.key,'mango');assert.equal(b.fichas[3].imagen.texture.key,'mandarina')
 b.animar(.3);assert.equal(b.fichas[1].destello.frame.name,1)
 b.actualizar(4);assert.ok(b.fichas.every(f=>f.marca.visible&&!f.destello.visible&&f.imagen.texture.key===f.tipo))
 const q=new BarraFrutas(e,d,{tipo:'solo_clase',clase:'fruta',meta:4},{activo:false,objetos:['fresa','mango','mandarina','pina'].map(tipo=>({tipo}))});q.animar(100)
 assert.equal(q.fichas.length,4);assert.ok(q.fichas.every(f=>f.destello.frame.name===0));assert.equal(q.tiempo,0)
})

test('clasificar muestra los alimentos reales, conserva duplicados y marca el recogido en cualquier orden',()=>{
 const e={add:{image:mockImagen,text:mockImagen}},d=calcularDisposicion({ancho:1600,filas:9,columnas:15})
 const objetos=['fresa','zanahoria','mango','fresa','mandarina','pina'].map(tipo=>({tipo,recogido:false}))
 const b=new BarraFrutas(e,d,{tipo:'solo_clase',clase:'fruta',meta:4},{objetos})
 assert.deepEqual(b.estado().map(f=>f.tipo),['fresa','mango','fresa','mandarina','pina'])
 assert.ok(b.fichas.every(f=>!f.destello.visible&&f.estado==='disponible'))
 objetos[4].recogido=true;b.actualizar(1,objetos)
 assert.deepEqual(b.estado().map(f=>f.estado),['disponible','disponible','disponible','recogida','disponible'])
 assert.match(b.etiqueta.text,/1\/4.*En cualquier orden/)
 assert.equal(b.fichas[3].marca.visible,true)
 const verduras=new BarraFrutas(e,d,{tipo:'solo_clase',clase:'verdura',meta:1},{objetos})
 assert.deepEqual(verduras.estado().map(f=>f.tipo),['zanahoria'])
})

test('las ocho siluetas grises conservan exactamente el alfa y tamaño del alimento aprobado',()=>{
 for(const tipo of OBJETOS_KIT){
  const original=leerPng(new URL(tipo+'.png',carpeta))
  const silueta=leerPng(new URL('kit-final/'+tipo+'-silueta.png',carpeta))
  assert.deepEqual([silueta.ancho,silueta.alto],[original.ancho,original.alto])
  for(let y=0;y<original.alto;y++)for(let x=0;x<original.ancho;x++){
   const rgba=silueta.pixel(x,y)
   assert.equal(rgba[3],original.pixel(x,y)[3])
   if(rgba[3]>0)assert.deepEqual(rgba.slice(0,3),[178,175,168])
  }
 }
})
