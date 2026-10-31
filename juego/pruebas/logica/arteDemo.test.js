import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { leerPng } from '../ayudas/png.js'
import { PIEZAS_MURO } from '../../kit/reproductor/dibujos/kitFinal.js'
import { crearPatio } from '../../juegos/laberinto/dibujos/patioChacra.js'
import { encajarTextoKusi } from '../../kit/reproductor/interfaz/textoKusi.js'
import { ubicarSonidoSuperior } from '../../juegos/laberinto/logica/disposicionLaberinto.js'
const folder=new URL('../../kit/recursos/dibujos/kit-final/',import.meta.url)
const aprobados=JSON.parse(readFileSync(new URL('../fixtures/adobe-aprobado.json',import.meta.url)))

test('los 32 cubos coinciden exactamente con el arte aprobado y toda su huella es opaca',()=>{
 for(const name of PIEZAS_MURO){
  const bytes=readFileSync(new URL(name+'.png',folder)),v=name.at(-1)
  assert.equal(createHash('sha256').update(bytes).digest('hex'),aprobados[v],name+' no coincide con la ilustración aprobada')
  const im=leerPng(new URL(name+'.png',folder));assert.equal(im.ancho,256);assert.equal(im.alto,256)
  for(let y=0;y<256;y++)for(let x=0;x<256;x++)assert.equal(im.pixel(x,y)[3],255,name+' hueco '+x+','+y)
 }
 // Las juntas son de barro; no se confunden con el suelo o con vegetación.
 for(const v of ['a','b']){
  const im=leerPng(new URL('muro-0000-'+v+'.png',folder))
  for(let p=0;p<256;p++)for(const [x,y] of [[p,0],[p,255],[0,p],[255,p]]){
   const [r,g,b]=im.pixel(x,y);assert.ok(r>g && g>b && r<180,'junta de barro '+v)
  }
 }
})

test('el suelo ilustrado cubre exactamente el mapa y el borde queda debajo del adobe',()=>{
 const dibujos=[];const escena={cajaMapa:{x:350,y:88,ancho:1050,alto:630},add:{image(x,y,key){
  const im={x,y,key,setOrigin(){return this},setDisplaySize(ancho,alto){this.ancho=ancho;this.alto=alto;return this},setDepth(depth){this.depth=depth;return this}};dibujos.push(im);return im
 }}}
 const piso=crearPatio(escena);assert.equal(piso.key,'tierra-patio')
 assert.deepEqual([piso.x,piso.y,piso.ancho,piso.alto],[350,88,1050,630])
 const borde=dibujos.find(d=>d.key==='borde-pasto');assert.ok(borde.depth<piso.depth)
 assert.ok(borde.x<=350&&borde.y<=88&&borde.x+borde.ancho>=1400&&borde.y+borde.alto>=718)
})

test('el globo de 90 caracteres crece dentro de la columna y deja todos sus márgenes',()=>{
 const t={width:260,height:205,setOrigin(){return this},setWordWrapWidth(w,partir){assert.equal(w,266);assert.equal(partir,true);return this},
  setFontSize(n){this.height=n>21?270:205;return this},setPosition(x,y){this.x=x;this.y=y;return this}}
 const a=encajarTextoKusi(t,{x:14,y:214,ancho:322,alto:232,altoMaximo:304,bordeInferior:446})
 assert.equal(a.alto,304);assert.equal(a.y,142)
 assert.ok(a.texto.x>=a.interior.x&&a.texto.y>=a.interior.y)
 assert.ok(a.texto.ancho<=a.interior.ancho&&a.texto.alto<=a.interior.alto)
 assert.ok(a.interior.x+a.interior.ancho<350&&a.y+a.alto<464)
})

test('el silenciador queda al lado de Ayuda en la misma fila, sin cambiar con el zoom',()=>{
 const p=ubicarSonidoSuperior({mundoAncho:1600},{ancho:45,alto:45})
 assert.deepEqual(p,{x:1547.5,y:50.5});assert.ok(p.x-22.5>1514&&p.x+22.5<1600)
 for(const [ancho,scrollX]of[[1600,0],[1280,160]])assert.deepEqual(ubicarSonidoSuperior({ancho,scrollX},{ancho:45,alto:45}),p)
 assert.ok(p.y-22.5>=4&&p.y+22.5<=82)
})
