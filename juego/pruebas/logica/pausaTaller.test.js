import { test } from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { crearBuzon } from '../../taller/trabajador/buzon.js'
import { limiteDe, INTERVALO_SONDEO_MS } from '../../taller/trabajador/pausa.js'
import { procesarTrabajo } from '../../taller/trabajador/procesar.js'

const MADRUGADA = new Date(2026, 10, 24, 1, 29).getTime()
const VUELTA = new Date(2026, 10, 24, 4, 20).getTime()
const AVISO = "You've hit your session limit · resets 4:20am"

test('reconoce límites en texto y eventos y calcula la próxima hora local', () => {
  assert.deepEqual(limiteDe({ salida: JSON.stringify({ result: AVISO }) }, 'supervisor', MADRUGADA), {
    rol: 'supervisor', hasta: VUELTA, sondear: false,
  })
  const aviso = 'FALLÓ\nRevisor: hit your usage limit; try again at 04:20'
  assert.deepEqual(limiteDe({ errores: JSON.stringify({ type: 'error', error: { message: aviso } }) }, 'supervisor', MADRUGADA), {
    rol: 'revisor', hasta: VUELTA, sondear: false,
  })
  const noche = new Date(2026, 10, 23, 23, 55).getTime()
  assert.equal(limiteDe({ errores: 'try again at 12:05 a.m.' }, 'dibujante', noche).hasta,
    new Date(2026, 10, 24, 0, 5).getTime())
  // La hora llega sin segundos: «8:58 PM» a las 20:58:02 es de hoy (vuelve en un minuto), no de mañana.
  const recien = new Date(2026, 10, 27, 20, 58, 2).getTime()
  assert.equal(limiteDe({ errores: 'usage limit; try again at 8:58 PM' }, 'programador', recien).hasta, recien + 60 * 1000)
  // Una hora que pasó hace rato sí es la de mañana.
  const tarde = new Date(2026, 10, 27, 21, 30).getTime()
  assert.equal(limiteDe({ errores: 'usage limit; try again at 8:58 PM' }, 'programador', tarde).hasta,
    new Date(2026, 10, 28, 20, 58).getTime())
  assert.deepEqual(limiteDe({ salida: 'programador: usage limit' }, 'supervisor', MADRUGADA), {
    rol: 'programador', hasta: MADRUGADA + INTERVALO_SONDEO_MS, sondear: true,
  })
  assert.equal(limiteDe({ salida: JSON.stringify({ tool_input: { command: AVISO } }) }, 'supervisor', MADRUGADA), null)
  assert.equal(limiteDe({ errores: 'se agotó el tiempo de espera' }, 'supervisor', MADRUGADA), null)
})

