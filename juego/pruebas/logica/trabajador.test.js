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
import { armarComando, leerAgentes, cortarActivos, subagentes, consumoDe, negadosDe, lanzar } from '../../taller/trabajador/roles.js'
import { nombraAlCuy, importacionPermitida, revisarCodigo, comprobarJuego } from '../../taller/trabajador/comprobar.js'
import { procesarTrabajo, pedidoParaElSupervisor, MAX_CORRECCIONES } from '../../taller/trabajador/procesar.js'
import { grabarVozKusi } from '../../taller/vozKusi.mjs'

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
  // Sin tiempo límite por omisión; TALLER_LIMITE_MS pone uno.
  assert.equal(configuracion.limiteMs, Infinity)
  assert.equal(cargarConfiguracion({ TALLER_ENV: path.join(carpeta, '.env'), TALLER_LIMITE_MS: '60000' }).limiteMs, 60000)
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

test('el buzón entrega la propuesta en su ruta y el fallo en la de siempre', async () => {
  const pedidos = []
  const pedirHttp = async (direccion, opciones) => {
    pedidos.push({ direccion, cuerpo: JSON.parse(opciones.body) })
    return { status: 200, text: async () => '{}' }
  }
  const buzon = crearBuzon({ url: 'http://spring/', clave: 'secreta', pedirHttp })
  await buzon.propuesta('p1', { propuesta: {}, fuentes: [] })
  await buzon.fallo('p1', 'sin tokens')
  assert.equal(pedidos[0].direccion, 'http://spring/interno/taller/trabajos/p1/propuesta')
  assert.equal(pedidos[1].direccion, 'http://spring/interno/taller/trabajos/p1/fallo')
  assert.deepEqual(pedidos[1].cuerpo, { motivo: 'sin tokens' })
})

test('el buzón reabre un juego fallido sin cuerpo y con la clave, para la entrega del equipo', async () => {
  const pedidos = []
  const pedirHttp = async (direccion, opciones) => {
    pedidos.push({ direccion, opciones })
    return { status: 409, text: async () => '{"mensaje":"Solo se reabre un trabajo fallido."}' }
  }
  const buzon = crearBuzon({ url: 'http://spring/', clave: 'secreta', pedirHttp })
  const respuesta = await buzon.reabrir('j1')
  assert.equal(pedidos[0].direccion, 'http://spring/interno/taller/trabajos/j1/reabrir')
  assert.equal(pedidos[0].opciones.method, 'POST')
  assert.equal(pedidos[0].opciones.headers['X-Taller-Clave'], 'secreta')
  assert.equal(pedidos[0].opciones.body, undefined)
  assert.deepEqual(respuesta, { estado: 409, datos: { mensaje: 'Solo se reabre un trabajo fallido.' } })
})

test('arma la línea de comando de un rol con sus marcadores, y un marcador sin valor es un error', () => {
  const rol = { programa: 'programa-del-rol', carpeta: '{temporal}', argumentos: ['--pedido', '{pedido}', 'Edit(/{carpeta}/**)'] }
  assert.deepEqual(armarComando(rol, { pedido: 'Haz el juego', carpeta: '/t/123', temporal: '/tmp/x' }), {
    programa: 'programa-del-rol', argumentos: ['--pedido', 'Haz el juego', 'Edit(//t/123/**)'], carpeta: '/tmp/x', silencioMs: null,
  })
  assert.throws(() => armarComando(rol, { pedido: 'x' }), /\{carpeta\} no tiene valor/)
})

