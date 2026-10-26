import { test, expect } from '@playwright/test'
import { abrir, estado, esperarCasilla, leerPaquete, servirPaquete } from './ayudas/laberinto.js'

async function servirEscenario(pagina, { mapa, enemigos }) {
  const paquete = await leerPaquete()
  paquete.retos = [{
    ...paquete.retos[0],
    mapa,
    objetos: [{ tipo: 'fresa', fila: 1, columna: 2 }],
    regla: { tipo: 'orden', secuencia: ['fresa'] },
    enemigos,
  }]
  await servirPaquete(pagina, paquete)
}

const zorroEn = (columna, movimiento = 'persigue_cerca') => ({
  tipo: 'zorro', fila: 1, columna, movimiento,
})

function comprobarSobreLaCabeza(actual, referencia) {
  const zorro = actual.zorros[0]
  const cuerpo = actual.vida.cuerpos.zorros[0]
  const aviso = zorro.avisoPersecucion
  expect(aviso.x).toBeCloseTo(zorro.x + cuerpo.desplazamiento.x, 5)
  expect(aviso.y).toBeLessThan(zorro.y - actual.casilla * 0.5)
  const separacion = aviso.y - zorro.y - cuerpo.desplazamiento.y
  if (referencia !== undefined) expect(separacion).toBeCloseTo(referencia, 5)
  return separacion
}

for (const parametros of ['', '&vida=0']) {
  test('«!» sigue la cabeza al empezar a perseguir y se oculta sin repetirse' +
    (parametros ? ' también con vida=0' : ''), async ({ page: pagina }) => {
    await servirEscenario(pagina, {
      mapa: ['##################', '#C..............P#', '##################'],
      // Uno detecta al cuy a cinco pasos; otro queda fuera del radio; el último
      // conserva la patrulla explícita del paquete, aunque también se mueva.
      enemigos: [zorroEn(6), zorroEn(10), zorroEn(13, 'patrulla')],
    })
    const inicial = await abrir(pagina, parametros)
    for (const zorro of inicial.zorros) {
      expect(zorro.avisoPersecucion).toMatchObject({ visible: false, texto: '!', apariciones: 0 })
    }

    // La flecha contra el muro inicia el juego y deja al cuy esperando.
    await pagina.keyboard.press('ArrowUp')
    await pagina.waitForFunction(() => window.kusi.estado().zorros[0].avisoPersecucion.visible,
      null, { polling: 'raf' })
    const empezando = await estado(pagina)
    expect(empezando.zorros[0]).toMatchObject({ persiguiendo: true, iniciosPersecucion: 1 })
    expect(empezando.zorros[0].avisoPersecucion.apariciones).toBe(1)
    const separacion = comprobarSobreLaCabeza(empezando)

    // Se mide el reloj de persecución del juego: un navegador lento puede
    // necesitar más tiempo de pared para dibujar estos mismos segundos.
    await pagina.waitForFunction(() => window.kusi.estado().zorros[0].segundosPersiguiendo >= 0.6,
      null, { polling: 'raf' })
    const caminando = await estado(pagina)
    expect(caminando.zorros[0].avisoPersecucion.visible).toBe(true)
    comprobarSobreLaCabeza(caminando, separacion)
    expect(caminando.zorros[0].avisoPersecucion.x).toBeLessThan(empezando.zorros[0].avisoPersecucion.x)
    // La persecución conserva el 60 % de la velocidad del cuy.
    const recorrido = (inicial.zorros[0].x - caminando.zorros[0].x) / inicial.casilla
    expect(recorrido / caminando.zorros[0].segundosPersiguiendo).toBeCloseTo(inicial.velocidad * 0.6, 3)

    await pagina.waitForFunction(() => window.kusi.estado().zorros[0].segundosPersiguiendo >= 0.95,
      null, { polling: 'raf' })
    const despues = await estado(pagina)
    expect(despues.zorros[0]).toMatchObject({ persiguiendo: true, iniciosPersecucion: 1 })
    expect(despues.zorros[0].avisoPersecucion).toMatchObject({ visible: false, apariciones: 1 })
    for (const zorro of despues.zorros.slice(1)) {
      expect(zorro.persiguiendo).toBe(false)
      expect(zorro.iniciosPersecucion).toBe(0)
      expect(zorro.avisoPersecucion).toMatchObject({ visible: false, apariciones: 0 })
    }
    expect(despues.zorros[1].x).toBeGreaterThan(inicial.zorros[1].x)
    expect(despues.zorros[2].x).toBeGreaterThan(inicial.zorros[2].x)
    expect(despues.capturas).toBe(0)
  })
}