async function montarTaller(contexto, { lanzar, comprobar, estadoDeLaPausa = 200 }) {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-pausa-'))
  contexto.after(() => rm(trabajos, { recursive: true, force: true }))
  const anterior = randomUUID()
  const trabajo = { id: randomUUID(), tipo: 'corregir_juego', entrada: { anterior: { trabajo: anterior } } }
  const carpeta = path.join(trabajos, trabajo.id)
  for (const subcarpeta of ['juego', 'piezas']) {
    await mkdir(path.join(trabajos, anterior, subcarpeta), { recursive: true })
  }
  const juego = path.join(carpeta, 'juego', 'juego.js')
  await writeFile(path.join(trabajos, anterior, 'juego', 'juego.js'), 'Código anterior')
  await writeFile(path.join(trabajos, anterior, 'piezas', 'olla.png'), 'Pieza anterior')

  let reloj = MADRUGADA
  let estado = 'pendiente'
  let tomas = 0
  const pedidos = []
  const mensajes = []
  const buzon = crearBuzon({ url: 'http://spring/', clave: 'de-prueba', ahora: () => reloj,
    async pedirHttp(url, opciones) {
      const ruta = new URL(url).pathname.replace('/interno/taller/trabajos/', '')
      const cuerpo = JSON.parse(opciones.body ?? 'null')
      pedidos.push({ ruta, cuerpo })
      const respuesta = (status, datos) => ({ status, text: async () => JSON.stringify(datos) })
      if (ruta === 'siguiente') {
        assert.equal(estado, 'pendiente')
        estado = 'en_proceso'
        tomas += 1
        return respuesta(200, { trabajo: { ...trabajo, intentos: tomas, tomado_en: new Date(reloj).toISOString() } })
      }
      if (ruta === trabajo.id + '/pausa') {
        assert.equal(estado, 'en_proceso')
        assert.equal(cuerpo.tomado_en, new Date(MADRUGADA).toISOString())
        if (estadoDeLaPausa === 200) estado = 'pendiente'
        return respuesta(estadoDeLaPausa, { trabajo: { estado } })
      }
      assert.equal(ruta, trabajo.id + '/resultado')
      assert.equal(estado, 'en_proceso')
      estado = 'listo'
      return respuesta(200, { trabajo: { estado } })
    },
  })
  const dependencias = {
    buzon, trabajos, biblioteca: { ejemplos: [] }, juegoUrl: 'http://127.0.0.1:5174/',
    ahora: () => reloj, limiteMs: 60_000, registrar: (mensaje) => mensajes.push(mensaje),
    roles: {
      supervisor: { programa: 'supervisor-de-prueba', argumentos: ['{pedido}'] },
      dibujante: { programa: 'dibujante-de-prueba', argumentos: ['{pedido}'] },
    },
    agentes: { supervisor: { instrucciones: 'Prepara el juego.' }, revisor: { descripcion: 'Revisa.', instrucciones: 'Juega.' } },
    lanzar: (comando) => lanzar(comando, { carpeta, juego }), comprobar,
  }
  return { buzon, trabajo, carpeta, pedidos, mensajes, dependencias,
    fijarHora: (instante) => { reloj = instante }, estado: () => estado }
}

const respuestaDelRol = (respuesta, codigo = 0) => ({ codigo, salida: JSON.stringify({ result: respuesta }), errores: '' })

test('devuelve el juego a pendiente, espera la hora y retoma la misma corrección con sus archivos', async (contexto) => {
  let llamadas = 0
  let comprobaciones = 0
  const taller = await montarTaller(contexto, {
    async lanzar(comando, { carpeta, juego }) {
      llamadas += 1
      if (llamadas === 1) return respuestaDelRol('LISTO')
      assert.match(comando.argumentos[0], /Corrección 1 de 2[\s\S]*Faltan los controles/)
      const archivos = ['plan.md', 'piezas/olla.png', 'juego/juego.js', 'revision/informe.md']
      if (llamadas === 2) {
        for (const archivo of archivos) await writeFile(path.join(carpeta, archivo), 'Avance de ' + archivo)
        return respuestaDelRol(AVISO, 1)
      }
      assert.match(comando.argumentos[0], /continúa desde el primer paso pendiente/)
      for (const archivo of archivos) assert.equal(await readFile(path.join(carpeta, archivo), 'utf8'), 'Avance de ' + archivo)
      return respuestaDelRol('LISTO')
    },
    async comprobar() {
      comprobaciones += 1
      return { motivos: comprobaciones === 1 ? ['Faltan los controles.'] : [], paquete: {} }
    },
  })
  const { buzon, trabajo, carpeta, pedidos, mensajes, dependencias, fijarHora, estado } = taller
  const evidencia = async () => JSON.parse(await readFile(path.join(carpeta, 'evidencia.json'), 'utf8'))
  const primeraToma = await buzon.siguiente()
  assert.equal((await procesarTrabajo(primeraToma, dependencias)).resultado, 'en pausa')
  assert.equal(estado(), 'pendiente')
  assert.equal(llamadas, 2)
  assert.equal(comprobaciones, 1)
  assert.deepEqual(pedidos.map(({ ruta }) => ruta), ['siguiente', trabajo.id + '/pausa'])
  assert.equal(pedidos[1].cuerpo.hasta, new Date(VUELTA).toISOString())
  assert.equal((await evidencia()).intentos.juego, 1)
  assert.equal((await evidencia()).pasos.length, 1)
  assert.equal((await evidencia()).correcciones.length, 0)
  assert.match((await evidencia()).motivo, /En pausa por límite de uso hasta las 04:20/)
  assert.ok(mensajes.includes('Pausado: supervisor llegó a su límite de uso; vuelve a las 04:20'))

  fijarHora(VUELTA - 1)
  assert.equal(await buzon.siguiente(), null)
  assert.equal(pedidos.length, 2)
  fijarHora(VUELTA)
  const segundaToma = await buzon.siguiente()
  assert.equal(segundaToma.id, trabajo.id)
  const final = await procesarTrabajo(segundaToma, dependencias)
  assert.equal(final.resultado, 'listo')
  assert.equal(final.evidencia.intentos.juego, 2)
  assert.deepEqual(final.evidencia.pasos.map(({ intento }) => intento), [1, 2])
  assert.equal(final.evidencia.correcciones.length, 1)
  assert.deepEqual(pedidos.map(({ ruta }) => ruta), ['siguiente', trabajo.id + '/pausa', 'siguiente', trabajo.id + '/resultado'])
})

