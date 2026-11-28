import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MUSICA, VOLUMEN, acercarVolumen, rutaPista, siguientePista, volumenDeMusica } from '../../kit/reproductor/logica/musica.js'

const RECURSOS = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../kit/recursos')

test('cada pista de cada ánimo existe y su origen y licencia están en ORIGEN.md', () => {
  const origen = readFileSync(path.join(RECURSOS, 'musica/ORIGEN.md'), 'utf8')
  for (const [animo, lista] of Object.entries(MUSICA)) {
    assert.ok(lista.length > 0, animo)
    for (const pista of lista) {
      assert.ok(existsSync(path.join(RECURSOS, rutaPista(pista))), pista)
      assert.match(origen, new RegExp('`' + pista + '\\.m4a`'), pista)
    }
  }
})

test('la pista siguiente nunca repite la que acaba de sonar', () => {
  const lista = ['a', 'b', 'c']
  for (const azar of [0, 0.4, 0.99]) assert.notEqual(siguientePista(lista, 'b', () => azar), 'b')
  assert.equal(siguientePista(['sola'], 'sola', () => 0.5), 'sola')
  assert.throws(() => siguientePista([], null))
})

test('la música baja cuando Kusi habla y se calla con el botón Sonido', () => {
  assert.equal(volumenDeMusica({ base: VOLUMEN.fondo }), VOLUMEN.fondo)
  assert.equal(volumenDeMusica({ base: VOLUMEN.fondo, hablando: true }), VOLUMEN.bajoLaVoz)
  assert.ok(VOLUMEN.bajoLaVoz < VOLUMEN.fondo / 2)
  assert.equal(volumenDeMusica({ base: VOLUMEN.fiesta, silenciado: true }), 0)
})

test('el fundido se acerca al volumen pedido sin pasarse', () => {
  assert.equal(acercarVolumen(0, 0.28, 100, 1000), 0.1)
  assert.equal(acercarVolumen(0.25, 0.28, 100, 1000), 0.28)
  assert.ok(Math.abs(acercarVolumen(0.28, 0.1, 50, 1000) - 0.23) < 1e-9)
  assert.equal(acercarVolumen(0.3, 0.3, 16, 1000), 0.3)
})
