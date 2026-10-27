import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { puntoEnLienzo, seSuperponen } from './ayudas/laberinto.js'

const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())

async function abrirLaberinto(pagina, rapido = true) {
  await pagina.goto('/?paquete=laberinto' + (rapido ? '&rapido=1' : ''))
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
  return estado(pagina)
}

async function esperarCasilla(pagina, fila, columna) {
  await pagina.waitForFunction(({ fila, columna }) => {
    const movimiento = window.kusi.estado().movimiento
    return movimiento.fila === fila && movimiento.columna === columna && !movimiento.moviendose
  }, { fila, columna })
  // Un cuadro posterior permite observar también el reposo del dibujo.
  await pagina.waitForFunction(() => {
    const animacion = window.kusi.estado().animacionCuy
    return animacion.estado === 'reposo' && /:(quieto|reposo)$/.test(animacion.clave)
  })
  return estado(pagina)
}

async function tocarBoton(pagina, nombre) {
  const punto = await pagina.evaluate((nombre) => window.kusi.ubicar(nombre), nombre)
  expect(punto).not.toBeNull()
  await pagina.mouse.click(punto.x, punto.y)
}

test('una pulsación sigue hasta el muro, recoge en orden y conserva el nivel con la puerta cerrada', async ({ page: pagina }) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  const inicial = await abrirLaberinto(pagina)
  expect(inicial.inicio).toEqual({ fila: 1, columna: 1 })
  await pagina.keyboard.press('ArrowRight')
  const final = await esperarCasilla(pagina, 1, 9)
  expect(final.cuyX).toBeGreaterThan(inicial.cuyX + inicial.casilla * 7)
  expect(final.animacionCuy).toMatchObject({
    estado: 'reposo', fotograma: 4, flipX: false,
    clave: 'cuy-nino-animado-v1:derecha:quieto',
  })
  await pagina.waitForTimeout(180)
  expect((await estado(pagina)).movimiento).toEqual(final.movimiento)
  expect(final.nivel).toBe(1)
  expect(final.regla.recogidos).toBe(2)
  expect(final.regla.completada).toBe(false)
  expect(final.puertaAbierta).toBe(false)
  expect(final.regla.objetos.filter((objeto) => objeto.recogido).map((objeto) => objeto.tipo))
    .toEqual(['fresa', 'platano'])
  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'accion').map((aviso) => ({
    objeto: aviso.objeto, correcto: aviso.correcto,
  }))).toEqual([{ objeto: 'fresa', correcto: true }, { objeto: 'platano', correcto: true }])
  expect(avisos.some((aviso) => ['reto_completado', 'fin'].includes(aviso.tipo))).toBe(false)
  expect(errores).toEqual([])
})

test('guarda un giro temprano, dobla en la próxima esquina y sube de espaldas', async ({ page: pagina }) => {
  await abrirLaberinto(pagina, false)
  await pagina.keyboard.press('ArrowRight')
  // Pasada la salida inicial, las columnas 2, 3 y 4 tienen muro abajo.
  // El deseo de bajar debe esperar a la columna 5, sin detener el avance.
  await pagina.waitForFunction(() => {
    const movimiento = window.kusi.estado().movimiento
    return movimiento.columna >= 2 && movimiento.columna < 4
  })
  await pagina.keyboard.press('ArrowDown')
  await pagina.waitForFunction(() => window.kusi.estado().movimiento.direccionPendiente === 'abajo')
  const abajo = await esperarCasilla(pagina, 5, 5)
  expect(abajo.animacionCuy).toMatchObject({ fotograma: 1, flipX: false })

  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForFunction(() => {
    const actual = window.kusi.estado()
    return actual.movimiento.direccion === 'arriba' && actual.animacionCuy.estado === 'caminar'
  })
  const caminando = await estado(pagina)
  expect(caminando.animacionCuy.clave).toBe('cuy-nino-animado-v1:espaldas:caminar_espalda')
  expect([12, 13, 14]).toContain(caminando.animacionCuy.fotograma)
  const arriba = await esperarCasilla(pagina, 1, 5)
  expect(arriba.animacionCuy).toMatchObject({
    clave: 'cuy-nino-animado-v1:espaldas:quieto', fotograma: 13, flipX: false,
  })
})

test('un toque sin arrastre no manda al cuy hasta la casilla tocada', async ({ page: pagina }) => {
  const inicial = await abrirLaberinto(pagina)
  const punto = await puntoEnLienzo(pagina,
    inicial.origenMapa.x + 2.5 * inicial.casilla,
    inicial.origenMapa.y + 1.5 * inicial.casilla)
  await pagina.mouse.click(punto.x, punto.y)
  await pagina.waitForTimeout(180)
  const final = await estado(pagina)
  expect(final.movimiento).toMatchObject({ fila: 1, columna: 1, moviendose: false })
  expect(final.joystick.visible).toBe(true)
  expect(final.regla.recogidos).toBe(0)
})

