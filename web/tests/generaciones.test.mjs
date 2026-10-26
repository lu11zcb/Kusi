import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarModulo } from './cargar-modulo.mjs'
import { etapa, generacion, generacionId, instante, juegoListo, json, otraGeneracionId, paquete, procedencia, solicitudId } from './fixtures-generaciones.mjs'

const { generarJuego, procesarGeneracion, consultarGeneracion, listarGeneraciones, etiquetasEtapas, generacionTerminada, observarGeneracion } = await import(await cargarModulo(new URL('../src/servicios/generaciones.ts', import.meta.url)))
const { enviar } = await import(await cargarModulo(new URL('../src/servicios/http.ts', import.meta.url)))
function simular(t, responder) {
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    assert.equal(opciones.credentials, 'same-origin')
    assert.equal(opciones.mode, 'same-origin')
    assert.equal(opciones.cache, 'no-store')
    if (ruta === '/api/edu/acceso/csrf/') return json({ csrf_token: 'token-spring' })
    return responder(ruta, opciones)
  })
}
const vaciarPromesas = () => new Promise((resolver) => setImmediate(resolver))

test('SIMULADO HU27: generar y procesar usan las rutas exactas, el CSRF de Spring y cuerpos vacíos', async (t) => {
  const llamadas = []
  simular(t, (ruta, opciones) => {
    assert.equal(opciones.method, 'POST')
    assert.equal(opciones.headers['X-XSRF-TOKEN'], 'token-spring')
    assert.equal(opciones.headers['X-CSRFToken'], undefined)
    assert.deepEqual(JSON.parse(opciones.body), {})
    llamadas.push(ruta)
    return json({ generacion: ruta.endsWith('/procesar/') ? juegoListo() : generacion() }, 201)
  })
  assert.equal((await generarJuego(solicitudId, 2)).id, generacionId)
  assert.equal((await procesarGeneracion(generacionId)).estado, 'lista')
  assert.deepEqual(llamadas, [
    '/api/edu/propuestas/solicitudes/' + solicitudId + '/versiones/2/generar/',
    '/api/edu/generaciones/' + generacionId + '/procesar/',
  ])
})

test('enviar conserva el token y la ruta de Django para operaciones ajenas a educación', async (t) => {
  const llamadas = []
  t.mock.method(globalThis, 'fetch', async (ruta, opciones) => {
    llamadas.push(ruta)
    if (ruta === '/api/acceso/sesion/') return json({ csrf_token: 'token-django' })
    assert.equal(opciones.headers['X-CSRFToken'], 'token-django')
    assert.equal(opciones.headers['X-XSRF-TOKEN'], undefined)
    return json({ guardado: true })
  })
  assert.deepEqual(await enviar('/api/cuentas/prueba/', { dato: 'ejemplo' }), { guardado: true })
  assert.deepEqual(llamadas, ['/api/acceso/sesion/', '/api/cuentas/prueba/'])
})

test('SIMULADO: sin un token CSRF válido no envía ningún POST', async (t) => {
  for (const csrf_token of [null, undefined, [], {}, 10, '', '   ', 'x'.repeat(513)]) {
    let llamadas = 0
    t.mock.method(globalThis, 'fetch', async () => { llamadas += 1; return json({ csrf_token }) })
    await assert.rejects(generarJuego(solicitudId, 2), /seguridad/)
    assert.equal(llamadas, 1)
    t.mock.restoreAll()
  }
})

test('SIMULADO: rechaza UUID y versiones inválidos antes de consultar o escribir', async (t) => {
  t.mock.method(globalThis, 'fetch', () => assert.fail('No debe hacer solicitudes'))
  for (const id of ['', '../ajena', 'sin-uuid']) {
    await assert.rejects(consultarGeneracion(id), /no válido/)
    await assert.rejects(procesarGeneracion(id), /no válido/)
    await assert.rejects(listarGeneraciones(id), /no válido/)
    await assert.rejects(generarJuego(id, 2), /no válido/)
  }
  for (const version of [0, -1, 1.5, '2', NaN, Infinity]) await assert.rejects(generarJuego(solicitudId, version), /Versión no válida/)
})