test('sin hora sondea al rol pausado cada 15 minutos antes de tomar trabajos', async (contexto) => {
  let sondeos = 0
  let llamadasAlSupervisor = 0
  const taller = await montarTaller(contexto, {
    async lanzar(comando) {
      if (comando.programa === 'supervisor-de-prueba') {
        llamadasAlSupervisor += 1
        if (llamadasAlSupervisor === 1) return respuestaDelRol('PAUSA dibujante: hit your usage limit')
        return respuestaDelRol('LISTO')
      }
      assert.equal(comando.programa, 'dibujante-de-prueba')
      assert.equal(comando.argumentos[0], 'Responde solo OK. No leas ni escribas archivos.')
      sondeos += 1
      return sondeos === 1 ? respuestaDelRol('usage limit', 1) : respuestaDelRol('OK')
    },
    async comprobar() { return { motivos: [], paquete: {} } },
  })
  const { buzon, pedidos, dependencias, fijarHora, carpeta } = taller
  assert.equal((await procesarTrabajo(await buzon.siguiente(), dependencias)).resultado, 'en pausa')
  const archivo = path.join(carpeta, 'evidencia.json')
  assert.equal(JSON.parse(await readFile(archivo, 'utf8')).intentos.juego, 0)
  fijarHora(MADRUGADA + INTERVALO_SONDEO_MS - 1)
  assert.equal(await buzon.siguiente(), null)
  assert.equal(sondeos, 0)
  fijarHora(MADRUGADA + INTERVALO_SONDEO_MS)
  assert.equal(await buzon.siguiente(), null)
  assert.equal(sondeos, 1)
  assert.equal(pedidos.length, 2)
  assert.match(JSON.parse(await readFile(archivo, 'utf8')).motivo, /hasta las 01:59/)
  fijarHora(MADRUGADA + 2 * INTERVALO_SONDEO_MS)
  assert.equal((await procesarTrabajo(await buzon.siguiente(), dependencias)).resultado, 'listo')
  assert.equal(sondeos, 2)
  assert.equal(llamadasAlSupervisor, 2)
  assert.equal(JSON.parse(await readFile(archivo, 'utf8')).intentos.juego, 1)
})

test('si Spring no confirma la pausa, el trabajador guarda el avance y sigue esperando', async (contexto) => {
  const { buzon, trabajo, carpeta, pedidos, mensajes, dependencias, estado } = await montarTaller(contexto, {
    estadoDeLaPausa: 404,
    lanzar: async () => respuestaDelRol(AVISO, 1),
    comprobar: async () => assert.fail('El límite debe detectarse antes de comprobar'),
  })
  assert.equal((await procesarTrabajo(await buzon.siguiente(), dependencias)).resultado, 'en pausa')
  assert.equal(estado(), 'en_proceso')
  assert.equal(await buzon.siguiente(), null)
  assert.deepEqual(pedidos.map(({ ruta }) => ruta), ['siguiente', trabajo.id + '/pausa'])
  assert.ok(mensajes.some((mensaje) => mensaje.includes('Spring no confirmó')))
  assert.equal(JSON.parse(await readFile(path.join(carpeta, 'evidencia.json'), 'utf8')).intentos.juego, 0)
})
