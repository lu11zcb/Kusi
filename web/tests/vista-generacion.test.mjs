import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'
import { etapa, generacion, instante, juegoListo, paquete } from './fixtures-generaciones.mjs'

const { DetalleGeneracion } = await import(await cargarModulo(new URL('../src/docente/DetalleGeneracion.tsx', import.meta.url)))
const { pasosDeGeneracion, problemasDeComprobacion, etiquetaReglaJuego, segundosTranscurridos, direccionVistaPrevia, atenderMensajeJuego } = await import(await cargarModulo(new URL('../src/docente/utilidadesGeneracion.ts', import.meta.url)))
const mostrar = (datos) => renderToStaticMarkup(createElement(DetalleGeneracion, { generacion: datos }))

test('HU27: empareja inicio y cierre por intento sin borrar correcciones ni fallos de comprobación', () => {
  const lista = [
    etapa('correccion', 'en_progreso', 'Intento 2', 0), etapa('correccion', 'completada', 'Primera corrección', 20),
    etapa('comprobacion', 'fallida', 'Todavía falta una fruta.', 21),
    etapa('correccion', 'en_progreso', 'Intento 3', 22), etapa('correccion', 'completada', 'Segunda corrección', 40),
  ]
  const original = structuredClone(lista)
  const pasos = pasosDeGeneracion(lista)
  assert.equal(pasos.length, 3)
  assert.equal(pasos[0].mensaje, 'Primera corrección')
  assert.equal(pasos[2].mensaje, 'Segunda corrección')
  assert.equal(segundosTranscurridos(pasos[0].inicio, pasos[0].fin, 0), 20)
  assert.equal(segundosTranscurridos(pasos[2].inicio, pasos[2].fin, 0), 18)
  assert.deepEqual(lista, original)
})

test('HU27: el reloj usa segundos reales, se congela al terminar y no muestra negativos', () => {
  assert.equal(segundosTranscurridos(instante, null, Date.parse(instante) + 12500), 12)
  assert.equal(segundosTranscurridos(instante, '2026-10-26T12:00:05Z', Date.parse(instante) + 120000), 5)
  assert.equal(segundosTranscurridos(instante, null, Date.parse(instante) - 5000), 0)
})

test('HU33: convierte mensajes de comprobación fallida en problemas y conserva avisos truncados', () => {
  assert.deepEqual(problemasDeComprobacion(etapa('comprobacion', 'fallida', 'Intento 2: 3 problemas\nPUERTA: Lejos.\nOBJETOS: Faltan.\n(y 1 más)')), ['PUERTA: Lejos.', 'OBJETOS: Faltan.', '(y 1 más)'])
  assert.deepEqual(problemasDeComprobacion(etapa('comprobacion', 'fallida', 'Un problema sin encabezado')), ['Un problema sin encabezado'])
  assert.deepEqual(problemasDeComprobacion(etapa('generacion', 'fallida', 'No respondió la IA')), [])
  assert.deepEqual(problemasDeComprobacion(etapa('comprobacion', 'completada', 'Sin problemas')), [])
  assert.deepEqual(problemasDeComprobacion(etapa('comprobacion', 'fallida', null)), [])
})

test('HU27/HU33/HU30: muestra recorrido accesible, problemas, procedencia completa y vista 16:9', () => {
  const html = mostrar(juegoListo())
  for (const texto of ['aria-live="polite"', 'La IA escribe el juego', 'Kusi revisa que se pueda jugar', 'La IA corrige lo que faltaba',
    'Se usan los caminos de respaldo', 'Lo que Kusi encontró y se corrigió', 'La puerta no es alcanzable.', 'Faltan frutas.',
    'Cómo se hizo este juego', 'Proveedor', 'proveedor-simulado', 'Modelo', 'modelo-de-prueba', 'Intentos', '>3<',
    'Sí, se usaron los caminos de respaldo', 'Vista previa del laberinto generado', 'paquete=mensaje', 'Volver a empezar', '120 s']) {
    assert.ok(html.includes(texto), texto)
  }
  assert.ok(html.includes('aria-live="off"'))
  assert.ok(!html.includes(juegoListo().id))
})

