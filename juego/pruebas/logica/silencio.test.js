import { test } from 'node:test'
import assert from 'node:assert/strict'
import { leerSilencio, guardarSilencio } from '../../kit/reproductor/efectos/silencio.js'

// Un localStorage de mentira, que se puede dejar sin funcionar como en algunos WebView.
function instalarAlmacenamiento({ falla = false } = {}) {
  const datos = new Map()
  globalThis.localStorage = {
    getItem(clave) {
      if (falla) throw new Error('almacenamiento bloqueado')
      return datos.has(clave) ? datos.get(clave) : null
    },
    setItem(clave, valor) {
      if (falla) throw new Error('almacenamiento bloqueado')
      datos.set(clave, String(valor))
    },
  }
  return datos
}

test.afterEach(() => {
  delete globalThis.localStorage
  guardarSilencio(false)
})

test('el silencio elegido se guarda y se lee, también tras apagarlo y encenderlo otra vez', () => {
  const datos = instalarAlmacenamiento()
  assert.equal(leerSilencio(), false, 'por defecto los sonidos están encendidos')
  guardarSilencio(true)
  assert.equal(leerSilencio(), true)
  assert.deepEqual([...datos.values()], ['si'])
  guardarSilencio(false)
  assert.equal(leerSilencio(), false)
  assert.deepEqual([...datos.values()], ['no'])
})

test('lo guardado manda sobre la memoria de la sesión, como al abrir el juego otra vez', () => {
  const datos = instalarAlmacenamiento()
  datos.set('kusi-laberinto-silencio-v1', 'si')
  assert.equal(leerSilencio(), true)
})

test('si el almacenamiento falla, el silencio se recuerda mientras dure la sesión', () => {
  instalarAlmacenamiento({ falla: true })
  assert.equal(leerSilencio(), false)
  assert.doesNotThrow(() => guardarSilencio(true))
  assert.equal(leerSilencio(), true)
  guardarSilencio(false)
  assert.equal(leerSilencio(), false)
})

test('sin localStorage en absoluto tampoco se rompe', () => {
  delete globalThis.localStorage
  assert.equal(leerSilencio(), false)
  assert.doesNotThrow(() => guardarSilencio(true))
  assert.equal(leerSilencio(), true)
})
