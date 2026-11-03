import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarModulo } from './cargar-modulo.mjs'
const { estadoTrabajo } = await import(await cargarModulo(new URL('../src/docente/trabajosDocente.ts', import.meta.url)))
const { CambiosPropuesta } = await import(await cargarModulo(new URL('../src/docente/cambiosPropuesta.ts', import.meta.url)))
const solicitud = { id_solicitud: 'prueba', estado: 'generada', propuesta: { version: 1, estado_revision: 'aprobada' } }

test('los estados de Mis juegos distinguen aprobar, preparar, probar y enviar', () => {
  const trabajo = (estado, publicada = false) => ({ solicitud, juego: estado ? { estado, publicada } : null, sinConfirmar: false })
  assert.equal(estadoTrabajo(trabajo(null)).clave, 'retomar')
  assert.equal(estadoTrabajo(trabajo('pendiente')).clave, 'preparando')
  assert.equal(estadoTrabajo(trabajo('generando')).clave, 'preparando')
  assert.equal(estadoTrabajo(trabajo('fallida')).clave, 'retomar')
  assert.equal(estadoTrabajo(trabajo('lista')).clave, 'probar')
  assert.equal(estadoTrabajo(trabajo('lista', true)).clave, 'enviado')
  assert.equal(estadoTrabajo({ ...trabajo('lista', true), solicitud: { ...solicitud, propuesta: { estado_revision: 'pendiente' } } }).clave, 'revisar')
  assert.equal(estadoTrabajo({ ...trabajo(null), sinConfirmar: true }).etiqueta, 'Por consultar')
})

test('el chat recupera un cambio guardado tras perder la respuesta sin crear otro', async () => {
  let escritos = 0
  const actualizada = { ...solicitud, propuesta: { version: 2 } }
  const gestor = new CambiosPropuesta({
    enviar: async () => { escritos++; throw new Error('Respuesta perdida') },
    versiones: async () => [{ version_base: 1, observaciones: 'Acorta la consigna.' }],
    consultar: async () => actualizada,
  })
  await assert.rejects(gestor.enviar('prueba', 1, 'Acorta la consigna.'))
  assert.equal(await gestor.enviar('prueba', 2, 'Acorta la consigna.'), actualizada)
  assert.equal(escritos, 1)
})

test('una consulta incierta o un cambio aún en curso impiden reenviar el mensaje', async () => {
  let escritos = 0
  let consultarVersiones = async () => { throw new Error('Sin conexión') }
  const gestor = new CambiosPropuesta({
    enviar: async () => { escritos++; throw new Error('Respuesta perdida') },
    versiones: () => consultarVersiones(),
    consultar: async () => ({ ...solicitud, estado: 'generando' }),
  })
  await assert.rejects(gestor.enviar('prueba', 1, 'Una ayuda más clara.'))
  await assert.rejects(gestor.enviar('prueba', 1, 'Una ayuda más clara.'))
  consultarVersiones = async () => []
  await assert.rejects(gestor.enviar('prueba', 1, 'Una ayuda más clara.'))
  assert.equal(escritos, 1)
})

test('un mensaje nuevo no se pierde al recuperar el anterior', async () => {
  const enviados = []
  const gestor = new CambiosPropuesta({
    enviar: async (_id, version, texto) => { enviados.push([version, texto]); if (enviados.length === 1) throw new Error('Respuesta perdida'); return solicitud },
    versiones: async () => [{ version_base: 1, observaciones: 'Primero' }],
    consultar: async () => ({ ...solicitud, propuesta: { version: 2 } }),
  })
  await assert.rejects(gestor.enviar('prueba', 1, 'Primero'))
  await gestor.enviar('prueba', 1, 'Después')
  assert.deepEqual(enviados, [[1, 'Primero'], [2, 'Después']])
})
