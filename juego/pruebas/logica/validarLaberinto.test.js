import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validarLaberinto } from '../../src/datos/validarLaberinto.js'

const ejemplo = JSON.parse(readFileSync(
  new URL('../../public/paquete-laberinto-ejemplo.json', import.meta.url), 'utf8',
))

const copiarEjemplo = () => structuredClone(ejemplo)

// Los guiones de una sola regla que usan las pruebas del guion por mensaje. Spring genera
// los mismos con su IA falsa (ConstructorGuionTest comprueba que sigan iguales).
const leerGuionDePrueba = (nombre) => JSON.parse(readFileSync(
  new URL('../fixtures/' + nombre, import.meta.url), 'utf8',
))

test('los guiones de patrones y de clasificar son válidos, con o sin el bloque de procedencia de Spring', () => {
  for (const nombre of ['laberinto-orden.json', 'laberinto-solo-clase.json']) {
    const guion = leerGuionDePrueba(nombre)
    assert.deepEqual(validarLaberinto(guion), { valido: true, errores: [] }, nombre)
    guion.procedencia = { proveedor: 'groq', modelo: 'openai/gpt-oss-120b', intentos: 2, mapa_base: true, catalogo: { nombre: 'laberinto', version: 1 } }
    assert.deepEqual(validarLaberinto(guion), { valido: true, errores: [] }, nombre + ' con procedencia')
    guion.procedencia.reparaciones = { regla: [1], textos: [1, 2] }
    assert.deepEqual(validarLaberinto(guion), { valido: true, errores: [] }, nombre + ' con reparaciones del respaldo')
  }
  assert.deepEqual(leerGuionDePrueba('laberinto-orden.json').retos.map((reto) => reto.regla.tipo),
    ['orden', 'orden', 'orden'])
  assert.deepEqual(leerGuionDePrueba('laberinto-solo-clase.json').retos.map((reto) => reto.regla.tipo),
    ['solo_clase', 'solo_clase', 'solo_clase'])
})

test('el paquete escrito a mano admite los tres niveles previstos', () => {
  assert.deepEqual(validarLaberinto(ejemplo), { valido: true, errores: [] })
  assert.equal(ejemplo.retos.length, 3)
  assert.deepEqual(ejemplo.retos[0].enemigos, [])
  assert.equal(ejemplo.retos[1].enemigos[0].movimiento, 'persigue_cerca')
  assert.equal(ejemplo.retos[2].enemigos[0].movimiento, 'persigue_cerca')
  assert.equal(ejemplo.retos[2].regla.tipo, 'solo_clase')
})

test('todos los dibujos y las puertas del ejemplo son alcanzables desde el inicio', () => {
  // Esta comprobación cuida el paquete de demostración; no se incorpora a la
  // validación del navegador, que debe seguir siendo mínima.
  for (const reto of ejemplo.retos) {
    const filaInicial = reto.mapa.findIndex((fila) => fila.includes('C'))
    const columnaInicial = reto.mapa[filaInicial].indexOf('C')
    const pendientes = [[filaInicial, columnaInicial]]
    const visitadas = new Set([filaInicial + ',' + columnaInicial])
    for (let indice = 0; indice < pendientes.length; indice += 1) {
      const [fila, columna] = pendientes[indice]
      for (const [cambioFila, cambioColumna] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const siguienteFila = fila + cambioFila
        const siguienteColumna = columna + cambioColumna
        const casilla = reto.mapa[siguienteFila]?.[siguienteColumna]
        const clave = siguienteFila + ',' + siguienteColumna
        if (casilla && casilla !== '#' && !visitadas.has(clave)) {
          visitadas.add(clave)
          pendientes.push([siguienteFila, siguienteColumna])
        }
      }
    }
    for (const elemento of [...reto.objetos, ...reto.enemigos]) {
      assert.ok(visitadas.has(elemento.fila + ',' + elemento.columna), reto.id)
    }
    const filaPuerta = reto.mapa.findIndex((fila) => fila.includes('P'))
    assert.ok(visitadas.has(filaPuerta + ',' + reto.mapa[filaPuerta].indexOf('P')), reto.id)
  }
})

test('un paquete o un nivel incompleto se rechaza sin lanzar una excepción', () => {
  for (const paquete of [null, [], {}, { formato: 'kusi-paquete/0', familia: 'laberinto', retos: [null] }]) {
    assert.equal(validarLaberinto(paquete).valido, false)
  }
  const paquete = copiarEjemplo()
  paquete.retos[0].mapa = [null]
  paquete.retos[0].objetos = [null]
  paquete.retos[0].enemigos = [null]
  assert.equal(validarLaberinto(paquete).valido, false)
})

test('rechaza mapas desiguales, símbolos desconocidos y cantidades incorrectas de C o P', () => {
  for (const mapa of [
    ['#####', '#C.P#', '###'],
    ['#####', '#CXP#', '#####'],
    ['######', '#CC.P#', '######'],
    ['#####', '#C..#', '#####'],
  ]) {
    const paquete = copiarEjemplo()
    paquete.retos[0].mapa = mapa
    assert.equal(validarLaberinto(paquete).valido, false)
  }
})

test('rechaza objetos y enemigos en muros, fuera del mapa o con tipos desconocidos', () => {
  for (const objeto of [
    { tipo: 'fresa', fila: 0, columna: 0 },
    { tipo: 'fresa', fila: -1, columna: 3 },
    { tipo: 'fresa', fila: 1, columna: 100 },
    { tipo: 'fresa', fila: 1.5, columna: 3 },
    { tipo: 'tomate', fila: 1, columna: 3 },
  ]) {
    const paquete = copiarEjemplo()
    paquete.retos[0].objetos = [objeto]
    assert.equal(validarLaberinto(paquete).valido, false)
  }
  for (const enemigo of [
    { tipo: 'zorro', fila: 0, columna: 0, movimiento: 'patrulla' },
    { tipo: 'llama', fila: 1, columna: 3, movimiento: 'patrulla' },
    { tipo: 'zorro', fila: 1, columna: 3, movimiento: 'teletransporta' },
  ]) {
    const paquete = copiarEjemplo()
    paquete.retos[0].enemigos = [enemigo]
    assert.equal(validarLaberinto(paquete).valido, false)
  }
})

test('rechaza reglas que no se pueden representar y mensajes incompletos', () => {
  for (const regla of [null, { tipo: 'orden', secuencia: ['palta'] },
    { tipo: 'solo_clase', clase: 'desconocida', meta: 4 },
    { tipo: 'solo_clase', clase: 'fruta', meta: 0 }]) {
    const paquete = copiarEjemplo()
    paquete.retos[0].regla = regla
    assert.equal(validarLaberinto(paquete).valido, false)
  }
  const paquete = copiarEjemplo()
  paquete.retos[0].ayudas = []
  assert.equal(validarLaberinto(paquete).valido, false)
})
