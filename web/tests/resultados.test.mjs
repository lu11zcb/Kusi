import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'

const { actividadesResultados, estudiantesResultados, respuestasResultados, destinatariosActividad, asignarActividad } = await import(await cargarModulo(new URL('../src/servicios/resultados.ts', import.meta.url)))
const { PartidasEstudiante, ResultadosDocente } = await import(await cargarModulo(new URL('../src/docente/ResultadosDocente.tsx', import.meta.url)))
const { ListaDestinatarios } = await import(await cargarModulo(new URL('../src/docente/AsignacionesActividad.tsx', import.meta.url)))
const juego = '22222222-2222-2222-2222-222222222222'
const reto = '33333333-3333-3333-3333-333333333333'
const partida = { juego_id: juego, envio: 2, enviado_en: '2026-11-09T15:30:59Z', estado: 'en_curso', ayudas_usadas: 2,
  retos: [{ reto, respuestas: [
    { respuesta: 'Cuadrado', correcto: false, tipo: 'primera', ayudas: [] },
    { respuesta: 'Círculo', correcto: true, tipo: 'correccion', ayudas: [1, 2] },
  ] }] }

test('consulta actividades, estados y respuestas por las rutas protegidas, con sesión y sin caché', async () => {
  const original = globalThis.fetch
  const llamadas = []
  globalThis.fetch = async (ruta, opciones) => {
    llamadas.push({ ruta, opciones })
    const datos = ruta.endsWith('/estudiante/') ? { partidas: [partida] }
      : ruta.includes('/estudiantes/') ? { estudiantes: [{ id: 'estudiante', nombre: 'Estudiante de prueba', estado: 'en_curso', partidas: 1, ayudas_usadas: 2 }] }
        : { actividades: [{ id: 'actividad', titulo: 'Clasificar formas', seccion: 'Primero A' }] }
    return new Response(JSON.stringify(datos))
  }
  try {
    assert.equal((await actividadesResultados())[0].titulo, 'Clasificar formas')
    assert.equal((await estudiantesResultados('actividad'))[0].estado, 'en_curso')
    assert.deepEqual(await respuestasResultados('actividad', 'estudiante'), [partida])
    assert.deepEqual(llamadas.map(c => c.ruta), ['/api/edu/resultados/actividades/', '/api/edu/resultados/actividades/actividad/estudiantes/', '/api/edu/resultados/actividades/actividad/estudiantes/estudiante/'])
    for (const { opciones } of llamadas) {
      assert.equal(opciones.credentials, 'same-origin')
      assert.equal(opciones.cache, 'no-store')
      assert.equal(opciones.method, undefined)
    }
  } finally { globalThis.fetch = original }
})

test('un rechazo de acceso conserva su estado y no se presenta como una lista vacía', async () => {
  const original = globalThis.fetch
  globalThis.fetch = async () => new Response(JSON.stringify({ mensaje: 'Acceso rechazado' }), { status: 403 })
  try { await assert.rejects(actividadesResultados(), error => error.estado === 403) }
  finally { globalThis.fetch = original }
})

test('rechaza respuestas incompletas, estados desconocidos y ayudas fuera del contrato', async () => {
  const original = globalThis.fetch
  try {
    for (const datos of [{}, { actividades: [{}] }, { actividades: null }]) {
      globalThis.fetch = async () => new Response(JSON.stringify(datos))
      await assert.rejects(actividadesResultados(), error => error.estado === 502)
    }
    for (const cambio of [{ estado: 'terminada' }, { ayudas_usadas: -1 }, { enviado_en: 'no es fecha' }, { envio: 0 },
      { retos: [{ reto: '1', respuestas: [{ respuesta: 'A', correcto: true, tipo: 'primera', ayudas: [3] }] }] }]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ partidas: [{ ...partida, ...cambio }] }))
      await assert.rejects(respuestasResultados('actividad', 'estudiante'), error => error.estado === 502)
    }
  } finally { globalThis.fetch = original }
})

