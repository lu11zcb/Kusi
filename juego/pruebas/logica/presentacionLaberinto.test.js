import { test } from 'node:test'
import assert from 'node:assert/strict'
import { repartirMuros } from '../../src/logica/presentacionLaberinto.js'

test('los adobes dependen solo de su semilla y no alteran las casillas del mapa', () => {
  const mapa = Object.freeze(['#########', '#C.....P#', '#########'])
  const original = [...mapa]
  const primero = repartirMuros(mapa, 'laberinto-1')
  const otroNivel = repartirMuros(mapa, 'laberinto-2')

  assert.deepEqual(repartirMuros(mapa, 'laberinto-1'), primero)
  assert.notDeepEqual(otroNivel, primero)
  assert.deepEqual(otroNivel.map(({ fila, columna }) => [fila, columna]),
    primero.map(({ fila, columna }) => [fila, columna]))
  assert.deepEqual(mapa, original)
  assert.equal(primero.length, 20)
  assert.equal(new Set(primero.map(({ fila, columna }) => fila + ':' + columna)).size, primero.length)
  for (const { fila, columna, variante } of primero) {
    assert.equal(mapa[fila][columna], '#')
    assert.ok(['muro-adobe-1', 'muro-adobe-2'].includes(variante))
  }
})
