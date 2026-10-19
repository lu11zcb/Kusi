import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarModulo } from './cargar-modulo.mjs'

const { listarUsuariosEducativos, filtrarOpciones, nombreSeccion, opcionesCuentas } = await import(await cargarModulo(new URL('../src/servicios/opcionesEducativas.ts', import.meta.url)))
const { listarSecciones } = await import(await cargarModulo(new URL('../src/servicios/educacion.ts', import.meta.url)))
const json = (datos, status = 200) => new Response(JSON.stringify(datos), { status })

test('HU08: solo permite elegir docentes activos y distingue nombres iguales por correo', () => {
  const cuentas = [
    { id: 'a', nombre: 'María', correo: 'uno@example.com', roles: ['docente'], activo: true },
    { id: 'b', nombre: 'María', correo: 'dos@example.com', roles: ['administrador', 'docente'], activo: true },
    { id: 'c', nombre: 'Sin acceso', roles: ['docente'], activo: false },
    { id: 'd', nombre: 'Estudiante', roles: ['estudiante'], activo: true },
  ]
  assert.deepEqual(opcionesCuentas(cuentas, 'docente'), [
    { id: 'a', nombre: 'María · uno@example.com' }, { id: 'b', nombre: 'María · dos@example.com' },
  ])
})

test('HU08: busca partes de nombres sin distinguir mayúsculas o tildes', () => {
  const opciones = [{ id: 'a', nombre: 'María López' }, { id: 'b', nombre: 'Matemática' }]
  assert.deepEqual(filtrarOpciones(opciones, 'MARIA'), [opciones[0]])
  assert.deepEqual(filtrarOpciones(opciones, 'temati'), [opciones[1]])
  assert.deepEqual(filtrarOpciones(opciones, 'sin coincidencias'), [])
  assert.deepEqual(filtrarOpciones(opciones, ' '), opciones)
  assert.equal(nombreSeccion({ nombre: 'A', grado: 1, anio_escolar: 2027 }), 'A · 1° de primaria · 2027')
})

test('HU08: carga nombres de todas las páginas y conserva las cuentas antiguas', async (t) => {
  const visitadas = []
  t.mock.method(globalThis, 'fetch', async (ruta) => {
    const pagina = Number(new URL(ruta, 'http://localhost').searchParams.get('pagina'))
    visitadas.push(pagina)
    return json({ usuarios: [{ id: String(pagina), nombre: 'Cuenta ' + pagina, activo: pagina === 2 }], paginas: 2, pagina, total: 2 })
  })
  const usuarios = await listarUsuariosEducativos()
  assert.deepEqual(visitadas, [1, 2])
  assert.deepEqual(usuarios.map((usuario) => usuario.id), ['1', '2'])
})

test('HU08: un fallo de una página no se presenta como catálogo completo', async (t) => {
  t.mock.method(globalThis, 'fetch', async (ruta) => ruta.endsWith('pagina=1')
    ? json({ usuarios: [{ id: '1' }], paginas: 2 }) : json({ mensaje: 'No disponible' }, 503))
  await assert.rejects(listarUsuariosEducativos(), /No disponible/)
})

test('HU08: consulta las secciones por el adaptador autorizado de Django', async (t) => {
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    assert.equal(ruta, '/api/educacion/secciones/listado/')
    assert.equal(opciones.credentials, 'same-origin')
    return json({ secciones: [] })
  })
  assert.deepEqual(await listarSecciones(), { secciones: [] })
})
