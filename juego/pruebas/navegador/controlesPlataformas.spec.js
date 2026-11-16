import { test, expect } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

// Los controles y la interfaz comunes del kit, con el modelo de plataformas
// (kit/ejemplos/plataformas/): se maneja con el joystick y con un botón de saltar, no con clics a
// «ir a…». La prueba crea un trabajo temporal en taller/trabajos/ y lo borra al terminar.

const TRABAJO = randomUUID()
const CARPETA = new URL('../../taller/trabajos/' + TRABAJO + '/', import.meta.url)
const FAMILIA = 'plataformas_ejemplo'

const ARCHIVOS = {
  'juego/juego.js': [
    "import { EscenaPlataformas } from '#kit/ejemplos/plataformas/EscenaPlataformas.js'",
    'export default {',
    "  familia: '" + FAMILIA + "', nombre: 'Plataformas de ejemplo', escena: EscenaPlataformas,",
    "  validar: () => ({ valido: true, errores: [] }), piezas: [],",
    '}',
  ].join('\n'),
  'juego/guion-ejemplo.json': JSON.stringify({
    formato: 'kusi-paquete/0', familia: FAMILIA, titulo: 'Plataformas', retos: [{ id: 1, consigna: 'Cruza.', ayudas: ['Salta.', 'Junta todo.'] }],
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

async function abrir(pagina) {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  pagina.on('console', (mensaje) => { if (mensaje.type() === 'error') errores.push(mensaje.text()) })
  await pagina.goto('/?juego=' + TRABAJO + '&historia=0')
  await pagina.waitForFunction(() => window.__plataformas?.enSuelo === true, null, { timeout: 20_000 })
  return errores
}
const estado = (pagina) => pagina.evaluate(() => window.__plataformas)

test('las flechas mueven al protagonista y la barra espaciadora lo hace saltar', async ({ page: pagina }) => {
  const errores = await abrir(pagina)
  const inicio = await estado(pagina)
  await pagina.keyboard.down('ArrowRight')
  await pagina.waitForTimeout(700)
  await pagina.keyboard.up('ArrowRight')
  expect((await estado(pagina)).x).toBeGreaterThan(inicio.x + 100)

  await pagina.keyboard.press('Space')
  await pagina.waitForTimeout(150)
  const enElAire = await estado(pagina)
  expect(enElAire.enSuelo).toBe(false)
  expect(enElAire.y).toBeLessThan(inicio.y - 10)
  await pagina.waitForFunction(() => window.__plataformas.enSuelo === true)
  expect(errores).toEqual([])
})

test('el joystick en pantalla mueve al protagonista y el botón de saltar lo hace saltar', async ({ page: pagina }) => {
  const errores = await abrir(pagina)
  const { controles } = await estado(pagina)
  const inicio = await estado(pagina)

  // Arrastra la perilla hacia la derecha, dentro del joystick.
  await pagina.mouse.move(controles.joystick.x, controles.joystick.y)
  await pagina.mouse.down()
  await pagina.mouse.move(controles.joystick.x + 70, controles.joystick.y, { steps: 4 })
  await pagina.waitForTimeout(600)
  expect((await estado(pagina)).x).toBeGreaterThan(inicio.x + 80)
  await pagina.mouse.up()

  // Toca el botón de saltar.
  const antes = await estado(pagina)
  await pagina.mouse.click(controles.saltar.x, controles.saltar.y)
  await pagina.waitForTimeout(150)
  const salto = await estado(pagina)
  expect(salto.enSuelo).toBe(false)
  expect(salto.y).toBeLessThan(antes.y - 10)
  expect(errores).toEqual([])
})

test('con un salto largo cruza el hueco hasta la plataforma siguiente y reúne lo que hay en ella', async ({ page: pagina }) => {
  const errores = await abrir(pagina)
  // Camina hasta el borde, salta con carrerilla y sigue hacia la derecha.
  await pagina.keyboard.down('ArrowRight')
  await pagina.waitForFunction(() => window.__plataformas.x > 330, null, { timeout: 8000 })
  await pagina.keyboard.press('Space')
  await pagina.waitForTimeout(1400)
  await pagina.keyboard.up('ArrowRight')
  const final = await estado(pagina)
  expect(final.x).toBeGreaterThan(420)
  expect(final.reunidas).toBeGreaterThanOrEqual(1)
  expect(errores).toEqual([])
})
