import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  crearMovimiento,
  pedirDireccion,
  iniciarRecorrido,
  avanzarMovimiento,
  direccionDelDeslizamiento,
} from '../../juegos/laberinto/logica/movimientoLaberinto.js'
import { posicionEnCasillas } from '../../juegos/laberinto/logica/zorrosLaberinto.js'

const PASILLO = [
  '########',
  '#C....P#',
  '########',
]

test('el cuy empieza quieto en C y no avanza sin una dirección solicitada', () => {
  const estado = crearMovimiento(PASILLO)
  avanzarMovimiento(estado, PASILLO, 2)
  assert.deepEqual(estado, {
    fila: 1, columna: 1, direccion: 'abajo', direccionPendiente: null,
    progreso: 0, moviendose: false,
  })
})

test('avanza tres casillas por segundo e interpola sin moverse en diagonal', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  assert.equal(estado.fila, 1)
  assert.equal(estado.columna, 2)
  assert.equal(estado.progreso, 0.5)
  assert.equal(estado.moviendose, true)
  assert.equal(estado.direccionPendiente, null)
})

test('sigue solo, atraviesa P como camino y se detiene antes de un muro', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  avanzarMovimiento(estado, PASILLO, 30)
  assert.equal(estado.columna, 6)
  assert.equal(estado.progreso, 0)
  assert.equal(estado.moviendose, false)
  assert.equal(estado.direccion, 'derecha')
})

test('una llegada exacta al muro deja de caminar en el mismo fotograma', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 5 / 3)
  assert.equal(estado.columna, 6)
  assert.equal(estado.progreso, 0)
  assert.equal(estado.moviendose, false)
})

test('una vuelta temprana se guarda y se hace en la siguiente esquina posible', () => {
  const mapa = ['#######', '#C....#', '####.##', '####P##', '#######']
  const estado = crearMovimiento(mapa)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, mapa, 0.2)
  pedirDireccion(estado, 'abajo')
  avanzarMovimiento(estado, mapa, 0.3)
  assert.equal(estado.direccion, 'derecha')
  assert.equal(estado.direccionPendiente, 'abajo')
  avanzarMovimiento(estado, mapa, 1)
  assert.equal(estado.fila, 2)
  assert.equal(estado.columna, 4)
  assert.ok(Math.abs(estado.progreso - 0.5) < 0.000000001)
  assert.equal(estado.direccion, 'abajo')
  assert.equal(estado.direccionPendiente, null)
})

test('un giro bloqueado conserva el rumbo y la petición hasta poder doblar', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  pedirDireccion(estado, 'arriba')
  avanzarMovimiento(estado, PASILLO, 0.5)
  assert.equal(estado.columna, 4)
  assert.equal(estado.direccion, 'derecha')
  assert.equal(estado.direccionPendiente, 'arriba')
})

test('una dirección nueva reemplaza la vuelta pendiente y permite dar la vuelta', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.5)
  pedirDireccion(estado, 'arriba')
  pedirDireccion(estado, 'izquierda')
  avanzarMovimiento(estado, PASILLO, 0.5)
  assert.equal(estado.columna, 2)
  assert.equal(estado.progreso, 0)
  assert.equal(estado.direccion, 'izquierda')
  assert.equal(estado.direccionPendiente, null)
})

test('tras detenerse, una dirección válida reanuda el recorrido sin otra pulsación', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 5)
  pedirDireccion(estado, 'arriba')
  avanzarMovimiento(estado, PASILLO, 1)
  assert.equal(estado.columna, 6)
  assert.equal(estado.moviendose, false)
  pedirDireccion(estado, 'izquierda')
  avanzarMovimiento(estado, PASILLO, 1 / 3)
  assert.equal(estado.columna, 5)
  assert.equal(estado.moviendose, true)
})

test('no sale de los bordes aunque el mapa no tenga un muro exterior', () => {
  const mapa = ['C.P']
  const estado = crearMovimiento(mapa)
  pedirDireccion(estado, 'izquierda')
  avanzarMovimiento(estado, mapa, 10)
  assert.equal(estado.columna, 0)
  assert.equal(estado.moviendose, false)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, mapa, 10)
  assert.equal(estado.columna, 2)
  assert.equal(estado.moviendose, false)
})

test('acepta una velocidad distinta y descarta tiempos o direcciones inválidas', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  pedirDireccion(estado, 'diagonal')
  avanzarMovimiento(estado, PASILLO, 0.25, 6)
  assert.equal(estado.columna, 2)
  assert.equal(estado.progreso, 0.5)
  const anterior = { ...estado }
  for (const segundos of [-1, Infinity, NaN]) {
    avanzarMovimiento(estado, PASILLO, segundos)
    assert.deepEqual(estado, anterior)
  }
  avanzarMovimiento(estado, PASILLO, 1, 0)
  assert.deepEqual(estado, anterior)
})

