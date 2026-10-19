import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarModulo } from './cargar-modulo.mjs'

const { opcionesCuentas, filtrarOpciones } = await import(await cargarModulo(new URL('../src/servicios/opcionesEducativas.ts', import.meta.url)))
const { crearVinculo } = await import(await cargarModulo(new URL('../src/servicios/educacion.ts', import.meta.url)))

test('HU07: solo ofrece estudiantes activos y diferencia homónimos sin mostrar UUID', () => {
  const cuentas = [
    { id: 'a', nombre: 'José Pérez', dni: '00000001', roles: ['estudiante'], activo: true },
    { id: 'b', nombre: 'José Pérez', dni: '00000002', roles: ['estudiante'], activo: true },
    { id: 'c', nombre: 'Docente', roles: ['docente'], activo: true },
    { id: 'd', nombre: 'Sin acceso', roles: ['estudiante'], activo: false },
  ]
  const opciones = opcionesCuentas(cuentas, 'estudiante')
  assert.deepEqual(opciones, [
    { id: 'a', nombre: 'José Pérez · DNI 00000001' }, { id: 'b', nombre: 'José Pérez · DNI 00000002' },
  ])
  assert.equal(filtrarOpciones(opciones, 'JOSE').length, 2)
})

test('HU07: conserva el contrato de creación y muestra el rechazo de duplicados sin reintentar', async (t) => {
  const datos = { estudiante_id: '00000000-0000-4000-8000-000000000001', seccion_id: '00000000-0000-4000-8000-000000000002', anio_escolar: 2027 }
  let escrituras = 0
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    if (ruta === '/api/acceso/sesion/') return new Response(JSON.stringify({ csrf_token: 'qa-token' }))
    assert.equal(ruta, '/api/educacion/vinculos-estudiantes/crear/')
    assert.equal(opciones.method, 'POST')
    assert.deepEqual(JSON.parse(opciones.body), datos)
    escrituras += 1
    return new Response(JSON.stringify({ mensaje: 'El estudiante ya está vinculado a esa sección.' }), { status: 409 })
  })
  await assert.rejects(crearVinculo(datos), /ya está vinculado/)
  assert.equal(escrituras, 1)
})
