import { test, expect } from '@playwright/test'
import { leerPaquete } from '../ayudas/laberinto.js'

const mandar = (pagina, datos) => pagina.evaluate((mensaje) => window.postMessage(mensaje, '*'), datos)
async function escuchar(pagina) {
  await pagina.addInitScript(() => {
    window.__controlPausa = []
    window.addEventListener('message', ({ data }) => {
      if (['listo', 'cargado', 'pausado', 'reanudado'].includes(data?.tipo)) window.__controlPausa.push(data)
    })
  })
}

test('pausar detiene de verdad zorros, animaciones y entrada; reanudar conserva la partida', async ({ page }) => {
  await escuchar(page)
  await page.goto('/?nivel=2')
  await page.waitForFunction(() => window.kusi?.listo && window.kusi.estado().nivel === 2)
  await mandar(page, { tipo: 'pausar' })
  await page.waitForFunction(() => window.__controlPausa.some((mensaje) => mensaje.tipo === 'pausado'))
  const antes = await page.evaluate(() => ({
    zorros: window.kusi.estado().zorros,
    movimiento: window.kusi.estado().movimiento,
    animacion: window.kusi.estado().animacionCuy,
    avisos: window.kusi.avisos.length,
    pausa: window.__controlPausa.find((mensaje) => mensaje.tipo === 'pausado'),
  }))
  expect(antes.pausa).toMatchObject({ tipo: 'pausado', nivel: 2 })
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(900)
  const despues = await page.evaluate(() => ({
    zorros: window.kusi.estado().zorros,
    movimiento: window.kusi.estado().movimiento,
    animacion: window.kusi.estado().animacionCuy,
    avisos: window.kusi.avisos.length,
  }))
  expect(despues).toEqual({ zorros: antes.zorros, movimiento: antes.movimiento, animacion: antes.animacion, avisos: antes.avisos })
  await mandar(page, { tipo: 'reanudar' })
  await expect.poll(() => page.evaluate(() => JSON.stringify(window.kusi.estado().zorros))).not.toBe(JSON.stringify(antes.zorros))
  expect(await page.evaluate(() => window.kusi.avisos[0].partida)).toBe(antes.pausa.partida)
})

test('reabrir el reto confirmado conserva versión, partida y orden sin repetir listo ni inicio', async ({ page }) => {
  await escuchar(page)
  await page.goto('/?paquete=mensaje&nivel=2')
  await page.waitForFunction(() => window.__controlPausa.some((mensaje) => mensaje.tipo === 'listo'))
  const paquete = await leerPaquete()
  const partida = { id: 'partida-confirmada-de-prueba', orden: 8,
    avisados: ['listo', 'inicio', 'reto_completado:1'], cerrada: false }
  await mandar(page, { tipo: 'paquete', paquete, partida })
  await page.waitForFunction(() => window.kusi?.listo && window.kusi.estado().nivel === 2)
  await expect.poll(() => page.evaluate(() => window.__controlPausa.filter((mensaje) => mensaje.tipo === 'cargado').length)).toBe(1)
  expect(await page.evaluate(() => window.kusi.avisos.filter((aviso) => aviso.partida === 'partida-confirmada-de-prueba'))).toEqual([])
  const ayuda = await page.evaluate(() => window.kusi.ubicar('ayuda'))
  await page.mouse.click(ayuda.x, ayuda.y)
  await expect.poll(() => page.evaluate(() => window.kusi.avisos.findLast((aviso) => aviso.partida === 'partida-confirmada-de-prueba')))
    .toMatchObject({ tipo: 'ayuda', nivel: 2, partida: partida.id, orden: 9 })
  expect(await page.evaluate(() => window.kusi.estado().mapa)).toEqual(paquete.retos[1].mapa)
})