test('un mapa sin C informa que falta el punto de inicio', () => {
  assert.throws(() => crearMovimiento(['###', '#P#', '###']), /casilla C/)
})

test('los deslizamientos eligen el eje mayor, con un mínimo de 30 píxeles', () => {
  const inicio = { x: 100, y: 100 }
  assert.equal(direccionDelDeslizamiento(inicio, { x: 129, y: 129 }), null)
  assert.equal(direccionDelDeslizamiento(inicio, { x: 130, y: 105 }), 'derecha')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 60, y: 80 }), 'izquierda')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 120, y: 150 }), 'abajo')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 90, y: 50 }), 'arriba')
  assert.equal(direccionDelDeslizamiento(inicio, { x: 130, y: 130 }), 'derecha')
})

test('avisa cada centro atravesado en orden aunque un cuadro avance muchas casillas', () => {
  const estado = crearMovimiento(PASILLO)
  const entradas = []
  const alEntrar = ({ fila, columna }) => entradas.push({ fila, columna })
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.2, 3, alEntrar)
  assert.deepEqual(entradas, [])

  // No se omiten frutas intermedias al acelerar ni se notifica el muro final.
  avanzarMovimiento(estado, PASILLO, 10, 3, alEntrar)
  assert.deepEqual(entradas, [2, 3, 4, 5, 6].map((columna) => ({ fila: 1, columna })))
  assert.equal(estado.columna, 6)
  assert.equal(estado.moviendose, false)
})

test('el callback puede detener la entrada sin gastar el tiempo sobrante en más casillas', () => {
  const estado = crearMovimiento(PASILLO)
  const entradas = []
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 0.2)
  pedirDireccion(estado, 'arriba')
  const alEntrar = ({ columna }) => {
    entradas.push(columna)
    return columna < 3
  }
  avanzarMovimiento(estado, PASILLO, 10, 3, alEntrar)
  assert.deepEqual(entradas, [2, 3])
  assert.equal(estado.columna, 3)
  assert.equal(estado.progreso, 0)
  assert.equal(estado.moviendose, false)
  assert.equal(estado.direccionPendiente, null)

  // Una actualización posterior no vuelve a ejecutar la salida ni desplaza al
  // personaje mientras la escena prepara el siguiente nivel.
  avanzarMovimiento(estado, PASILLO, 10, 3, alEntrar)
  assert.deepEqual(entradas, [2, 3])
  assert.equal(estado.columna, 3)
})

test('notificar las casillas conserva el giro guardado y el orden del recorrido', () => {
  const mapa = ['#######', '#C....#', '####.##', '####P##', '#######']
  const estado = crearMovimiento(mapa)
  const entradas = []
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, mapa, 0.2)
  pedirDireccion(estado, 'abajo')
  avanzarMovimiento(estado, mapa, 5, 3, ({ fila, columna }) => {
    entradas.push({ fila, columna })
  })
  assert.deepEqual(entradas, [
    { fila: 1, columna: 2 }, { fila: 1, columna: 3 }, { fila: 1, columna: 4 },
    { fila: 2, columna: 4 }, { fila: 3, columna: 4 },
  ])
  assert.equal(estado.direccion, 'abajo')
  assert.equal(estado.direccionPendiente, null)
  assert.equal(estado.moviendose, false)
})

test('un recorrido iniciado en reposo reemplaza la flecha pendiente y camina hacia su primer paso', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'izquierda')
  iniciarRecorrido(estado, [{ fila: 1, columna: 2, direccion: 'derecha' }])
  assert.deepEqual(posicionEnCasillas(estado), { fila: 1, columna: 1 })

  avanzarMovimiento(estado, PASILLO, 0.25, 1)
  assert.deepEqual(posicionEnCasillas(estado), { fila: 1, columna: 1.25 })
  assert.equal(estado.direccion, 'derecha')
  assert.equal(estado.direccionPendiente, null)
  assert.equal(estado.moviendose, true)
})

