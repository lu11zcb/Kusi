import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { leerEnv, cargarConfiguracion } from '../../taller/trabajador/configuracion.js'
import { crearBuzon } from '../../taller/trabajador/buzon.js'
import { prepararCarpeta, piezasNuevas } from '../../taller/trabajador/carpeta.js'
import { armarComando, leerAgentes, subagentes, consumoDe } from '../../taller/trabajador/roles.js'
import { nombraAlCuy, importacionPermitida, revisarCodigo } from '../../taller/trabajador/comprobar.js'
import { procesarTrabajo, pedidoParaElSupervisor, MAX_CORRECCIONES } from '../../taller/trabajador/procesar.js'

// El trabajador del taller, sin programas reales: los roles, el buzón y las
// comprobaciones son dobles de prueba. La prueba de punta a punta, con el navegador,
// está en pruebas/navegador/trabajador.spec.js.

const PAPA = new URL('../../kit/recursos/dibujos/objetos/papa.png', import.meta.url)

test('lee el .env sin comentarios y quita las comillas', () => {
  assert.deepEqual(leerEnv('# comentario\nEDU_API_URL=http://127.0.0.1:8080\n\nTALLER_CLAVE="a=b"\nVACIA=\n'), {
    EDU_API_URL: 'http://127.0.0.1:8080', TALLER_CLAVE: 'a=b', VACIA: '',
  })
})

test('lo que ya está en el entorno gana al archivo, y sin archivo hay valores por omisión', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-env-'))
  await writeFile(path.join(carpeta, '.env'), 'EDU_API_URL=http://del-archivo\nTALLER_CLAVE=del-archivo\n')
  const configuracion = cargarConfiguracion({ TALLER_ENV: path.join(carpeta, '.env'), TALLER_CLAVE: 'del-entorno' })
  assert.equal(configuracion.eduApiUrl, 'http://del-archivo')
  assert.equal(configuracion.clave, 'del-entorno')
  assert.equal(configuracion.limiteMs, 12 * 60 * 1000)
  assert.equal(cargarConfiguracion({ TALLER_ENV: path.join(carpeta, 'no-existe') }).clave, '')
  await rm(carpeta, { recursive: true })
})

test('el buzón manda la clave en su encabezado y entiende 200, 204 y los errores', async () => {
  const pedidos = []
  const respuestas = [
    { status: 204, texto: '' },
    { status: 200, texto: JSON.stringify({ trabajo: { id: 'x', tipo: 'crear_juego' } }) },
    { status: 403, texto: JSON.stringify({ mensaje: 'Servicio no autorizado.' }) },
    { status: 422, texto: JSON.stringify({ motivos: ['uno'] }) },
  ]
  const pedirHttp = async (direccion, opciones) => {
    pedidos.push({ direccion, opciones })
    const { status, texto } = respuestas.shift()
    return { status, text: async () => texto }
  }
  const buzon = crearBuzon({ url: 'http://spring/', clave: 'secreta', pedirHttp })
  assert.equal(await buzon.siguiente(), null)
  assert.deepEqual(await buzon.siguiente(), { id: 'x', tipo: 'crear_juego' })
  await assert.rejects(buzon.siguiente(), /403/)
  assert.deepEqual(await buzon.resultado('x', { paquete: {} }), { estado: 422, datos: { motivos: ['uno'] } })
  assert.equal(pedidos[0].direccion, 'http://spring/interno/taller/trabajos/siguiente')
  assert.equal(pedidos[0].opciones.headers['X-Taller-Clave'], 'secreta')
  assert.equal(pedidos[3].direccion, 'http://spring/interno/taller/trabajos/x/resultado')
})

test('arma la línea de comando de un rol con sus marcadores, y un marcador sin valor es un error', () => {
  const rol = { programa: 'programa-del-rol', carpeta: '{temporal}', argumentos: ['--pedido', '{pedido}', 'Edit(/{carpeta}/**)'] }
  assert.deepEqual(armarComando(rol, { pedido: 'Haz el juego', carpeta: '/t/123', temporal: '/tmp/x' }), {
    programa: 'programa-del-rol', argumentos: ['--pedido', 'Haz el juego', 'Edit(//t/123/**)'], carpeta: '/tmp/x',
  })
  assert.throws(() => armarComando(rol, { pedido: 'x' }), /\{carpeta\} no tiene valor/)
})

