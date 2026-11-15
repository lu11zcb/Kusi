import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

// Los contenidos por grado (kit/curriculo/) son para que el proponedor sepa qué se enseña y de
// dónde sale. Esta prueba comprueba su forma y que no se haya perdido ningún tema de la
// investigación; no comprueba que lo escrito sea cierto (eso es la revisión de una persona).

const CARPETA = new URL('../../kit/curriculo/', import.meta.url)
const ORIGENES = new URL('../../kit/originales/curriculo/', import.meta.url)
const AREAS = ['matematica', 'comunicacion', 'ciencia-y-tecnologia', 'personal-social', 'arte-y-cultura', 'educacion-fisica', 'educacion-religiosa']
const NOMBRES = ['1-', '2-'].flatMap((grado) => AREAS.map((area) => grado + area + '.md'))
const ETIQUETAS = ['Qué aprende el niño', 'Lo que se enseña', 'Ejemplos y actividades del documento', 'Cita corta', 'Fuente']
const leer = (nombre) => readFileSync(new URL(nombre, CARPETA), 'utf8')
const json = (nombre) => JSON.parse(readFileSync(new URL(nombre, ORIGENES), 'utf8'))
const antesDelPrograma = (texto) => texto.split('## Lo que pide el Programa')[0]

test('hay un archivo por grado y área (14) y nada más que el README', () => {
  assert.deepEqual(readdirSync(CARPETA).filter((n) => n !== 'README.md').sort(), [...NOMBRES].sort())
})

test('ningún archivo lleva enlaces, pasa de 30 KB ni olvida decir que no está revisado', () => {
  for (const nombre of NOMBRES) {
    const texto = leer(nombre)
    assert.doesNotMatch(texto, /https?:|www\./, nombre + ' lleva un enlace')
    assert.ok(Buffer.byteLength(texto) < 30 * 1024, nombre + ' pasa de 30 KB')
    assert.match(texto, /\*\*Revisado:\*\* no/)
    assert.match(texto, /^# .+ · [12]\.º de primaria/)
  }
})

test('cada tema escrito tiene sus cinco líneas, una cita de 25 palabras o menos y una fuente que está entre los documentos usados', () => {
  let temas = 0
  for (const nombre of NOMBRES) {
    const texto = leer(nombre)
    const usados = new Set([...texto.matchAll(/^- ([A-Za-z0-9]+) — /gm)].map((m) => m[1]))
    for (const bloque of antesDelPrograma(texto).split(/\n(?=### )/).filter((parte) => parte.startsWith('### '))) {
      temas += 1
      for (const etiqueta of ETIQUETAS) assert.ok(bloque.includes('- **' + etiqueta + ':**'), nombre + ': «' + bloque.split('\n')[0] + '» sin «' + etiqueta + '»')
      const cita = /- \*\*Cita corta:\*\* «(.+)»/.exec(bloque)[1]
      assert.ok(cita.split(/\s+/).length <= 25, nombre + ': cita de más de 25 palabras')
      const fuente = /- \*\*Fuente:\*\* ([A-Za-z0-9]+),/.exec(bloque)
      assert.ok(fuente && usados.has(fuente[1]), nombre + ': la fuente de «' + bloque.split('\n')[0] + '» no está en «Documentos usados»')
    }
  }
  assert.ok(temas >= 78, 'hay muy pocos temas escritos: ' + temas)
})

test('los temas con detalle de lo que se enseña son los de las áreas que tienen cuaderno, guía o unidad', () => {
  for (const nombre of NOMBRES) {
    const escritos = (antesDelPrograma(leer(nombre)).match(/^### /gm) ?? []).length
    if (nombre.includes('religiosa')) assert.equal(escritos, 0, nombre + ' no tiene documento por grado: no debe traer temas inventados')
    else assert.ok(escritos >= 1, nombre + ' no tiene ningún tema escrito')
  }
})

test('no se perdió ningún tema ni desempeño de la investigación: todos están en su archivo con su documento y su página', () => {
  const documentoPorEnlace = new Map(json('documentos_primaria_peru.json').map((documento) => [documento.pdf, documento.id]))
  const temas = json('temas_primaria_peru.json')
  const nombreDeArea = (area) => area.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  for (const tema of temas) {
    const texto = leer(tema.grado + '-' + nombreDeArea(tema.area) + '.md')
    const linea = '- ' + tema.tema + ' — ' + documentoPorEnlace.get(tema.documento) + ', pág. ' + tema.pagina + '\n'
    assert.ok(texto.includes(linea), 'falta el tema «' + tema.tema + '» en ' + tema.grado + ' ' + tema.area)
  }
  assert.equal(temas.length, 389)
  const desempenos = NOMBRES.reduce((suma, nombre) => suma + (leer(nombre).match(/\*\*Lo que el niño logra en este grado\*\*[^\n]*\n\n((?:- .+\n)+)/g) ?? [])
    .reduce((sumaBloques, bloque) => sumaBloques + bloque.split('\n').filter((l) => l.startsWith('- ')).length, 0), 0)
  assert.equal(desempenos, 211)
})

test('Ciencia y Tecnología de 1.º dice lo que se sabe de los huesos y no inventa una lista', () => {
  const texto = leer('1-ciencia-y-tecnologia.md')
  assert.match(texto, /### Los huesos y las radiografías/)
  assert.match(texto, /No hay una lista de nombres de huesos/)
  assert.match(texto, /No encontrado en los documentos revisados/)
})