test('HU33: conserva ultimo_error y no presenta problemas pendientes como resueltos', () => {
  const datos = generacion({ estado: 'fallida', ultimo_error: '<script>motivo de prueba</script>', etapas: [etapa('comprobacion', 'fallida', 'PUERTA: Sin salida.')] })
  const html = mostrar(datos)
  assert.ok(html.includes('No se pudo terminar este juego'))
  assert.ok(html.includes('&lt;script&gt;motivo de prueba&lt;/script&gt;'))
  assert.ok(html.includes('La corrección solo se confirma cuando el juego queda listo.'))
  assert.ok(!html.includes('<script>'))
  assert.ok(!html.includes('<iframe'))
})

test('HU30: distingue caminos de IA y procedencia no registrada sin inventar proveedor', () => {
  const datos = juegoListo()
  assert.ok(mostrar({ ...datos, procedencia: { ...datos.procedencia, mapa_base: false } }).includes('No, se usaron los caminos de la IA'))
  const html = mostrar({ ...datos, procedencia: null })
  assert.ok(html.includes('no registró la procedencia'))
  assert.ok(!html.includes('proveedor-simulado'))
})

test('la regla elegida se expresa con las etiquetas docentes', () => {
  assert.equal(etiquetaReglaJuego('orden'), 'Seguir el orden (patrones)')
  assert.equal(etiquetaReglaJuego('solo_clase'), 'Solo una clase (clasificar)')
  assert.equal(etiquetaReglaJuego(null), 'Pendiente de elegir')
})

test('la dirección usa el valor por defecto o conserva ruta y parámetros configurados', () => {
  assert.deepEqual(direccionVistaPrevia(), { url: 'http://127.0.0.1:5174/?paquete=mensaje', origen: 'http://127.0.0.1:5174' })
  assert.deepEqual(direccionVistaPrevia('https://juego.example/pruebas/?paquete=laberinto&vida=0'), {
    url: 'https://juego.example/pruebas/?paquete=mensaje&vida=0', origen: 'https://juego.example',
  })
  for (const direccion of ['javascript:alert(1)', 'file:///prueba', 'data:text/html,prueba', '/relativa', 'https://usuario:clave@juego.example']) {
    assert.throws(() => direccionVistaPrevia(direccion))
  }
})

test('el protocolo entrega el paquete como texto únicamente al iframe y al origen correctos', () => {
  const envios = []
  const ventana = { postMessage: (...datos) => envios.push(datos) }
  const origen = 'https://juego.example'
  const evento = { source: ventana, origin: origen, data: { tipo: 'listo' } }
  for (const cambio of [{ source: {} }, { source: null }, { origin: 'https://ajeno.example' }, { origin: 'null' }]) {
    assert.equal(atenderMensajeJuego({ ...evento, ...cambio }, ventana, origen, paquete), null)
  }
  assert.equal(atenderMensajeJuego({ ...evento, source: null }, null, origen, paquete), null)
  assert.deepEqual(envios, [])
  assert.deepEqual(atenderMensajeJuego(evento, ventana, origen, paquete), { estado: 'cargando' })
  assert.deepEqual(envios, [[{ tipo: 'paquete', paquete }, origen]])
  assert.equal(typeof envios[0][0].paquete, 'string')
})

test('cargado y error validan sus datos y también rechazan ventanas y orígenes ajenos', () => {
  const ventana = { postMessage: () => assert.fail('No debe enviar mensajes') }
  const evento = (data) => ({ source: ventana, origin: 'http://127.0.0.1:5174', data })
  const atender = (datos) => atenderMensajeJuego(evento(datos), ventana, 'http://127.0.0.1:5174', paquete)
  assert.deepEqual(atender({ tipo: 'cargado', niveles: 3 }), { estado: 'lista', niveles: 3 })
  assert.deepEqual(atender({ tipo: 'error', motivo: 'Falta una puerta.' }), { estado: 'error', motivo: 'Falta una puerta.' })
  for (const datos of [null, 'listo', [], { tipo: 'cargado', niveles: '3' }, { tipo: 'cargado', niveles: 0 },
    { tipo: 'cargado', niveles: 1.5 }, { tipo: 'error', motivo: '' }, { tipo: 'error', motivo: {} }, { tipo: 'otro' }]) assert.equal(atender(datos), null)
  for (const datos of [{ tipo: 'cargado', niveles: 3 }, { tipo: 'error', motivo: 'Prueba' }]) {
    assert.equal(atenderMensajeJuego({ ...evento(datos), source: {} }, ventana, 'http://127.0.0.1:5174', paquete), null)
    assert.equal(atenderMensajeJuego({ ...evento(datos), origin: 'https://ajeno.example' }, ventana, 'http://127.0.0.1:5174', paquete), null)
  }
})