test('muestra la primera respuesta, las correcciones y sus ayudas sin identificadores ni segundos', () => {
  const original = structuredClone(partida)
  const html = renderToStaticMarkup(createElement(PartidasEstudiante, { partidas: [partida] }))
  for (const texto of ['Primera respuesta', 'Corrección', 'Cuadrado', 'Círculo', 'Ayuda 1, Ayuda 2', 'Sin ayuda', 'Juego recibido: envío 2', '10:30', 'Reto 1']) assert.ok(html.includes(texto), texto)
  for (const texto of [juego, reto, '10:30:59', 'Versión', 'version_propuesta']) assert.ok(!html.includes(texto), texto)
  assert.deepEqual(partida, original)
  assert.ok(html.includes('Ayudas se muestran aparte') || html.includes('ayudas se muestran aparte'))
})

test('abre resultados con una espera clara sin inventar estudiantes ni estados', () => {
  const html = renderToStaticMarkup(createElement(ResultadosDocente, { activo: true }))
  assert.ok(html.includes('Resultados'))
  assert.ok(html.includes('Buscando las actividades'))
  assert.ok(!html.includes('Completada'))
})

test('la asignación consulta destinatarios y envía solo la selección explícita con el CSRF educativo', async () => {
  const original = globalThis.fetch
  const llamadas = []
  globalThis.fetch = async (ruta, opciones) => {
    llamadas.push({ ruta, opciones })
    if (ruta.endsWith('/csrf/')) return new Response(JSON.stringify({ csrf_token: 'token-sintetico' }))
    if (opciones.method === 'POST') return new Response(JSON.stringify({ guardado: true }))
    return new Response(JSON.stringify({ estudiantes: [{ id: juego, nombre: 'Cuenta sintética', asignado: false }] }))
  }
  try {
    assert.equal((await destinatariosActividad('actividad'))[0].asignado, false)
    await asignarActividad('actividad', [juego])
    const envio = llamadas.at(-1)
    assert.equal(envio.ruta, '/api/edu/resultados/actividades/actividad/asignaciones/')
    assert.equal(envio.opciones.method, 'POST')
    assert.equal(envio.opciones.headers['X-XSRF-TOKEN'], 'token-sintetico')
    assert.equal(envio.opciones.credentials, 'same-origin')
    assert.deepEqual(JSON.parse(envio.opciones.body), { estudiantes: [juego] })
  } finally { globalThis.fetch = original }
})

test('una asignación exige elecciones válidas y confirmación de guardado', async () => {
  const original = globalThis.fetch
  let llamadas = 0
  try {
    globalThis.fetch = async ruta => {
      llamadas++
      return new Response(JSON.stringify(ruta.endsWith('/csrf/') ? { csrf_token: 'token' } : { guardado: false }))
    }
    for (const seleccion of [[], ['../cuenta'], [juego, juego]]) {
      await assert.rejects(asignarActividad('actividad', seleccion), error => error.estado === 400)
    }
    assert.equal(llamadas, 0)
    await assert.rejects(asignarActividad('actividad', [juego]), error => error.estado === 502)
    globalThis.fetch = async () => new Response(JSON.stringify({ estudiantes: [{ id: juego, nombre: 'Cuenta', asignado: 'sí' }] }))
    await assert.rejects(destinatariosActividad('actividad'), error => error.estado === 502)
  } finally { globalThis.fetch = original }
})

test('la lista diferencia destinatarios existentes y estudiantes que necesitan elección del docente', () => {
  const html = renderToStaticMarkup(createElement(ListaDestinatarios, {
    estudiantes: [{ id: juego, nombre: 'Cuenta que ya recibió', asignado: true }, { id: reto, nombre: 'Cuenta recién vinculada', asignado: false }],
    seleccion: [], bloqueada: false, alElegir: () => {},
  }))
  assert.ok(html.includes('Ya recibió la actividad'))
  assert.equal((html.match(/checked=""/g) ?? []).length, 1)
  assert.equal((html.match(/disabled=""/g) ?? []).length, 1)
  assert.ok(html.includes('Cuenta recién vinculada'))
})
