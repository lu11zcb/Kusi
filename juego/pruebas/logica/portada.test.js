import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { dibujarPortada, pedidoDePortada } from '../../taller/trabajador/portada.js'
import { pedidoDeDibujo } from '../../taller/dibujar.mjs'

// Una carpeta de trabajo mínima: la propuesta en trabajo.json y el mundo en plan.md.
async function carpetaDePrueba({ plan = true } = {}) {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-portada-'))
  await writeFile(path.join(carpeta, 'trabajo.json'), JSON.stringify({
    id: 'x', tipo: 'crear', entrada: { propuesta: { titulo: 'Las vocales congeladas', historia: 'Kusi y tú viajan a la Antártida.' } },
  }))
  if (plan) await writeFile(path.join(carpeta, 'plan.md'), '# Plan\n\n**Mundo:** la Antártida al atardecer, con icebergs y pingüinos.\n')
  return carpeta
}

test('la portada describe el juego con su título, su historia y el mundo del plan', async () => {
  const carpeta = await carpetaDePrueba()
  try {
    const { que, mundo } = await pedidoDePortada(carpeta)
    assert.match(que, /Las vocales congeladas/)
    assert.match(que, /Antártida\./)
    assert.equal(mundo, 'la Antártida al atardecer, con icebergs y pingüinos.')
  } finally { await rm(carpeta, { recursive: true, force: true }) }
})

test('si el dibujo pasa, queda como portada.png aparte de las piezas del juego', async () => {
  const carpeta = await carpetaDePrueba()
  try {
    await mkdir(path.join(carpeta, 'piezas'))
    const dibujada = path.join(carpeta, 'piezas', 'portada.png')
    await writeFile(dibujada, 'png-simulado')
    let pedido
    const resultado = await dibujarPortada({
      carpeta, roles: { dibujante: {} }, registrar: () => {}, restanteMs: 60000,
      dibujarPieza: async (datos) => { pedido = datos; return { pasa: true, archivo: dibujada } },
    })
    assert.equal(resultado.estado, 'dibujada')
    assert.equal(pedido.id, 'portada')
    assert.equal(pedido.portada, true)
    assert.equal(await readFile(path.join(carpeta, 'portada.png'), 'utf8'), 'png-simulado')
    assert.equal(existsSync(dibujada), false)
  } finally { await rm(carpeta, { recursive: true, force: true }) }
})

test('si el dibujo no pasa, no hay tiempo o no hay dibujante, el juego sigue sin portada', async () => {
  const carpeta = await carpetaDePrueba({ plan: false })
  try {
    const base = { carpeta, roles: { dibujante: {} }, registrar: () => {}, restanteMs: 60000 }
    assert.equal((await dibujarPortada({ ...base, dibujarPieza: async () => ({ pasa: false, motivo: 'Tiene letras.' }) })).estado, 'sin_portada')
    assert.equal((await dibujarPortada({ ...base, restanteMs: 0, dibujarPieza: async () => assert.fail('no debe dibujar') })).estado, 'omitida')
    assert.equal((await dibujarPortada({ ...base, roles: {}, dibujarPieza: async () => assert.fail('no debe dibujar') })).estado, 'omitida')
    assert.equal(existsSync(path.join(carpeta, 'portada.png')), false)
  } finally { await rm(carpeta, { recursive: true, force: true }) }
})

test('el pedido de la portada es apaisado, sin personajes y sin letras', () => {
  const pedido = pedidoDeDibujo({ id: 'portada', que: 'la Antártida', portada: true, intento: 1 })
  const texto = Array.isArray(pedido) ? pedido.join(' ') : JSON.stringify(pedido)
  assert.match(texto, /16:9 cover illustration/)
  assert.match(texto, /No people, no animals and no characters/)
  assert.match(texto, /No text, no letters/)
})