test('HU29/HU30: distingue autoría y recursos usados con nombre y versión del catálogo', () => {
  const datos = juegoListo()
  datos.procedencia = { ...datos.procedencia, catalogo: { nombre: 'laberinto', version: 1 } }
  datos.paquete = JSON.stringify({ retos: [{ objetos: [{ tipo: 'fresa' }], enemigos: [{ tipo: 'zorro' }] }] })
  const html = mostrar(datos)
  for (const texto of ['Lo que hizo la IA', 'Lo reutilizado del catálogo de Kusi', 'Catálogo laberinto · versión 1', 'fresa, zorro', 'mapas de respaldo']) assert.ok(html.includes(texto), texto)
})

const paqueteConHistoria = JSON.stringify({ historia: 'Kusi explora los caminos.', retos: [{}, {}, {}] })
const parteDeLaIa = (html) => html.slice(html.indexOf('<h4>Lo que hizo la IA</h4>'), html.indexOf('<h4>Lo que rehízo Kusi</h4>'))

test('HU30: acredita las reparaciones por nivel y atribuye solo las partes conservadas', () => {
  const datos = juegoListo()
  const html = mostrar({ ...datos, paquete: paqueteConHistoria, procedencia: { ...datos.procedencia, reparaciones: { regla: [1], textos: [2, 3] } } })
  assert.ok(html.includes('Kusi rehízo la regla en el nivel 1.'))
  assert.ok(html.includes('Kusi rehízo los textos en los niveles 2 y 3.'))
  const aportes = parteDeLaIa(html)
  for (const texto of ['La historia.', 'La regla en los niveles 2 y 3.', 'Las consignas y las ayudas en el nivel 1.']) assert.ok(aportes.includes(texto), texto)
  assert.ok(!aportes.includes('La regla en el nivel 1.'))
  assert.ok(!aportes.includes('los mapas'))
  const completo = mostrar({ ...datos, paquete: paqueteConHistoria, procedencia: { ...datos.procedencia, reparaciones: { regla: [1, 2, 3], textos: [1, 2, 3] } } })
  assert.ok(parteDeLaIa(completo).includes('La historia.'))
  assert.ok(!parteDeLaIa(completo).includes('La regla'))
  assert.ok(!parteDeLaIa(completo).includes('Las consignas'))
})

test('HU30: un juego viejo no inventa reparaciones ni conservación a partir de sus etapas', () => {
  const datos = juegoListo()
  const sinDatos = mostrar({ ...datos, paquete: paqueteConHistoria, procedencia: { ...datos.procedencia } })
  assert.ok(sinDatos.includes('Este juego anterior no registra qué reglas, consignas o ayudas se conservaron de la respuesta.'))
  assert.ok(!sinDatos.includes('Kusi rehízo la regla en el nivel'))
  const conDatos = mostrar({ ...datos, paquete: paqueteConHistoria, procedencia: { ...datos.procedencia, reparaciones: { regla: [], textos: [] } },
    etapas: [etapa('mapa_base', 'completada', 'Nivel 1: se rehízo la regla y los textos.')] })
  const aportes = parteDeLaIa(conDatos)
  assert.ok(aportes.includes('La regla en los niveles 1, 2 y 3.'))
  assert.ok(aportes.includes('Las consignas y las ayudas en los niveles 1, 2 y 3.'))
  assert.ok(!conDatos.includes('Kusi rehízo la regla en el nivel 1.'))
})