test('SIMULADO HU27: consulta los seis estados y reconoce la etapa inicial solicitud', async (t) => {
  for (const estado of ['pendiente', 'generando', 'comprobando', 'correccion', 'lista', 'fallida']) {
    simular(t, (ruta) => {
      assert.equal(ruta, '/api/edu/generaciones/' + generacionId + '/')
      return json({ generacion: estado === 'lista' ? juegoListo() : generacion({ estado }) })
    })
    const recibida = await consultarGeneracion(generacionId)
    assert.equal(recibida.estado, estado)
    assert.equal(recibida.etapas[0].etapa, 'solicitud')
    assert.equal(generacionTerminada(estado), estado === 'lista' || estado === 'fallida')
    t.mock.restoreAll()
  }
})

test('SIMULADO: nunca confirma respuestas incompletas, de otra identidad ni con tipos inválidos', async (t) => {
  const cambios = [
    { id: otraGeneracionId }, { solicitud_id: 'no-uuid' }, { propuesta_id: null }, { version_propuesta: '2' },
    { estado: ['lista'] }, { estado: 'aprobada' }, { paquete: {} }, { procedencia: [] }, { ultimo_error: [] },
    { creado_en: 'ayer' }, { actualizado_en: null }, { etapas: undefined }, { etapas: {} },
    { etapas: [{ ...etapa(), etapa: 'desconocida' }] }, { etapas: [{ ...etapa(), estado: ['completada'] }] },
    { etapas: [{ ...etapa(), estado: 'lista' }] }, { etapas: [{ ...etapa(), mensaje: {} }] },
    { etapas: [{ ...etapa(), creado_en: 'incorrecta' }] }, { etapas: [{ ...etapa(), id: '' }] },
  ]
  for (const cambio of cambios) {
    simular(t, () => json({ generacion: generacion(cambio) }))
    await assert.rejects(consultarGeneracion(generacionId), (error) => error.estado === 502)
    t.mock.restoreAll()
  }
  for (const datos of [{}, { generacion: null }, { generacion: [] }]) {
    simular(t, () => json(datos)); await assert.rejects(consultarGeneracion(generacionId)); t.mock.restoreAll()
  }
})

test('SIMULADO: una generación nueva debe pertenecer a la solicitud y versión pedidas', async (t) => {
  for (const cambio of [{ solicitud_id: otraGeneracionId }, { version_propuesta: 1 }]) {
    simular(t, () => json({ generacion: generacion(cambio) }))
    await assert.rejects(generarJuego(solicitudId, 2), /comprobar la generación/)
    t.mock.restoreAll()
  }
})

test('SIMULADO HU30: valida procedencia y solo abre paquetes JSON de laberinto cuando están listos', async (t) => {
  for (const cambio of [
    { paquete: null }, { paquete: 'no json' }, { paquete: '{}' }, { paquete: '[]' },
    { paquete: JSON.stringify({ formato: 'kusi-paquete/0', familia: 'otra', retos: [{}] }) },
    { paquete: JSON.stringify({ formato: 'kusi-paquete/0', familia: 'laberinto', retos: [] }) },
    ...[{ intentos: 0 }, { intentos: 1.5 }, { intentos: '3' }, { mapa_base: 'sí' }, { proveedor: '' }, { modelo: null }].map((valor) => ({ procedencia: { ...procedencia, ...valor } })),
  ]) {
    simular(t, () => json({ generacion: juegoListo(cambio) }))
    await assert.rejects(consultarGeneracion(generacionId), /comprobar la generación/)
    t.mock.restoreAll()
  }
  simular(t, () => json({ generacion: juegoListo({ procedencia: null }) }))
  assert.equal((await consultarGeneracion(generacionId)).paquete, paquete)
})

test('SIMULADO HU27: historial sin etapas, ordenado por fecha y sin resultados de otra solicitud', async (t) => {
  const { etapas: omitidas, ...resumen } = generacion()
  assert.ok(omitidas)
  simular(t, (ruta) => {
    assert.equal(ruta, '/api/edu/propuestas/solicitudes/' + solicitudId + '/generaciones/')
    return json({ generaciones: [resumen, { ...resumen, id: otraGeneracionId, creado_en: '2026-10-26T13:00:00Z' }] })
  })
  const lista = await listarGeneraciones(solicitudId)
  assert.equal(lista[0].id, otraGeneracionId)
  assert.equal(lista[0].etapas, undefined)
  t.mock.restoreAll()
  for (const generaciones of [null, {}, [{ ...resumen, solicitud_id: otraGeneracionId }], [{ ...resumen, estado: 'otra' }]]) {
    simular(t, () => json({ generaciones }))
    await assert.rejects(listarGeneraciones(solicitudId), /historial/)
    t.mock.restoreAll()
  }
})

