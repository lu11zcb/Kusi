import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { planearRuta } from '../../src/logica/rutaLaberinto.js'

const PASILLO = ['########', '#C....P#', '########']
const ORIGEN = { fila: 1, columna: 1 }

function casillasDeLosPasos(ruta) {
  return ruta.pasos.map(({ fila, columna }) => [fila, columna])
}

test('encuentra el recorrido mínimo y entrega la dirección de cada entrada', () => {
  const mapa = ['#######', '#C....#', '###.#.#', '#...#P#', '#######']
  const ruta = planearRuta(mapa, ORIGEN, { fila: 3, columna: 5 })
  assert.deepEqual(ruta, {
    destino: { fila: 3, columna: 5 },
    pasos: [
      { fila: 1, columna: 2, direccion: 'derecha' },
      { fila: 1, columna: 3, direccion: 'derecha' },
      { fila: 1, columna: 4, direccion: 'derecha' },
      { fila: 1, columna: 5, direccion: 'derecha' },
      { fila: 2, columna: 5, direccion: 'abajo' },
      { fila: 3, columna: 5, direccion: 'abajo' },
    ],
    frutaObjetivo: null,
  })
})

test('prefiere rodear otras frutas aunque la ruta sin ellas sea más larga', () => {
  const mapa = ['#######', '#C...P#', '#.###.#', '#.....#', '#######']
  const objetos = [
    { tipo: 'mango', fila: 1, columna: 3 },
    { tipo: 'fresa', fila: 1, columna: 5 },
  ]
  const ruta = planearRuta(mapa, ORIGEN, { fila: 1, columna: 5 }, objetos)
  assert.equal(ruta.frutaObjetivo, 1)
  assert.equal(ruta.pasos.length, 8)
  assert.deepEqual(casillasDeLosPasos(ruta), [
    [2, 1], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [2, 5], [1, 5],
  ])
})

test('atraviesa frutas intermedias si son inevitables y solo señala el objetivo', () => {
  const objetos = [
    { tipo: 'mango', fila: 1, columna: 2 },
    { tipo: 'fresa', fila: 1, columna: 4 },
    { tipo: 'platano', fila: 1, columna: 5 },
  ]
  const ruta = planearRuta(PASILLO, ORIGEN, { fila: 1, columna: 5 }, objetos)
  assert.equal(ruta.frutaObjetivo, 2)
  assert.deepEqual(casillasDeLosPasos(ruta), [[1, 2], [1, 3], [1, 4], [1, 5]])
  assert.ok(objetos.every((objeto) => objeto.recogido === undefined))
})

test('tocar camino sin fruta no selecciona las que haya en medio', () => {
  const ruta = planearRuta(PASILLO, ORIGEN, { fila: 1, columna: 6 }, [
    { tipo: 'mango', fila: 1, columna: 2 },
    { tipo: 'fresa', fila: 1, columna: 5 },
  ])
  assert.equal(ruta.frutaObjetivo, null)
  assert.equal(ruta.pasos.length, 5)
  assert.deepEqual(ruta.destino, { fila: 1, columna: 6 })
})

test('los objetos recogidos dejan libre el recorrido y no vuelven a ser objetivo', () => {
  const mapa = ['#######', '#C...P#', '#.###.#', '#.....#', '#######']
  const objetos = [
    { tipo: 'mango', fila: 1, columna: 3, recogido: true },
    { tipo: 'fresa', fila: 1, columna: 5, recogido: true },
  ]
  const ruta = planearRuta(mapa, ORIGEN, { fila: 1, columna: 5 }, objetos)
  assert.equal(ruta.frutaObjetivo, null)
  assert.equal(ruta.pasos.length, 4)
})

test('ajusta un muro al centro de camino más cercano y desempata por fila y columna', () => {
  const mapa = ['#####', '#C..#', '#.#.#', '#..P#', '#####']
  const ruta = planearRuta(mapa, ORIGEN, { fila: 2, columna: 2 })
  assert.deepEqual(ruta.destino, { fila: 1, columna: 2 })
  assert.deepEqual(casillasDeLosPasos(ruta), [[1, 2]])
})

test('respeta la celda tocada con coordenadas fraccionarias incluso al tocar un borde', () => {
  const objetos = [{ tipo: 'fresa', fila: 1, columna: 3 }]
  const dentro = planearRuta(PASILLO, ORIGEN, { fila: 1.49, columna: 3.49 }, objetos)
  const enBorde = planearRuta(PASILLO, ORIGEN, { fila: 1, columna: 2.5 }, objetos)
  assert.deepEqual(dentro.destino, { fila: 1, columna: 3 })
  assert.deepEqual(enBorde.destino, { fila: 1, columna: 3 })
  assert.equal(dentro.frutaObjetivo, 0)
  assert.equal(enBorde.frutaObjetivo, 0)
})

test('al tocar un muro conserva la posición dentro de la celda para elegir camino', () => {
  const mapa = ['#####', '#C..#', '#.#.#', '#..P#', '#####']
  const ruta = planearRuta(mapa, ORIGEN, { fila: 2.45, columna: 2.2 })
  assert.deepEqual(ruta.destino, { fila: 3, columna: 2 })
})

test('ajustar un muro al camino vecino con fruta no convierte ese objeto en objetivo', () => {
  const mapa = ['#####', '#C..#', '#.#.#', '#..P#', '#####']
  const objetos = [{ tipo: 'mango', fila: 1, columna: 2 }]
  const ruta = planearRuta(mapa, ORIGEN, { fila: 2, columna: 2 }, objetos)
  assert.deepEqual(ruta.destino, { fila: 1, columna: 2 })
  assert.deepEqual(casillasDeLosPasos(ruta), [[1, 2]])
  assert.equal(ruta.frutaObjetivo, null)
  assert.equal(objetos[0].recogido, undefined)
})

