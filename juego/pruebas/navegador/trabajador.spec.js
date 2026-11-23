import { test, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// El trabajador de punta a punta: un Spring falso con un trabajo en su buzón, el
// trabajador de verdad (--una-vez), un supervisor de prueba sin IA que deja un juego
// mínimo, y las comprobaciones reales (node --test y el juego abierto en un navegador).

const JUEGO = fileURLToPath(new URL('../../', import.meta.url))
const SUPERVISOR = fileURLToPath(new URL('../fixtures/supervisorDePrueba.mjs', import.meta.url))
const CLAVE = 'clave-del-taller-de-prueba'
const creados = []

test.afterAll(async () => {
  for (const carpeta of creados) await rm(carpeta, { recursive: true, force: true })
})

// Un buzón de Spring de mentira: entrega un trabajo una vez y guarda lo que recibe.
async function springFalso(trabajo) {
  const recibido = { resultados: [], fallos: [], claves: new Set() }
  let entregado = false
  const servidor = createServer((pedido, respuesta) => {
    let cuerpo = ''
    pedido.on('data', (parte) => { cuerpo += parte })
    pedido.on('end', () => {
      recibido.claves.add(pedido.headers['x-taller-clave'])
      if (pedido.headers['x-taller-clave'] !== CLAVE) return responder(respuesta, 403, { mensaje: 'Servicio no autorizado.' })
      if (pedido.url.endsWith('/siguiente')) {
        if (entregado) return responder(respuesta, 204)
        entregado = true
        return responder(respuesta, 200, { trabajo })
      }
      if (pedido.url.endsWith('/resultado')) { recibido.resultados.push(JSON.parse(cuerpo)); return responder(respuesta, 200, {}) }
      if (pedido.url.endsWith('/fallo')) { recibido.fallos.push(JSON.parse(cuerpo).motivo); return responder(respuesta, 200, {}) }
      responder(respuesta, 404, {})
    })
  })
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo))
  return { recibido, url: 'http://127.0.0.1:' + servidor.address().port, cerrar: () => servidor.close() }
}

function responder(respuesta, estado, datos) {
  respuesta.writeHead(estado, { 'Content-Type': 'application/json' })
  respuesta.end(datos === undefined ? '' : JSON.stringify(datos))
}

// Corre el trabajador una vez, con un .env y un archivo de roles de prueba.
async function correrTrabajador({ modo, limiteMs = 60_000 }) {
  const id = randomUUID()
  creados.push(path.join(JUEGO, 'taller', 'trabajos', id))
  const spring = await springFalso({ id, tipo: 'crear_juego', intentos: 1, entrada: { solicitud: { tema: 'Parejas' }, propuesta: { objetivo: 'Juntar parejas' } } })
  const auxiliar = await mkdtemp(path.join(tmpdir(), 'kusi-trabajador-'))
  creados.push(auxiliar)
  await writeFile(path.join(auxiliar, '.env'), 'EDU_API_URL=' + spring.url + '\nTALLER_CLAVE=' + CLAVE + '\n')
  await writeFile(path.join(auxiliar, 'roles.json'), JSON.stringify({
    supervisor: { programa: process.execPath, argumentos: [SUPERVISOR, '{carpeta}', modo, '{pedido}'] },
  }))
  const proceso = spawn(process.execPath, ['taller/trabajador.js', '--una-vez'], {
    cwd: JUEGO,
    env: { ...process.env, TALLER_ENV: path.join(auxiliar, '.env'), TALLER_ROLES: path.join(auxiliar, 'roles.json'), TALLER_LIMITE_MS: String(limiteMs) },
  })
  let consola = ''
  proceso.stdout.on('data', (parte) => { consola += parte })
  proceso.stderr.on('data', (parte) => { consola += parte })
  const codigo = await new Promise((listo) => proceso.on('close', listo))
  spring.cerrar()
  return { id, codigo, consola, recibido: spring.recibido, carpeta: path.join(JUEGO, 'taller', 'trabajos', id) }
}