test('HU27: las etiquetas de las cuatro etapas explican lo que pasa al docente', () => {
  assert.deepEqual(etiquetasEtapas, {
    solicitud: 'Solicitud registrada', generacion: 'La IA escribe el juego', comprobacion: 'Kusi revisa que se pueda jugar',
    correccion: 'La IA corrige lo que faltaba', mapa_base: 'Se usan los caminos de respaldo',
  })
})

test('SIMULADO: procesar espera el POST largo y nunca lo reenvía al perder la respuesta', async (t) => {
  let terminar; let envios = 0; let finalizo = false
  simular(t, () => { envios += 1; return new Promise((resolver) => { terminar = resolver }) })
  const proceso = procesarGeneracion(generacionId).then(() => { finalizo = true })
  await vaciarPromesas()
  assert.equal(finalizo, false)
  terminar(json({ generacion: juegoListo() }))
  await proceso
  assert.equal(envios, 1)
  t.mock.restoreAll()
  simular(t, () => { envios += 1; throw new TypeError('Conexión perdida') })
  await assert.rejects(procesarGeneracion(generacionId), /confirmar la operación/)
  assert.equal(envios, 2)
})

for (const terminal of ['lista', 'fallida']) {
  test('SIMULADO: consulta cada dos segundos y se detiene en ' + terminal, async (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] })
    let llamadas = 0
    simular(t, () => json({ generacion: ++llamadas === 3 ? terminal === 'lista' ? juegoListo() : generacion({ estado: 'fallida' }) : generacion({ estado: 'generando' }) }))
    const recibidas = []; const controlador = new AbortController()
    observarGeneracion(generacionId, controlador.signal, (datos) => recibidas.push(datos.estado), assert.fail)
    await vaciarPromesas()
    assert.equal(llamadas, 1)
    t.mock.timers.tick(1999); await vaciarPromesas(); assert.equal(llamadas, 1)
    t.mock.timers.tick(1); await vaciarPromesas(); assert.equal(llamadas, 2)
    t.mock.timers.tick(2000); await vaciarPromesas(); assert.equal(llamadas, 3)
    t.mock.timers.tick(20000); await vaciarPromesas(); assert.equal(llamadas, 3)
    assert.deepEqual(recibidas, ['generando', 'generando', terminal])
    controlador.abort()
  })
}

test('SIMULADO: cancelar al salir aborta el GET y descarta incluso una respuesta tardía', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const controlador = new AbortController()
  let terminar; let llamadas = 0
  simular(t, (ruta, opciones) => {
    llamadas += 1; assert.equal(opciones.signal, controlador.signal)
    return new Promise((resolver) => { terminar = resolver })
  })
  observarGeneracion(generacionId, controlador.signal, () => assert.fail('Respuesta posterior a salir'), assert.fail)
  controlador.abort()
  terminar(json({ generacion: juegoListo() }))
  await vaciarPromesas(); t.mock.timers.tick(20000); await vaciarPromesas()
  assert.equal(llamadas, 1)
})

test('SIMULADO: un GET lento no se solapa y un error transitorio permite seguir consultando', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let terminar; let llamadas = 0; let errores = 0
  simular(t, () => {
    llamadas += 1
    if (llamadas === 1) return new Promise((resolver) => { terminar = resolver })
    if (llamadas === 2) return json({ mensaje: 'Red de prueba' }, 503)
    return json({ generacion: juegoListo() })
  })
  const controlador = new AbortController()
  observarGeneracion(generacionId, controlador.signal, () => {}, () => { errores += 1 })
  t.mock.timers.tick(20000); await vaciarPromesas(); assert.equal(llamadas, 1)
  terminar(json({ generacion: generacion({ creado_en: instante }) })); await vaciarPromesas()
  t.mock.timers.tick(2000); await vaciarPromesas(); assert.equal(errores, 1)
  t.mock.timers.tick(2000); await vaciarPromesas(); assert.equal(llamadas, 3)
  controlador.abort()
})