test('ajusta los toques fuera del mapa al camino más cercano', () => {
  const haciaDerecha = planearRuta(PASILLO, ORIGEN, { fila: 1, columna: 20 })
  const haciaArriba = planearRuta(PASILLO, ORIGEN, { fila: -10, columna: 3 })
  assert.deepEqual(haciaDerecha.destino, { fila: 1, columna: 6 })
  assert.deepEqual(haciaArriba.destino, { fila: 1, columna: 3 })
  assert.equal(haciaDerecha.pasos.length, 5)
})

test('la cercanía usa distancia euclídea entre centros y no distancia Manhattan', () => {
  const mapa = ['###C#', '###.#', '##.P#', '#####']
  // Al tocar (0, 0), (0, 3) queda a tres unidades y (2, 2), a raíz de ocho.
  // Manhattan escogería (0, 3), que requiere tres desplazamientos por eje.
  const ruta = planearRuta(mapa, { fila: 0, columna: 3 }, { fila: 0, columna: 0 })
  assert.deepEqual(ruta.destino, { fila: 2, columna: 2 })
})

test('elige una casilla alcanzable antes que un camino de otra zona desconectada', () => {
  const mapa = ['#########', '#C..#..P#', '#########']
  const ruta = planearRuta(mapa, ORIGEN, { fila: 1, columna: 6 }, [
    { tipo: 'fresa', fila: 1, columna: 6 },
  ])
  assert.deepEqual(ruta.destino, { fila: 1, columna: 3 })
  assert.deepEqual(casillasDeLosPasos(ruta), [[1, 2], [1, 3]])
  assert.equal(ruta.frutaObjetivo, null)
})

test('un origen aislado mantiene su centro y todavía identifica la fruta tocada', () => {
  const mapa = ['#####', '#C#P#', '#####']
  const objetos = [{ tipo: 'fresa', ...ORIGEN }]
  const ruta = planearRuta(mapa, ORIGEN, ORIGEN, objetos)
  assert.deepEqual(ruta, { destino: ORIGEN, pasos: [], frutaObjetivo: 0 })
  assert.deepEqual(planearRuta(mapa, ORIGEN, { fila: 1, columna: 3 }), {
    destino: ORIGEN, pasos: [], frutaObjetivo: null,
  })
})

test('no modifica ninguno de los datos recibidos', () => {
  const mapa = Object.freeze([...PASILLO])
  const origen = Object.freeze({ ...ORIGEN })
  const toque = Object.freeze({ fila: 1, columna: 5 })
  const objetos = Object.freeze([
    Object.freeze({ tipo: 'fresa', fila: 1, columna: 3, recogido: false }),
    Object.freeze({ tipo: 'mango', fila: 1, columna: 5, recogido: false }),
  ])
  const antes = JSON.stringify({ mapa, origen, toque, objetos })
  const ruta = planearRuta(mapa, origen, toque, objetos)
  assert.equal(JSON.stringify({ mapa, origen, toque, objetos }), antes)
  assert.notEqual(ruta.destino, toque)
  assert.notEqual(ruta.destino, origen)
})

test('un origen sin camino o un toque no finito no genera ruta', () => {
  const sinRuta = { destino: null, pasos: [], frutaObjetivo: null }
  assert.deepEqual(planearRuta(PASILLO, { fila: 0, columna: 0 }, ORIGEN), sinRuta)
  assert.deepEqual(planearRuta(PASILLO, ORIGEN, { fila: NaN, columna: 2 }), sinRuta)
})

test('los mapas reales permiten llegar a cada objeto y a la puerta con pasos contiguos', async () => {
  const paquete = JSON.parse(await readFile(new URL('../../public/paquete-laberinto-ejemplo.json', import.meta.url), 'utf8'))

  for (const reto of paquete.retos) {
    const filaOrigen = reto.mapa.findIndex((fila) => fila.includes('C'))
    const origen = { fila: filaOrigen, columna: reto.mapa[filaOrigen].indexOf('C') }
    const filaPuerta = reto.mapa.findIndex((fila) => fila.includes('P'))
    const puerta = { fila: filaPuerta, columna: reto.mapa[filaPuerta].indexOf('P') }

    for (const [indice, objeto] of reto.objetos.entries()) {
      const ruta = planearRuta(reto.mapa, origen, objeto, reto.objetos)
      assert.deepEqual(ruta.destino, { fila: objeto.fila, columna: objeto.columna }, reto.id)
      assert.equal(ruta.frutaObjetivo, indice, reto.id)
      let anterior = origen
      for (const paso of ruta.pasos) {
        assert.equal(Math.abs(paso.fila - anterior.fila)
          + Math.abs(paso.columna - anterior.columna), 1, reto.id)
        assert.ok('.CP'.includes(reto.mapa[paso.fila][paso.columna]), reto.id)
        anterior = paso
      }
      assert.equal(anterior.fila, objeto.fila, reto.id)
      assert.equal(anterior.columna, objeto.columna, reto.id)
    }

    const salida = planearRuta(reto.mapa, origen, puerta, reto.objetos)
    assert.deepEqual(salida.destino, puerta, reto.id)
    assert.equal(salida.frutaObjetivo, null, reto.id)
  }
})
