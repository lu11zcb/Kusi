import test from 'node:test'
import assert from 'node:assert/strict'
import { animarVozKusi, crearHablaKusi, iniciarHablaKusi, avanzarHablaKusi, terminarHablaKusi,
 iniciarCelebracionKusi, FILAS_KUSI } from '../../kit/reproductor/logica/hablaKusi.js'
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

test('Kusi celebra en los cuadros 12, 13, 14 y 13 y vuelve a respirar a los 2,5 s', () => {
 const estado = crearHablaKusi()
 iniciarCelebracionKusi(estado)
 assert.equal(FILAS_KUSI.celebrar, 12)
 let anterior = 0
 const cuadros = [0, .2, .4, .55].map((tiempo) => {
  const pose = avanzarHablaKusi(estado, tiempo - anterior)
  anterior = tiempo
  assert.equal(pose.animacion, 'celebrar')
  return pose.cuadro
 })
 assert.deepEqual(cuadros, [12, 13, 14, 13])
 assert.equal(avanzarHablaKusi(estado, 1.9).animacion, 'celebrar')
 assert.equal(avanzarHablaKusi(estado, .06).animacion, 'respirar')
})

test('Kusi conserva el gesto y mueve la boca hasta que acaba una voz larga', () => {
 const estado = crearHablaKusi()
 iniciarCelebracionKusi(estado)
 avanzarHablaKusi(estado, .2)
 const voz = animarVozKusi(estado, '¡Muy bien!')
 voz.alEmpezar()
 assert.equal(avanzarHablaKusi(estado, 0).cuadro, 13)
 const bocas = new Set()
 const cuadros = new Set()
 for (let i = 0; i < 20; i++) {
  const pose = avanzarHablaKusi(estado, .2)
  assert.equal(pose.animacion, 'celebrar')
  assert.equal(pose.hablando, true)
  bocas.add(pose.boca)
  cuadros.add(pose.cuadro)
 }
 assert.deepEqual([...cuadros].sort(), [12, 13, 14])
 assert.deepEqual(bocas, new Set([true, false]))
 voz.alTerminar()
 assert.equal(avanzarHablaKusi(estado, .02).animacion, 'respirar')
})
