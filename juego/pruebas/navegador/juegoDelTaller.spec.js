import { test, expect } from '@playwright/test'
import { mkdir, writeFile, copyFile, rm } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

// El reproductor abre un juego del taller por su id, sin reiniciar Vite: la prueba crea
// una ficha mínima (no es un juego de la biblioteca) en una carpeta temporal de
// taller/trabajos/ cuando Vite ya está corriendo, la abre y la borra al terminar.

const TRABAJO = randomUUID()
const CARPETA = new URL('../../taller/trabajos/' + TRABAJO + '/', import.meta.url)
const FAMILIA = 'prueba_taller'

const ARCHIVOS = {
  'juego/juego.js': [
    "import { EscenaPrueba } from './escenas/EscenaPrueba.js'",
    "import { validarPrueba } from './datos/validarPrueba.js'",
    '',
    'export default {',
    "  familia: '" + FAMILIA + "',",
    "  nombre: 'Juego de prueba del taller',",
    '  escena: EscenaPrueba,',
    '  validar: validarPrueba,',
    "  piezas: ['fresa', 'olla-de-prueba', 'pieza-que-falta'],",
    '}',
  ].join('\n'),
  // La escena pone su propia clave, como haría un programador: el reproductor la cambia.
  'juego/escenas/EscenaPrueba.js': [
    "import * as Phaser from 'phaser'",
    "import { ANCHO, ALTO, estiloTexto } from '#kit/reproductor/medidas.js'",
    "import { crearProtagonista } from '#kit/reproductor/dibujos/protagonista.js'",
    '',
    'export class EscenaPrueba extends Phaser.Scene {',
    "  constructor() { super('" + FAMILIA + "') }",
    '  init(datos) { this.datos = datos }',
    '  create() {',
    '    const reto = this.datos.paquete.retos[this.datos.indiceNivel]',
    '    this.add.text(ANCHO / 2, 80, reto.consigna, estiloTexto(32)).setOrigin(0.5)',
    '    crearProtagonista(this, { alto: 120 }).setPosition(ANCHO / 2, ALTO / 2)',
    "    this.add.image(320, 420, 'olla-de-prueba')",
    "    const claves = ['protagonista', 'kusi-animado', 'boton-ayuda', 'fresa', 'olla-de-prueba', 'pieza-que-falta']",
    '    const texturas = Object.fromEntries(claves.map((clave) => [clave, this.textures.exists(clave)]))',
    '    window.__pruebaTaller = { trabajo: this.datos.trabajo, nivel: this.datos.indiceNivel + 1, consigna: reto.consigna, texturas }',
    '  }',
    '}',
  ].join('\n'),
  'juego/datos/validarPrueba.js': [
    'export function validarPrueba(guion) {',
    '  const errores = []',
    "  if (!Array.isArray(guion?.retos) || guion.retos.length === 0) errores.push('Faltan los retos.')",
    "  if (guion?.roto) errores.push('El guion está roto a propósito.')",
    '  return { valido: errores.length === 0, errores }',
    '}',
  ].join('\n'),
  // Sin «trabajo»: con ?juego= lo pone el reproductor.
  'juego/guion-ejemplo.json': JSON.stringify({
    formato: 'kusi-paquete/0',
    familia: FAMILIA,
    titulo: 'Prueba del taller',
    retos: [
      { id: 1, consigna: 'Toca la olla.', ayudas: ['Es redonda.', 'Está a la izquierda.'] },
      { id: 2, consigna: 'Toca la olla otra vez.', ayudas: ['Sigue ahí.', 'Mira abajo.'] },
    ],
    cierre: { mensaje: '¡Muy bien!' },
  }),
}

async function crearTrabajo() {
  for (const [ruta, contenido] of Object.entries(ARCHIVOS)) {
    const archivo = new URL(ruta, CARPETA)
    await mkdir(new URL('./', archivo), { recursive: true })
    await writeFile(archivo, contenido)
  }
  // La pieza nueva del trabajo: cualquier PNG de 256 × 256 sirve para la prueba.
  await mkdir(new URL('piezas/', CARPETA), { recursive: true })
  await copyFile(new URL('../../kit/recursos/dibujos/objetos/papa.png', import.meta.url), new URL('piezas/olla-de-prueba.png', CARPETA))
}

test.beforeAll(async ({ request }) => {
  // Vite ya responde antes de que exista la carpeta: el trabajo se crea «después de arrancar».
  expect((await request.get('/')).ok()).toBe(true)
  await crearTrabajo()
})

test.afterAll(async () => {
  await rm(CARPETA, { recursive: true, force: true })
})

// Guarda lo que el juego le avisa a la página (listo, cargado, error).
async function escucharAvisos(pagina) {
  await pagina.addInitScript(() => {
    window.__avisosDelJuego = []
    window.addEventListener('message', (evento) => {
      if (['listo', 'cargado', 'error'].includes(evento.data?.tipo)) window.__avisosDelJuego.push(evento.data)
    })
  })
}

const avisosDePartida = (pagina) => pagina.evaluate(() => window.kusi.avisos.map(({ tipo, familia, nivel, motivo }) =>
  ({ tipo, familia, nivel, motivo })))

async function esperarFallo(pagina) {
  await pagina.waitForFunction(() => window.kusi?.avisos?.some((aviso) => aviso.tipo === 'fallo'))
  return (await avisosDePartida(pagina)).find((aviso) => aviso.tipo === 'fallo').motivo
}

