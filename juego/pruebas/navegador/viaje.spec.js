import { test, expect } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

// El viaje en vehículo (kit/ejemplos/viaje/): se maneja un barco con el joystick, se detiene en el puerto para
// bajar, se explora la isla a pie y se detiene en la zona del barco para volver a subir. Crea un trabajo temporal
// en taller/trabajos/ y lo borra al terminar.

const TRABAJO = randomUUID()
const CARPETA = new URL('../../taller/trabajos/' + TRABAJO + '/', import.meta.url)
const FAMILIA = 'viaje_ejemplo'

const ARCHIVOS = {
  'juego/juego.js': [
    "import { EscenaViaje } from '#kit/ejemplos/viaje/EscenaViaje.js'",
    'export default {',
    "  familia: '" + FAMILIA + "', nombre: 'Viaje de ejemplo', escena: EscenaViaje,",
    "  validar: () => ({ valido: true, errores: [] }), piezas: [],",
    '}',
  ].join('\n'),
  'juego/guion-ejemplo.json': JSON.stringify({
    formato: 'kusi-paquete/0', familia: FAMILIA, titulo: 'Viaje', retos: [{ id: 1, consigna: 'Viaja.', ayudas: ['Mira.', 'Maneja.'] }],
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
  await pagina.goto('/?juego=' + TRABAJO + '&historia=0&vida=0')
  await pagina.waitForFunction(() => window.__viaje?.controles, null, { timeout: 20_000 })
  return errores
}
const estado = (pagina) => pagina.evaluate(() => window.__viaje)
const esperar = (pagina, condicion, argumento = null, tiempo = 20_000) => pagina.waitForFunction(condicion, argumento, { timeout: tiempo })

test('el joystick maneja el barco: arranca, avanza y frena solo al soltar', async ({ page: pagina }) => {
  const errores = await abrir(pagina)
  const inicio = await estado(pagina)
  expect(inicio.modo).toBe('vehiculo')
  const { controles } = inicio
  await pagina.mouse.move(controles.joystick.x, controles.joystick.y)
  await pagina.mouse.down()
  await pagina.mouse.move(controles.joystick.x + 70, controles.joystick.y, { steps: 4 })
  await esperar(pagina, (x) => window.__viaje.x > x + 60 && window.__viaje.velocidad > 40, inicio.x)
  await pagina.mouse.up()
  await esperar(pagina, () => window.__viaje.velocidad === 0)
  expect(errores).toEqual([])
})

test('llega al puerto, se detiene para bajar, explora la isla a pie y vuelve al barco', async ({ page: pagina }) => {
  test.setTimeout(90_000)
  const errores = await abrir(pagina)

  // Navegando hasta el puerto de la isla A: no baja mientras pasa de largo, solo al detenerse en él.
  await pagina.keyboard.down('ArrowRight')
  await esperar(pagina, () => window.__viaje.x >= 760)
  await pagina.keyboard.up('ArrowRight')
  await esperar(pagina, () => window.__viaje.modo === 'pie', null, 25_000)
  const abajo = await estado(pagina)
  expect(abajo.isla).toBe('a')

  // A pie: camina por la isla (un lugar grande) hasta la primera cosa y la recoge.
  await pagina.keyboard.down('ArrowRight')
  await esperar(pagina, () => window.__viaje.x >= 1400)
  await pagina.keyboard.up('ArrowRight')
  await pagina.keyboard.down('ArrowUp')
  await esperar(pagina, () => window.__viaje.reunidas >= 1)
  await pagina.keyboard.up('ArrowUp')

  // Vuelve a la zona del barco y se detiene en ella para subir.
  await pagina.keyboard.down('ArrowDown')
  await esperar(pagina, () => window.__viaje.y >= 600)
  await pagina.keyboard.up('ArrowDown')
  await pagina.keyboard.down('ArrowLeft')
  await esperar(pagina, () => window.__viaje.x <= 1120)
  await pagina.keyboard.up('ArrowLeft')
  await esperar(pagina, () => window.__viaje.modo === 'vehiculo', null, 25_000)
  expect((await estado(pagina)).reunidas).toBe(1)
  expect(errores).toEqual([])
})

test('pasar a toda velocidad por el puerto no cuenta: el barco sigue y no baja', async ({ page: pagina }) => {
  const errores = await abrir(pagina)
  await pagina.keyboard.down('ArrowRight')
  await esperar(pagina, () => window.__viaje.x >= 900, null, 25_000)
  expect((await estado(pagina)).modo).toBe('vehiculo')
  await pagina.keyboard.up('ArrowRight')
  expect(errores).toEqual([])
})
