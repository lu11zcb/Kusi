import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { leerPaquete, estado, esperarCasilla, puntoEnLienzo } from './ayudas/laberinto.js'

// El juego recibe el guion que generó la IA por un mensaje de la página que lo contiene
// (la vista previa del panel). Con el juego abierto solo, esa página es él mismo: la
// prueba le manda los mensajes y lee los avisos con window.postMessage, igual que el panel.
const leerFixture = async (nombre) =>
  JSON.parse(await readFile(new URL('./fixtures/' + nombre, import.meta.url), 'utf8'))

// Guarda todo lo que el juego le avisa a la página (listo, cargado, error) para leerlo después.
async function escucharAvisos(pagina) {
  await pagina.addInitScript(() => {
    window.__avisosDelJuego = []
    window.addEventListener('message', (evento) => {
      if (['listo', 'cargado', 'error'].includes(evento.data?.tipo)) window.__avisosDelJuego.push(evento.data)
    })
  })
}

const avisosDelJuego = (pagina) => pagina.evaluate(() => window.__avisosDelJuego)
const mandar = (pagina, mensaje) => pagina.evaluate((datos) => window.postMessage(datos, '*'), mensaje)

// Abre el juego sin guion (?paquete=mensaje) y espera su aviso de que ya puede recibirlo.
async function abrirSinGuion(pagina, parametros = '') {
  await escucharAvisos(pagina)
  await pagina.goto('/?paquete=mensaje&rapido=1' + parametros)
  await pagina.waitForFunction(() => window.__avisosDelJuego.some((aviso) => aviso.tipo === 'listo'))
}

async function esperarJuego(pagina, nivel = 1) {
  await pagina.waitForFunction((nivel) => window.kusi?.listo && window.kusi.estado().familia === 'laberinto' &&
    window.kusi.estado().nivel === nivel, nivel)
  return estado(pagina)
}

async function tocarCasilla(pagina, fila, columna) {
  const actual = await estado(pagina)
  const punto = await puntoEnLienzo(pagina,
    actual.origenMapa.x + (columna + 0.5) * actual.casilla,
    actual.origenMapa.y + (fila + 0.5) * actual.casilla)
  await pagina.mouse.click(punto.x, punto.y)
}

test('sin guion el juego espera y avisa a la página que ya puede recibirlo, una sola vez', async ({ page: pagina }) => {
  await abrirSinGuion(pagina)
  expect(await avisosDelJuego(pagina)).toEqual([{ tipo: 'listo' }])
  const kusi = await pagina.evaluate(() => ({ listo: window.kusi.listo, tieneEstado: 'estado' in window.kusi }))
  expect(kusi).toEqual({ listo: false, tieneEstado: false })
  await pagina.waitForTimeout(300)
  expect(await avisosDelJuego(pagina)).toEqual([{ tipo: 'listo' }])
})

test('recibe un guion por mensaje, empieza en el primer nivel, avisa que cargó y se puede jugar', async ({ page: pagina }) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await abrirSinGuion(pagina)
  const guion = await leerPaquete()

  await mandar(pagina, { tipo: 'paquete', paquete: guion })
  const inicial = await esperarJuego(pagina)

  expect(inicial.mapa).toEqual(guion.retos[0].mapa)
  expect(inicial.consigna).toBe(guion.retos[0].consigna)
  expect(await avisosDelJuego(pagina)).toEqual([{ tipo: 'listo' }, { tipo: 'cargado', niveles: 3 }])
  // Una pulsación sigue hasta el muro y recoge en orden, como con el paquete de siempre.
  await pagina.keyboard.press('ArrowRight')
  const final = await esperarCasilla(pagina, 1, 9)
  expect(final.regla.objetos.filter((objeto) => objeto.recogido).map((objeto) => objeto.tipo)).toEqual(['fresa', 'platano'])
  expect(errores).toEqual([])
})

test('el guion también llega como texto JSON, con el bloque de procedencia que guarda Spring', async ({ page: pagina }) => {
  await abrirSinGuion(pagina)
  const guion = await leerFixture('laberinto-solo-clase.json')
  guion.procedencia = { proveedor: 'groq', modelo: 'openai/gpt-oss-120b', intentos: 2, mapa_base: false }

  await mandar(pagina, { tipo: 'paquete', paquete: JSON.stringify(guion) })
  const inicial = await esperarJuego(pagina)

  expect(inicial.mapa).toEqual(guion.retos[0].mapa)
  expect((await avisosDelJuego(pagina)).map((aviso) => aviso.tipo)).toEqual(['listo', 'cargado'])
})