test('?juego=<id> abre el juego del taller con su escena, sus piezas y el protagonista', async ({ page: pagina }) => {
  const errores = []
  const advertencias = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  pagina.on('console', (mensaje) => { if (mensaje.type() === 'warning') advertencias.push(mensaje.text()) })

  await pagina.goto('/?juego=' + TRABAJO + '&nivel=2&vida=0')
  await pagina.waitForFunction((trabajo) => window.kusi?.juego?.trabajo === trabajo, TRABAJO)

  expect(await pagina.evaluate(() => window.kusi.juego)).toEqual({ familia: FAMILIA, trabajo: TRABAJO, clave: 'taller:' + TRABAJO })
  // La escena recibió { paquete, partida, trabajo, indiceNivel } y ?nivel=2 abrió el segundo.
  // Tiene lo común, la pieza del kit, la del trabajo y una figura simple para la que falta.
  expect(await pagina.evaluate(() => window.__pruebaTaller)).toEqual({
    trabajo: TRABAJO, nivel: 2, consigna: 'Toca la olla otra vez.',
    texturas: { protagonista: true, 'kusi-animado': true, 'boton-ayuda': true, fresa: true, 'olla-de-prueba': true, 'pieza-que-falta': true },
  })
  // El aviso «listo» lo manda el reproductor cuando el juego no lo hizo.
  expect(await avisosDePartida(pagina)).toEqual([{ tipo: 'listo', familia: FAMILIA, nivel: 2, motivo: undefined }])
  expect(advertencias.some((texto) => texto.includes('«pieza-que-falta»') && texto.includes('figura simple'))).toBe(true)
  expect(errores).toEqual([])
})

test('un guion con «trabajo» que llega por mensaje abre ese juego y la página se entera', async ({ page: pagina }) => {
  await escucharAvisos(pagina)
  await pagina.goto('/?paquete=mensaje&vida=0')
  await pagina.waitForFunction(() => window.__avisosDelJuego.some((aviso) => aviso.tipo === 'listo'))
  const guion = { ...JSON.parse(ARCHIVOS['juego/guion-ejemplo.json']), trabajo: TRABAJO }

  await pagina.evaluate((paquete) => window.postMessage({ tipo: 'paquete', paquete }, '*'), guion)
  await pagina.waitForFunction((trabajo) => window.kusi?.juego?.trabajo === trabajo, TRABAJO)

  expect(await pagina.evaluate(() => window.__pruebaTaller.nivel)).toBe(1)
  expect(await pagina.evaluate(() => window.__avisosDelJuego)).toEqual([{ tipo: 'listo' }, { tipo: 'cargado', niveles: 2 }])

  // Un guion nuevo por el mismo puente reemplaza al juego, aunque el juego no atienda el puente.
  await pagina.evaluate(() => { window.__pruebaTaller = null })
  await pagina.evaluate((paquete) => window.postMessage({ tipo: 'paquete', paquete }, '*'),
    { ...guion, retos: [{ ...guion.retos[1], consigna: 'Un guion nuevo.' }] })
  await pagina.waitForFunction(() => window.__pruebaTaller?.consigna === 'Un guion nuevo.')
})

test('un id que no es un UUID no pide ningún archivo del taller', async ({ page: pagina }) => {
  const pedidos = []
  pagina.on('request', (pedido) => { if (pedido.url().includes('/taller/')) pedidos.push(pedido.url()) })
  await pagina.goto('/?juego=../../kit&vida=0')
  expect(await esperarFallo(pagina)).toMatch(/no es un id válido/)
  expect(pedidos).toEqual([])
  expect(await pagina.evaluate(() => window.kusi.listo)).toBe(false)
})

test('un trabajo que no existe y un guion que no pasa su validar muestran el error amable', async ({ page: pagina }) => {
  const inexistente = '00000000-0000-4000-8000-000000000000'
  // Con ?juego= lo primero que falta es su guion de ejemplo.
  await pagina.goto('/?juego=' + inexistente + '&vida=0')
  expect(await esperarFallo(pagina)).toMatch(/No llegó el guion/)

  // Con un guion que sí llega, lo que falta es el código del juego.
  await pagina.goto('/?paquete=mensaje&vida=0')
  await pagina.waitForFunction(() => window.kusi?.avisos)
  const sinCodigo = { ...JSON.parse(ARCHIVOS['juego/guion-ejemplo.json']), trabajo: inexistente }
  await pagina.evaluate((paquete) => window.postMessage({ tipo: 'paquete', paquete }, '*'), sinCodigo)
  expect(await esperarFallo(pagina)).toMatch(/No se pudo abrir el juego del trabajo/)
  // El niño ve la salida amable de siempre, nunca el motivo técnico.
  expect(await pagina.evaluate(() => window.kusi.estado().error)).toContain('¡Vamos a intentarlo de nuevo!')

  await pagina.goto('/?paquete=mensaje&vida=0')
  await pagina.waitForFunction(() => window.kusi?.avisos)
  const roto = { ...JSON.parse(ARCHIVOS['juego/guion-ejemplo.json']), trabajo: TRABAJO, roto: true }
  await pagina.evaluate((paquete) => window.postMessage({ tipo: 'paquete', paquete }, '*'), roto)
  expect(await esperarFallo(pagina)).toMatch(/roto a propósito/)
  expect(await pagina.evaluate(() => window.kusi.estado().familia)).toBe(FAMILIA)
})

test('el guion de un trabajo no abre el código de otro', async ({ page: pagina }) => {
  await pagina.goto('/?paquete=mensaje&vida=0')
  await pagina.waitForFunction(() => window.kusi?.avisos)
  // La ficha es de «prueba_taller» y el guion dice otra familia.
  const ajeno = { ...JSON.parse(ARCHIVOS['juego/guion-ejemplo.json']), trabajo: TRABAJO, familia: 'otra_familia' }
  await pagina.evaluate((paquete) => window.postMessage({ tipo: 'paquete', paquete }, '*'), ajeno)
  expect(await esperarFallo(pagina)).toMatch(/familia/)
})
