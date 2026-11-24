import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { leerAgentes } from '../../taller/trabajador/roles.js'
import { procesarPropuesta, pedidoParaElProponedor, MAX_CORRECCIONES_PROPUESTA } from '../../taller/trabajador/proponer.js'

// La propuesta por el taller, sin programas reales: el proponedor, el buzón y el reloj son
// dobles de prueba. Lo que no se prueba aquí es que el proponedor real escriba bien: eso
// solo se ve con una propuesta de verdad.

const FUENTE = { documento: 'Programa curricular de Primaria', referencia: 'página 120', tema: 'El cuerpo humano' }
const PROPUESTA = { tipo_juego: 'otro', regla_juego: 'ninguna', objetivo: 'Los niños aprenderán a …', historia: 'Texto.' }

function trabajoNuevo() {
  return { id: randomUUID(), tipo: 'proponer', entrada: { entrada: { tema: 'Las partes del hueso', grado: 2, tipo: 'nueva' }, versionBase: null } }
}

// El proponedor de mentira escribe lo que diga «acciones[n]» en propuesta.json, o no escribe nada.
async function armar({ acciones, respuestasBuzon = [], roles, ahora } = {}) {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-proponer-'))
  const llamadas = []
  const buzon = { entregas: [], fallos: [] }
  buzon.propuesta = async (id, cuerpo) => { buzon.entregas.push({ id, cuerpo }); return respuestasBuzon.shift() ?? { estado: 200, datos: {} } }
  buzon.fallo = async (id, motivo) => { buzon.fallos.push({ id, motivo }); return { estado: 200, datos: {} } }
  buzon.pausas = []
  buzon.pausar = async ({ id }, { pausa }) => { buzon.pausas.push({ id, pausa }); return { estado: 200 } }
  const lanzar = async (comando, opciones) => {
    llamadas.push({ comando, opciones })
    const accion = acciones.shift() ?? {}
    // El segundo argumento del rol de prueba es la carpeta del trabajo.
    if (accion.escribir !== undefined) await writeFile(path.join(comando.argumentos[1], 'propuesta.json'), JSON.stringify(accion.escribir))
    return { codigo: 0, agotado: false, segundos: 1, salida: JSON.stringify({ result: accion.respuesta ?? 'LISTO', usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.5, is_error: false }), errores: '', ...accion.ejecucion }
  }
  const dependencias = {
    buzon, lanzar, trabajos, limiteMs: 5 * 60 * 1000, registrar: () => {}, ahora,
    roles: roles ?? { proponedor: { programa: 'proponedor-de-prueba', carpeta: '{temporal}', argumentos: ['{pedido}', '{carpeta}', '{instrucciones}'] } },
    agentes: { proponedor: { instrucciones: 'Instrucciones del proponedor.' } },
  }
  return { dependencias, buzon, llamadas, trabajos, limpiar: () => rm(trabajos, { recursive: true, force: true }) }
}

