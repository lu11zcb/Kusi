import { test, expect } from '@playwright/test'
import { abrir, estado, esperarCasilla, leerPaquete, servirPaquete, servirPasillo } from './ayudas/laberinto.js'

// Solo se lee la geometría publicada por la escena. Los destinos se eligen con
// el ratón real, convirtiendo las coordenadas internas al tamaño del canvas.
async function puntoEnLienzo(pagina, x, y) {
  const lienzo = await pagina.locator('canvas').boundingBox()
  expect(lienzo).not.toBeNull()
  return { x: lienzo.x + x * lienzo.width / 1280, y: lienzo.y + y * lienzo.height / 720 }
}

async function tocarCasilla(pagina, fila, columna) {
  const actual = await estado(pagina)
  const punto = await puntoEnLienzo(pagina,
    actual.origenMapa.x + (columna + 0.5) * actual.casilla,
    actual.origenMapa.y + (fila + 0.5) * actual.casilla)
  await pagina.mouse.click(punto.x, punto.y)
}

async function servirMapaAbierto(pagina, objetos = [
  { tipo: 'fresa', fila: 3, columna: 6 }, { tipo: 'platano', fila: 3, columna: 5 },
]) {
  const paquete = await leerPaquete()
  paquete.retos = [{
    ...paquete.retos[0],
    mapa: ['#########', '#C.....P#', '#.......#', '#.......#', '#########'],
    regla: { tipo: 'orden', secuencia: ['fresa', 'platano'] },
    objetos,
    enemigos: [],
  }]
  await servirPaquete(pagina, paquete)
  return paquete
}

function comprobarDestino(actual, fila, columna) {
  expect(actual.modoControl).toBe('toque')
  expect(actual.destino).toEqual({ fila, columna })
  expect(actual.marcadorDestino.visible).toBe(true)
  expect(actual.marcadorDestino.x).toBeCloseTo(actual.origenMapa.x + (columna + 0.5) * actual.casilla, 4)
  expect(actual.marcadorDestino.y).toBeCloseTo(actual.origenMapa.y + (fila + 0.5) * actual.casilla, 4)
}

function comprobarLlegada(actual, fila, columna) {
  expect(actual.movimiento).toMatchObject({ fila, columna, progreso: 0, moviendose: false })
  expect(actual.destino).toBeNull()
  expect(actual.ruta).toEqual([])
  expect(actual.marcadorDestino.visible).toBe(false)
}

test('tocar la primera fruta muestra el destino, la recoge y se detiene allí', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  expect(inicial.modoControl).toBe('teclado')
  expect(inicial.destino).toBeNull()
  expect(inicial.ruta).toEqual([])
  expect(inicial.marcadorDestino.visible).toBe(false)

  await tocarCasilla(pagina, 1, 3)
  const andando = await estado(pagina)
  comprobarDestino(andando, 1, 3)
  expect(andando.ruta.length).toBeGreaterThan(0)
  expect(andando.regla.recogidos).toBe(0)

  const llegada = await esperarCasilla(pagina, 1, 3)
  comprobarLlegada(llegada, 1, 3)
  expect(llegada.regla.recogidos).toBe(1)
  expect(llegada.regla.errores).toBe(0)
  expect(llegada.regla.objetos.filter((objeto) => objeto.recogido).map((objeto) => objeto.tipo))
    .toEqual(['fresa'])
  await pagina.waitForTimeout(200)
  expect((await estado(pagina)).movimiento).toEqual(llegada.movimiento)
})

test('atraviesa una fruta inevitable sin comerla y solo recoge la fruta tocada', async ({ page: pagina }) => {
  await servirPasillo(pagina, {
    mapa: ['###########', '#C.......P#', '###########'],
    regla: { tipo: 'orden', secuencia: ['fresa', 'platano'] },
    objetos: [{ tipo: 'platano', fila: 1, columna: 3 }, { tipo: 'fresa', fila: 1, columna: 7 }],
  })
  await abrir(pagina)
  await tocarCasilla(pagina, 1, 7)
  expect((await estado(pagina)).ruta).toContainEqual({ fila: 1, columna: 3, direccion: 'derecha' })
  const llegada = await esperarCasilla(pagina, 1, 7)
  comprobarLlegada(llegada, 1, 7)
  expect(llegada.regla).toMatchObject({ recogidos: 1, errores: 0, completada: false })
  expect(llegada.regla.objetos.map((objeto) => [objeto.tipo, objeto.recogido]))
    .toEqual([['platano', false], ['fresa', true]])
  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'accion').map((aviso) => [aviso.objeto, aviso.correcto]))
    .toEqual([['fresa', true]])

  // Las flechas mantienen la recogida habitual y cancelan el modo de toque.
  await pagina.keyboard.press('ArrowLeft')
  const teclado = await esperarCasilla(pagina, 1, 1)
  expect(teclado.modoControl).toBe('teclado')
  expect(teclado.regla.recogidos).toBe(2)
  expect(teclado.regla.objetos.every((objeto) => objeto.recogido)).toBe(true)
})

