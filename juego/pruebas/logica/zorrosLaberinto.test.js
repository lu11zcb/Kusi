import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buscarCamino, crearZorro, avanzarZorro, restablecerZorro,
  posicionEnCasillas, seAtrapan,
} from '../../src/logica/zorrosLaberinto.js'

const PASILLO = ['########', '#C....P#', '########']
const enemigo = (fila, columna, movimiento = 'patrulla') => ({ tipo: 'zorro', fila, columna, movimiento })

test('la búsqueda en anchura encuentra la ruta más corta sin cruzar muros', () => {
  const mapa = ['#######', '#C#..P#', '#.#.#.#', '#.....#', '#######']
  const camino = buscarCamino(mapa, { fila: 1, columna: 1 }, { fila: 1, columna: 3 })
  assert.deepEqual(camino, ['abajo', 'abajo', 'derecha', 'derecha', 'arriba', 'arriba'])
  assert.equal(buscarCamino(mapa, { fila: 1, columna: 1 }, { fila: 1, columna: 3 }, 3), null)
})

test('la distancia máxima incluye exactamente tres pasos y distingue rutas ausentes', () => {
  assert.deepEqual(buscarCamino(PASILLO, { fila: 1, columna: 1 }, { fila: 1, columna: 4 }, 3),
    ['derecha', 'derecha', 'derecha'])
  assert.equal(buscarCamino(PASILLO, { fila: 1, columna: 1 }, { fila: 1, columna: 5 }, 3), null)
  assert.deepEqual(buscarCamino(PASILLO, { fila: 1, columna: 1 }, { fila: 1, columna: 1 }, 0), [])
  assert.equal(buscarCamino(['#####', '#C#P#', '#####'], { fila: 1, columna: 1 }, { fila: 1, columna: 3 }), null)
  assert.equal(buscarCamino(PASILLO, { fila: -1, columna: 1 }, { fila: 1, columna: 1 }), null)
})

test('la patrulla continúa recto y vuelve al chocar, incluso con un delta largo', () => {
  const zorro = crearZorro(enemigo(1, 4), PASILLO)
  avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 2.5, 2)
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 1, columna: 3 })
  assert.equal(zorro.direccion, 'izquierda')
  assert.equal(zorro.moviendose, true)
})

test('una patrulla vertical respeta su eje y una casilla aislada queda quieta', () => {
  const vertical = ['###', '#C#', '#.#', '#P#', '###']
  const zorro = crearZorro(enemigo(2, 1), vertical)
  assert.equal(zorro.direccion, 'abajo')
  avanzarZorro(zorro, vertical, { fila: 1, columna: 1 }, 2, 1)
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 2, columna: 1 })
  assert.equal(zorro.direccion, 'arriba')

  const aislado = ['#####', '#C#P#', '#####']
  const quieto = crearZorro(enemigo(1, 1), aislado)
  avanzarZorro(quieto, aislado, { fila: 1, columna: 3 }, 10)
  assert.deepEqual(posicionEnCasillas(quieto), { fila: 1, columna: 1 })
  assert.equal(quieto.moviendose, false)
})

test('persigue a tres pasos por el camino y fuera de ese radio conserva su patrulla', () => {
  const cercano = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
  avanzarZorro(cercano, PASILLO, { fila: 1, columna: 1 }, 0.25, 2)
  assert.equal(cercano.direccion, 'izquierda')
  assert.deepEqual(posicionEnCasillas(cercano), { fila: 1, columna: 3.5 })

  const lejano = crearZorro(enemigo(1, 5, 'persigue_cerca'), PASILLO)
  avanzarZorro(lejano, PASILLO, { fila: 1, columna: 1 }, 0.25, 2)
  assert.equal(lejano.direccion, 'derecha')
  assert.deepEqual(posicionEnCasillas(lejano), { fila: 1, columna: 5.5 })
})

test('estar cerca al otro lado de un muro no activa la persecución', () => {
  const mapa = ['#########', '#C#....P#', '#.#.###.#', '#.......#', '#########']
  const zorro = crearZorro(enemigo(1, 3, 'persigue_cerca'), mapa)
  avanzarZorro(zorro, mapa, { fila: 1, columna: 1 }, 0.25, 2)
  assert.equal(zorro.direccion, 'derecha')
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 1, columna: 3.5 })
})

test('la persecución dobla en la esquina sin girar a mitad de casilla', () => {
  const mapa = ['#######', '#C....#', '###.#.#', '###.P.#', '#######']
  const zorro = crearZorro(enemigo(1, 2, 'persigue_cerca'), mapa)
  avanzarZorro(zorro, mapa, { fila: 2, columna: 3 }, 0.25, 2)
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 1, columna: 2.5 })
  // El niño cambia de sitio a mitad del tramo. El zorro acaba de llegar al
  // centro antes de volver a decidir, conservando siempre la cuadrícula.
  avanzarZorro(zorro, mapa, { fila: 3, columna: 3 }, 0.5, 2)
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 1.5, columna: 3 })
  assert.equal(zorro.direccion, 'abajo')
})

test('la velocidad puede fijarse al sesenta por ciento y el reinicio conserva la patrulla', () => {
  const zorro = crearZorro(enemigo(1, 2), PASILLO)
  avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 1, 3 * 0.6)
  assert.ok(Math.abs(posicionEnCasillas(zorro).columna - 3.8) < 0.000000001)
  restablecerZorro(zorro)
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 1, columna: 2 })
  assert.equal(zorro.progreso, 0)
  assert.equal(zorro.direccion, 'derecha')
  assert.equal(zorro.movimiento, 'patrulla')
})

test('los intervalos inválidos y la pausa no desplazan ni cambian el rumbo', () => {
  const zorro = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
  const antes = structuredClone(zorro)
  for (const segundos of [0, -1, NaN, Infinity]) {
    avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, segundos)
    assert.deepEqual(zorro, antes)
  }
  avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 1, 0)
  assert.deepEqual(zorro, antes)
})

test('la captura usa posiciones interpoladas y detecta cruces en sentidos opuestos', () => {
  const cuy = { fila: 1, columna: 2, direccion: 'derecha', progreso: 0.4 }
  const zorro = { fila: 1, columna: 3, direccion: 'izquierda', progreso: 0.3 }
  assert.equal(seAtrapan(cuy, zorro), true)
  assert.equal(seAtrapan({ fila: 1, columna: 2 }, { fila: 1, columna: 2.56 }), false)
  assert.equal(seAtrapan({ fila: 1, columna: 2 }, { fila: 1, columna: 2 }), true)
  assert.equal(seAtrapan({ fila: 1, columna: 2 }, { fila: 2, columna: 2 }), false)
})