async function tocarCasilla(pagina, actual, columna) {
  const lienzo = await pagina.locator('canvas').boundingBox()
  await pagina.mouse.click(
    lienzo.x + (actual.origenMapa.x + (columna + 0.5) * actual.casilla) * lienzo.width / 1280,
    lienzo.y + (actual.origenMapa.y + 1.5 * actual.casilla) * lienzo.height / 720,
  )
  return esperarCasilla(pagina, 1, columna)
}

test('tras cinco segundos persiguiendo descansa dos y vuelve a anunciar la persecución', async ({ page: pagina }) => {
  await servirEscenario(pagina, {
    mapa: ['#'.repeat(22), '#.......C...........P#', '#'.repeat(22)],
    enemigos: [zorroEn(3)],
  })
  const inicial = await abrir(pagina)
  await pagina.keyboard.press('ArrowUp')

  // Los toques reales alejan al cuy una casilla cada vez: el zorro permanece
  // dentro de cinco pasos sin alcanzarlo antes de completar los cinco segundos.
  for (const [indice, segundos] of [1, 1.55, 2.1, 2.65, 3.2, 3.75, 4.3].entries()) {
    await pagina.waitForFunction((umbral) => window.kusi.estado().zorros[0].segundosPersiguiendo >= umbral,
      segundos, { polling: 'raf' })
    await tocarCasilla(pagina, inicial, 9 + indice)
  }
  await pagina.waitForFunction(() => window.kusi.estado().zorros[0].segundosDescanso > 1.8,
    null, { timeout: 20_000, polling: 'raf' })
  const cansado = await estado(pagina)
  expect(cansado.capturas).toBe(0)
  expect(cansado.zorros[0]).toMatchObject({ persiguiendo: false, moviendose: false, iniciosPersecucion: 1 })
  expect(cansado.zorros[0].avisoPersecucion).toMatchObject({ visible: false, apariciones: 1 })
  expect(cansado.zorros[0].segundosDescanso).toBeLessThanOrEqual(2)
  expect((cansado.zorros[0].x - inicial.zorros[0].x) / inicial.casilla).toBeCloseTo(5 * inicial.velocidad * 0.6, 3)

  await pagina.waitForFunction(() => {
    const zorro = window.kusi.estado().zorros[0]
    return zorro.segundosDescanso > 0 && zorro.segundosDescanso <= 0.7
  }, null, { polling: 'raf' })
  const descansando = await estado(pagina)
  expect(descansando.capturas).toBe(0)
  expect(descansando.zorros[0]).toMatchObject({
    fila: cansado.zorros[0].fila, columna: cansado.zorros[0].columna,
    progreso: cansado.zorros[0].progreso, persiguiendo: false, moviendose: false,
  })
  expect(descansando.zorros[0].x).toBeCloseTo(cansado.zorros[0].x, 5)

  await pagina.waitForFunction(() => {
    const zorro = window.kusi.estado().zorros[0]
    return zorro.iniciosPersecucion === 2 && zorro.avisoPersecucion.visible
  }, null, { polling: 'raf' })
  const reanudando = await estado(pagina)
  expect(reanudando.capturas).toBe(0)
  expect(reanudando.zorros[0]).toMatchObject({ persiguiendo: true, segundosDescanso: 0, iniciosPersecucion: 2 })
  expect(reanudando.zorros[0].segundosPersiguiendo).toBeLessThan(0.3)
  expect(reanudando.zorros[0].avisoPersecucion).toMatchObject({ visible: true, texto: '!', apariciones: 2 })
  comprobarSobreLaCabeza(reanudando)
})