test('los roles salen de taller/agentes/ y los subagentes del supervisor son el programador y el revisor', async () => {
  const agentes = await leerAgentes()
  assert.deepEqual(Object.keys(agentes).sort(), ['dibujante', 'programador', 'proponedor', 'revisor', 'sabio', 'supervisor'])
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

test('los eventos por línea conservan el mensaje final, el consumo y los fallos del rol', () => {
  const eventos = [
    { type: 'item.completed', item: { type: 'agent_message', text: 'Estoy revisando.' } },
    { type: 'item.completed', item: { type: 'agent_message', text: 'LISTO' } },
    { type: 'turn.completed', usage: { input_tokens: 120, cached_input_tokens: 100, output_tokens: 25 } },
  ]
  const salida = eventos.map(JSON.stringify).join('\n')
  assert.deepEqual(consumoDe(salida), { tokens_entrada: 120, tokens_salida: 25,
    costo_estimado_usd: 0, respuesta: 'LISTO', con_error: false })
  const fallo = consumoDe(salida + '\n' + JSON.stringify({ type: 'turn.failed', error: { message: 'No disponible' } }))
  assert.equal(fallo.con_error, true)
  assert.equal(fallo.respuesta, 'No disponible')
})

test('un guion sin historia no pasa las comprobaciones: el reproductor no tendría qué contar', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-historia-'))
  await mkdir(path.join(carpeta, 'juego'), { recursive: true })
  const guion = { formato: 'kusi-paquete/0', familia: 'prueba', retos: [] }
  await writeFile(path.join(carpeta, 'juego', 'guion-ejemplo.json'), JSON.stringify(guion))
  assert.match((await comprobarJuego({ carpeta, trabajo: randomUUID(), juegoUrl: 'http://127.0.0.1:1/' })).motivos.join(' | '), /Falta la historia del guion/)
  await writeFile(path.join(carpeta, 'juego', 'guion-ejemplo.json'), JSON.stringify({ ...guion, historia: 'Kusi necesita ayuda.' }))
  assert.doesNotMatch((await comprobarJuego({ carpeta, trabajo: randomUUID(), juegoUrl: 'http://127.0.0.1:1/' })).motivos.join(' | '), /Falta la historia del guion/)
  await rm(carpeta, { recursive: true })
})

test('un rol que se pasa del tiempo se corta aunque un hijo suyo deje abiertas las tuberías', { timeout: 30_000 }, async () => {
  // El hijo sale del grupo (detached) y hereda la salida: «close» no llegaría hasta que él muera.
  const codigo = "const { spawn } = require('node:child_process');" +
    "spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { detached: true, stdio: 'inherit' }).unref();" +
    "setTimeout(() => {}, 60000)"
  const inicio = Date.now()
  const resultado = await lanzar({ programa: process.execPath, argumentos: ['-e', codigo], carpeta: tmpdir() }, { limiteMs: 300 })
  assert.equal(resultado.agotado, true)
  assert.ok(Date.now() - inicio < 20_000, 'tardó ' + (Date.now() - inicio) + ' ms')
})

test('un rol que deja de dar salida se corta por silencio, y uno que sigue hablando no', { timeout: 40_000 }, async () => {
  const mudo = await lanzar({ programa: process.execPath, argumentos: ['-e', 'setTimeout(() => {}, 60000)'], carpeta: tmpdir(), silencioMs: 700 }, { limiteMs: 60_000 })
  assert.equal(mudo.silencio, true)
  assert.equal(mudo.agotado, true)
  const habla = await lanzar({ programa: process.execPath, carpeta: tmpdir(), silencioMs: 700, argumentos: ['-e',
    "let n = 0; const t = setInterval(() => { console.log('avance ' + n); if (++n === 4) { clearInterval(t) } }, 300)"] }, { limiteMs: 60_000 })
  assert.equal(habla.silencio, false)
  assert.equal(habla.codigo, 0)
  // El campo del rol pasa a milisegundos; sin el campo, no se vigila.
  assert.equal(armarComando({ programa: 'p', argumentos: [], silencio_seg: 240 }, { carpeta: '/c' }).silencioMs, 240_000)
  assert.equal(armarComando({ programa: 'p', argumentos: [] }, { carpeta: '/c' }).silencioMs, null)
})

test('al cerrar el taller se cortan los roles que seguían trabajando', async () => {
  // Un rol que no termina solo (como un supervisor con su navegador abierto): sin cortarActivos quedaría huérfano.
  const colgado = lanzar({ programa: process.execPath, argumentos: ['-e', 'setInterval(() => {}, 1000)'] }, { limiteMs: 60_000 })
  await new Promise((listo) => setTimeout(listo, 400))
  assert.equal(cortarActivos('SIGKILL'), 1)
  const resultado = await colgado
  assert.notEqual(resultado.codigo, 0)
  assert.equal(resultado.agotado, false)
  assert.equal(cortarActivos('SIGKILL'), 0)
})

test('un juego sin los controles ni la interfaz del kit, o con su propio entorno, no pasa el código', async () => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-controles-'))
  const juego = path.join(carpeta, 'juego')
  await mkdir(path.join(juego, 'escenas'), { recursive: true })
  for (const archivo of ['juego.js', 'guion-ejemplo.json', 'README.md']) await writeFile(path.join(juego, archivo), archivo.endsWith('.json') ? '{}' : '// x\n')
  await writeFile(path.join(juego, 'escenas', 'E.js'), "import * as Phaser from 'phaser'\n" +
    'export class E extends Phaser.Scene { update() { moverConColisiones() } }\n')
  const sin = (await revisarCodigo(juego)).motivos.join(' | ')
  assert.match(sin, /no usa los controles del kit/)
  assert.match(sin, /no usa la interfaz común del kit/)
  await writeFile(path.join(juego, 'escenas', 'E.js'), 'crearControles(this)\ncrearHud(this)\nrepartirYColocar(this, {})\ndarVida(this, x)\nambiente(this, {})\n')
  await writeFile(path.join(juego, 'index.html'), '<html></html>')
  await mkdir(path.join(juego, 'kit'))
  // Una criatura animada en piezas/ que el juego no reproduce con crearCriatura se rechaza.
  await mkdir(path.join(carpeta, 'piezas'), { recursive: true })
  await writeFile(path.join(carpeta, 'piezas', 'criatura-llama.png'), 'x')
  assert.match((await revisarCodigo(juego)).motivos.join(' | '), /criaturas animadas en piezas\/ \(criatura-llama\.png\)[\s\S]*crearCriatura/)
  await writeFile(path.join(juego, 'escenas', 'E.js'), 'crearControles(this)\ncrearHud(this)\nrepartirYColocar(this, {})\ndarVida(this, x)\nambiente(this, {})\ncrearCriatura(this, "criatura-llama")\n')
  assert.doesNotMatch((await revisarCodigo(juego)).motivos.join(' | '), /criaturas animadas/)
  await writeFile(path.join(juego, 'escenas', 'E.js'), 'crearControles(this)\ncrearHud(this)\nrepartirYColocar(this, {})\ndarVida(this, x)\nambiente(this, {})\n')
  const ajeno = (await revisarCodigo(juego)).motivos.join(' | ')
  assert.doesNotMatch(ajeno, /no usa/)
  await writeFile(path.join(juego, 'escenas', 'E.js'), 'crearControles(this)\ncrearHud(this)\nrepartirYColocar(this, {})\ndarVida(this, x)\nambiente(this, {})\nthis.cameras.main.setZoom(2)\n')
  assert.match((await revisarCodigo(juego)).motivos.join(' | '), /usa zoom de cámara/)
  // El truco que dejó un juego reducido a una tira de 350 px y con los botones del kit encimados.
  await writeFile(path.join(juego, 'escenas', 'E.js'), 'crearControles(this)\ncrearHud(this)\nrepartirYColocar(this, {})\ndarVida(this, x)\nambiente(this, {})\n' +
    'this.cameras.main.setViewport(0, 170, 1280, 350)\nthis.camaraHud = this.cameras.add(0, 0, 1280, 720)\n' +
    'const interfaz = this.children.list.filter((p) => !mundo.includes(p))\nfor (const o of interfaz) { if (o.type === "Text") o.setFontSize(48) }\n')
  const truco = (await revisarCodigo(juego)).motivos.join(' | ')
  assert.match(truco, /recorta la cámara/)
  assert.match(truco, /cambia el tamaño de todos los textos/)
  assert.match(ajeno, /juego\/index\.html no debe estar/)
  assert.match(ajeno, /juego\/kit no debe estar/)
  await rm(carpeta, { recursive: true })
})

