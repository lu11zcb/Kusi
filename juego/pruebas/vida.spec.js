import { test, expect } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const RUTA_PAQUETE = new URL('../public/paquete-laberinto-ejemplo.json', import.meta.url)
const SONIDOS_DEL_PAQUETE = 8
const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())
const leerPaquete = async () => JSON.parse(await readFile(RUTA_PAQUETE, 'utf8'))

async function abrir(pagina, parametros = '') {
  await pagina.goto('/?paquete=laberinto' + parametros)
  await pagina.waitForFunction(() => window.kusi?.listo && window.kusi.estado().familia === 'laberinto')
  return estado(pagina)
}

async function esperarCasilla(pagina, fila, columna) {
  await pagina.waitForFunction(({ fila, columna }) => {
    const movimiento = window.kusi.estado().movimiento
    return movimiento.fila === fila && movimiento.columna === columna && !movimiento.moviendose
  }, { fila, columna })
  return estado(pagina)
}

// Un pasillo recto con un zorro que patrulla, el mismo de las pruebas del zorro.
// El zorro no se mueve hasta que el niño elige su primer rumbo.
async function servirPasilloConZorro(pagina) {
  const paquete = await leerPaquete()
  paquete.retos = [{
    ...paquete.retos[0],
    mapa: ['#############', '#C.........P#', '#############'],
    regla: { tipo: 'orden', secuencia: ['fresa', 'platano'] },
    objetos: [{ tipo: 'fresa', fila: 1, columna: 2 }, { tipo: 'platano', fila: 1, columna: 10 }],
    enemigos: [{ tipo: 'zorro', fila: 1, columna: 8, movimiento: 'patrulla' }],
  }]
  await pagina.route('**/paquete-laberinto-ejemplo.json', (ruta) => ruta.fulfill({ json: paquete }))
}

test('el zorro tiene una sombra elíptica del mismo estilo que la del cuy, proporcional a su tamaño', async ({ page: pagina }) => {
  await servirPasilloConZorro(pagina)
  const inicial = await abrir(pagina)
  expect(inicial.vida.activa).toBe(true)
  const { cuy, zorros } = inicial.vida.sombras
  expect(zorros).toHaveLength(1)
  const [zorro] = zorros

  // Una elipse baja y ancha, suave: translúcida y bajo los personajes.
  for (const sombra of [cuy, zorro]) {
    expect(sombra.ancho).toBeGreaterThan(sombra.alto * 2)
    expect(sombra.opacidad).toBeGreaterThan(0)
    expect(sombra.opacidad).toBeLessThan(0.3)
    expect(sombra.profundidad).toBeLessThan(5)
  }
  // Mismo estilo que la del cuy: misma opacidad, profundidad y forma.
  expect(zorro.opacidad).toBe(cuy.opacidad)
  expect(zorro.profundidad).toBe(cuy.profundidad)
  expect(zorro.ancho / zorro.alto).toBeCloseTo(cuy.ancho / cuy.alto, 5)
  // El zorro es más grande y su sombra crece igual de ancho que de alto.
  expect(zorro.ancho).toBeGreaterThan(cuy.ancho)
  expect(zorro.alto / cuy.alto).toBeCloseTo(zorro.ancho / cuy.ancho, 5)
  // Cada sombra queda justo sobre la línea de los pies de su personaje.
  const pies = inicial.casilla * 0.1
  expect(cuy.x).toBeCloseTo(inicial.cuyX, 5)
  expect(cuy.y).toBeCloseTo(inicial.cuyY - pies, 5)
  expect(zorro.x).toBeCloseTo(inicial.zorros[0].x, 5)
  expect(zorro.y).toBeCloseTo(inicial.zorros[0].y - pies, 5)
})