test('retocar hacia otro pasillo a mitad del tramo conserva la posición y vuelve al centro para girar', () => {
  const mapa = ['#####', '#...#', '#.C.#', '#..P#', '#####']
  const estado = crearMovimiento(mapa)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, mapa, 0.25, 1)
  pedirDireccion(estado, 'abajo')
  const posicionAntes = posicionEnCasillas(estado)
  const nuevaRuta = [{ fila: 1, columna: 2, direccion: 'arriba' }]
  iniciarRecorrido(estado, nuevaRuta)

  assert.deepEqual(posicionEnCasillas(estado), posicionAntes)
  assert.equal(estado.direccionPendiente, null)
  avanzarMovimiento(estado, mapa, 0.125, 1)
  assert.deepEqual(posicionEnCasillas(estado), { fila: 2, columna: 2.125 })

  // La ejecución de la ruta decide de nuevo al entrar en un centro. Detener el
  // cuadro aquí impide gastar el tiempo restante antes de preparar el giro.
  const centros = []
  avanzarMovimiento(estado, mapa, 3, 1, ({ fila, columna }) => {
    centros.push({ fila, columna })
    return false
  })
  assert.deepEqual(centros, [{ fila: 2, columna: 2 }])
  assert.deepEqual(posicionEnCasillas(estado), { fila: 2, columna: 2 })
  iniciarRecorrido(estado, nuevaRuta)
  avanzarMovimiento(estado, mapa, 1, 1, () => false)
  assert.deepEqual(posicionEnCasillas(estado), { fila: 1, columna: 2 })
})

test('retocar hacia el mismo tramo sigue avanzando sin saltar ni obedecer una flecha anterior', () => {
  const mapa = ['#####', '#...#', '#.C.#', '#..P#', '#####']
  const estado = crearMovimiento(mapa)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, mapa, 0.25, 1)
  pedirDireccion(estado, 'arriba')
  const posicionAntes = posicionEnCasillas(estado)
  iniciarRecorrido(estado, [{ fila: 2, columna: 3, direccion: 'derecha' }])

  assert.deepEqual(posicionEnCasillas(estado), posicionAntes)
  assert.equal(estado.direccionPendiente, null)
  avanzarMovimiento(estado, mapa, 0.125, 1)
  assert.deepEqual(posicionEnCasillas(estado), { fila: 2, columna: 2.375 })
  const centros = []
  avanzarMovimiento(estado, mapa, 3, 1, ({ fila, columna }) => {
    centros.push({ fila, columna })
    return false
  })
  assert.deepEqual(centros, [{ fila: 2, columna: 3 }])
})

test('un recorrido vacío a mitad de cualquiera de los cuatro rumbos regresa al centro sin saltar', () => {
  const mapa = ['#####', '#...#', '#.C.#', '#..P#', '#####']
  for (const direccion of ['arriba', 'abajo', 'izquierda', 'derecha']) {
    const estado = crearMovimiento(mapa)
    pedirDireccion(estado, direccion)
    avanzarMovimiento(estado, mapa, 0.25, 1)
    const posicionAntes = posicionEnCasillas(estado)
    iniciarRecorrido(estado, [])
    assert.deepEqual(posicionEnCasillas(estado), posicionAntes, direccion)

    const centros = []
    avanzarMovimiento(estado, mapa, 3, 1, ({ fila, columna }) => {
      centros.push({ fila, columna })
      return false
    })
    assert.deepEqual(centros, [{ fila: 2, columna: 2 }], direccion)
    assert.deepEqual(posicionEnCasillas(estado), { fila: 2, columna: 2 }, direccion)
    assert.equal(estado.moviendose, false, direccion)
    avanzarMovimiento(estado, mapa, 3, 1)
    assert.deepEqual(posicionEnCasillas(estado), { fila: 2, columna: 2 }, direccion)
  }
})

test('un recorrido de cero pasos detiene el avance desde un centro y borra la flecha guardada', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 1, 1)
  pedirDireccion(estado, 'izquierda')
  iniciarRecorrido(estado, [])
  avanzarMovimiento(estado, PASILLO, 10, 1)
  assert.deepEqual(posicionEnCasillas(estado), { fila: 1, columna: 2 })
  assert.equal(estado.moviendose, false)
  assert.equal(estado.direccionPendiente, null)
})

test('un recorrido nulo equivale a cero pasos y detiene el movimiento en el centro', () => {
  const estado = crearMovimiento(PASILLO)
  pedirDireccion(estado, 'derecha')
  avanzarMovimiento(estado, PASILLO, 1, 1)
  iniciarRecorrido(estado, null)
  avanzarMovimiento(estado, PASILLO, 10, 1)
  assert.deepEqual(posicionEnCasillas(estado), { fila: 1, columna: 2 })
  assert.equal(estado.moviendose, false)
  assert.equal(estado.direccionPendiente, null)
})
