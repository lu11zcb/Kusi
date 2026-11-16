import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

// El catálogo de géneros de juego (kit/generos/) lo leen el proponedor y el supervisor. Esta prueba
// vigila que tenga la forma que esperan y que no se cuele nada que no debe estar en el repositorio.

const CARPETA = new URL('../../kit/generos/', import.meta.url)
const GENEROS = ['accion-y-disparos', 'aventura', 'deportes-y-carreras', 'estrategia', 'lucha', 'plataformas', 'puzles-y-logica', 'rol', 'terror']
const leer = (archivo) => readFileSync(new URL(archivo, CARPETA), 'utf8')

test('el catálogo tiene su índice, sus fuentes y un archivo por género', () => {
  const archivos = readdirSync(CARPETA).filter((nombre) => nombre.endsWith('.md')).sort()
  assert.deepEqual(archivos, ['README.md', 'fuentes.md', ...GENEROS.map((genero) => genero + '.md')].sort())
  const indice = leer('README.md')
  for (const genero of GENEROS) assert.ok(indice.includes('(' + genero + '.md)'), 'el índice no enlaza ' + genero)
  assert.match(indice, /Cómo se usa en el taller/)
  assert.match(indice, /kit\/ejemplos\/exploracion/)
  assert.match(indice, /kit\/ejemplos\/plataformas/)
})

test('cada género trae fichas con sus cinco líneas, la sección del motor y seis ideas', () => {
  for (const genero of GENEROS) {
    const texto = leer(genero + '.md')
    const fichas = texto.split(/^### /m).slice(1)
    assert.ok(fichas.length >= 1, genero + ' no tiene fichas')
    for (const ficha of fichas) {
      for (const etiqueta of ['Qué hace el jugador:', 'Controles y cámara:', 'Qué lo hace entretenido:', 'Qué se puede adaptar', 'Qué NO se debe copiar']) {
        assert.ok(ficha.includes('**' + etiqueta), genero + ': a la ficha «' + ficha.split('\n')[0] + '» le falta «' + etiqueta + '»')
      }
    }
    assert.match(texto, /## Qué necesita el motor/, genero + ' no tiene la sección del motor')
    assert.equal((texto.match(/^\d+\. \*\*/gm) ?? []).length, 6, genero + ' no tiene exactamente 6 ideas de adaptación')
  }
})

test('el catálogo no nombra a empresas de IA ni a personas, y no copia dibujos', () => {
  for (const archivo of readdirSync(CARPETA).filter((nombre) => nombre.endsWith('.md'))) {
    const texto = leer(archivo)
    assert.doesNotMatch(texto, /codex|chatgpt|claude|openai|anthropic|\bgpt\b/i, archivo + ' nombra a una empresa de IA')
    assert.doesNotMatch(texto, /\bLuis\b/, archivo + ' nombra a una persona del equipo')
    assert.doesNotMatch(texto, /!\[[^\]]*\]\(/, archivo + ' incluye una imagen')
  }
  const peso = readdirSync(CARPETA).reduce((suma, archivo) => suma + readFileSync(path.join(CARPETA.pathname, archivo)).length, 0)
  assert.ok(peso < 150 * 1024, 'el catálogo pesa ' + peso + ' bytes: ya es demasiado para que el proponedor lo lea')
})

test('las fuentes se declaran y lo que no se pudo confirmar se dice «No encontrado»', () => {
  const fuentes = leer('fuentes.md')
  assert.ok((fuentes.match(/https:\/\//g) ?? []).length >= 30)
  assert.match(fuentes, /No encontrado/)
})
