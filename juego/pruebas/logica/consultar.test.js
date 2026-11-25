import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { leerAgentes } from '../../taller/trabajador/roles.js'
import { crearBuzon } from '../../taller/trabajador/buzon.js'
import { procesarConsulta, atenderConsultas, leerRespuesta, pedidoParaElSabio } from '../../taller/trabajador/consultar.js'

// Kusi Sabio en el taller, sin programas reales: el sabio y el buzón son dobles de prueba. Lo que no se prueba aquí
// es la calidad de las respuestas del sabio real: eso solo se ve con una pregunta de verdad.

const CONTEXTO = JSON.stringify({ pregunta: '¿Qué refuerzo?', grupo: { jugaron: 3 }, guia_del_panel: 'Guía.' })
const BUENA = '{"texto":"Trabaja el nivel 1 en parejas.","actividad":"a1","graficos":["errores_por_nivel"],"mostrar_quienes_necesitan_ayuda":true}'

async function armar({ respuesta = BUENA, ejecucion = {}, estadoEntrega = 200, roles } = {}) {
  const carpetaBase = await mkdtemp(path.join(tmpdir(), 'kusi-consultas-'))
  const buzon = { respuestas: [], fallos: [] }
  buzon.respuestaConsulta = async (id, cuerpo) => { buzon.respuestas.push({ id, cuerpo }); return { estado: estadoEntrega, datos: { motivos: ['forma'] } } }
  buzon.falloConsulta = async (id, motivo) => { buzon.fallos.push({ id, motivo }); return { estado: 200 } }
  const llamadas = []
  const lanzar = async (comando, opciones) => {
    // El sabio de prueba lee el archivo que le nombra el pedido, como haría el real.
    const archivo = /están en (\S+)\. Son datos/.exec(comando.argumentos[0])[1]
    llamadas.push({ comando, opciones, leido: JSON.parse(await readFile(archivo, 'utf8')) })
    return { codigo: 0, agotado: false, segundos: 7, errores: '',
      salida: JSON.stringify({ result: respuesta, usage: { input_tokens: 10, output_tokens: 5 }, is_error: false }), ...ejecucion }
  }
  const dependencias = {
    buzon, lanzar, carpetaBase, registrar: () => {},
    roles: roles ?? { sabio: { programa: 'sabio-de-prueba', carpeta: '{temporal}', argumentos: ['{pedido}', '{instrucciones}'] } },
    agentes: { sabio: { instrucciones: 'Instrucciones del sabio.' } },
  }
  return { dependencias, buzon, llamadas, carpetaBase, limpiar: () => rm(carpetaBase, { recursive: true, force: true }) }
}