test('los roles salen de taller/agentes/ y los subagentes del supervisor son el programador y el revisor', async () => {
  const agentes = await leerAgentes()
  assert.deepEqual(Object.keys(agentes).sort(), ['dibujante', 'programador', 'revisor', 'supervisor'])
  assert.match(agentes.supervisor.instrucciones, /^# Supervisor/)
  const json = JSON.parse(subagentes(agentes, ['programador', 'revisor']))
  assert.deepEqual(Object.keys(json), ['programador', 'revisor'])
  assert.match(json.revisor.description, /Juega el juego/)
  assert.throws(() => subagentes(agentes, ['pintor']), /pintor/)
})

test('del resumen en JSON del programa salen los tokens y el costo estimado', () => {
  const salida = 'algo antes\n' + JSON.stringify({ result: 'LISTO', usage: { input_tokens: 10, cache_read_input_tokens: 5, output_tokens: 3 }, total_cost_usd: 0.25 })
  assert.deepEqual(consumoDe(salida), { tokens_entrada: 15, tokens_salida: 3, costo_estimado_usd: 0.25, respuesta: 'LISTO', con_error: false })
  assert.equal(consumoDe('LISTO').respuesta, 'LISTO')
})

test('la búsqueda del cuy no confunde «cuyo» ni «cuya»', () => {
  for (const texto of ['el cuy', 'cuyAnimado', 'paso_cuy', 'CUY']) assert.equal(nombraAlCuy(texto), true, texto)
  for (const texto of ['cuyo nombre', 'cuya forma', 'cuyos', 'el protagonista']) assert.equal(nombraAlCuy(texto), false, texto)
})

test('un juego solo importa del kit, de phaser y de su carpeta (y las pruebas, de Node)', () => {
  const juego = '/t/123/juego'
  assert.equal(importacionPermitida('#kit/reproductor/medidas.js', juego + '/escenas/E.js', juego), true)
  assert.equal(importacionPermitida('phaser', juego + '/escenas/E.js', juego), true)
  assert.equal(importacionPermitida('../logica/a.js', juego + '/escenas/E.js', juego), true)
  assert.equal(importacionPermitida('node:test', juego + '/pruebas/a.test.js', juego), true)
  assert.equal(importacionPermitida('node:fs', juego + '/escenas/E.js', juego), false)
  assert.equal(importacionPermitida('../../../../juegos/laberinto/x.js', juego + '/escenas/E.js', juego), false)
  assert.equal(importacionPermitida('axios', juego + '/escenas/E.js', juego), false)
})

test('la revisión del código encuentra lo prohibido, el cuy y las importaciones ajenas', async () => {
  const juego = path.join(await mkdtemp(path.join(tmpdir(), 'kusi-codigo-')), 'juego')
  await mkdir(path.join(juego, 'escenas'), { recursive: true })
  await writeFile(path.join(juego, 'juego.js'), "import { E } from './escenas/E.js'\nexport default {}\n")
  await writeFile(path.join(juego, 'guion-ejemplo.json'), '{"retos": [{"consigna": "Ayuda al cuy"}]}')
  await writeFile(path.join(juego, 'escenas', 'E.js'), [
    "import axios from 'axios'",
    "fetch('https://otra.pagina')",
    "localStorage.setItem('a', 1)",
    'window.parent.postMessage(1)',
  ].join('\n'))
  const motivos = await revisarCodigo(juego)
  assert.equal(motivos.length, 6, motivos.join('\n'))
  assert.match(motivos[0], /Falta juego\/README\.md/)
  assert.ok(motivos.some((motivo) => /E\.js se conecta a la red/.test(motivo)))
  assert.ok(motivos.some((motivo) => /guarda datos en el navegador/.test(motivo)))
  assert.ok(motivos.some((motivo) => /toca la página o la app/.test(motivo)))
  assert.ok(motivos.some((motivo) => /importa «axios»/.test(motivo)))
  assert.ok(motivos.some((motivo) => /guion-ejemplo\.json nombra al cuy/.test(motivo)))
  await rm(path.dirname(juego), { recursive: true })
})

test('la carpeta de una corrección empieza con una copia del juego anterior, sin tocarlo', async () => {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-trabajos-'))
  const anterior = randomUUID()
  await mkdir(path.join(trabajos, anterior, 'juego'), { recursive: true })
  await mkdir(path.join(trabajos, anterior, 'piezas'), { recursive: true })
  await writeFile(path.join(trabajos, anterior, 'juego', 'juego.js'), 'export default {}\n')
  await copyFile(PAPA, path.join(trabajos, anterior, 'piezas', 'olla.png'))

  const trabajo = { id: randomUUID(), tipo: 'corregir_juego', intentos: 1, entrada: { pedido: 'Un solo nivel.', anterior: { trabajo: anterior } } }
  const { carpeta, anterior: carpetaAnterior } = await prepararCarpeta(trabajo, { trabajos, biblioteca: { ejemplos: [] } })
  assert.equal(await readFile(path.join(carpeta, 'juego', 'juego.js'), 'utf8'), 'export default {}\n')
  assert.ok(existsSync(path.join(carpeta, 'piezas', 'olla.png')))
  assert.deepEqual(JSON.parse(await readFile(path.join(carpeta, 'trabajo.json'), 'utf8')).entrada.pedido, 'Un solo nivel.')
  assert.ok(existsSync(path.join(carpeta, 'biblioteca.json')))

  // Solo cuentan como nuevas las piezas que no traía el juego anterior.
  await copyFile(PAPA, path.join(carpeta, 'piezas', 'fondo-chacra.png'))
  await writeFile(path.join(carpeta, 'piezas', 'Mal Nombre.png'), '')
  assert.deepEqual(await piezasNuevas(carpeta, carpetaAnterior), [{ id: 'fondo-chacra', tipo: 'fondo' }])
  assert.deepEqual(await piezasNuevas(path.join(trabajos, anterior)), [{ id: 'olla', tipo: 'objeto' }])
  await assert.rejects(prepararCarpeta({ ...trabajo, id: '../../kit' }, { trabajos, biblioteca: {} }), /no es un id válido/)
  await rm(trabajos, { recursive: true })
})

test('el pedido al supervisor dice la carpeta, la corrección y sus motivos, sin nombrar programas', () => {
  const trabajo = { id: randomUUID(), tipo: 'corregir_juego' }
  const pedido = pedidoParaElSupervisor({ trabajo, carpeta: '/t/' + trabajo.id, juegoUrl: 'http://127.0.0.1:5174/',
    correccion: ['Faltan las pruebas.'], intento: 2 })
  assert.match(pedido, /Carpeta del trabajo: \/t\//)
  assert.match(pedido, /copia del juego anterior/)
  assert.match(pedido, /Corrección 1 de 2/)
  assert.match(pedido, /- Faltan las pruebas\./)
  assert.match(pedido, /\?juego=/)
})

// ---------- procesarTrabajo, con dobles ----------

async function escenario({ entregas, respuestasSpring = [], limiteMs = 60_000, ahora } = {}) {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-procesar-'))
  const trabajo = { id: randomUUID(), tipo: 'crear_juego', intentos: 1, entrada: { solicitud: { tema: 'Parejas' } } }
  const registro = { lanzados: [], resultados: [], fallos: [] }
  const buzon = {
    resultado: async (id, cuerpo) => { registro.resultados.push(cuerpo); return respuestasSpring.shift() ?? { estado: 200, datos: {} } },
    fallo: async (id, motivo) => { registro.fallos.push(motivo); return { estado: 200, datos: {} } },
  }
  // Cada intento del supervisor «entrega» algo: los motivos que encontrarán las comprobaciones.
  const lanzar = async (comando) => {
    registro.lanzados.push(comando.argumentos[0])
    const entrega = entregas.shift()
    if (entrega === 'agotado') return { codigo: null, agotado: true, salida: '', errores: '' }
    if (entrega === 'no') return { codigo: 0, agotado: false, salida: JSON.stringify({ result: 'FALLÓ: figura sagrada' }), errores: '' }
    registro.siguientes = entrega
    return { codigo: 0, agotado: false, salida: JSON.stringify({ result: 'LISTO', usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.5 }), errores: '' }
  }
  const comprobar = async () => ({ motivos: registro.siguientes, paquete: { formato: 'kusi-paquete/0', trabajo: trabajo.id } })
  const final = await procesarTrabajo(trabajo, {
    buzon, lanzar, comprobar, trabajos, limiteMs, ahora, registrar: () => {},
    roles: { supervisor: { programa: 'p', argumentos: ['{pedido}'] } },
    agentes: await leerAgentes(), biblioteca: { ejemplos: [] }, juegoUrl: 'http://127.0.0.1:5174/',
  })
  await rm(trabajos, { recursive: true })
  return { final, registro, trabajo }
}

test('un juego que pasa a la primera se entrega con su evidencia', async () => {
  const { final, registro, trabajo } = await escenario({ entregas: [[]] })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.lanzados.length, 1)
  assert.equal(registro.resultados.length, 1)
  const { paquete, piezas, evidencia } = registro.resultados[0]
  assert.equal(paquete.trabajo, trabajo.id)
  assert.deepEqual(piezas, [])
  assert.equal(evidencia.trabajo, trabajo.id)
  assert.equal(evidencia.intentos.juego, 1)
  assert.equal(evidencia.costo_estimado_usd, 0.5)
  assert.equal(evidencia.pasos[0].rol, 'supervisor')
})

test('si no pasa, el supervisor recibe los motivos y corrige', async () => {
  const { final, registro } = await escenario({ entregas: [['Faltan las pruebas.'], []] })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.lanzados.length, 2)
  assert.match(registro.lanzados[1], /Corrección 1 de 2[\s\S]*- Faltan las pruebas\./)
  assert.equal(registro.resultados[0].evidencia.intentos.juego, 2)
  assert.equal(registro.resultados[0].evidencia.correcciones.length, 1)
})

