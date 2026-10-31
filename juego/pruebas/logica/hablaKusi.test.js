import test from 'node:test'
import assert from 'node:assert/strict'
import { crearHablaKusi, iniciarHablaKusi, avanzarHablaKusi, terminarHablaKusi } from '../../kit/reproductor/logica/hablaKusi.js'
import { calcularDisposicion, distribuirBarra, distribuirGuia } from '../../juegos/laberinto/logica/disposicionLaberinto.js'
test('Kusi saluda, habla, parpadea y respira mediante sus cuatro filas dibujadas',()=>{
 const e=crearHablaKusi(),vistos=new Set()
 for(let i=0;i<80;i++){const g=avanzarHablaKusi(e,.02);vistos.add(g.animacion);assert.equal(g.entrada,0);assert.equal(g.rebote,0)}
 assert.ok(vistos.has('saludar'))
 iniciarHablaKusi(e,'Hola, caminamos juntos.');const bocas=new Set()
 for(let i=0;i<65;i++){const g=avanzarHablaKusi(e,.02);assert.equal(g.animacion,'hablar');bocas.add(g.cuadro)}
 assert.deepEqual([...bocas].sort(),[0,1,2]);terminarHablaKusi(e)
 for(let i=0;i<400;i++)vistos.add(avanzarHablaKusi(e,.02).animacion)
 assert.ok(vistos.has('respirar')&&vistos.has('parpadear'))
 const q=crearHablaKusi(false);iniciarHablaKusi(q,'Hola');const antes=avanzarHablaKusi(q,0)
 assert.deepEqual(avanzarHablaKusi(q,100),antes);assert.equal(q.tiempo,0)
})
test('guía de cuerpo entero y globo están a la derecha, el mando a la izquierda y caben ocho objetivos',()=>{
 const d=calcularDisposicion({ancho:1600,filas:9,columnas:15}),g=distribuirGuia(d,'x'.repeat(90))
 assert.equal(g.globo.x,1264);assert.equal(g.globo.ancho,322)
 assert.ok(g.globo.x>d.mapa.x+d.mapa.ancho)
 assert.ok(g.kusi.x>d.mapa.x+d.mapa.ancho)
 assert.equal(g.joystick.x,100)
 const b=distribuirBarra(d,{tipo:'orden',secuencia:Array(8).fill('mango')})
 assert.equal(new Set(b.fichas.map(f=>f.y)).size,1);assert.ok(b.fichas.every(f=>f.ancho>=44))
})

test('la boca sigue los eventos de voz aunque el audio supere la duración estimada', () => {
 const e=crearHablaKusi();e.saludo=0;iniciarHablaKusi(e,'Hola')
 e.vozActiva=true
 const cuadros=new Set()
 for(let i=0;i<1000;i++){
  const g=avanzarHablaKusi(e,.02)
  assert.equal(g.animacion,'hablar');assert.equal(g.hablando,true);cuadros.add(g.cuadro)
 }
 assert.equal(cuadros.size,3)
 terminarHablaKusi(e)
 assert.equal(avanzarHablaKusi(e,.02).animacion,'respirar')
 iniciarHablaKusi(e,'Otra consigna')
 assert.equal(e.vozActiva,false)
})