test('elige un rodeo libre de otras frutas cuando existe', async ({ page: pagina }) => {
  await servirMapaAbierto(pagina, [
    { tipo: 'platano', fila: 1, columna: 3 }, { tipo: 'fresa', fila: 1, columna: 5 },
  ])
  await abrir(pagina)
  await tocarCasilla(pagina, 1, 5)
  const andando = await estado(pagina)
  comprobarDestino(andando, 1, 5)
  expect(andando.ruta.some((paso) => paso.fila === 2)).toBe(true)
  expect(andando.ruta.some((paso) => paso.fila === 1 && paso.columna === 3)).toBe(false)
  for (const paso of andando.ruta) expect(andando.mapa[paso.fila][paso.columna]).not.toBe('#')

  const llegada = await esperarCasilla(pagina, 1, 5)
  comprobarLlegada(llegada, 1, 5)
  expect(llegada.regla).toMatchObject({ recogidos: 1, errores: 0 })
  expect(llegada.regla.objetos[0].recogido).toBe(false)
  expect(llegada.regla.objetos[1].recogido).toBe(true)
})

test('otro toque durante la marcha cambia el destino y se detiene en la nueva casilla', async ({ page: pagina }) => {
  await servirMapaAbierto(pagina)
  await abrir(pagina)
  await tocarCasilla(pagina, 1, 6)
  await pagina.waitForFunction(() => {
    const m = window.kusi.estado().movimiento
    return m.columna === 2 && m.progreso > 0.1 && m.progreso < 0.8 && m.moviendose
  })
  const antes = await estado(pagina)
  await tocarCasilla(pagina, 3, 2)
  const despues = await estado(pagina)
  comprobarDestino(despues, 3, 2)
  expect(Math.hypot(despues.cuyX - antes.cuyX, despues.cuyY - antes.cuyY)).toBeLessThan(antes.casilla)
  const llegada = await esperarCasilla(pagina, 3, 2)
  comprobarLlegada(llegada, 3, 2)
  expect(llegada.regla.recogidos).toBe(0)
  await pagina.waitForTimeout(250)
  expect((await estado(pagina)).movimiento).toEqual(llegada.movimiento)
})

test('un muro y un toque fuera del mapa eligen el camino más cercano', async ({ page: pagina }) => {
  await servirMapaAbierto(pagina)
  await abrir(pagina)
  // El centro del muro superior tiene una sola casilla de camino más cercana.
  await tocarCasilla(pagina, 0, 4)
  comprobarDestino(await estado(pagina), 1, 4)
  comprobarLlegada(await esperarCasilla(pagina, 1, 4), 1, 4)

  const actual = await estado(pagina)
  const fuera = await puntoEnLienzo(pagina,
    actual.origenMapa.x + 4.5 * actual.casilla,
    actual.origenMapa.y + actual.mapa.length * actual.casilla + 12)
  await pagina.mouse.click(fuera.x, fuera.y)
  comprobarDestino(await estado(pagina), 3, 4)
  const llegada = await esperarCasilla(pagina, 3, 4)
  comprobarLlegada(llegada, 3, 4)
  expect(llegada.regla.recogidos).toBe(0)
})

test('tocar la puerta cerrada no recoge frutas de paso; abierta permite terminar', async ({ page: pagina }) => {
  await servirPasillo(pagina, {
    mapa: ['#######', '#C...P#', '#######'],
    regla: { tipo: 'orden', secuencia: ['fresa'] },
    objetos: [{ tipo: 'fresa', fila: 1, columna: 2 }],
  })
  await abrir(pagina)
  await tocarCasilla(pagina, 1, 5)
  const cerrada = await esperarCasilla(pagina, 1, 5)
  comprobarLlegada(cerrada, 1, 5)
  expect(cerrada.puertaAbierta).toBe(false)
  expect(cerrada.regla.recogidos).toBe(0)
  expect(cerrada.terminada).toBe(false)

  await tocarCasilla(pagina, 1, 2)
  const abierta = await esperarCasilla(pagina, 1, 2)
  expect(abierta.puertaAbierta).toBe(true)
  expect(abierta.terminada).toBe(false)
  await tocarCasilla(pagina, 1, 5)
  await pagina.waitForFunction(() => window.kusi.estado().terminada)
  const final = await estado(pagina)
  comprobarLlegada(final, 1, 5)
  expect(final.regla.recogidos).toBe(1)
  const avisos = await pagina.evaluate(() => window.kusi.avisos)
  expect(avisos.filter((aviso) => aviso.tipo === 'fin')).toHaveLength(1)
})

test('una flecha cancela el destino táctil y continúa con el movimiento habitual', async ({ page: pagina }) => {
  await servirPasillo(pagina)
  await abrir(pagina)
  await tocarCasilla(pagina, 1, 10)
  await pagina.waitForFunction(() => {
    const m = window.kusi.estado().movimiento
    return m.columna >= 2 && m.columna < 4 && m.moviendose
  })
  await pagina.keyboard.press('ArrowLeft')
  const teclado = await estado(pagina)
  expect(teclado.modoControl).toBe('teclado')
  expect(teclado.destino).toBeNull()
  expect(teclado.ruta).toEqual([])
  expect(teclado.marcadorDestino.visible).toBe(false)
  comprobarLlegada(await esperarCasilla(pagina, 1, 1), 1, 1)
})

test('la captura cancela la ruta táctil y el cuy espera otro toque al volver al inicio', async ({ page: pagina }) => {
  await servirPasillo(pagina, { zorros: [2] })
  await abrir(pagina)
  await tocarCasilla(pagina, 1, 10)
  await pagina.waitForFunction(() => window.kusi.estado().capturas === 1, null, { timeout: 8000 })
  const atrapado = await estado(pagina)
  comprobarLlegada(atrapado, 1, 1)
  expect(atrapado.invulnerable).toBe(true)
  await pagina.waitForTimeout(350)
  const espera = await estado(pagina)
  comprobarLlegada(espera, 1, 1)
  expect(espera.capturas).toBe(1)
})
