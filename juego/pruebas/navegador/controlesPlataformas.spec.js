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
const botonSaltar = (pagina) => pagina.evaluate(() =>
  window.__kusiPantalla().cajas.find((caja) => caja.id.startsWith('boton-saltar (')))

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

  // El dibujo se achica al presionar, pero la zona de toque mantiene su radio.
  const dibujo = await botonSaltar(pagina)
  const etiquetas = await pagina.evaluate(() => window.__kusiPantalla().cajas
    .filter((caja) => ['Saltar', 'Ayuda'].includes(caja.texto)))
  const saltar = etiquetas.find((caja) => caja.texto === 'Saltar')
  expect(saltar.letra).toEqual(etiquetas.find((caja) => caja.texto === 'Ayuda').letra)
  expect(saltar.y + saltar.alto / 2).toBeGreaterThan(dibujo.y + dibujo.alto)
  const { x, y, radio } = controles.saltar
  expect(radio).toBe(62)
  await pagina.mouse.click(x + radio + 2, y)
  await pagina.waitForTimeout(150)
  expect((await estado(pagina)).enSuelo).toBe(true)

  const antes = await estado(pagina)
  await pagina.mouse.move(x + radio - 2, y)
  await pagina.mouse.down()
  await expect.poll(async () => (await botonSaltar(pagina)).ancho / dibujo.ancho).toBeCloseTo(0.92)
  await pagina.waitForFunction((altura) => window.__plataformas.y < altura - 10, antes.y)
  const salto = await estado(pagina)
  expect(salto.enSuelo).toBe(false)
  expect(salto.y).toBeLessThan(antes.y - 10)
  await pagina.mouse.up()
  await expect.poll(async () => (await botonSaltar(pagina)).ancho).toBeCloseTo(dibujo.ancho)
  expect(errores).toEqual([])
})

test('si no carga el dibujo, el círculo de respaldo permite saltar', async ({ page: pagina }) => {
  await pagina.route('**/dibujos/interfaz/boton-saltar.png', (ruta) => ruta.fulfill({ status: 404 }))
  await abrir(pagina)
  expect(await botonSaltar(pagina)).toBeUndefined()
  const inicio = await estado(pagina)
  const { x, y } = inicio.controles.saltar
  const circulo = await pagina.evaluate(({ x, y }) => window.__kusiPantalla().cajas.some((caja) =>
    caja.hud && caja.id.startsWith('Arc (') && caja.x + caja.ancho / 2 === x && caja.y + caja.alto / 2 === y), { x, y })
  expect(circulo).toBe(true)
  await pagina.mouse.click(x, y)
  await pagina.waitForFunction((altura) => window.__plataformas.y < altura - 10, inicio.y)
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
