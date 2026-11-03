import assert from 'node:assert/strict'
import test from 'node:test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { cargarModulo } from './cargar-modulo.mjs'
import { etapa, generacion, instante, juegoListo, paquete } from './fixtures-generaciones.mjs'

const { DetalleGeneracion } = await import(await cargarModulo(new URL('../src/docente/DetalleGeneracion.tsx', import.meta.url)))
const { pasosDeGeneracion, problemasDeComprobacion, etiquetaReglaJuego, segundosTranscurridos, direccionVistaPrevia, atenderMensajeJuego, aportesDelJuego, recursosDelPaquete } = await import(await cargarModulo(new URL('../src/docente/utilidadesGeneracion.ts', import.meta.url)))
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

test('el juego listo ocupa la pantalla sin mostrar el proceso interno ni crear otro juego', () => {
  const datos = juegoListo()
  const original = structuredClone(datos)
  const html = mostrar(datos)
  for (const texto of ['Tu juego está listo', 'Tu juego para probar', 'Enviar a mi clase', 'Volver a empezar', 'Ampliar juego', 'paquete=mensaje']) assert.ok(html.includes(texto), texto)
  for (const texto of ['La IA escribe', 'Comprobación', 'proveedor-simulado', 'modelo-de-prueba', 'Cómo se hizo', 'Lo que Kusi registró', 'Generar juego', '120 s', datos.id]) assert.ok(!html.includes(texto), texto)
  // Ocultar los detalles nunca borra la procedencia o las comprobaciones recibidas.
  assert.deepEqual(datos, original)
})

test('todas las etapas en curso se presentan como una preparación sin porcentajes inventados', () => {
  for (const estado of ['pendiente', 'generando', 'comprobando', 'correccion']) {
    const html = mostrar(generacion({ estado }))
    assert.ok(html.includes('Estamos preparando tu juego'))
    assert.ok(!html.includes('progressbar'))
    assert.ok(!html.includes('<iframe'))
  }
})

test('un fallo ofrece una salida sencilla sin trasladar el diagnóstico al docente', () => {
  const datos = generacion({ estado: 'fallida', ultimo_error: '<script>motivo interno</script>', etapas: [etapa('comprobacion', 'fallida', 'PUERTA: Sin salida.')] })
  const html = mostrar(datos)
  assert.ok(html.includes('Tu juego quedó por terminar'))
  assert.ok(html.includes('Tu idea está guardada'))
  for (const texto of ['motivo interno', 'PUERTA', '<script>', '<iframe']) assert.ok(!html.includes(texto), texto)
  assert.equal(datos.ultimo_error, '<script>motivo interno</script>')
})

test('un juego enviado muestra una confirmación y deja de ofrecer el envío como siguiente paso', () => {
  const html = mostrar({ ...juegoListo(), publicada: true })
  assert.ok(html.includes('Tu juego ya está en la app'))
  assert.ok(!html.includes('Enviar a mi clase'))
  assert.ok(!html.includes('Dar el OK'))
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

test('los recursos siguen disponibles internamente a partir del paquete real', () => {
  assert.deepEqual(recursosDelPaquete(JSON.stringify({ retos: [{ objetos: [{ tipo: 'fresa' }], enemigos: [{ tipo: 'zorro' }] }] })), ['fresa', 'zorro'])
})

const paqueteConHistoria = JSON.stringify({ historia: 'Kusi explora los caminos.', retos: [{}, {}, {}] })
test('se conservan los cálculos internos de procedencia y reparaciones por nivel', () => {
  const procedencia = juegoListo().procedencia
  const datos = aportesDelJuego({ ...procedencia, reparaciones: { regla: [1], textos: [2, 3] } }, paqueteConHistoria)
  assert.deepEqual(datos.reparaciones, ['Kusi rehízo la regla en el nivel 1.', 'Kusi rehízo los textos en los niveles 2 y 3.'])
  assert.deepEqual(datos.aportes, ['La historia.', 'La regla en los niveles 2 y 3.', 'Las consignas y las ayudas en el nivel 1.'])
  const completo = aportesDelJuego({ ...procedencia, reparaciones: { regla: [1, 2, 3], textos: [1, 2, 3] } }, paqueteConHistoria)
  assert.deepEqual(completo.aportes, ['La historia.'])
})

test('un juego antiguo no inventa atribuciones aunque ya no se muestren al docente', () => {
  const datos = aportesDelJuego(juegoListo().procedencia, paqueteConHistoria)
  assert.ok(datos.nota.includes('no registra'))
  assert.deepEqual(datos.reparaciones, [])
  assert.deepEqual(aportesDelJuego(null, paqueteConHistoria).aportes, [])
})
