import assert from 'node:assert/strict'
import test from 'node:test'
import { cargarModulo } from './cargar-modulo.mjs'

const { tituloDelJuego } = await import(await cargarModulo(new URL('../src/docente/utilidadesDocente.ts', import.meta.url)))

// El docente escribe un tema («las vocales»); el juego se llama como lo propuso Kusi.
test('el juego se muestra con el título que propuso Kusi', () => {
  assert.equal(tituloDelJuego({ tema: 'las vocales', propuesta: { titulo: 'Las vocales congeladas' } }), 'Las vocales congeladas')
})

test('sin propuesta, o si es anterior a los títulos, se muestra el tema del docente', () => {
  assert.equal(tituloDelJuego({ tema: 'las vocales', propuesta: null }), 'las vocales')
  assert.equal(tituloDelJuego({ tema: 'las vocales', propuesta: { titulo: null } }), 'las vocales')
  assert.equal(tituloDelJuego({ tema: 'las vocales', propuesta: { titulo: '   ' } }), 'las vocales')
})