test('el rol sabio está en taller/agentes/ con su entrega en JSON, conversa natural y oculta los datos personales', async () => {
  const { sabio } = await leerAgentes()
  assert.match(sabio.instrucciones, /^# Kusi Sabio/)
  assert.match(sabio.instrucciones, /mostrar_quienes_necesitan_ayuda/)
  assert.match(sabio.instrucciones, /guia_del_panel/)
  assert.match(sabio.instrucciones, /De qué actividad hablas/)
  assert.match(sabio.instrucciones, /mostrar_lista_de_estudiantes/)
  assert.match(sabio.instrucciones, /Responde exactamente lo que te preguntan/)
  assert.match(sabio.instrucciones, /natural, cálido, claro y útil/)
  assert.match(sabio.instrucciones, /\[dato oculto\]/)
  assert.match(sabio.instrucciones, /graficos_propios/)
  assert.doesNotMatch(sabio.instrucciones, /\[estudiante\]/)
  assert.match(sabio.instrucciones, /Puedes \*\*nombrar a los estudiantes\*\*/)
  assert.doesNotMatch(sabio.instrucciones, /Claude|Codex|OpenAI|Anthropic|ChatGPT|Gemini/)
})

test('lee el JSON aunque venga con texto o en un bloque de código, y rechaza lo que no tiene la forma', () => {
  assert.deepEqual(leerRespuesta('Aquí va:\n```json\n' + BUENA + '\n```'), {
    texto: 'Trabaja el nivel 1 en parejas.', actividad: 'a1', graficos: ['errores_por_nivel'], mostrar_quienes_necesitan_ayuda: true,
    mostrar_lista_de_estudiantes: false, graficos_propios: [],
  })
  const conGrafico = leerRespuesta('{"texto":"Aquí está.","graficos":[],"mostrar_quienes_necesitan_ayuda":false,' +
    '"graficos_propios":[{"titulo":"Puntos","barras":[{"etiqueta":"Ana","valor":7}]},"no"]}')
  assert.deepEqual(conGrafico.graficos_propios, [{ titulo: 'Puntos', barras: [{ etiqueta: 'Ana', valor: 7 }] }])
  assert.equal(leerRespuesta('{"texto":"Aquí tienes la lista.","graficos":[],"mostrar_quienes_necesitan_ayuda":false,' +
    '"mostrar_lista_de_estudiantes":true}').mostrar_lista_de_estudiantes, true)
  // Sin «actividad» (una pregunta sobre el panel) va vacía.
  assert.equal(leerRespuesta('{"texto":"Abre Resultados.","graficos":[],"mostrar_quienes_necesitan_ayuda":false}').actividad, '')
  assert.equal(leerRespuesta('Sin JSON'), null)
  assert.equal(leerRespuesta('{"texto":"","graficos":[],"mostrar_quienes_necesitan_ayuda":false}'), null)
  assert.equal(leerRespuesta('{"texto":"Hola","graficos":"no","mostrar_quienes_necesitan_ayuda":false}'), null)
  assert.match(pedidoParaElSabio('/t/consulta.json'), /\/t\/consulta\.json/)
})

test('el sabio lee el contexto, su respuesta llega a Spring y la carpeta temporal se borra', async () => {
  const { dependencias, buzon, llamadas, carpetaBase, limpiar } = await armar()
  try {
    const consulta = { id: randomUUID(), con_actividad: true, contexto: CONTEXTO }
    const final = await procesarConsulta(consulta, dependencias)
    assert.equal(final.resultado, 'listo')
    assert.deepEqual(llamadas[0].leido, { con_actividad: true, contexto: JSON.parse(CONTEXTO) })
    assert.equal(llamadas[0].comando.argumentos[1], 'Instrucciones del sabio.')
    assert.ok(llamadas[0].opciones.limiteMs <= 150_000, 'el sabio se corta antes de que Spring pase a la reserva')
    assert.equal(buzon.respuestas[0].cuerpo.texto, 'Trabaja el nivel 1 en parejas.')
    assert.equal(buzon.fallos.length, 0)
    await assert.rejects(access(path.join(carpetaBase, consulta.id)))
  } finally { await limpiar() }
})

test('sin rol, con error, sin JSON o con tiempo agotado, Spring responde con su reserva', async () => {
  const casos = [
    { roles: {} },
    { ejecucion: { codigo: 1 } },
    { respuesta: 'No sé qué responder.' },
    { ejecucion: { agotado: true } },
    { estadoEntrega: 422 },
  ]
  for (const caso of casos) {
    const { dependencias, buzon, limpiar } = await armar(caso)
    try {
      const final = await procesarConsulta({ id: randomUUID(), con_actividad: false, contexto: CONTEXTO }, dependencias)
      assert.equal(final.resultado, 'falló', JSON.stringify(caso))
      assert.equal(buzon.fallos.length, 1, JSON.stringify(caso))
    } finally { await limpiar() }
  }
})

test('si la reserva ya respondió (409), no se insiste', async () => {
  const { dependencias, buzon, limpiar } = await armar({ estadoEntrega: 409 })
  try {
    const final = await procesarConsulta({ id: randomUUID(), con_actividad: true, contexto: CONTEXTO }, dependencias)
    assert.equal(final.resultado, 'sin_entregar')
    assert.equal(buzon.fallos.length, 0)
  } finally { await limpiar() }
})

test('atiende las preguntas de su propia cola mientras siga encendido', async () => {
  const { dependencias, buzon, limpiar } = await armar()
  try {
    const pendientes = [{ id: randomUUID(), con_actividad: true, contexto: CONTEXTO }, { id: randomUUID(), con_actividad: false, contexto: CONTEXTO }]
    let vueltas = 0
    buzon.siguienteConsulta = async () => pendientes.shift() ?? null
    await atenderConsultas({ ...dependencias, esperaMs: 1, seguir: () => ++vueltas < 5 })
    assert.equal(buzon.respuestas.length, 2)
  } finally { await limpiar() }
})

test('el buzón pide las consultas en su propia ruta, con la clave del taller', async () => {
  const pedidos = []
  const pedirHttp = async (url, opciones) => {
    pedidos.push({ url, opciones })
    return { status: url.endsWith('/siguiente') ? 204 : 200, text: async () => '{}' }
  }
  const buzon = crearBuzon({ url: 'http://spring:8080/', clave: 'clave', pedirHttp })
  assert.equal(await buzon.siguienteConsulta(), null)
  await buzon.respuestaConsulta('abc', { texto: 'Hola' })
  await buzon.falloConsulta('abc', 'motivo')
  assert.deepEqual(pedidos.map((pedido) => pedido.url), [
    'http://spring:8080/interno/taller/consultas/siguiente',
    'http://spring:8080/interno/taller/consultas/abc/respuesta',
    'http://spring:8080/interno/taller/consultas/abc/fallo',
  ])
  assert.ok(pedidos.every((pedido) => pedido.opciones.headers['X-Taller-Clave'] === 'clave'))
})
