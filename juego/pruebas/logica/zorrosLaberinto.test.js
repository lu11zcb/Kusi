import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buscarCamino, crearZorro, avanzarZorro, restablecerZorro,
  posicionEnCasillas, seAtrapan, DISTANCIA_PERSECUCION,
  SEGUNDOS_PERSECUCION, SEGUNDOS_DESCANSO,
} from '../../juegos/laberinto/logica/zorrosLaberinto.js'

const PASILLO = ['########', '#C....P#', '########']
const PASILLO_LARGO = ['#############', '#C.........P#', '#############']
const enemigo = (fila, columna, movimiento = 'patrulla') => ({ tipo: 'zorro', fila, columna, movimiento })
const casiIgual = (actual, esperado) => assert.ok(Math.abs(actual - esperado) < 0.000000001,
  'Se esperaba ' + esperado + ', pero se obtuvo ' + actual)

test('la búsqueda en anchura encuentra la ruta más corta sin cruzar muros', () => {
  const mapa = ['#######', '#C#..P#', '#.#.#.#', '#.....#', '#######']
  const camino = buscarCamino(mapa, { fila: 1, columna: 1 }, { fila: 1, columna: 3 })
  assert.deepEqual(camino, ['abajo', 'abajo', 'derecha', 'derecha', 'arriba', 'arriba'])
  assert.equal(buscarCamino(mapa, { fila: 1, columna: 1 }, { fila: 1, columna: 3 }, 3), null)
})

