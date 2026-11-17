import { test, expect } from '@playwright/test'
import { mkdir, writeFile, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { guardarPng } from '../../kit/herramientas/animaciones/png_rgba.mjs'

// La criatura animada (kit/reproductor/dibujos/criaturaAnimada.js): una tira de 3 cuadros de un personaje o enemigo
// nuevo se reproduce en el ciclo 0, 1, 2, 1, se voltea al ir a la izquierda y, si falta la pieza, se ve una figura
// simple sin romper el juego. Crea un trabajo temporal en taller/trabajos/ y lo borra al terminar.

const TRABAJO = randomUUID()
const CARPETA = new URL('../../taller/trabajos/' + TRABAJO + '/', import.meta.url)
const FAMILIA = 'criatura_prueba'

// Una hoja de 768 × 256 con un cuerpo distinto en cada cuadro (de otro color y otro ancho).
function hojaDePrueba(ruta) {
  const datos = Buffer.alloc(768 * 256 * 4)
  const colores = [[220, 80, 60], [60, 180, 90], [70, 110, 220]]
  for (let c = 0; c < 3; c += 1) {
    for (let y = 100; y <= 244; y += 1) {
      for (let x = 0; x < 256; x += 1) {
        const dx = (x - 128) / (50 + c * 15)
        const dy = (y - 172) / 72
        if (dx * dx + dy * dy <= 1) datos.set([...colores[c], 255], (y * 768 + c * 256 + x) * 4)
      }
    }
  }
  guardarPng(ruta, { ancho: 768, alto: 256, datos })
}

const ESCENA = `
import * as Phaser from 'phaser'
import { crearCriatura } from '#kit/reproductor/dibujos/criaturaAnimada.js'
export class EscenaCriaturaPrueba extends Phaser.Scene {
  constructor() { super('criatura-prueba') }
  create() {
    this.cameras.main.setBackgroundColor('#f6dcae')
    this.criatura = crearCriatura(this, 'criatura-prueba', { alto: 150 })
    this.falta = crearCriatura(this, 'criatura-que-no-existe', { alto: 100 })
    this.falta.setPosition(200, 300)
    this.criatura.setPosition(400, 400)
    this.mira = 1
    this.vistos = new Set()
  }
  update(_t, delta) {
    const t = this.time.now
    const caminando = (t % 3000) < 2000
    // Va y viene por la pantalla: a la derecha y luego a la izquierda.
    this.mira = (Math.floor(t / 3000) % 2 === 0) ? 1 : -1
    if (caminando) this.criatura.x += this.mira * 0.15 * delta
    this.criatura.animar(caminando, this.mira, t)
    this.falta.animar(caminando, this.mira, t)
    this.vistos.add(String(this.criatura.frame.name))
    window.__criatura = {
      cuadro: String(this.criatura.frame.name), vistos: [...this.vistos].sort(), flipX: this.criatura.flipX, caminando,
      alto: Math.round(this.criatura.displayHeight), tipoFalta: this.falta.type,
    }
  }
}
`

const ARCHIVOS = {
  'juego/juego.js': [
    "import { EscenaCriaturaPrueba } from './E.js'",
    'export default {',
    "  familia: '" + FAMILIA + "', nombre: 'Criatura de prueba', escena: EscenaCriaturaPrueba,",
    "  validar: () => ({ valido: true, errores: [] }), piezas: ['criatura-prueba'],",
    '}',
  ].join('\n'),
  'juego/E.js': ESCENA,
  'juego/guion-ejemplo.json': JSON.stringify({
    formato: 'kusi-paquete/0', familia: FAMILIA, titulo: 'Criatura', retos: [{ id: 1, consigna: 'Mira.', ayudas: ['Mira.', 'Mira.'] }],
    cierre: { mensaje: '¡Muy bien!' },
  }),
}

test.beforeAll(async () => {
  for (const [ruta, contenido] of Object.entries(ARCHIVOS)) {
    const archivo = new URL(ruta, CARPETA)
    await mkdir(new URL('./', archivo), { recursive: true })
    await writeFile(archivo, contenido)
  }
  await mkdir(new URL('piezas/', CARPETA), { recursive: true })
  hojaDePrueba(new URL('piezas/criatura-prueba.png', CARPETA).pathname)
})
test.afterAll(async () => { await rm(CARPETA, { recursive: true, force: true }) })

test('la criatura recorre sus 3 cuadros, se voltea al ir a la izquierda y la pieza que falta no rompe nada', async ({ page: pagina }) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  pagina.on('console', (mensaje) => { if (mensaje.type() === 'error') errores.push(mensaje.text()) })
  await pagina.goto('/?juego=' + TRABAJO + '&historia=0&vida=0')
  await pagina.waitForFunction(() => window.__criatura, null, { timeout: 20_000 })
  // Pasan los 3 cuadros de la tira.
  await pagina.waitForFunction(() => window.__criatura.vistos.length === 3, null, { timeout: 15_000 })
  expect((await pagina.evaluate(() => window.__criatura)).vistos).toEqual(['0', '1', '2'])
  // Mide lo que se pidió (150 px de lado mayor, con el lado mayor de 200 px dentro del cuadro de 256).
  const { alto } = await pagina.evaluate(() => window.__criatura)
  expect(alto).toBe(Math.round(256 * 150 / 200))
  // Al ir a la izquierda se voltea; a la derecha, no.
  await pagina.waitForFunction(() => window.__criatura.flipX === true, null, { timeout: 15_000 })
  await pagina.waitForFunction(() => window.__criatura.flipX === false, null, { timeout: 15_000 })
  // La criatura sin pieza es una figura simple (un contenedor), no un error.
  expect((await pagina.evaluate(() => window.__criatura)).tipoFalta).toBe('Container')
  expect(errores.filter((texto) => !/Falta la pieza|404|Failed to load resource/.test(texto))).toEqual([])
})
