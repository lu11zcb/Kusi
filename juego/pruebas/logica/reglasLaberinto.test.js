import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { crearRegla, comerEnCasilla } from '../../src/logica/reglasLaberinto.js'

const paquete = JSON.parse(readFileSync(
  new URL('../../public/paquete-laberinto-ejemplo.json', import.meta.url), 'utf8',
))

test('cada partida conserva objetos propios sin modificar el paquete', () => {
  const reto = paquete.retos[0]
  const original = structuredClone(reto)
  const primera = crearRegla(reto)
  const segunda = crearRegla(reto)

  assert.equal(primera.recogidos, 0)
  assert.equal(primera.completada, false)
  assert.equal(primera.errores, 0)
  assert.equal(primera.objetos.every((objeto) => !objeto.recogido), true)
  comerEnCasilla(primera, reto.regla, 1, 3)

  assert.equal(primera.objetos[0].recogido, true)
  assert.equal(segunda.objetos[0].recogido, false)
  assert.equal(segunda.recogidos, 0)
  assert.deepEqual(reto, original)
})

test('el primer nivel recoge fresa, platano, fresa y platano y completa al final', () => {
  const reto = paquete.retos[0]
  const estado = crearRegla(reto)

  reto.objetos.forEach((objeto, indice) => {
    const resultado = comerEnCasilla(estado, reto.regla, objeto.fila, objeto.columna)
    assert.deepEqual(resultado, {
      indice, objeto: objeto.tipo, correcto: true,
      completada: indice === 3, ayuda: null,
    })
    assert.equal(estado.recogidos, indice + 1)
    assert.equal(estado.completada, indice === 3)
  })

  assert.equal(estado.objetos.every((objeto) => objeto.recogido), true)
  assert.equal(estado.errores, 0)
})

test('una fruta equivocada permanece y ofrece primero ayuda 1 y después ayuda 2', () => {
  const reto = paquete.retos[0]
  const estado = crearRegla(reto)

  for (let intento = 1; intento <= 3; intento += 1) {
    assert.deepEqual(comerEnCasilla(estado, reto.regla, 1, 7), {
      indice: 1, objeto: 'platano', correcto: false, completada: false,
      ayuda: Math.min(intento, 2),
    })
    assert.equal(estado.objetos[1].recogido, false)
    assert.equal(estado.recogidos, 0)
    assert.equal(estado.errores, intento)
  }

  // Después de acertar la fresa, el mismo plátano que antes era incorrecto
  // se puede recoger. Un error no lo elimina ni cambia la secuencia pendiente.
  comerEnCasilla(estado, reto.regla, 1, 3)
  const resultado = comerEnCasilla(estado, reto.regla, 1, 7)
  assert.equal(resultado.correcto, true)
  assert.equal(resultado.ayuda, null)
  assert.equal(estado.recogidos, 2)
  assert.equal(estado.errores, 3)
})

test('las casillas vacías y los objetos ya recogidos no vuelven a puntuar', () => {
  const reto = paquete.retos[0]
  const estado = crearRegla(reto)
  assert.equal(comerEnCasilla(estado, reto.regla, 1, 2), null)
  comerEnCasilla(estado, reto.regla, 1, 3)
  assert.equal(comerEnCasilla(estado, reto.regla, 1, 3), null)
  assert.equal(estado.recogidos, 1)
  assert.equal(estado.errores, 0)
})

test('solo_clase recoge cuatro frutas y conserva las verduras como trampas', () => {
  const reto = paquete.retos[2]
  const estado = crearRegla(reto)

  for (const objeto of reto.objetos.slice(4)) {
    const resultado = comerEnCasilla(estado, reto.regla, objeto.fila, objeto.columna)
    assert.equal(resultado.correcto, false)
    assert.equal(estado.recogidos, 0)
    assert.equal(estado.objetos[resultado.indice].recogido, false)
  }

  for (const [indice, objeto] of reto.objetos.slice(0, 4).entries()) {
    const resultado = comerEnCasilla(estado, reto.regla, objeto.fila, objeto.columna)
    assert.equal(resultado.correcto, true)
    assert.equal(resultado.completada, indice === 3)
  }

  assert.equal(estado.recogidos, 4)
  assert.equal(estado.completada, true)
  assert.equal(estado.errores, 3)
  assert.equal(estado.objetos.slice(4).every((objeto) => !objeto.recogido), true)
})

test('una vez cumplida la regla no recoge ni penaliza al ir hacia la puerta', () => {
  const reto = paquete.retos[2]
  const estado = crearRegla(reto)
  for (const objeto of reto.objetos.slice(0, 4)) {
    comerEnCasilla(estado, reto.regla, objeto.fila, objeto.columna)
  }
  const antes = structuredClone(estado)
  for (const objeto of reto.objetos) {
    assert.equal(comerEnCasilla(estado, reto.regla, objeto.fila, objeto.columna), null)
  }
  assert.deepEqual(estado, antes)
})

test('la clasificación utiliza la clase del paquete y no fija fruta en el código', () => {
  const reto = {
    regla: { tipo: 'solo_clase', clase: 'verdura', meta: 1 },
    objetos: [
      { tipo: 'fresa', fila: 1, columna: 2 },
      { tipo: 'zanahoria', fila: 1, columna: 3 },
    ],
  }
  const estado = crearRegla(reto)
  assert.equal(comerEnCasilla(estado, reto.regla, 1, 2).correcto, false)
  assert.equal(comerEnCasilla(estado, reto.regla, 1, 3).completada, true)
  assert.equal(estado.objetos[0].recogido, false)
  assert.equal(estado.objetos[1].recogido, true)
})