test('un guion de patrones y uno de clasificar cambian el juego: otra regla, otra barra y otras trampas', async ({ page: pagina }) => {
  await abrirSinGuion(pagina)

  // Patrones («orden»): la barra pide la fruta que sigue y comer la segunda primero es un error.
  await mandar(pagina, { tipo: 'paquete', paquete: await leerFixture('laberinto-orden.json') })
  const patrones = await esperarJuego(pagina)
  expect(patrones.reglaDelReto).toEqual({ tipo: 'orden', secuencia: ['fresa', 'platano', 'fresa', 'platano'] })
  expect(patrones.barra).toEqual({ titulo: 'Sigue el orden', fichas: 4 })
  await tocarCasilla(pagina, 1, 7)
  const equivocado = await esperarCasilla(pagina, 1, 7)
  expect(equivocado.regla).toMatchObject({ recogidos: 0, errores: 1, completada: false })
  await tocarCasilla(pagina, 1, 3)
  const acertado = await esperarCasilla(pagina, 1, 3)
  expect(acertado.regla).toMatchObject({ recogidos: 1, errores: 1 })

  // Clasificar («solo_clase»): llega otro guion y el juego se reemplaza desde el primer nivel.
  await mandar(pagina, { tipo: 'paquete', paquete: await leerFixture('laberinto-solo-clase.json') })
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().reglaDelReto.tipo === 'solo_clase')
  const clasificar = await estado(pagina)
  expect(clasificar.nivel).toBe(1)
  expect(clasificar.reglaDelReto).toEqual({ tipo: 'solo_clase', clase: 'fruta', meta: 3 })
  expect(clasificar.barra).toEqual({ titulo: 'Busca frutas', fichas: 3 })
  expect(clasificar.regla).toMatchObject({ recogidos: 0, errores: 0 })
  // Aquí no importa el orden: la segunda fruta primero es correcta, y la trampa es la verdura.
  await tocarCasilla(pagina, 1, 7)
  expect((await esperarCasilla(pagina, 1, 7)).regla).toMatchObject({ recogidos: 1, errores: 0 })
  await tocarCasilla(pagina, 5, 7)
  const trampa = await esperarCasilla(pagina, 5, 7)
  expect(trampa.regla).toMatchObject({ recogidos: 1, errores: 1 })
  expect(trampa.regla.objetos.find((objeto) => objeto.tipo === 'zanahoria').recogido).toBe(false)
  // Los dos juegos llegaron sin recargar la página.
  expect((await avisosDelJuego(pagina)).map((aviso) => aviso.tipo)).toEqual(['listo', 'cargado', 'cargado'])
})

test('un nivel de verduras pide buscar verduras', async ({ page: pagina }) => {
  await escucharAvisos(pagina)
  await pagina.goto('/?paquete=mensaje&rapido=1&nivel=2')
  await pagina.waitForFunction(() => window.__avisosDelJuego.some((aviso) => aviso.tipo === 'listo'))

  await mandar(pagina, { tipo: 'paquete', paquete: await leerFixture('laberinto-solo-clase.json') })
  const verduras = await esperarJuego(pagina, 2)

  expect(verduras.reglaDelReto).toEqual({ tipo: 'solo_clase', clase: 'verdura', meta: 3 })
  expect(verduras.barra).toEqual({ titulo: 'Busca verduras', fichas: 3 })
})

test('reiniciar vuelve al primer nivel con una partida nueva y no cambia el guion', async ({ page: pagina }) => {
  await escucharAvisos(pagina)
  await pagina.goto('/?paquete=mensaje&rapido=1&nivel=2')
  await pagina.waitForFunction(() => window.__avisosDelJuego.some((aviso) => aviso.tipo === 'listo'))
  const guion = await leerPaquete()
  await mandar(pagina, { tipo: 'paquete', paquete: guion })
  await esperarJuego(pagina, 2)
  const partidaAntes = await pagina.evaluate(() => window.kusi.avisos.findLast((aviso) => aviso.tipo === 'listo').partida)

  await mandar(pagina, { tipo: 'reiniciar' })
  const reiniciado = await esperarJuego(pagina, 1)

  expect(reiniciado.mapa).toEqual(guion.retos[0].mapa)
  expect(reiniciado.regla).toMatchObject({ recogidos: 0, errores: 0, completada: false })
  const partidaDespues = await pagina.evaluate(() => window.kusi.avisos.findLast((aviso) => aviso.tipo === 'listo').partida)
  expect(partidaDespues).not.toBe(partidaAntes)
})