test('la búsqueda del cuy no confunde «cuyo» ni «cuya»', () => {
  for (const texto of ['el cuy', 'cuyAnimado', 'paso_cuy', 'CUY']) assert.equal(nombraAlCuy(texto), true, texto)
  for (const texto of ['cuyo nombre', 'cuya forma', 'cuyos', 'el protagonista']) assert.equal(nombraAlCuy(texto), false, texto)
})

test('la búsqueda del cuy admite patrones de validación y detecta menciones fuera de ellos', () => {
  const validar = 'if (/(^|[^a-záéíóúñ])(cuy|mal|perdiste)([^a-záéíóúñ]|$)/i.test(frase)) errores.push("Palabra no permitida")'
  const prueba = 'assert.doesNotMatch(frase,/cuy|mal|error|incorrecto|perdiste/i)'
  for (const texto of [validar, prueba, String.raw`const prohibidas = /["'/]cuy\/mal/i`]) {
    assert.equal(nombraAlCuy(texto), false, texto)
  }
  for (const texto of [validar + '\ncuyAnimado()', prueba + '; hablar("Ayuda al cuy")',
    'const texto = "La frase incluye /cuy|mal/"', 'const proporcion = alto / cuy / ancho']) {
    assert.equal(nombraAlCuy(texto), true, texto)
  }
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
  const { motivos, avisos } = await revisarCodigo(juego)
  // Cinco fallos del código, cuatro del kit (incluido el tutorial) y dos archivos obligatorios ausentes.
  // El decorado sin repartir ya no bloquea: es un aviso para el revisor (correcciones.md, 116).
  assert.equal(motivos.length, 11, motivos.join('\n'))
  assert.ok(avisos.some((aviso) => /no usa repartirYColocar ni repartirDecorado/.test(aviso)))
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

async function escenario({ entregas, respuestasSpring = [], limiteMs = 60_000, ahora, siguientes, avisos = [],
  motorInstalado = false, modeloDisponible = motorInstalado, grabar, alComprobar } = {}) {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-procesar-'))
  const trabajo = { id: randomUUID(), tipo: 'crear_juego', intentos: 1, entrada: { solicitud: { tema: 'Parejas' } } }
  const registro = { lanzados: [], grabaciones: [], resultados: [], fallos: [], consola: [], siguientes }
  const buzon = {
    resultado: async (id, cuerpo) => {
      registro.resultados.push(cuerpo)
      registro.seEntregoConVoz = existsSync(path.join(trabajos, id, 'voz', 'voz.json'))
      return respuestasSpring.shift() ?? { estado: 200, datos: {} }
    },
    fallo: async (id, motivo) => { registro.fallos.push(motivo); return { estado: 200, datos: {} } },
  }
  // Cada intento del supervisor «entrega» algo: los motivos que encontrarán las comprobaciones.
  const lanzar = async (comando) => {
    registro.lanzados.push(comando.argumentos[0])
    const entrega = entregas.shift()
    if (entrega === 'agotado') return { codigo: null, agotado: true, salida: '', errores: '' }
    if (entrega === 'negado') {
      const negado = { tool_name: 'Bash', tool_input: { command: 'cat trabajo.json' } }
      return { codigo: 0, agotado: false, salida: JSON.stringify({ result: 'FALLÓ: Bash denegado', permission_denials: [negado] }), errores: '' }
    }
    if (entrega === 'no') return { codigo: 0, agotado: false, salida: JSON.stringify({ result: 'FALLÓ: figura sagrada' }), errores: '' }
    if (entrega === 'espera') {
      registro.siguientes = ['Faltan las pruebas.']
      return { codigo: 0, agotado: false, salida: JSON.stringify({ result: 'Espero a que terminen el programador (B1) y el revisor de piezas.' }), errores: '' }
    }
    registro.siguientes = entrega
    return { codigo: 0, agotado: false, salida: JSON.stringify({ result: 'LISTO', usage: { input_tokens: 10, output_tokens: 5 }, total_cost_usd: 0.5 }), errores: '' }
  }
  const comprobar = async ({ carpeta }) => {
    await alComprobar?.()
    await writeFile(path.join(carpeta, 'juego', 'guion-ejemplo.json'), JSON.stringify({
      consigna: 'Hola.', cierre: { mensaje: 'Falla.' },
    }))
    return { motivos: registro.siguientes, avisos, paquete: { formato: 'kusi-paquete/0', trabajo: trabajo.id } }
  }
  const archivosMotor = ['python-simulado', 'referencia-simulada.wav', 'modelo.txt'].map((archivo) => path.join(trabajos, archivo))
  const [python, referencia, modelo] = archivosMotor
  if (motorInstalado) {
    await writeFile(python, 'simulado')
    await writeFile(referencia, 'simulada')
  }
  if (modeloDisponible) await writeFile(modelo, 'modelo-simulado')
  const lanzarVoz = async ({ argumentos }, { limiteMs }) => {
    registro.grabaciones.push(limiteMs)
    assert.deepEqual(registro.siguientes, [], 'El juego debe pasar antes de grabar')
    return grabar(argumentos[2])
  }
  const final = await procesarTrabajo(trabajo, {
    buzon, lanzar, comprobar, trabajos, limiteMs, ahora, registrar: (texto) => registro.consola.push(texto),
    lanzarVoz, archivosMotor,
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
  assert.deepEqual(registro.grabaciones, [])
  assert.equal(registro.seEntregoConVoz, false)
  assert.equal(evidencia.voz.estado, 'omitida')
  assert.match(evidencia.voz.motivo, /Falta el entorno del motor de voz/)
})

test('el trabajador entrega el juego sin voz grabada si falta el modelo de voz', async () => {
  const { final, registro } = await escenario({ entregas: [[]], motorInstalado: true, modeloDisponible: false })
  assert.equal(final.resultado, 'listo')
  assert.deepEqual(registro.grabaciones, [])
  assert.equal(registro.seEntregoConVoz, false)
  const { voz } = registro.resultados[0].evidencia
  assert.equal(voz.estado, 'omitida')
  assert.match(voz.motivo, /archivo del modelo de voz/)
})

test('el trabajador graba con el motor instalado después de comprobar y antes de entregar', async () => {
  const { final, registro } = await escenario({
    entregas: [['Faltan las pruebas.'], []], motorInstalado: true, limiteMs: 75 * 60 * 1000,
    async grabar(carpeta) {
      const resumen = await grabarVozKusi({
        carpeta,
        async motor({ trabajos }) {
          const fallos = []
          for (const { texto, salida } of trabajos) {
            if (texto === 'Falla.') fallos.push({ salida, motivo: 'Sin audio.' })
            else await writeFile(salida, 'audio simulado')
          }
          return { fallos }
        },
        convertir: ([origen, , , , , destino]) => copyFile(origen, destino),
        afinfo: async () => ({ stdout: 'estimated duration: 1.2 sec' }),
      })
      return { codigo: 0, salida: 'Frases cargadas.\n' + JSON.stringify(resumen) + '\n' }
    },
  })
  assert.equal(final.resultado, 'listo')
  assert.deepEqual(registro.grabaciones, [12 * 60 * 1000])
  assert.equal(registro.seEntregoConVoz, true)
  assert.deepEqual(registro.resultados[0].evidencia.voz, {
    voz: 'Kusi', estado: 'terminada', grabadas: 1, ya_estaban: 0, total: 2, para_revisar: 1, fallidas: 1,
  })
})

test('el trabajador entrega aunque falle el grabador y guarda el motivo', async () => {
  const { final, registro } = await escenario({
    entregas: [[]], motorInstalado: true,
    grabar: async () => ({ codigo: 1, errores: 'No se pudo cargar el motor.\n' }),
  })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.seEntregoConVoz, false)
  assert.deepEqual(registro.fallos, [])
  assert.deepEqual(registro.resultados[0].evidencia.voz, {
    estado: 'falló', grabadas: 0, para_revisar: 0, fallidas: 0, motivo: 'No se pudo cargar el motor.',
  })
})

test('el trabajador limita la voz al tiempo restante y entrega si la grabación se agota', async () => {
  let reloj = 0
  const limiteMs = 75 * 60 * 1000
  const { final, registro } = await escenario({
    entregas: [[]], motorInstalado: true, limiteMs, ahora: () => reloj,
    alComprobar: () => { reloj = limiteMs - 4000 },
    grabar: async () => ({ codigo: null, agotado: true }),
  })
  assert.equal(final.resultado, 'listo')
  assert.deepEqual(registro.grabaciones, [4000])
  assert.equal(registro.seEntregoConVoz, false)
  assert.match(registro.resultados[0].evidencia.voz.motivo, /superó el tiempo disponible \(4 s\)/)
})

test('el trabajador omite la voz si las comprobaciones consumieron el tiempo del trabajo', async () => {
  let reloj = 0
  const { final, registro } = await escenario({
    entregas: [[]], motorInstalado: true, limiteMs: 1000, ahora: () => reloj,
    alComprobar: () => { reloj = 1000 },
  })
  assert.equal(final.resultado, 'listo')
  assert.deepEqual(registro.grabaciones, [])
  assert.equal(registro.resultados[0].evidencia.voz.estado, 'omitida')
  assert.match(registro.resultados[0].evidencia.voz.motivo, /Se acabó el tiempo del trabajo/)
})

test('si no pasa, el supervisor recibe los motivos y corrige', async () => {
  const { final, registro } = await escenario({ entregas: [['Faltan las pruebas.'], []] })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.lanzados.length, 2)
  assert.match(registro.lanzados[1], /Corrección 1 de 2[\s\S]*- Faltan las pruebas\./)
  assert.equal(registro.resultados[0].evidencia.intentos.juego, 2)
  assert.equal(registro.resultados[0].evidencia.correcciones.length, 1)
})

test('los avisos llegan al supervisor y quedan en evidencia sin impedir la entrega', async () => {
  const avisos = ['Revisa el botón «Volver» (reglas.md, regla 14.8).']
  const { final, registro } = await escenario({ entregas: [['Faltan las pruebas.'], []], avisos })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.lanzados.length, 2)
  assert.match(registro.lanzados[1], /Pide al revisor confirmar estos avisos[\s\S]*- Revisa el botón «Volver»/)
  assert.ok(registro.consola.some((linea) => linea.includes(avisos[0])))
  assert.deepEqual(registro.resultados[0].evidencia.avisos_comprobacion, avisos)
  assert.equal(final.evidencia.correcciones.length, 1)
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

test('si se acaba el tiempo pero lo que hay pasa las comprobaciones, se entrega igual con su nota', async () => {
  const { final, registro } = await escenario({ entregas: ['agotado'], siguientes: [] })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.resultados.length, 1)
  assert.equal(registro.fallos.length, 0)
  assert.match(registro.resultados[0].evidencia.motivo, /sin su revisión final/)

  // Y si lo que hay no pasa, falla con el motivo de las comprobaciones.
  const mal = await escenario({ entregas: ['agotado'], siguientes: ['Faltan las pruebas.'] })
  assert.equal(mal.final.resultado, 'falló')
  assert.match(mal.registro.fallos[0], /Se acabó el tiempo[\s\S]*Faltan las pruebas\./)
})

test('si el supervisor termina su turno esperando en segundo plano, se le dice que no lo haga', async () => {
  const { final, registro } = await escenario({ entregas: ['espera', []] })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.lanzados.length, 2)
  assert.match(registro.lanzados[1], /Terminaste tu turno sin responder LISTO[\s\S]*Espero a que terminen el programador[\s\S]*Faltan las pruebas\./)
  // El pedido ya lo advierte, y manda la tarea larga en un archivo.
  assert.match(registro.lanzados[0], /No termines tu turno mientras esperas/)
  assert.match(registro.lanzados[0], /--tarea-archivo programador\/tarea-<n>\.md/)
})

