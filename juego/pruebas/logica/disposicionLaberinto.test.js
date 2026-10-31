import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularDisposicion, distribuirBarra, distribuirGuia } from '../../juegos/laberinto/logica/disposicionLaberinto.js'
const chocan = (a,b) => a.x < b.x+b.ancho && a.x+a.ancho>b.x && a.y<b.y+b.alto && a.y+a.alto>b.y

test('las tres bases dejan columnas libres y nunca bajan de 64 unidades', () => {
  for (const ancho of [1280,1600,1840]) for (const [filas,columnas] of [[7,11],[9,15],[3,13],[13,19]]) {
    const d=calcularDisposicion({ancho,filas,columnas});const g=distribuirGuia(d,'x'.repeat(90))
    assert.ok(d.casilla>=64)
    assert.equal(d.tipo,'columnas')
    assert.ok(!chocan(d.mapa,d.panel) && !chocan(d.mapa,d.columnaDerecha))
    assert.ok(d.mapa.y>=88 && d.mapa.y+d.mapa.alto<=d.diseno.alto)
    assert.ok(d.mapa.x>=200 && d.mapa.x+d.mapa.ancho<=d.columnaDerecha.x)
    assert.ok(!chocan(d.mapa,g.globo) && !chocan(d.mapa,g.kusi))
    assert.ok(g.globo.y+g.globo.alto<g.kusi.y)
    assert.ok(g.kusi.x>d.mapa.x+d.mapa.ancho && g.globo.x>d.mapa.x+d.mapa.ancho)
    assert.ok(g.joystick.x-g.joystick.radio>=0)
    assert.ok(g.joystick.x+g.joystick.radio<=d.mapa.x)
  }
})
test('barra y botones permanecen arriba; ocho fichas caben sin encimarse', () => {
  const d=calcularDisposicion({ancho:1600,filas:9,columnas:15})
  for(const regla of [{tipo:'orden',secuencia:Array(8).fill('fresa')},{tipo:'solo_clase',clase:'fruta',meta:6}]) {
    const b=distribuirBarra(d,regla,Array.from({length:6},()=>({tipo:'mango'})))
    assert.deepEqual(b.caja,{x:420,y:4,ancho:760,alto:78})
    assert.equal(b.fichas.length,regla.meta??regla.secuencia.length)
    for (const [i,f] of b.fichas.entries()) {
      assert.ok(f.y-f.alto/2>=b.caja.y && f.y+f.alto/2<=b.caja.y+b.caja.alto)
      assert.ok(f.x-f.ancho/2>=b.caja.x && f.x+f.ancho/2<=b.caja.x+b.caja.ancho)
      if(i)assert.ok(b.fichas[i-1].x+b.fichas[i-1].ancho/2<f.x-f.ancho/2)
    }
    assert.ok(b.botones.ayuda.alto>=72 && b.botones.ayuda.y+b.botones.ayuda.alto/2<88)
  }
})