test('un guion que no sirve se rechaza con su motivo y el siguiente guion bueno sí se juega', async ({ page: pagina }) => {
  await abrirSinGuion(pagina)
  const roto = await leerPaquete()
  roto.retos[0].mapa = ['###', '#C#', '###']

  await mandar(pagina, { tipo: 'paquete', paquete: roto })
  await pagina.waitForFunction(() => window.__avisosDelJuego.some((aviso) => aviso.tipo === 'error'))
  const aviso = (await avisosDelJuego(pagina)).find((candidato) => candidato.tipo === 'error')
  expect(aviso.motivo).toContain('Nivel 1')
  expect(aviso.motivo).toContain('puerta')
  expect(await pagina.evaluate(() => window.kusi.listo)).toBe(false)

  await mandar(pagina, { tipo: 'paquete', paquete: await leerPaquete() })
  await esperarJuego(pagina)
  // Un texto que ni siquiera es JSON también se rechaza, sin romper nada.
  await mandar(pagina, { tipo: 'paquete', paquete: '{esto no es json' })
  await pagina.waitForFunction(() => window.__avisosDelJuego.filter((aviso) => aviso.tipo === 'error').length === 2)
  await mandar(pagina, { tipo: 'paquete', paquete: await leerPaquete() })
  await esperarJuego(pagina)
})

test('solo hace caso a la página que contiene el juego, no a otra ventana', async ({ page: pagina }) => {
  await abrirSinGuion(pagina)
  const guion = await leerPaquete()

  // El mensaje sale de un iframe: su ventana no es la que contiene el juego.
  await pagina.evaluate((guion) => {
    const marco = document.createElement('iframe')
    document.body.appendChild(marco)
    const mandarDesdeElMarco = new marco.contentWindow.Function('guion',
      'parent.postMessage({ tipo: "paquete", paquete: guion }, "*")')
    mandarDesdeElMarco(guion)
  }, guion)
  await pagina.waitForTimeout(400)
  expect(await pagina.evaluate(() => window.kusi.listo)).toBe(false)
  expect((await avisosDelJuego(pagina)).map((aviso) => aviso.tipo)).toEqual(['listo'])

  // Lo mismo, mandado por la página, sí funciona.
  await mandar(pagina, { tipo: 'paquete', paquete: guion })
  await esperarJuego(pagina)
})

test('con ?paquete=laberinto el juego empieza con el ejemplo y también acepta un guion por mensaje', async ({ page: pagina }) => {
  await escucharAvisos(pagina)
  await pagina.goto('/?paquete=laberinto&rapido=1')
  await esperarJuego(pagina)
  expect((await avisosDelJuego(pagina)).map((aviso) => aviso.tipo)).toEqual(['listo', 'cargado'])

  await mandar(pagina, { tipo: 'paquete', paquete: await leerFixture('laberinto-solo-clase.json') })
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().reglaDelReto.tipo === 'solo_clase')
  expect((await estado(pagina)).barra).toEqual({ titulo: 'Busca frutas', fichas: 3 })
})

test('sin parámetros abre el ejemplo y acepta un guion nuevo por mensaje', async ({ page: pagina }) => {
  await escucharAvisos(pagina)
  await pagina.goto('/')
  await esperarJuego(pagina)
  expect((await avisosDelJuego(pagina)).map((aviso) => aviso.tipo)).toEqual(['listo', 'cargado'])
  await mandar(pagina, { tipo: 'paquete', paquete: await leerFixture('laberinto-solo-clase.json') })
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().reglaDelReto.tipo === 'solo_clase')
  expect((await estado(pagina)).barra).toEqual({ titulo: 'Busca frutas', fichas: 3 })
})
