import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarModulo } from './cargar-modulo.mjs'

const { ordenarRanking } = await import(await cargarModulo(new URL('../src/componentes/puestos.ts', import.meta.url)))
const ranking = (filas) => ordenarRanking(filas, (f) => f.valor, (f) => f.llego).map((p) => [p.item.nombre, p.puesto])

test('con lo mismo va primero quien llegó antes, y cada uno tiene su propio puesto', () => {
  assert.deepEqual(ranking([
    { nombre: 'Ana', valor: 3, llego: '2026-11-20T10:00:00Z' },
    { nombre: 'Bruno', valor: 3, llego: '2026-11-18T09:00:00Z' },
    { nombre: 'Carla', valor: 5, llego: '2026-11-25T08:00:00Z' },
  ]), [['Carla', 1], ['Bruno', 2], ['Ana', 3]])
})

test('sin fecha va al final de los que tienen lo mismo', () => {
  assert.deepEqual(ranking([{ nombre: 'Ana', valor: 0, llego: null }, { nombre: 'Bruno', valor: 0, llego: '2026-11-18T09:00:00Z' }]),
    [['Bruno', 1], ['Ana', 2]])
})
