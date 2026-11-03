import test from 'node:test'
import assert from 'node:assert/strict'
import { crearPuente, interpretarMensaje } from '../../src/mensajes/puenteGuion.js'

// Una ventana de mentira: guarda a quien escucha y lo que se le avisa a la página que la contiene.
function crearVentanaFalsa() {
  const escuchas = new Set()
  const enviados = []
  const padre = { postMessage: (mensaje, origen) => enviados.push({ mensaje, origen }) }
  const ventana = {
    parent: padre,
    addEventListener: (tipo, funcion) => { if (tipo === 'message') escuchas.add(funcion) },
    removeEventListener: (tipo, funcion) => { if (tipo === 'message') escuchas.delete(funcion) },
  }
  // Lo que llega por postMessage: los datos y la ventana que los mandó.
  const recibir = (datos, origen = padre) => escuchas.forEach((funcion) => funcion({ data: datos, source: origen }))
  return { ventana, padre, enviados, escuchas, recibir }
}

const GUION = { formato: 'kusi-paquete/0', familia: 'laberinto', retos: [] }

test('un guion llega como objeto o como texto JSON, y reiniciar no lleva nada más', () => {
  assert.deepEqual(interpretarMensaje({ tipo: 'paquete', paquete: GUION }), { tipo: 'paquete', paquete: GUION })
  assert.deepEqual(interpretarMensaje({ tipo: 'paquete', paquete: JSON.stringify(GUION) }), { tipo: 'paquete', paquete: GUION })
  assert.deepEqual(interpretarMensaje({ tipo: 'reiniciar', sobra: 1 }), { tipo: 'reiniciar' })
})

test('un guion en texto que no es JSON llega como paquete nulo, para que el juego lo rechace', () => {
  assert.deepEqual(interpretarMensaje({ tipo: 'paquete', paquete: '{esto no es json' }), { tipo: 'paquete', paquete: null })
  assert.deepEqual(interpretarMensaje({ tipo: 'paquete' }), { tipo: 'paquete', paquete: undefined })
})

test('lo que no es para el juego se ignora sin lanzar excepciones', () => {
  for (const datos of [null, undefined, 'paquete', 42, [], ['paquete'], {}, { tipo: 'otra' }, { tipo: 'PAQUETE' }, { paquete: GUION }]) {
    assert.equal(interpretarMensaje(datos), null, JSON.stringify(datos))
  }
})

test('solo escucha a la página que contiene el juego', () => {
  const { ventana, recibir } = crearVentanaFalsa()
  const puente = crearPuente(ventana)
  const ordenes = []
  puente.conectar((orden) => ordenes.push(orden))

  recibir({ tipo: 'paquete', paquete: GUION }, { otraVentana: true })
  recibir({ tipo: 'reiniciar' }, null)
  assert.deepEqual(ordenes, [])

  recibir({ tipo: 'reiniciar' })
  assert.deepEqual(ordenes, [{ tipo: 'reiniciar' }])
})

test('lo que llega antes de que alguien lo atienda espera su turno y se entrega en orden', () => {
  const { ventana, recibir } = crearVentanaFalsa()
  const puente = crearPuente(ventana)
  recibir({ tipo: 'paquete', paquete: GUION })
  recibir({ tipo: 'reiniciar' })

  const ordenes = []
  puente.conectar((orden) => ordenes.push(orden))
  assert.deepEqual(ordenes, [{ tipo: 'paquete', paquete: GUION }, { tipo: 'reiniciar' }])

  // Ya atendidas, no se repiten con el siguiente que atienda.
  const siguientes = []
  puente.conectar((orden) => siguientes.push(orden))
  assert.deepEqual(siguientes, [])
})

test('avisa «listo» una sola vez, cuando alguien empieza a atender, a cualquier origen', () => {
  const { ventana, enviados } = crearVentanaFalsa()
  const puente = crearPuente(ventana)
  assert.deepEqual(enviados, [], 'antes de atender todavía no puede recibir')

  puente.conectar(() => {})
  assert.deepEqual(enviados, [{ mensaje: { tipo: 'listo' }, origen: '*' }])

  puente.conectar(() => {})
  puente.desconectar(() => {})
  assert.equal(enviados.length, 1)
})

test('quien se va solo suelta su lugar si sigue siendo el que atiende', () => {
  const { ventana, recibir } = crearVentanaFalsa()
  const puente = crearPuente(ventana)
  const antiguo = []
  const nuevo = []
  const atenderAntiguo = (orden) => antiguo.push(orden)
  const atenderNuevo = (orden) => nuevo.push(orden)

  puente.conectar(atenderAntiguo)
  puente.conectar(atenderNuevo)
  // El antiguo se va después de que el nuevo ya tomó su lugar: no lo desconecta.
  puente.desconectar(atenderAntiguo)
  recibir({ tipo: 'reiniciar' })
  assert.deepEqual(antiguo, [])
  assert.deepEqual(nuevo, [{ tipo: 'reiniciar' }])

  // Cuando sí se va el que atiende, lo que llega espera al siguiente.
  puente.desconectar(atenderNuevo)
  recibir({ tipo: 'paquete', paquete: GUION })
  assert.deepEqual(nuevo, [{ tipo: 'reiniciar' }])
  const ultimo = []
  puente.conectar((orden) => ultimo.push(orden))
  assert.deepEqual(ultimo, [{ tipo: 'paquete', paquete: GUION }])
})

test('avisar manda el mensaje a la página que contiene el juego y cerrar deja de escuchar', () => {
  const { ventana, enviados, escuchas, recibir } = crearVentanaFalsa()
  const puente = crearPuente(ventana)
  assert.equal(escuchas.size, 1)

  puente.avisar({ tipo: 'error', motivo: 'no sirve' })
  assert.deepEqual(enviados, [{ mensaje: { tipo: 'error', motivo: 'no sirve' }, origen: '*' }])

  puente.cerrar()
  assert.equal(escuchas.size, 0)
  const ordenes = []
  puente.conectar((orden) => ordenes.push(orden))
  recibir({ tipo: 'reiniciar' })
  assert.deepEqual(ordenes, [])
})