test('toma el trabajo, el supervisor hace el juego, se comprueba y se entrega a Spring', async () => {
  const { id, codigo, consola, recibido, carpeta } = await correrTrabajador({ modo: 'bien' })
  expect(codigo, consola).toBe(0)
  expect(recibido.fallos).toEqual([])
  expect(recibido.resultados).toHaveLength(1)
  const { paquete, piezas, evidencia } = recibido.resultados[0]
  expect(paquete).toMatchObject({ formato: 'kusi-paquete/0', familia: 'parejas_prueba', trabajo: id })
  expect(piezas).toEqual([{ id: 'olla-de-prueba', tipo: 'objeto' }])
  expect(evidencia).toMatchObject({ trabajo: id, familia: 'parejas_prueba', resultado: 'listo', intentos: { juego: 1, piezas: { 'olla-de-prueba': 1 } } })
  expect(evidencia.pasos[0]).toMatchObject({ rol: 'supervisor', tokens_entrada: 1200, tokens_salida: 300, costo_estimado_usd: 0.01 })
  // La carpeta tiene lo que llegó del buzón, la biblioteca y la evidencia.
  for (const archivo of ['trabajo.json', 'biblioteca.json', 'evidencia.json', 'plan.md', 'juego/juego.js']) {
    expect(existsSync(path.join(carpeta, archivo)), archivo).toBe(true)
  }
  expect(JSON.parse(await readFile(path.join(carpeta, 'biblioteca.json'), 'utf8')).ejemplos.map((juego) => juego.familia)).toEqual(['laberinto'])
  // La clave viaja en el encabezado, pero nunca sale en la consola.
  expect([...recibido.claves]).toEqual([CLAVE])
  expect(consola).not.toContain(CLAVE)
  expect(consola).toContain('entregado a Spring')
})

test('si la primera entrega no pasa, el supervisor recibe el motivo y la corrige', async () => {
  const { codigo, consola, recibido } = await correrTrabajador({ modo: 'corrige' })
  expect(codigo, consola).toBe(0)
  expect(recibido.resultados).toHaveLength(1)
  const { evidencia } = recibido.resultados[0]
  expect(evidencia.intentos.juego).toBe(2)
  expect(evidencia.correcciones).toHaveLength(1)
  expect(evidencia.correcciones[0].motivo).toContain('Faltan las pruebas')
})

test('si nunca pasa, después de 2 correcciones se informa el fallo', async () => {
  const { codigo, consola, recibido } = await correrTrabajador({ modo: 'roto' })
  expect(codigo, consola).toBe(0)
  expect(recibido.resultados).toEqual([])
  expect(recibido.fallos).toHaveLength(1)
  expect(recibido.fallos[0]).toMatch(/después de 2 correcciones: Faltan las pruebas/)
  expect(consola.match(/el supervisor empieza el intento/g)).toHaveLength(3)
})

test('no entrega un juego que muestra la consigna pero sigue mudo después del toque', async () => {
  const { codigo, consola, recibido } = await correrTrabajador({ modo: 'mudo' })
  expect(codigo, consola).toBe(0)
  expect(recibido.resultados).toEqual([])
  expect(recibido.fallos).toHaveLength(1)
  expect(recibido.fallos[0]).toMatch(/No apareció «\[Kusi\] voz:» después de tocar la pantalla.*reglas\.md, regla 14\.1/)
})

test('recoge errores de consola y de voz al abrir y al tocar con los efectos encendidos', async () => {
  const { codigo, consola, recibido } = await correrTrabajador({ modo: 'errores-con-vida' })
  expect(codigo, consola).toBe(0)
  expect(recibido.resultados).toEqual([])
  expect(recibido.fallos).toHaveLength(1)
  const [motivo] = recibido.fallos
  expect(motivo).toMatch(/con efectos \(console\.error\).*Error de consola al abrir.*reglas\.md, regla 14\.6/)
  expect(motivo).toMatch(/con efectos \(pageerror\).*Error del juego después del toque.*reglas\.md, regla 14\.6/)
  expect(motivo).toMatch(/\[Kusi\] voz sin sonido: prueba.*reglas\.md, regla 14\.1/)
  expect(motivo).toMatch(/\[Kusi\] voz trabada: prueba.*reglas\.md, regla 14\.1/)
})

test('un supervisor que no termina se corta al acabarse el tiempo', async () => {
  const inicio = Date.now()
  const { codigo, consola, recibido } = await correrTrabajador({ modo: 'lento', limiteMs: 3000 })
  expect(codigo, consola).toBe(0)
  expect(Date.now() - inicio).toBeLessThan(30_000)
  expect(recibido.fallos).toHaveLength(1)
  expect(recibido.fallos[0]).toMatch(/Se acabó el tiempo/)
})

for (const modo of ['sin-revision', 'revision-vieja']) {
  test('no entrega una pieza ' + (modo === 'sin-revision' ? 'sin revisión visual' : 'con revisión de otro archivo'), async () => {
    const { codigo, consola, recibido } = await correrTrabajador({ modo })
    expect(codigo, consola).toBe(0)
    expect(recibido.resultados).toEqual([])
    expect(recibido.fallos).toHaveLength(1)
    expect(recibido.fallos[0]).toContain('aprobación del revisor para su archivo final')
    expect(consola.match(/el supervisor empieza el intento/g)).toHaveLength(3)
  })
}
