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

for (const parametros of ['&vida=0']) {
  test('«!» sigue la cabeza durante la alerta y se oculta sin repetirse' +
    (parametros ? ' también con vida=0' : ''), async ({ page: pagina }) => {
    // Desde el 27 de octubre el zorro explora apenas aparece el nivel. Empieza a
    // nueve pasos del cuy, fuera de su radio de cinco, y avisa recién al acercarse.
    await servirEscenario(pagina, {
      mapa: ['##################', '#C..............P#', '##################'],
      enemigos: [zorroEn(10)],
    })
    const inicial = await abrir(pagina, parametros)
    expect(inicial.zorros[0].avisoPersecucion).toMatchObject({ visible: false, texto: '!', apariciones: 0 })

    // Al detectar al cuy, el zorro se queda en alerta 0,6 s con el «!» encima.
    await pagina.waitForFunction(() => window.kusi.estado().zorros[0].avisoPersecucion.visible,
      null, { polling: 'raf', timeout: 30000 })
    const alerta = await estado(pagina)
    expect(alerta.zorros[0]).toMatchObject({ fase: 'alerta', iniciosPersecucion: 1 })
    expect(alerta.zorros[0].avisoPersecucion.apariciones).toBe(1)
    comprobarSobreLaCabeza(alerta)

    // Después corre al 60 % de la velocidad del cuy y el «!» se oculta.
    await pagina.waitForFunction(() => window.kusi.estado().zorros[0].segundosPersiguiendo >= 0.7,
      null, { polling: 'raf' })
    const persiguiendo = await estado(pagina)
    expect(persiguiendo.zorros[0]).toMatchObject({ fase: 'perseguir', persiguiendo: true, iniciosPersecucion: 1 })
    expect(persiguiendo.zorros[0].avisoPersecucion).toMatchObject({ visible: false, apariciones: 1 })
    const recorrido = (alerta.zorros[0].x - persiguiendo.zorros[0].x) / inicial.casilla
    expect(recorrido / persiguiendo.zorros[0].segundosPersiguiendo).toBeCloseTo(inicial.velocidad * 0.6, 1)
    expect(persiguiendo.capturas).toBe(0)
  })
}

test('el zorro avisa quieto con su fila de alerta y luego corre al 60 %', async ({ page: pagina }) => {
  await servirEscenario(pagina, {
    mapa: ['##################', '#C..............P#', '##################'],
    enemigos: [zorroEn(6)],
  })
  const inicial = await abrir(pagina)
  await pagina.keyboard.press('ArrowUp')
  await pagina.waitForFunction(() => window.kusi.estado().zorros[0].fase === 'alerta')
  const alerta = await estado(pagina)
  expect(alerta.zorros[0].avisoPersecucion).toMatchObject({ visible: true, texto: '❗', apariciones: 1 })
  expect(alerta.zorros[0].animacion).toMatch(/:frente:alerta$/)
  expect([12, 13, 14]).toContain(alerta.zorros[0].fotograma)
  comprobarSobreLaCabeza(alerta)
  await pagina.waitForTimeout(180)
  expect((await estado(pagina)).zorros[0].x).toBeCloseTo(alerta.zorros[0].x, 4)
  await pagina.waitForFunction(() => window.kusi.estado().zorros[0].segundosPersiguiendo >= 0.7)
  const persiguiendo = await estado(pagina)
  expect(persiguiendo.zorros[0]).toMatchObject({ fase: 'perseguir', mirando: 'izquierda', flipX: true })
  expect(persiguiendo.zorros[0].avisoPersecucion.visible).toBe(false)
  const distancia = (inicial.zorros[0].x - persiguiendo.zorros[0].x) / inicial.casilla
  expect(distancia / persiguiendo.zorros[0].segundosPersiguiendo).toBeCloseTo(inicial.velocidad * 0.6, 2)
})

test('el zorro persigue cinco segundos, descansa con su fila cansada y vuelve a buscar', async ({ page: pagina }) => {
  await servirEscenario(pagina, {
    mapa: ['#'.repeat(22), '#.......C...........P#', '#'.repeat(22)], enemigos: [zorroEn(3)],
  })
  await abrir(pagina)
  // El niño se aleja de verdad, con una flecha. El zorro mantiene la persecución
  // iniciada durante cinco segundos aunque el niño salga de su radio inicial.
  await pagina.keyboard.press('ArrowRight')
  await pagina.waitForFunction(() => window.kusi.estado().zorros[0].fase === 'cansado', null, { timeout: 15000 })
  const cansado = await estado(pagina)
  expect(cansado.capturas).toBe(0)
  expect(cansado.zorros[0]).toMatchObject({ moviendose: false, persiguiendo: false })
  expect(cansado.zorros[0].animacion).toMatch(/:frente:cansado$/)
  expect([9, 10, 11]).toContain(cansado.zorros[0].fotograma)
  await pagina.waitForTimeout(700)
  expect((await estado(pagina)).zorros[0].x).toBeCloseTo(cansado.zorros[0].x, 4)
  await pagina.waitForFunction(() => window.kusi.estado().zorros[0].fase === 'buscar')
  expect((await estado(pagina)).zorros[0].avisoPersecucion.visible).toBe(false)
})
