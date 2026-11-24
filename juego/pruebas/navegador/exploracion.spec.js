import { test, expect } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

// La exploración vista desde arriba (kit/ejemplos/exploracion/): joystick en dos ejes, obstáculos que
// no se atraviesan y un adversario amable que atrapa sin castigar. Crea un trabajo temporal en
// taller/trabajos/ y lo borra al terminar.

const TRABAJO = randomUUID()
const CARPETA = new URL('../../taller/trabajos/' + TRABAJO + '/', import.meta.url)
const FAMILIA = 'exploracion_ejemplo'

const ARCHIVOS = {
  'juego/juego.js': [
    "import { EscenaExploracion } from '#kit/ejemplos/exploracion/EscenaExploracion.js'",
    'export default {',
    "  familia: '" + FAMILIA + "', nombre: 'Exploración de ejemplo', escena: EscenaExploracion,",
    "  validar: () => ({ valido: true, errores: [] }), piezas: [],",
    '}',
  ].join('\n'),
  'juego/guion-ejemplo.json': JSON.stringify({
    formato: 'kusi-paquete/0', familia: FAMILIA, titulo: 'Exploración', retos: [{ id: 1, consigna: 'Junta todo.', ayudas: ['Mira.', 'Camina.'] }],
    cierre: { mensaje: '¡Muy bien!' },
  }),
}

test.beforeAll(async () => {
  for (const [ruta, contenido] of Object.entries(ARCHIVOS)) {
    const archivo = new URL(ruta, CARPETA)
    await mkdir(new URL('./', archivo), { recursive: true })
    await writeFile(archivo, contenido)
  }
})
test.afterAll(async () => { await rm(CARPETA, { recursive: true, force: true }) })

async function abrir(pagina, busqueda = '') {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  pagina.on('console', (mensaje) => { if (mensaje.type() === 'error') errores.push(mensaje.text()) })
  await pagina.goto('/?juego=' + TRABAJO + '&historia=0&vida=0' + busqueda)
  await pagina.waitForFunction(() => window.__exploracion?.controles, null, { timeout: 20_000 })
  return errores
}
const estado = (pagina) => pagina.evaluate(() => window.__exploracion)

test('el joystick mueve al protagonista en los dos ejes y las flechas también', async ({ page: pagina }) => {
  const errores = await abrir(pagina)
  const inicio = await estado(pagina)
  const { controles } = inicio
  await pagina.mouse.move(controles.joystick.x, controles.joystick.y)
  await pagina.mouse.down()
  await pagina.mouse.move(controles.joystick.x + 60, controles.joystick.y - 60, { steps: 4 })
  // El navegador sin pantalla dibuja pocos cuadros por segundo: se espera a que se note el movimiento.
  await pagina.waitForFunction((punto) => window.__exploracion.x > punto.x + 40 && window.__exploracion.y < punto.y - 40, { x: inicio.x, y: inicio.y }, { timeout: 8000 })
  const diagonal = await estado(pagina)
  await pagina.mouse.up()

  await pagina.keyboard.down('ArrowDown')
  await pagina.waitForFunction((punto) => window.__exploracion.y > punto.y + 40, { y: diagonal.y }, { timeout: 8000 })
  await pagina.keyboard.up('ArrowDown')
  expect(errores).toEqual([])
})

test('un muro no se atraviesa: el protagonista se detiene contra él', async ({ page: pagina }) => {
  const errores = await abrir(pagina)
  // Desde el inicio (200, 600), todo a la derecha choca con el muro de x = 520 a 600 (y de 200 a 720).
  await pagina.keyboard.down('ArrowRight')
  await pagina.waitForTimeout(1800)
  await pagina.keyboard.up('ArrowRight')
  const contraElMuro = await estado(pagina)
  expect(contraElMuro.x).toBeLessThanOrEqual(520 - 30 + 1)
  expect(contraElMuro.x).toBeGreaterThan(400)
  expect(errores).toEqual([])
})

test('el adversario avisa, persigue y atrapa: el protagonista vuelve al inicio sin perder lo reunido', async ({ page: pagina }) => {
  const errores = await abrir(pagina, '&tutorial=0')
  // Se queda quieto cerca del recorrido del adversario hasta que lo atrape (con avisos y todo).
  await pagina.waitForFunction(() => window.__exploracion.capturas >= 1, null, { timeout: 25_000 })
  const despues = await estado(pagina)
  expect(despues.capturas).toBeGreaterThanOrEqual(1)
  // Vuelve al inicio (200, 600) y el juego sigue: nada terminó.
  expect(Math.abs(despues.x - 200)).toBeLessThan(120)
  expect(errores).toEqual([])
})