test('el rol proponedor está en taller/agentes/ con su forma de entrega y sus reglas de grado', async () => {
  const { proponedor } = await leerAgentes()
  assert.match(proponedor.instrucciones, /^# Proponedor/)
  assert.match(proponedor.instrucciones, /propuesta\.json/)
  assert.match(proponedor.instrucciones, /fuentes/)
  assert.match(proponedor.instrucciones, /no lo cambies/)
  assert.match(proponedor.descripcion, /contenidos por grado/)
})

test('el pedido nombra la carpeta y el archivo de entrega; con corrección lista los motivos', () => {
  const trabajo = trabajoNuevo()
  const primero = pedidoParaElProponedor({ trabajo, carpeta: '/t/' + trabajo.id, correccion: null, intento: 1 })
  assert.match(primero, /proponedor del taller/)
  assert.ok(primero.includes('/t/' + trabajo.id + '/propuesta.json'))
  assert.doesNotMatch(primero, /Corrección/)
  const segundo = pedidoParaElProponedor({ trabajo, carpeta: '/t/x', correccion: ['«historia» debe ser un texto'], intento: 2 })
  assert.match(segundo, /Corrección 1 de 2/)
  assert.match(segundo, /- «historia» debe ser un texto/)
})

test('entrega la propuesta con sus fuentes y la evidencia, y guarda la evidencia en la carpeta', async () => {
  const trabajo = trabajoNuevo()
  const { dependencias, buzon, llamadas, trabajos, limpiar } = await armar({ acciones: [{ escribir: { propuesta: PROPUESTA, fuentes: [FUENTE] } }] })
  const final = await procesarPropuesta(trabajo, dependencias)
  assert.equal(final.resultado, 'listo')
  assert.equal(llamadas.length, 1)
  assert.equal(buzon.entregas.length, 1)
  assert.deepEqual(buzon.entregas[0].cuerpo.propuesta, PROPUESTA)
  assert.deepEqual(buzon.entregas[0].cuerpo.fuentes, [FUENTE])
  assert.equal(buzon.entregas[0].cuerpo.evidencia.tipo, 'proponer')
  assert.equal(buzon.entregas[0].cuerpo.evidencia.costo_estimado_usd, 0.5)
  assert.deepEqual(buzon.fallos, [])
  // El pedido del docente quedó en trabajo.json, como dato.
  const guardado = JSON.parse(await readFile(path.join(trabajos, trabajo.id, 'trabajo.json'), 'utf8'))
  assert.equal(guardado.entrada.entrada.tema, 'Las partes del hueso')
  assert.equal(JSON.parse(await readFile(path.join(trabajos, trabajo.id, 'evidencia.json'), 'utf8')).resultado, 'listo')
  await limpiar()
})

test('si Spring la rechaza con motivos, pide una corrección con esos motivos y entrega la nueva', async () => {
  const trabajo = trabajoNuevo()
  const entrega = { escribir: { propuesta: PROPUESTA, fuentes: [FUENTE] } }
  const { dependencias, buzon, llamadas, limpiar } = await armar({
    acciones: [entrega, entrega],
    respuestasBuzon: [{ estado: 422, datos: { motivos: ['«retos» debe ser una lista de 1 a 20 textos.'] } }, { estado: 200, datos: {} }],
  })
  const final = await procesarPropuesta(trabajo, dependencias)
  assert.equal(final.resultado, 'listo')
  assert.equal(llamadas.length, 2)
  assert.match(llamadas[1].comando.argumentos[0], /Corrección 1 de 2/)
  assert.match(llamadas[1].comando.argumentos[0], /Spring rechazó la propuesta: «retos»/)
  assert.equal(buzon.entregas.length, 2)
  assert.equal(buzon.entregas[1].cuerpo.evidencia.correcciones.length, 1)
  await limpiar()
})

test('tras dos correcciones fallidas, el trabajo falla con sus motivos para que entre el respaldo', async () => {
  const trabajo = trabajoNuevo()
  const entrega = { escribir: { propuesta: PROPUESTA, fuentes: [FUENTE] } }
  const mala = { estado: 422, datos: { motivos: ['motivo uno'] } }
  const { dependencias, buzon, llamadas, limpiar } = await armar({ acciones: [entrega, entrega, entrega], respuestasBuzon: [mala, mala, mala] })
  const final = await procesarPropuesta(trabajo, dependencias)
  assert.equal(final.resultado, 'falló')
  assert.equal(llamadas.length, 1 + MAX_CORRECCIONES_PROPUESTA)
  assert.equal(buzon.fallos.length, 1)
  assert.match(buzon.fallos[0].motivo, /después de 2 correcciones: Spring rechazó la propuesta: motivo uno/)
  await limpiar()
})

test('una entrega sin fuentes o sin archivo no llega a Spring: se corrige primero', async () => {
  const trabajo = trabajoNuevo()
  const { dependencias, buzon, llamadas, limpiar } = await armar({
    acciones: [{}, { escribir: { propuesta: PROPUESTA } }, { escribir: { propuesta: PROPUESTA, fuentes: [FUENTE] } }],
  })
  const final = await procesarPropuesta(trabajo, dependencias)
  assert.equal(final.resultado, 'listo')
  assert.equal(llamadas.length, 3)
  assert.match(llamadas[1].comando.argumentos[0], /Falta propuesta\.json/)
  assert.match(llamadas[2].comando.argumentos[0], /necesita «fuentes»/)
  assert.equal(buzon.entregas.length, 1)
  await limpiar()
})

test('si el proponedor dice FALLÓ o termina con un error general, falla de una vez sin insistir', async () => {
  for (const accion of [
    { respuesta: 'FALLÓ: no encontré una fuente que sirva' },
    { ejecucion: { codigo: 1, salida: '', errores: 'servicio no disponible' } },
  ]) {
    const { dependencias, buzon, llamadas, limpiar } = await armar({ acciones: [accion] })
    const final = await procesarPropuesta(trabajoNuevo(), dependencias)
    assert.equal(final.resultado, 'falló')
    assert.equal(llamadas.length, 1)
    assert.equal(buzon.fallos.length, 1)
    assert.equal(buzon.entregas.length, 0)
    await limpiar()
  }
})

test('el proponedor también se pausa sin gastar intento y retoma la propuesta que dejó', async (contexto) => {
  const trabajo = trabajoNuevo()
  const hora = new Date(2026, 10, 24, 1, 29).getTime()
  const entrega = { propuesta: PROPUESTA, fuentes: [FUENTE] }
  const { dependencias, buzon, llamadas, trabajos, limpiar } = await armar({
    ahora: () => hora,
    acciones: [{ escribir: entrega, ejecucion: { codigo: 1, salida: '', errores: 'usage limit reached' } }, {}],
  })
  contexto.after(limpiar)
  assert.equal((await procesarPropuesta(trabajo, dependencias)).resultado, 'en pausa')
  assert.equal(llamadas.length, 1)
  assert.deepEqual(buzon.fallos, [])
  assert.deepEqual(buzon.entregas, [])
  assert.deepEqual(buzon.pausas, [{ id: trabajo.id, pausa: { rol: 'proponedor', sondear: true, hasta: hora + 900_000 } }])
  const archivo = path.join(trabajos, trabajo.id, 'evidencia.json')
  assert.equal(JSON.parse(await readFile(archivo, 'utf8')).intentos.propuesta, 0)
  dependencias.ahora = () => hora + 900_000
  assert.equal((await procesarPropuesta(trabajo, dependencias)).resultado, 'listo')
  assert.match(llamadas[1].comando.argumentos[0], /Retoma lo que esté escrito/)
  assert.equal(buzon.entregas[0].cuerpo.evidencia.intentos.propuesta, 1)
})

test('si se acaba el tiempo falla; sin el rol proponedor falla sin lanzar nada', async () => {
  const agotado = await armar({ acciones: [{ ejecucion: { agotado: true } }] })
  assert.equal((await procesarPropuesta(trabajoNuevo(), agotado.dependencias)).resultado, 'falló')
  assert.match(agotado.buzon.fallos[0].motivo, /Se acabó el tiempo/)
  await agotado.limpiar()

  const sinRol = await armar({ acciones: [], roles: {} })
  assert.equal((await procesarPropuesta(trabajoNuevo(), sinRol.dependencias)).resultado, 'falló')
  assert.equal(sinRol.llamadas.length, 0)
  assert.match(sinRol.buzon.fallos[0].motivo, /Falta el rol «proponedor»/)
  await sinRol.limpiar()
})

test('si Spring ya no espera la propuesta (409) no la reintenta ni la da por fallida', async () => {
  const { dependencias, buzon, llamadas, limpiar } = await armar({
    acciones: [{ escribir: { propuesta: PROPUESTA, fuentes: [FUENTE] } }], respuestasBuzon: [{ estado: 409, datos: {} }],
  })
  const final = await procesarPropuesta(trabajoNuevo(), dependencias)
  assert.equal(final.resultado, 'sin_entregar')
  assert.equal(llamadas.length, 1)
  assert.deepEqual(buzon.fallos, [])
  await limpiar()
})
