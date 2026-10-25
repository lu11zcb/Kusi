import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

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

async function puntoEnLienzo(pagina, x, y) {
  const lienzo = await pagina.locator('canvas').boundingBox()
  return { x: lienzo.x + x * lienzo.width / 1280, y: lienzo.y + y * lienzo.height / 720 }
}

test('una pulsación sigue hasta el muro, recoge en orden y conserva el nivel con la puerta cerrada', async ({ page: pagina }) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  // La figura simple debe mantener jugable el mapa sin el PNG definitivo.
  await pagina.route('**/dibujos/muro-adobe.png', (ruta) => ruta.fulfill({ status: 404, body: '' }))
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

test('ignora un toque corto y un deslizamiento diagonal elige su eje mayor', async ({ page: pagina }) => {
  const inicial = await abrirLaberinto(pagina)
  const inicio = await puntoEnLienzo(pagina, 760, 676)
  await pagina.mouse.move(inicio.x, inicio.y)
  await pagina.mouse.down()
  await pagina.mouse.move(inicio.x + 15, inicio.y - 8)
  await pagina.mouse.up()
  await pagina.waitForTimeout(180)
  expect((await estado(pagina)).movimiento).toEqual(inicial.movimiento)

  await pagina.mouse.move(inicio.x, inicio.y)
  await pagina.mouse.down()
  await pagina.mouse.move(inicio.x + 110, inicio.y - 34, { steps: 4 })
  await pagina.mouse.up()
  const final = await esperarCasilla(pagina, 1, 9)
  expect(final.movimiento.direccion).toBe('derecha')
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
      expect(lienzo.width / lienzo.height).toBeCloseTo(1280 / 720, 2)
      // La barra ocupa hasta y=132; la guía y su globo terminan antes de x=280.
      // El mapa debe reservar esas zonas incluso al ajustar todo el lienzo.
      expect(actual.origenMapa.y).toBeGreaterThanOrEqual(156)
      expect(actual.origenMapa.x).toBeGreaterThanOrEqual(280)
      expect(actual.origenMapa.x + actual.mapa[0].length * actual.casilla).toBeLessThanOrEqual(1248)
      expect(actual.origenMapa.y + actual.mapa.length * actual.casilla).toBeLessThanOrEqual(656)
    })
}

test.describe('deslizamiento táctil', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })

  test('un dedo fuera del mapa elige la dirección y el cuy continúa solo', async ({ page: pagina }) => {
    const inicial = await abrirLaberinto(pagina)
    const inicio = await puntoEnLienzo(pagina, 90, 210)
    const entrada = await pagina.context().newCDPSession(pagina)
    const dedo = (x, y) => ({ id: 1, x, y, radiusX: 8, radiusY: 8, force: 1 })
    try {
      // Con el lienzo reducido, 29 px de la ventana equivalen a más de 30 px
      // internos. El umbral se debe medir en la pantalla que toca el niño.
      await entrada.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [dedo(inicio.x, inicio.y)],
      })
      await entrada.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [dedo(inicio.x + 29, inicio.y)],
      })
      await entrada.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      await pagina.waitForTimeout(180)
      expect((await estado(pagina)).movimiento).toEqual(inicial.movimiento)

      await entrada.send('Input.dispatchTouchEvent', {
        type: 'touchStart', touchPoints: [dedo(inicio.x, inicio.y)],
      })
      await entrada.send('Input.dispatchTouchEvent', {
        type: 'touchMove', touchPoints: [dedo(inicio.x + 31, inicio.y + 12)],
      })
      await entrada.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
      const final = await esperarCasilla(pagina, 1, 9)
      expect(final.movimiento.direccion).toBe('derecha')
    } finally {
      await entrada.detach()
    }
  })
})