test('la distancia máxima incluye exactamente cinco pasos y distingue rutas ausentes', () => {
  assert.equal(DISTANCIA_PERSECUCION, 5)
  assert.deepEqual(buscarCamino(PASILLO, { fila: 1, columna: 1 }, { fila: 1, columna: 6 }, 5),
    ['derecha', 'derecha', 'derecha', 'derecha', 'derecha'])
  assert.equal(buscarCamino(PASILLO_LARGO, { fila: 1, columna: 1 }, { fila: 1, columna: 7 }, 5), null)
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

test('persigue a cinco pasos por el camino y a seis conserva su patrulla', () => {
  const cercano = crearZorro(enemigo(1, 6, 'persigue_cerca'), PASILLO_LARGO)
  avanzarZorro(cercano, PASILLO_LARGO, { fila: 1, columna: 1 }, 0.25, 2)
  assert.equal(cercano.direccion, 'izquierda')
  assert.deepEqual(posicionEnCasillas(cercano), { fila: 1, columna: 5.5 })
  assert.equal(cercano.persiguiendo, true)
  assert.equal(cercano.iniciosPersecucion, 1)

  const lejano = crearZorro(enemigo(1, 7, 'persigue_cerca'), PASILLO_LARGO)
  avanzarZorro(lejano, PASILLO_LARGO, { fila: 1, columna: 1 }, 0.25, 2)
  assert.equal(lejano.direccion, 'derecha')
  assert.deepEqual(posicionEnCasillas(lejano), { fila: 1, columna: 7.5 })
  assert.equal(lejano.persiguiendo, false)
  assert.equal(lejano.segundosPersiguiendo, 0)
  assert.equal(lejano.iniciosPersecucion, 0)
})

test('estar cerca al otro lado de un muro no activa la persecución', () => {
  const mapa = ['#########', '#C#....P#', '#.#.###.#', '#.......#', '#########']
  const zorro = crearZorro(enemigo(1, 3, 'persigue_cerca'), mapa)
  avanzarZorro(zorro, mapa, { fila: 1, columna: 1 }, 0.25, 2)
  assert.equal(zorro.direccion, 'derecha')
  assert.deepEqual(posicionEnCasillas(zorro), { fila: 1, columna: 3.5 })
  assert.equal(buscarCamino(mapa, zorro, { fila: 1, columna: 1 }).length, 6)
  assert.equal(zorro.persiguiendo, false)
  assert.equal(zorro.segundosPersiguiendo, 0)
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

test('se fatiga a los cinco segundos exactos y descansa dos sin perder el progreso', () => {
  assert.equal(SEGUNDOS_PERSECUCION, 5)
  assert.equal(SEGUNDOS_DESCANSO, 2)
  const zorro = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
  const cuy = { fila: 1, columna: 1 }
  avanzarZorro(zorro, PASILLO, cuy, 4.9, 0.5)
  assert.equal(zorro.persiguiendo, true)
  casiIgual(zorro.segundosPersiguiendo, 4.9)
  assert.equal(zorro.segundosDescanso, 0)

  avanzarZorro(zorro, PASILLO, cuy, 0.1, 0.5)
  casiIgual(posicionEnCasillas(zorro).columna, 1.5)
  casiIgual(zorro.progreso, 0.5)
  assert.equal(zorro.persiguiendo, false)
  assert.equal(zorro.moviendose, false)
  assert.equal(zorro.segundosDescanso, 2)
  assert.equal(zorro.segundosPersiguiendo, 0)
  assert.equal(zorro.iniciosPersecucion, 1)
  const posicion = posicionEnCasillas(zorro)
  const progreso = zorro.progreso

  avanzarZorro(zorro, PASILLO, cuy, 1, 0.5)
  assert.deepEqual(posicionEnCasillas(zorro), posicion)
  assert.equal(zorro.progreso, progreso)
  assert.equal(zorro.segundosDescanso, 1)
  assert.equal(zorro.moviendose, false)
  avanzarZorro(zorro, PASILLO, cuy, 1, 0.5)
  assert.deepEqual(posicionEnCasillas(zorro), posicion)
  assert.equal(zorro.progreso, progreso)
  assert.equal(zorro.segundosDescanso, 0)
  assert.equal(zorro.persiguiendo, true)
  assert.equal(zorro.moviendose, true)
  assert.equal(zorro.iniciosPersecucion, 2)

  avanzarZorro(zorro, PASILLO, cuy, 0.5, 0.5)
  casiIgual(posicionEnCasillas(zorro).columna, 1.25)
  casiIgual(zorro.segundosPersiguiendo, 0.5)
})

test('perder el radio interrumpe la racha y volver a entrar empieza desde cero', () => {
  const zorro = crearZorro(enemigo(1, 2, 'persigue_cerca'), PASILLO_LARGO)
  avanzarZorro(zorro, PASILLO_LARGO, { fila: 1, columna: 1 }, 4, 0.1)
  assert.equal(zorro.segundosPersiguiendo, 4)
  avanzarZorro(zorro, PASILLO_LARGO, { fila: 1, columna: 11 }, 1, 0.1)
  assert.equal(zorro.persiguiendo, false)
  assert.equal(zorro.segundosPersiguiendo, 0)
  assert.equal(zorro.segundosDescanso, 0)
  avanzarZorro(zorro, PASILLO_LARGO, { fila: 1, columna: 1 }, 1, 0.1)
  assert.equal(zorro.persiguiendo, true)
  assert.equal(zorro.segundosPersiguiendo, 1)
  assert.equal(zorro.segundosDescanso, 0)
  assert.equal(zorro.iniciosPersecucion, 2)
})

test('una patrulla y un destino inalcanzable nunca acumulan fatiga', () => {
  const patrulla = crearZorro(enemigo(1, 4), PASILLO)
  avanzarZorro(patrulla, PASILLO, { fila: 1, columna: 1 }, 25, 2)
  assert.equal(patrulla.persiguiendo, false)
  assert.equal(patrulla.segundosPersiguiendo, 0)
  assert.equal(patrulla.segundosDescanso, 0)
  assert.equal(patrulla.iniciosPersecucion, 0)
  assert.equal(patrulla.moviendose, true)

  const mapa = ['#####', '#C#P#', '#####']
  const aislado = crearZorro(enemigo(1, 1, 'persigue_cerca'), mapa)
  avanzarZorro(aislado, mapa, { fila: 1, columna: 3 }, 25, 2)
  assert.equal(aislado.persiguiendo, false)
  assert.equal(aislado.segundosPersiguiendo, 0)
  assert.equal(aislado.segundosDescanso, 0)
  assert.equal(aislado.iniciosPersecucion, 0)
})

test('al terminar el descanso patrulla si el niño ha salido del radio', () => {
  const zorro = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO_LARGO)
  avanzarZorro(zorro, PASILLO_LARGO, { fila: 1, columna: 1 }, 5, 0.5)
  const posicion = posicionEnCasillas(zorro)
  avanzarZorro(zorro, PASILLO_LARGO, { fila: 1, columna: 11 }, 2, 0.5)
  assert.deepEqual(posicionEnCasillas(zorro), posicion)
  assert.equal(zorro.persiguiendo, false)
  assert.equal(zorro.segundosPersiguiendo, 0)
  assert.equal(zorro.segundosDescanso, 0)
  assert.equal(zorro.iniciosPersecucion, 1)
  assert.equal(zorro.moviendose, true)
})

test('un delta largo consume persecución, descanso y reanudación en orden', () => {
  const largo = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
  const dividido = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
  const cuy = { fila: 1, columna: 1 }
  avanzarZorro(largo, PASILLO, cuy, 8.25, 0.5)
  for (const delta of [5, 2, 1.25]) avanzarZorro(dividido, PASILLO, cuy, delta, 0.5)
  assert.deepEqual(largo, dividido)
  casiIgual(posicionEnCasillas(largo).columna, 1.125)
  assert.equal(largo.segundosPersiguiendo, 1.25)
  assert.equal(largo.segundosDescanso, 0)
  assert.equal(largo.iniciosPersecucion, 2)

  const variosCiclos = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
  avanzarZorro(variosCiclos, PASILLO, cuy, 15, 0.5)
  casiIgual(posicionEnCasillas(variosCiclos).columna, 1.5)
  assert.equal(variosCiclos.segundosPersiguiendo, 1)
  assert.equal(variosCiclos.segundosDescanso, 0)
  assert.equal(variosCiclos.iniciosPersecucion, 3)
})

test('la rapidez modifica el desplazamiento pero los relojes siguen en segundos reales', () => {
  for (const velocidad of [0.5, 2.3]) {
    const zorro = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
    avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 5, velocidad)
    assert.equal(zorro.segundosDescanso, 2)
    assert.equal(zorro.persiguiendo, false)
    const posicion = posicionEnCasillas(zorro)
    avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 1, velocidad * 2)
    assert.deepEqual(posicionEnCasillas(zorro), posicion)
    assert.equal(zorro.segundosDescanso, 1)
  }
})

test('restablecer tras una captura borra el cansancio y los inicios de persecución', () => {
  const zorro = crearZorro(enemigo(1, 4, 'persigue_cerca'), PASILLO)
  const inicio = structuredClone(zorro)
  avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 5, 0.5)
  assert.equal(zorro.segundosDescanso, 2)
  assert.equal(zorro.iniciosPersecucion, 1)
  assert.equal(restablecerZorro(zorro), zorro)
  assert.deepEqual(zorro, inicio)
  avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 1, 0.5)
  assert.equal(zorro.persiguiendo, true)
  assert.equal(zorro.segundosPersiguiendo, 1)
  assert.equal(zorro.iniciosPersecucion, 1)
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

  avanzarZorro(zorro, PASILLO, { fila: 1, columna: 1 }, 5, 0.5)
  const descansando = structuredClone(zorro)
  for (const segundos of [0, -1, NaN, Infinity]) {
    avanzarZorro(zorro, PASILLO, { fila: 1, columna: 6 }, segundos)
    assert.deepEqual(zorro, descansando)
  }
})

test('la captura usa posiciones interpoladas y detecta cruces en direcciones contrarias', () => {
  const cuy = { fila: 1, columna: 2, direccion: 'derecha', progreso: 0.4 }
  const zorro = { fila: 1, columna: 3, direccion: 'izquierda', progreso: 0.3 }
  assert.equal(seAtrapan(cuy, zorro), true)
  assert.equal(seAtrapan({ fila: 1, columna: 2 }, { fila: 1, columna: 2.56 }), false)
  assert.equal(seAtrapan({ fila: 1, columna: 2 }, { fila: 1, columna: 2 }), true)
  assert.equal(seAtrapan({ fila: 1, columna: 2 }, { fila: 2, columna: 2 }), false)
})
