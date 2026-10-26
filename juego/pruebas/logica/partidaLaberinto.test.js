import { test } from 'node:test'
import assert from 'node:assert/strict'
import { crearPartidaLaberinto, avisarPartida } from '../../src/logica/partidaLaberinto.js'
import { avisos } from '../../src/logica/avisos.js'

// Cada prueba conserva los avisos anteriores y observa solamente los suyos.
// El mock de consola pertenece al contexto de la prueba y Node lo restaura al
// terminar, sin cambiar el registro que también utiliza el mercado.
function prepararPrueba(contexto) {
  contexto.mock.method(console, 'log', () => {})
  const desde = avisos.length
  return () => avisos.slice(desde)
}

test('el contexto impone su partida y un orden propio aunque los datos intenten reemplazarlos', (contexto) => {
  const leerAvisos = prepararPrueba(contexto)
  const partida = crearPartidaLaberinto()
  assert.equal(partida.orden, 0)
  assert.equal(typeof partida.id, 'string')
  assert.ok(partida.id.length > 0)

  const aviso = avisarPartida(partida, 'accion', {
    objeto: 'fresa', correcto: true, partida: 'ajena', orden: 800,
  })

  assert.equal(aviso.tipo, 'accion')
  assert.equal(aviso.objeto, 'fresa')
  assert.equal(aviso.correcto, true)
  assert.equal(aviso.partida, partida.id)
  assert.equal(aviso.orden, 1)
  assert.equal(partida.orden, 1)
  assert.ok(Number.isFinite(Date.parse(aviso.momento)))
  assert.deepEqual(leerAvisos(), [aviso])
})

test('listo e inicio se emiten una sola vez por partida sin gastar orden en sus duplicados', (contexto) => {
  const leerAvisos = prepararPrueba(contexto)
  const partida = crearPartidaLaberinto()
  avisarPartida(partida, 'listo', { nivel: 1 })
  assert.equal(avisarPartida(partida, 'listo', { nivel: 1 }), null)
  avisarPartida(partida, 'inicio', { nivel: 1 })
  assert.equal(avisarPartida(partida, 'inicio', { nivel: 2 }), null)
  assert.equal(avisarPartida(partida, 'listo', { nivel: 2 }), null)

  assert.deepEqual(leerAvisos().map((aviso) => aviso.tipo), ['listo', 'inicio'])
  assert.deepEqual(leerAvisos().map((aviso) => aviso.orden), [1, 2])
  assert.equal(partida.orden, 2)
})

test('las acciones y ayudas repetidas siguen siendo intentos válidos antes del cierre', (contexto) => {
  const leerAvisos = prepararPrueba(contexto)
  const partida = crearPartidaLaberinto()
  for (let intento = 1; intento <= 2; intento += 1) {
    const accion = avisarPartida(partida, 'accion', { objeto: 'platano', correcto: false })
    const ayuda = avisarPartida(partida, 'ayuda', { nivel: 1, ayuda: intento })
    assert.notEqual(accion, null)
    assert.notEqual(ayuda, null)
  }

  assert.deepEqual(leerAvisos().map((aviso) => aviso.tipo), ['accion', 'ayuda', 'accion', 'ayuda'])
  assert.deepEqual(leerAvisos().map((aviso) => aviso.orden), [1, 2, 3, 4])
  assert.equal(leerAvisos().every((aviso) => aviso.partida === partida.id), true)
})

test('dos niveles comparten partida y solo completan cada reto una vez', (contexto) => {
  const leerAvisos = prepararPrueba(contexto)
  const partida = crearPartidaLaberinto()
  avisarPartida(partida, 'listo', { nivel: 1 })
  avisarPartida(partida, 'inicio', { nivel: 1 })
  avisarPartida(partida, 'accion', { nivel: 1, objeto: 'fresa', correcto: true })
  avisarPartida(partida, 'reto_completado', { nivel: 1 })
  assert.equal(avisarPartida(partida, 'reto_completado', { nivel: 1 }), null)
  avisarPartida(partida, 'accion', { nivel: 2, objeto: 'mango', correcto: true })
  avisarPartida(partida, 'reto_completado', { nivel: 2 })
  assert.equal(avisarPartida(partida, 'reto_completado', { nivel: 2 }), null)
  avisarPartida(partida, 'fin')

  const registrados = leerAvisos()
  assert.equal(registrados.every((aviso) => aviso.partida === partida.id), true)
  assert.deepEqual(registrados.map((aviso) => aviso.orden), [1, 2, 3, 4, 5, 6, 7])
  assert.deepEqual(registrados.filter((aviso) => aviso.tipo === 'reto_completado')
    .map((aviso) => aviso.nivel), [1, 2])
  assert.equal(registrados.at(-1).tipo, 'fin')
})

test('fin queda como último aviso y cierra los eventos posteriores sin incrementar el orden', (contexto) => {
  const leerAvisos = prepararPrueba(contexto)
  const partida = crearPartidaLaberinto()
  avisarPartida(partida, 'inicio', { nivel: 1 })
  const fin = avisarPartida(partida, 'fin')
  const ordenFinal = partida.orden

  for (const tipo of ['fin', 'fallo', 'accion', 'ayuda', 'reto_completado', 'inicio', 'listo']) {
    assert.equal(avisarPartida(partida, tipo, { nivel: 2 }), null)
  }

  assert.equal(partida.cerrada, true)
  assert.equal(partida.orden, ordenFinal)
  assert.deepEqual(leerAvisos().map((aviso) => aviso.tipo), ['inicio', 'fin'])
  assert.equal(leerAvisos().at(-1), fin)
})

test('un fallo de carga cierra su partida aunque el primer mapa nunca haya comenzado', (contexto) => {
  const leerAvisos = prepararPrueba(contexto)
  const partida = crearPartidaLaberinto()
  const fallo = avisarPartida(partida, 'fallo', { motivo: 'Mapa incompatible' })

  assert.equal(fallo.tipo, 'fallo')
  assert.equal(fallo.orden, 1)
  assert.equal(fallo.partida, partida.id)
  assert.equal(partida.cerrada, true)
  assert.equal(avisarPartida(partida, 'fallo'), null)
  assert.equal(avisarPartida(partida, 'fin'), null)
  assert.equal(avisarPartida(partida, 'inicio'), null)
  assert.equal(avisarPartida(partida, 'accion', { atrapado: true }), null)
  assert.equal(partida.orden, 1)
  assert.deepEqual(leerAvisos(), [fallo])
})

test('un reintento crea otro identificador y comienza de nuevo en orden 1', (contexto) => {
  const leerAvisos = prepararPrueba(contexto)
  const primera = crearPartidaLaberinto()
  avisarPartida(primera, 'fallo')
  const segunda = crearPartidaLaberinto()
  const aviso = avisarPartida(segunda, 'listo', { nivel: 1 })

  assert.notEqual(primera.id, segunda.id)
  assert.equal(aviso.orden, 1)
  assert.equal(aviso.partida, segunda.id)
  assert.equal(segunda.orden, 1)
  assert.equal(segunda.cerrada, false)
  assert.deepEqual(leerAvisos().map((registrado) => registrado.orden), [1, 1])
})