test('Escuchar y Ayuda se pueden tocar sin elegir una dirección', async ({ page: pagina }) => {
  const inicial = await abrirLaberinto(pagina)
  await tocarBoton(pagina, 'sonido')
  await tocarBoton(pagina, 'ayuda')
  await expect.poll(async () => (await estado(pagina)).consigna).not.toBe(inicial.consigna)
  await pagina.waitForTimeout(180)
  expect((await estado(pagina)).movimiento).toEqual(inicial.movimiento)

  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  expect(avisos.map((aviso) => aviso.tipo)).toContain('ayuda')
  const partida = avisos[0].partida
  expect(typeof partida).toBe('string')
  expect(partida.length).toBeGreaterThan(0)
  expect(avisos.every((aviso) => aviso.partida === partida)).toBe(true)
  expect(avisos.map((aviso) => aviso.orden)).toEqual(avisos.map((aviso, indice) => indice + 1))
})

test('un mapa inválido avisa el fallo y permite volver a pedir el paquete corregido', async ({ page: pagina }) => {
  const paquete = JSON.parse(await readFile(
    new URL('../public/paquete-laberinto-ejemplo.json', import.meta.url), 'utf8',
  ))
  const paqueteValido = structuredClone(paquete)
  paquete.retos[0].mapa[2] += '#'
  let peticiones = 0
  await pagina.route('**/paquete-laberinto-ejemplo.json', (ruta) => {
    peticiones += 1
    return ruta.fulfill({ json: peticiones === 1 ? paquete : paqueteValido })
  })
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await pagina.goto('/?paquete=laberinto')
  await pagina.waitForFunction(() => window.kusi?.avisos.some((aviso) => aviso.tipo === 'fallo'))
  const resultado = await pagina.evaluate(() => ({ listo: window.kusi.listo, ...window.kusi.estado() }))
  expect(resultado.listo).toBe(false)
  expect(resultado.error).toContain('Este camino no está listo todavía')
  expect(resultado.error).toContain('intentarlo de nuevo')
  const fallo = await pagina.evaluate(() => window.kusi.avisos.find((aviso) => aviso.tipo === 'fallo'))
  expect(fallo).toMatchObject({ tipo: 'fallo', orden: 1 })
  expect(typeof fallo.partida).toBe('string')
  expect(fallo.partida.length).toBeGreaterThan(0)

  // El botón real debe volver a descargar el JSON: reiniciar la escena con
  // el paquete inválido todavía en caché repetiría el mismo fallo para siempre.
  const reintentar = await puntoEnLienzo(pagina, 640, 460)
  await pagina.mouse.click(reintentar.x, reintentar.y)
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
  expect(peticiones).toBe(2)
  expect((await estado(pagina)).nivel).toBe(1)
  expect(errores).toEqual([])
})

for (const pantalla of [{ width: 1280, height: 720 }, { width: 844, height: 390 }]) {
  test('el mapa reserva espacio a la barra y a Kusi en ' + pantalla.width + ' × ' + pantalla.height,
    async ({ page: pagina }) => {
      await pagina.setViewportSize(pantalla)
      const actual = await abrirLaberinto(pagina)
      const lienzo = await pagina.locator('canvas').boundingBox()
      expect(lienzo.x).toBeGreaterThanOrEqual(-1)
      expect(lienzo.y).toBeGreaterThanOrEqual(-1)
      expect(lienzo.x + lienzo.width).toBeLessThanOrEqual(pantalla.width + 1)
      expect(lienzo.y + lienzo.height).toBeLessThanOrEqual(pantalla.height + 1)
      expect(lienzo.width).toBeCloseTo(pantalla.width, 0)
      expect(lienzo.height).toBeCloseTo(pantalla.height, 0)
      // Se comprueba el espacio ocupado, sin fijar la composición anterior de
      // Kusi. Así puede crecer el mapa y seguir quedando completo y separado.
      const { mapa, barra, guia } = actual.presentacion
      expect(seSuperponen(mapa, barra)).toBe(false)
      expect(seSuperponen(mapa, guia)).toBe(false)
      const esquina = await puntoEnLienzo(pagina, mapa.x, mapa.y)
      const opuesta = await puntoEnLienzo(pagina, mapa.x + mapa.ancho, mapa.y + mapa.alto)
      expect(esquina.x).toBeGreaterThanOrEqual(-1)
      expect(esquina.y).toBeGreaterThanOrEqual(-1)
      expect(opuesta.x).toBeLessThanOrEqual(pantalla.width + 1)
      expect(opuesta.y).toBeLessThanOrEqual(pantalla.height + 1)
    })
}

test.describe('toque táctil', () => {
  test.use({ viewport: { width: 800, height: 360 }, hasTouch: true, isMobile: true })

  test('tocar una fruta sin mover el dedo no inicia un recorrido automático', async ({ page: pagina }) => {
    const inicial = await abrirLaberinto(pagina)
    const fruta = await pagina.evaluate(() => window.kusi.ubicarCasilla(1, 3))
    await pagina.touchscreen.tap(fruta.x, fruta.y)
    await pagina.waitForTimeout(200)
    const final = await estado(pagina)
    expect(final.movimiento.fila).toBe(inicial.movimiento.fila)
    expect(final.movimiento.columna).toBe(inicial.movimiento.columna)
    expect(final.movimiento.moviendose).toBe(false)
    expect(final.joystick.visible).toBe(true)
    expect(final.regla.recogidos).toBe(0)
  })
})