test('después de 2 correcciones sin pasar, se informa el fallo con su motivo', async () => {
  const { final, registro } = await escenario({ entregas: [['a'], ['b'], ['c'], []] })
  assert.equal(final.resultado, 'falló')
  assert.equal(registro.lanzados.length, 1 + MAX_CORRECCIONES)
  assert.equal(registro.resultados.length, 0)
  assert.match(registro.fallos[0], /después de 2 correcciones: c/)
})

test('lo que rechaza Spring (422) también vuelve al supervisor como corrección', async () => {
  const { final, registro } = await escenario({
    entregas: [[], []],
    respuestasSpring: [{ estado: 422, datos: { motivos: ['«trabajo» debe ser el id de este trabajo.'] } }, { estado: 200, datos: {} }],
  })
  assert.equal(final.resultado, 'listo')
  assert.match(registro.lanzados[1], /Spring rechazó el guion: «trabajo»/)
})

test('si se acaba el tiempo, el trabajo falla sin más intentos', async () => {
  const { final, registro } = await escenario({ entregas: ['agotado'] })
  assert.equal(final.resultado, 'falló')
  assert.match(registro.fallos[0], /Se acabó el tiempo/)

  // Y si el tiempo ya se fue antes de un intento, no se lanza otro.
  let reloj = 0
  const lento = await escenario({ entregas: [['a'], []], limiteMs: 1000, ahora: () => (reloj += 600) })
  assert.equal(lento.final.resultado, 'falló')
  assert.equal(lento.registro.lanzados.length, 1)
})

test('si el supervisor dice que no se puede, se informa el fallo sin insistir', async () => {
  const { final, registro } = await escenario({ entregas: ['no'] })
  assert.equal(final.resultado, 'falló')
  assert.equal(registro.lanzados.length, 1)
  assert.match(registro.fallos[0], /figura sagrada/)
})