test('las sombras acompañan al cuy y al zorro mientras caminan', async ({ page: pagina }) => {
  await servirPasilloConZorro(pagina)
  const inicial = await abrir(pagina)
  // La flecha hacia arriba choca con el muro: el cuy espera y el zorro empieza a patrullar.
  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForFunction((columna) => {
    const zorro = window.kusi.estado().zorros[0]
    return zorro.columna !== columna || zorro.progreso > 0.3
  }, inicial.zorros[0].columna)
  const zorro = await estado(pagina)
  const pies = zorro.casilla * 0.1
  expect(zorro.zorros[0].x).not.toBeCloseTo(inicial.zorros[0].x, 1)
  expect(zorro.vida.sombras.zorros[0].x).toBeCloseTo(zorro.zorros[0].x, 5)
  expect(zorro.vida.sombras.zorros[0].y).toBeCloseTo(zorro.zorros[0].y - pies, 5)

  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().movimiento.columna >= 3)
  const caminando = await estado(pagina)
  expect(caminando.vida.sombras.cuy.x).toBeCloseTo(caminando.cuyX, 5)
  expect(caminando.vida.sombras.cuy.y).toBeCloseTo(caminando.cuyY - pies, 5)
  expect(caminando.cuyX).toBeGreaterThan(inicial.cuyX + inicial.casilla * 2)
})

test('?vida=0 apaga sombras, sonidos y parpadeo sin cambiar cómo se juega', async ({ page: pagina }) => {
  const peticionesDeSonido = []
  pagina.on('request', (peticion) => {
    if (peticion.url().includes('/sonidos/')) peticionesDeSonido.push(peticion.url())
  })
  await servirPasilloConZorro(pagina)
  const inicial = await abrir(pagina, '&rapido=1&vida=0')
  expect(inicial.vida.activa).toBe(false)
  expect(inicial.vida.sombras).toEqual({ cuy: null, zorros: [] })
  expect(inicial.vida.sonidos.activo).toBe(false)
  // El zorro sigue en el laberinto: solo desaparece su sombra.
  expect(inicial.zorros).toHaveLength(1)
  expect(peticionesDeSonido).toEqual([])

  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().movimiento.columna >= 2)
  const jugando = await estado(pagina)
  expect(jugando.cuyX).toBeGreaterThan(inicial.cuyX)
  expect(jugando.vida.sonidos.reproducciones).toEqual({})
  expect(jugando.vida.parpadeos).toBe(0)
})

test('los ocho sonidos se descargan solo con la vida encendida', async ({ page: pagina }) => {
  const peticionesDeSonido = []
  pagina.on('request', (peticion) => {
    if (peticion.url().includes('/sonidos/') && /\.(ogg|wav)$/.test(peticion.url())) {
      peticionesDeSonido.push(peticion.url())
    }
  })
  await abrir(pagina)
  expect(peticionesDeSonido).toHaveLength(SONIDOS_DEL_PAQUETE)
})

test('el cuy parpadea de frente después de esperar y vuelve a sus ojos abiertos', async ({ page: pagina }) => {
  const inicial = await abrir(pagina)
  expect(inicial.animacionCuy.clave).toBe('cuy-nino-animado-v1:frente:quieto')
  expect(inicial.vida.parpadeos).toBe(0)
  // La espera máxima es de 4 s; el tiempo extra cubre el arranque del navegador.
  await pagina.waitForFunction(
    () => /:frente:parpadeo$/.test(window.kusi.estado().animacionCuy.clave),
    null, { timeout: 8000, polling: 'raf' },
  )
  const cerrando = await estado(pagina)
  expect([15, 16, 17]).toContain(cerrando.animacionCuy.fotograma)
  expect(cerrando.animacionCuy.flipX).toBe(false)
  expect(cerrando.vida.parpadeos).toBe(1)
  expect(cerrando.movimiento.moviendose).toBe(false)

  // El parpadeo es un solo ciclo: al terminar regresa al dibujo quieto.
  await pagina.waitForFunction(() => {
    const animacion = window.kusi.estado().animacionCuy
    return animacion.clave === 'cuy-nino-animado-v1:frente:quieto' && animacion.fotograma === 1
  }, null, { timeout: 2000, polling: 'raf' })
  expect((await estado(pagina)).vida.parpadeos).toBe(1)
})

