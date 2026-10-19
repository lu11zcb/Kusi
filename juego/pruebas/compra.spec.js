import { test, expect } from '@playwright/test'

// Lee el estado del juego (window.kusi lo expone para las pruebas).
const estado = (pagina) => pagina.evaluate(() => window.kusi.estado())

// Hace clic de verdad sobre el lienzo, en el centro de lo que el juego llama `nombre`.
async function tocar(pagina, nombre) {
  const punto = await (await pagina.waitForFunction((n) => window.kusi.ubicar(n), nombre)).jsonValue()
  await pagina.mouse.click(punto.x, punto.y)
}

// Abre el juego rápido, toca «¡Vamos!» y toca el puesto de pan: el cuy camina solo hasta su frente.
async function llegarAlPuestoDePan(pagina) {
  await pagina.goto('/?rapido=1')
  await pagina.waitForFunction(() => window.kusi?.listo)

  // Antes de «¡Vamos!» el cuy no se mueve
  expect((await estado(pagina)).puedeMoverse).toBe(false)
  await tocar(pagina, 'vamos')
  await expect.poll(async () => (await estado(pagina)).puedeMoverse).toBe(true)

  await tocar(pagina, 'puesto:p1')
  await pagina.waitForFunction(() => {
    const ahora = window.kusi.estado()
    return ahora.puestoCercano === 'p1' && !ahora.caminando && ahora.velocidad === 0
  })

  // Quedó frente al puesto, mirándolo
  const frente = await estado(pagina)
  const pan = frente.puestos.find((puesto) => puesto.id === 'p1')
  expect(Math.hypot(frente.cuyX - pan.frente.x, frente.cuyY - pan.frente.y)).toBeLessThan(10)
  expect(frente.mirando).toBe('espaldas')
  expect(frente.puestoCercano).toBe('p1')

  await tocar(pagina, 'hablar')
  await expect.poll(async () => (await estado(pagina)).ventanaAbierta).toBe(true)
  // La ventana aparece con una animación corta
  await pagina.waitForTimeout(300)
}

test('compra la harina con la moneda de 5 y recibe 2 de vuelto', async ({ page: pagina }) => {
  const consola = []
  pagina.on('console', (mensaje) => consola.push(mensaje.text()))

  await llegarAlPuestoDePan(pagina)
  await tocar(pagina, 'producto:harina')
  await tocar(pagina, 'dinero:5')
  await tocar(pagina, 'pagar')

  // Espera a que el vuelto termine de llegar a la cartera
  await expect
    .poll(async () => {
      const ahora = await estado(pagina)
      return ahora.ventanaOcupada ? null : ahora.ultimoVuelto
    })
    .toEqual([2])

  const final = await estado(pagina)
  expect(final.plata).toBe(12)
  expect(final.cartera).toEqual([10, 2])
  expect(final.textoPlata).toBe('12 soles')
  expect(final.cartel).toContain('harina 1/1')

  // El aviso de la compra quedó en la lista y salió en la consola con «[Kusi]»
  const compra = await pagina.evaluate(() => window.kusi.avisos.find((aviso) => aviso.tipo === 'compra'))
  expect(compra).toMatchObject({ puesto: 'p1', producto: 'harina', precio: 3, pago: [5], vuelto: [2], plata: 12 })
  expect(consola.some((linea) => linea.startsWith('[Kusi]') && linea.includes('"tipo":"compra"'))).toBe(true)

  // «Listo» cierra la ventana y el cuy sigue frente al puesto
  await tocar(pagina, 'listo')
  await expect.poll(async () => (await estado(pagina)).ventanaAbierta).toBe(false)
  const despues = await estado(pagina)
  expect([despues.cuyX, despues.cuyY]).toEqual([final.cuyX, final.cuyY])
})

test('si no alcanza, el vendedor avisa y no se pierde plata', async ({ page: pagina }) => {
  await llegarAlPuestoDePan(pagina)
  await tocar(pagina, 'producto:harina')
  // Paga sin marcar nada
  await tocar(pagina, 'pagar')

  await expect
    .poll(() => pagina.evaluate(() => window.kusi.avisos.some((aviso) => aviso.tipo === 'pago_insuficiente')))
    .toBe(true)
  const final = await estado(pagina)
  expect(final.plata).toBe(15)
  expect(final.cartera).toEqual([10, 5])
  expect(final.cartel).toContain('harina 0/1')
})
