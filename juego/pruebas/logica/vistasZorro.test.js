import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { validarSpritePersonaje } from '../../src/datos/validarSpritePersonaje.js'

test('el zorro conserva una fila por vista y solo voltea el lado izquierdo', async () => {
  const datos = validarSpritePersonaje(JSON.parse(await readFile(
    new URL('../../public/dibujos/zorro-animado-v1.json', import.meta.url), 'utf8',
  )), 'zorro')
  assert.equal(datos.imagen, 'zorro-cuadros-v4.png')
  const inicios = { frente: 0, derecha: 3, izquierda: 3, espaldas: 6 }
  for (const [direccion, inicio] of Object.entries(inicios)) {
    const vista = datos.animaciones[direccion]
    assert.deepEqual(vista.caminar.fotogramas, [inicio, inicio + 1, inicio + 2, inicio + 1])
    assert.deepEqual(vista.quieto.fotogramas, [inicio + 1])
    assert.equal(vista.caminar.voltear === true, direccion === 'izquierda')
    assert.deepEqual(vista.cansado.fotogramas, [9, 10, 11, 10])
  }
})
