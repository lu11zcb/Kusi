import test from 'node:test'
import assert from 'node:assert/strict'
import { intensidadSiguiente } from '../../src/efectos/FrutasVivas.js'
test('la siguiente fruta tiene una luz tenue y periódica, sin alterar su escala',()=>{
  for(let t=0;t<10;t+=.01) assert.ok(intensidadSiguiente(t)>=.11-1e-9 && intensidadSiguiente(t)<=.25+1e-9)
  assert.ok(Math.abs(intensidadSiguiente(.2)-intensidadSiguiente(2.2))<1e-9)
})
