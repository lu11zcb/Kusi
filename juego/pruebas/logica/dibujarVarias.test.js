import test from 'node:test'
import assert from 'node:assert/strict'
import { dibujarVarias, MAX_EN_PARALELO } from '../../taller/dibujar_varias.mjs'
import { limiteDe, resultadoDePausa } from '../../taller/trabajador/pausa.js'

// Un dibujante de mentira que tarda un poco y anota cuántos trabajan a la vez.
function dibujanteDePrueba({ fallar = [] } = {}) {
  const estado = { activos: 0, maximo: 0, pedidos: [] }
  const dibujarPieza = async (pedido) => {
    estado.pedidos.push(pedido)
    estado.activos += 1
    estado.maximo = Math.max(estado.maximo, estado.activos)
    await new Promise((listo) => setTimeout(listo, 30))
    estado.activos -= 1
    if (fallar.includes(pedido.id)) throw new Error('sin imagen')
    return { id: pedido.id, pasa: true, siguiente: 'revisor' }
  }
  return { estado, dibujarPieza }
}

test('varias piezas se dibujan a la vez, sin pasar del máximo, y los resultados siguen el orden pedido', async () => {
  const { estado, dibujarPieza } = dibujanteDePrueba()
  const piezas = Array.from({ length: 12 }, (_, numero) => ({ id: 'pieza-' + numero, que: 'a thing' }))
  const resultados = await dibujarVarias({ carpeta: '/t/x', piezas }, { roles: {}, dibujarPieza })
  assert.deepEqual(resultados.map((resultado) => resultado.id), piezas.map((pieza) => pieza.id))
  assert.ok(resultados.every((resultado) => resultado.pasa))
  assert.ok(estado.maximo > 1, 'no trabajaron a la vez')
  assert.ok(estado.maximo <= MAX_EN_PARALELO, 'pasó del máximo: ' + estado.maximo)
  // Cada pieza lleva su carpeta y sus opciones tal como las pidió el supervisor.
  assert.equal(estado.pedidos.every((pedido) => pedido.carpeta === '/t/x'), true)
})

test('lleva a cada pieza sus opciones (fondo, cuento, apoyado) y una que falla no tumba a las demás', async () => {
  const { estado, dibujarPieza } = dibujanteDePrueba({ fallar: ['b'] })
  const resultados = await dibujarVarias({ carpeta: '/t/x', piezas: [
    { id: 'a', que: 'x', apoyado: true }, { id: 'b', que: 'y' }, { id: 'fondo-cuento-1', que: 'z', cuento: true },
  ] }, { roles: {}, dibujarPieza })
  assert.equal(resultados[0].pasa, true)
  assert.equal(resultados[1].pasa, false)
  assert.match(resultados[1].motivo, /sin imagen/)
  assert.equal(resultados[1].siguiente, 'corregir')
  assert.equal(resultados[2].pasa, true)
  assert.equal(estado.pedidos.find((pedido) => pedido.id === 'a').apoyado, true)
  assert.equal(estado.pedidos.find((pedido) => pedido.id === 'fondo-cuento-1').cuento, true)
})

test('sin lista, o con ids repetidos, no se pide nada', async () => {
  const { estado, dibujarPieza } = dibujanteDePrueba()
  for (const piezas of [null, [], [{ id: 'a', que: 'x' }, { id: 'a', que: 'y' }]]) {
    const [resultado] = await dibujarVarias({ carpeta: '/t/x', piezas }, { roles: {}, dibujarPieza })
    assert.equal(resultado.pasa, false)
  }
  assert.equal(estado.pedidos.length, 0)
})

test('el mundo de la aventura llega a cada pieza, y una pieza puede traer el suyo', async () => {
  const { estado, dibujarPieza } = dibujanteDePrueba()
  await dibujarVarias({ carpeta: '/t/x', mundo: 'a cloud kingdom', piezas: [{ id: 'a', que: 'x' }, { id: 'b', que: 'y', mundo: 'otro' }] }, { roles: {}, dibujarPieza })
  assert.equal(estado.pedidos.find((pedido) => pedido.id === 'a').mundo, 'a cloud kingdom')
  assert.equal(estado.pedidos.find((pedido) => pedido.id === 'b').mundo, 'otro')
})

test('un lote propaga el límite y deja para después las piezas que no se lanzaron', async () => {
  const lanzadas = []
  const ahora = Date.now()
  const pausa = { rol: 'dibujante', hasta: ahora + 900_000, sondear: true }
  const piezas = Array.from({ length: MAX_EN_PARALELO + 2 }, (_, numero) => ({ id: 'pieza-' + numero, que: 'objeto' }))
  const resultados = await dibujarVarias({ carpeta: '/t/x', piezas }, { async dibujarPieza({ id }) {
    lanzadas.push(id)
    if (id === 'pieza-0') return { id, ...resultadoDePausa(pausa) }
    await new Promise(setImmediate)
    return { id, pasa: true, siguiente: 'revisor' }
  } })
  assert.deepEqual(lanzadas, piezas.slice(0, MAX_EN_PARALELO).map(({ id }) => id))
  assert.deepEqual(resultados.map(({ id }) => id), piezas.map(({ id }) => id))
  assert.equal(resultados[1].siguiente, 'revisor')
  assert.ok(resultados.slice(MAX_EN_PARALELO).every(({ siguiente, intento }) => siguiente === 'pausa' && intento === undefined))
  const salida = JSON.stringify({ type: 'item.completed', item: { type: 'command_execution', aggregated_output: JSON.stringify(resultados) } })
  assert.deepEqual(limiteDe({ salida }, 'supervisor', ahora), pausa)
})