test('si el supervisor dice que no se puede, se informa el fallo sin insistir', async () => {
  const { final, registro } = await escenario({ entregas: ['no'] })
  assert.equal(final.resultado, 'falló')
  assert.equal(registro.lanzados.length, 1)
  assert.match(registro.fallos[0], /figura sagrada/)
})

test('si el supervisor dice FALLÓ tras una negativa de permiso, se le dice qué se negó y reintenta', async () => {
  const { final, registro } = await escenario({ entregas: ['negado', []] })
  assert.equal(final.resultado, 'listo')
  assert.equal(registro.lanzados.length, 2)
  assert.match(registro.lanzados[1], /Se te negó este comando por permisos: Bash: cat trabajo\.json/)
  assert.equal(registro.fallos.length, 0)
})

test('las negativas de permiso salen del resumen del programa, una línea cada una', () => {
  const salida = JSON.stringify({ result: 'x', permission_denials: [{ tool_name: 'Bash', tool_input: { command: 'echo hola' } }] })
  assert.deepEqual(negadosDe(salida), ['Bash: echo hola'])
  assert.deepEqual(negadosDe('LISTO'), [])
  assert.deepEqual(negadosDe(JSON.stringify({ result: 'x' })), [])
})

// ---------- La biblioteca crece sola ----------

