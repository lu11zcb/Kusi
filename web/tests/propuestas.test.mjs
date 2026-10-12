// Todas las respuestas de Spring e IA de este archivo son SIMULADAS.
// No acredita persistencia Spring ni una llamada real al proveedor.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import ts from 'typescript'

const cache = new Map()
async function modulo(url) {
  if (cache.has(url.href)) return cache.get(url.href)
  let { outputText } = ts.transpileModule(await readFile(url, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  })
  for (const coincidencia of [...outputText.matchAll(/from\s+(['"])(\.[^'"]+)\1/g)]) {
    outputText = outputText.replace(coincidencia[0], 'from ' + JSON.stringify(await modulo(new URL(coincidencia[2] + '.ts', url))))
  }
  const resultado = 'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
  cache.set(url.href, resultado)
  return resultado
}
const { GestorSolicitud, obtenerContextosPropuestas, prepararSolicitud } = await import(await modulo(new URL('../src/servicios/propuestas.ts', import.meta.url)))
const curso = '4b757369-2026-4011-8000-000000000001'
const seccion = '00000000-0000-4000-8000-000000000010'
const entrada = { curso_id: curso, seccion_id: seccion, tema: '  Sumas hasta diez  ', objetivo: '  Mi objetivo docente.\nSegunda línea.  ' }
const json = (datos, estado = 200) => new Response(JSON.stringify(datos), { status: estado })
const resultado = (datos, estado = 'pendiente', propuesta = null) => ({ solicitud: {
  id_solicitud: datos.id_solicitud, curso_id: datos.curso_id, seccion_id: datos.seccion_id,
  tema: datos.tema, objetivo_docente: datos.objetivo, estado, propuesta,
} })
const propuesta = (objetivo = entrada.objetivo, origen_objetivo = 'docente') => ({
  id: '00000000-0000-4000-8000-000000000020', objetivo, origen_objetivo,
  historia: 'Contenido ficticio exclusivo de pruebas.', acciones: ['Contar fichas ficticias'],
  reglas: ['Una ficha por turno'], retos: ['Sumar dos conjuntos'], ayudas: ['Contar de nuevo'],
})
function simular(t, responder) {
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    assert.equal(opciones.credentials, 'same-origin')
    assert.equal(opciones.mode, 'same-origin')
    assert.equal(opciones.cache, 'no-store')
    if (ruta.endsWith('/acceso/csrf/')) return json({ csrf_token: 'csrf-spring-simulado' })
    return responder(ruta, opciones)
  })
}

test('SIMULADO HU18: valida tema/objetivo y conserva exactamente el objetivo docente', () => {
  const id = '00000000-0000-4000-8000-000000000030'
  assert.equal(prepararSolicitud(entrada, id).tema, 'Sumas hasta diez')
  assert.equal(prepararSolicitud(entrada, id).objetivo, entrada.objetivo)
  assert.equal(prepararSolicitud({ ...entrada, objetivo: '  \n ' }, id).objetivo, null)
  for (const cambio of [{ tema: '  ' }, { tema: 'x'.repeat(2001) }, { objetivo: 'x'.repeat(4001) }, { curso_id: 'ajeno-no-uuid' }, { seccion_id: '' }]) {
    assert.throws(() => prepararSolicitud({ ...entrada, ...cambio }, id))
  }
})

test('SIMULADO: contexto autorizado y disponibilidad IA provienen del servidor', async (t) => {
  simular(t, (ruta) => {
    assert.equal(ruta, '/api/edu/contexto/propuestas/')
    return json({ contextos: [{ curso_id: curso, curso_nombre: 'Matemática', grado: 1, seccion_id: seccion, seccion_nombre: 'A', anio_escolar: 2026 }], ia_configurada: false })
  })
  assert.equal((await obtenerContextosPropuestas()).ia_configurada, false)
})

test('SIMULADO: rechaza contextos inválidos y conserva el rechazo de permisos', async (t) => {
  for (const datos of [{ contextos: [], ia_configurada: 'sí' }, { contextos: [{ curso_id: curso, curso_nombre: 'QA', grado: 2 }], ia_configurada: false }]) {
    t.mock.method(globalThis, 'fetch', async () => json(datos))
    await assert.rejects(obtenerContextosPropuestas(), /cursos autorizados/)
    t.mock.restoreAll()
  }
  simular(t, () => json({ mensaje: 'No tienes permiso para este recurso.' }, 403))
  await assert.rejects(obtenerContextosPropuestas(), (error) => error.estado === 403)
})

test('SIMULADO HU16: usa CSRF propio de Spring y no envía identidad ni credenciales internas', async (t) => {
  simular(t, (ruta, opciones) => {
    assert.equal(ruta, '/api/edu/propuestas/solicitudes/')
    assert.equal(opciones.headers['X-XSRF-TOKEN'], 'csrf-spring-simulado')
    assert.equal(opciones.headers['X-Clave-Interna'], undefined)
    assert.equal(opciones.headers['X-CSRFToken'], undefined)
    const datos = JSON.parse(opciones.body)
    assert.deepEqual(Object.keys(datos).sort(), ['curso_id', 'id_solicitud', 'objetivo', 'seccion_id', 'tema'])
    return json(resultado(datos), 201)
  })
  const guardada = await new GestorSolicitud().enviar(entrada)
  assert.equal(guardada.estado, 'pendiente')
  assert.equal(guardada.propuesta, null)
})

test('SIMULADO: CSRF ausente impide cualquier POST', async (t) => {
  let llamadas = 0
  t.mock.method(globalThis, 'fetch', async () => { llamadas += 1; return json({ csrf_token: '' }) })
  await assert.rejects(new GestorSolicitud().enviar(entrada), /seguridad/)
  assert.equal(llamadas, 1)
})

test('SIMULADO HU18: distingue objetivo docente de objetivo sugerido por IA', async (t) => {
  simular(t, (ruta, opciones) => {
    const datos = JSON.parse(opciones.body)
    return json(resultado(datos, 'generada', datos.objetivo === null ? propuesta('Objetivo ficticio de prueba', 'ia') : propuesta()), 201)
  })
  assert.equal((await new GestorSolicitud().enviar(entrada)).propuesta.origen_objetivo, 'docente')
  assert.equal((await new GestorSolicitud().enviar({ ...entrada, objetivo: '' })).propuesta.origen_objetivo, 'ia')
})

test('SIMULADO HU16: nunca confirma propuestas incompletas ni sustituye un objetivo docente', async (t) => {
  for (const invalida of [null, {}, { ...propuesta(), ayudas: [] }, { ...propuesta(), reglas: [''] }, { ...propuesta(), historia: '' }, { ...propuesta(), retos: 'texto' }, { ...propuesta(), objetivo: 'Sustitución' }, { ...propuesta(), origen_objetivo: 'ia' }]) {
    simular(t, (ruta, opciones) => json(resultado(JSON.parse(opciones.body), 'generada', invalida), 201))
    await assert.rejects(new GestorSolicitud().enviar(entrada), /resultado recibido está incompleto/)
    t.mock.restoreAll()
  }
})

test('SIMULADO: rechaza identidad, entrada o estados incompatibles en la respuesta', async (t) => {
  for (const cambio of [{ id_solicitud: seccion }, { curso_id: seccion }, { tema: 'otro' }, { objetivo_docente: null }, { estado: ['pendiente'] }, { estado: 'aprobada' }, { propuesta: propuesta() }]) {
    simular(t, (ruta, opciones) => {
      const datos = resultado(JSON.parse(opciones.body))
      return json({ solicitud: { ...datos.solicitud, ...cambio } })
    })
    await assert.rejects(new GestorSolicitud().enviar(entrada))
    t.mock.restoreAll()
  }
})

test('SIMULADO HU16: respuesta perdida se consulta y resultado existente evita otra generación', async (t) => {
  let guardada; let escrituras = 0
  simular(t, (ruta, opciones) => {
    if (opciones.method === 'POST') { escrituras += 1; guardada = JSON.parse(opciones.body); throw new TypeError('Red ficticia interrumpida') }
    assert.equal(ruta, '/api/edu/propuestas/solicitudes/' + guardada.id_solicitud + '/')
    return json(resultado(guardada, 'generada', propuesta()))
  })
  const gestor = new GestorSolicitud()
  await assert.rejects(gestor.enviar(entrada), /confirmar/)
  assert.equal((await gestor.enviar(entrada)).estado, 'generada')
  assert.equal(escrituras, 1)
})

test('SIMULADO HU16: reintenta una fallida solo por acción explícita y conserva el identificador', async (t) => {
  let guardada; const escrituras = []
  simular(t, (ruta, opciones) => {
    if (opciones.method !== 'POST') return json(resultado(guardada, 'fallida'))
    escrituras.push(ruta)
    if (!guardada) { guardada = JSON.parse(opciones.body); return json({ mensaje: 'Proveedor no disponible (simulado).' }, 502) }
    assert.equal(ruta, '/api/edu/propuestas/solicitudes/' + guardada.id_solicitud + '/reintentar/')
    assert.deepEqual(JSON.parse(opciones.body), {})
    return json(resultado(guardada, 'generada', propuesta()))
  })
  const gestor = new GestorSolicitud()
  await assert.rejects(gestor.enviar(entrada), /simulado/)
  assert.equal(escrituras.length, 1)
  assert.equal((await gestor.enviar(entrada)).id_solicitud, guardada.id_solicitud)
  assert.equal(escrituras.length, 2)
})

test('SIMULADO HU16: si no se puede consultar el resultado incierto no vuelve a escribir', async (t) => {
  let escrituras = 0
  simular(t, (ruta, opciones) => {
    if (opciones.method === 'POST') { escrituras += 1; throw new TypeError('Red ficticia') }
    return json({ mensaje: 'Consulta no disponible (simulado).' }, 503)
  })
  const gestor = new GestorSolicitud()
  await assert.rejects(gestor.enviar(entrada))
  await assert.rejects(gestor.enviar(entrada), /Consulta no disponible/)
  assert.equal(escrituras, 1)
})

test('SIMULADO HU16: una solicitud no guardada se reenvía con el mismo UUID tras comprobar 404', async (t) => {
  const enviados = []; let consultas = 0
  simular(t, (ruta, opciones) => {
    if (opciones.method !== 'POST') { consultas += 1; return json({ mensaje: 'No encontrada.' }, 404) }
    enviados.push(JSON.parse(opciones.body))
    if (enviados.length === 1) throw new TypeError('Fallo ficticio antes de guardar')
    return json(resultado(enviados[1]), 201)
  })
  const gestor = new GestorSolicitud()
  await assert.rejects(gestor.enviar(entrada))
  await gestor.enviar(entrada)
  assert.equal(consultas, 1)
  assert.deepEqual(enviados[0], enviados[1])
})

test('SIMULADO HU16: cambiar la entrada crea otra solicitud y no muta el texto original', async (t) => {
  const enviados = []; const original = structuredClone(entrada)
  simular(t, (ruta, opciones) => { const datos = JSON.parse(opciones.body); enviados.push(datos); return json(resultado(datos), 201) })
  const gestor = new GestorSolicitud()
  await gestor.enviar(entrada)
  await gestor.enviar({ ...entrada, tema: 'Otro tema' })
  assert.notEqual(enviados[0].id_solicitud, enviados[1].id_solicitud)
  assert.deepEqual(entrada, original)
})

test('SIMULADO HU16: dos envíos simultáneos no producen dos solicitudes', async (t) => {
  let terminar; let datosGuardados; let escrituras = 0
  simular(t, (ruta, opciones) => {
    escrituras += 1; datosGuardados = JSON.parse(opciones.body)
    return new Promise((resolver) => { terminar = resolver })
  })
  const gestor = new GestorSolicitud()
  const primero = gestor.enviar(entrada)
  await assert.rejects(gestor.enviar(entrada), /solicitud en curso/)
  await new Promise((resolver) => setImmediate(resolver))
  terminar(json(resultado(datosGuardados), 201))
  await primero
  assert.equal(escrituras, 1)
})

test('SIMULADO HU16: sin configuración IA conserva el mensaje y la entrada para reintentar', async (t) => {
  const original = structuredClone(entrada)
  simular(t, () => json({ mensaje: 'La IA está pendiente de configuración. La solicitud se conserva.' }, 503))
  await assert.rejects(new GestorSolicitud().enviar(entrada), /IA está pendiente de configuración/)
  assert.deepEqual(entrada, original)
})