test('si el niño elige un rumbo a mitad de un parpadeo, el cuy camina de inmediato', async ({ page: pagina }) => {
  await abrir(pagina)
  await pagina.waitForFunction(
    () => /:frente:parpadeo$/.test(window.kusi.estado().animacionCuy.clave),
    null, { timeout: 8000, polling: 'raf' },
  )
  await pagina.keyboard.press('ArrowRight')
  // Un parpadeo completo dura 312 ms; caminar debe llegar bastante antes.
  await pagina.waitForFunction(
    () => window.kusi.estado().animacionCuy.clave === 'cuy-nino-animado-v1:derecha:caminar_lado',
    null, { timeout: 250, polling: 'raf' },
  )
  expect((await estado(pagina)).vida.parpadeos).toBe(1)
})

test('suenan los pasos del cuy, un pop por fruta correcta y un boing por la equivocada', async ({ page: pagina }) => {
  await abrir(pagina)
  const sonidos = async () => (await estado(pagina)).vida.sonidos.reproducciones

  // Las dos primeras frutas del nivel 1: pisadas del cuy y un pop por cada fruta.
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  let oidos = await sonidos()
  expect(oidos.paso_cuy).toBeGreaterThanOrEqual(3)
  expect(oidos.comer).toBe(2)
  expect(oidos.error ?? 0).toBe(0)

  // Al volver por el pasillo inferior el plátano llega antes que la fresa: rebota y suena el boing.
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 5, 9)
  await pagina.keyboard.press('ArrowLeft')
  await esperarCasilla(pagina, 5, 5)
  oidos = await sonidos()
  expect(oidos.error).toBeGreaterThanOrEqual(1)
  expect(oidos.comer).toBe(2)
})

test('la puerta suena al abrirse y el nivel nuevo empieza con su fanfarria', async ({ page: pagina }) => {
  const errores = []
  pagina.on('pageerror', (error) => errores.push(error.message))
  await abrir(pagina)
  // El recorrido del nivel 1 completo, con las flechas y guardando el giro.
  await pagina.keyboard.press('ArrowRight')
  await esperarCasilla(pagina, 1, 9)
  await pagina.keyboard.press('ArrowDown')
  await pagina.waitForFunction(() => window.kusi.estado().movimiento.fila === 2)
  await pagina.keyboard.press('ArrowLeft')
  await esperarCasilla(pagina, 3, 5)
  await pagina.keyboard.press('ArrowDown')
  await esperarCasilla(pagina, 5, 5)
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => {
    const actual = window.kusi.estado()
    return actual.nivel === 1 && actual.regla.recogidos === 4 && actual.puertaAbierta
  })
  const abierta = (await estado(pagina)).vida.sonidos.reproducciones
  expect(abierta.comer).toBe(4)
  expect(abierta.puerta).toBe(1)
  expect(abierta.nivel ?? 0).toBe(0)

  // La fanfarria la toca la escena que arranca; la anterior se destruye al reiniciarse.
  await pagina.waitForFunction(() => window.kusi.estado().nivel === 2)
  const siguiente = (await estado(pagina)).vida.sonidos.reproducciones
  expect(siguiente.nivel).toBe(1)
  expect(errores).toEqual([])
})

test('el zorro suena al patrullar y el cuy hace «ay» cuando lo atrapa', async ({ page: pagina }) => {
  await servirPasilloConZorro(pagina)
  await abrir(pagina)
  // El cuy espera contra el muro, así que solo se oyen los pasos del zorro.
  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForFunction(() => window.kusi.estado().vida.sonidos.reproducciones.paso_zorro >= 2,
    null, { timeout: 5000 })
  expect((await estado(pagina)).vida.sonidos.reproducciones.paso_cuy ?? 0).toBe(0)

  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().capturas === 1)
  expect((await estado(pagina)).vida.sonidos.reproducciones.captura).toBe(1)
})