import { armarBiblioteca, huellaDe } from '../../taller/trabajador/carpeta.js'
import { revisarPiezas } from '../../taller/trabajador/comprobar.js'

test('la biblioteca trae los juegos enviados con la ruta y la huella de sus piezas aprobadas', async () => {
  const trabajos = await mkdtemp(path.join(tmpdir(), 'kusi-biblioteca-'))
  const enviado = randomUUID()
  await mkdir(path.join(trabajos, enviado, 'juego'), { recursive: true })
  await mkdir(path.join(trabajos, enviado, 'piezas'), { recursive: true })
  await writeFile(path.join(trabajos, enviado, 'juego', 'juego.js'), 'export default {}\n')
  await copyFile(PAPA, path.join(trabajos, enviado, 'piezas', 'olla.png'))
  const borrado = randomUUID()

  const biblioteca = await armarBiblioteca({ trabajos, enviados: [
    { trabajo: enviado, familia: 'memoria', titulo: 'La memoria', piezas: [{ id: 'olla', tipo: 'objeto' }, { id: 'no-existe', tipo: 'objeto' }, { id: '../cuy', tipo: 'objeto' }] },
    { trabajo: borrado, familia: 'otra', piezas: [] },
    { trabajo: '../../kit', familia: 'mala', piezas: [] },
  ] })
  assert.deepEqual(biblioteca.ejemplos.map((juego) => juego.familia), ['laberinto'])
  assert.equal(biblioteca.taller.length, 1)
  assert.equal(biblioteca.taller[0].familia, 'memoria')
  assert.deepEqual(biblioteca.piezas_aprobadas.map((pieza) => pieza.id), ['olla'])
  assert.equal(biblioteca.piezas_aprobadas[0].sha256, await huellaDe(path.join(trabajos, enviado, 'piezas', 'olla.png')))

  // Un trabajo nuevo que copia esa pieza: no necesita revisión ni se reporta como nueva.
  const nuevo = { id: randomUUID(), tipo: 'crear_juego', intentos: 1, entrada: {} }
  const { carpeta } = await prepararCarpeta(nuevo, { trabajos, biblioteca })
  await copyFile(PAPA, path.join(carpeta, 'piezas', 'olla-reusada.png'))
  await copyFile(new URL('../../kit/recursos/dibujos/objetos/fresa.png', import.meta.url), path.join(carpeta, 'piezas', 'fresa-nueva.png'))
  const motivos = await revisarPiezas(carpeta)
  assert.equal(motivos.length, 1, motivos.join('\n'))
  assert.match(motivos[0], /«fresa-nueva» necesita la aprobación del revisor/)
  assert.deepEqual(await piezasNuevas(carpeta), [{ id: 'fresa-nueva', tipo: 'objeto' }])
  await rm(trabajos, { recursive: true })
})
