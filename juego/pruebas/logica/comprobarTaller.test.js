import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { revisarCodigo } from '../../taller/trabajador/comprobar.js'

const GUION = {
  titulo: 'Ayuda en la plaza',
  historia: 'Kusi llegó a la plaza.',
  consigna: 'Recoge la manzana.',
  retos: [
    { consigna: 'Trae una manzana.', ayudas: ['Mira junto al árbol.', 'Busca la más roja.'] },
    { consigna: 'Trae otra manzana.', ayudas: ['Mira en el suelo.', 'Está cerca.'] },
  ],
  cierre: { mensaje: '¡Lo hicimos!' },
}
const CODIGO = [
  'export function preparar(escena) {',
  '  crearControles(escena)',
  '  const hud = crearHud(escena)',
  '  repartirYColocar(escena, {})',
  '  darVida(escena, {})',
  '  ambiente(escena, {})',
  '  return hud',
  '}',
].join('\n')
const FRASES = 'export const frasesDeKusi = () => ["¡Sigamos!", "a".repeat(60)]'

async function revisar(t, reemplazos = {}) {
  const juego = await mkdtemp(path.join(tmpdir(), 'kusi-comprobar-'))
  t.after(() => rm(juego, { recursive: true, force: true }))
  const archivos = {
    'juego.js': CODIGO,
    'frases.js': FRASES,
    'guion-ejemplo.json': JSON.stringify(GUION),
    'README.md': 'Presenta las frutas. Practica y comprueba su clasificación.',
    ...reemplazos,
  }
  for (const [archivo, contenido] of Object.entries(archivos)) {
    if (contenido !== null) await writeFile(path.join(juego, archivo), contenido)
  }
  return revisarCodigo(juego)
}

test('pasa un juego mínimo con frases calculadas, incluida una de 60 caracteres, y Kusi en el cuento', async (t) => {
  assert.deepEqual(await revisar(t, {
    'frases.js': 'import { saludo } from "./saludo.js"\nexport const frasesDeKusi = async () => [saludo, "a".repeat(60)]',
    'saludo.js': 'export const saludo = "¡Sigamos!"',
  }), { motivos: [], avisos: [] })
})

for (const [caso, frases, error] of [
  ['falta el archivo', null, /Falta juego\/frases\.js.*frasesDeKusi/],
  ['falta la exportación', 'export const otraFuncion = () => []', /debe exportar frasesDeKusi/],
  ['falla al importar', 'import "./no-existe.mjs"', /No se pudo revisar juego\/frases\.js.*no-existe\.mjs/],
  ['la función falla', 'export function frasesDeKusi() { throw new Error("Frases indisponibles") }', /Frases indisponibles/],
  ['el retorno no es una lista de textos', 'export const frasesDeKusi = () => [42]', /debe devolver una lista de textos/],
  ['una frase pasa de 60', 'export const frasesDeKusi = () => ["a".repeat(61)]', /frase 1 tiene 61 caracteres/],
  ['una frase dice el propio nombre', 'export const frasesDeKusi = () => ["Soy kUsI."]', /frase 1 dice «Kusi»/],
  ['el módulo se cuelga', 'while (true) {}\n' + FRASES, /superó el límite de 3 s/],
]) {
  test('frases.js bloquea si ' + caso, async (t) => {
    const { motivos } = await revisar(t, { 'frases.js': frases })
    assert.equal(motivos.length, 1, motivos.join('\n'))
    assert.match(motivos[0], error)
    assert.match(motivos[0], /reglas\.md, regla 14\.1/)
  })
}

test('el taller aplaza la importación de frases si el juego usa código prohibido', async (t) => {
  const { motivos } = await revisar(t, {
    'frases.js': 'import "./datos.js"\n' + FRASES,
    'datos.js': 'throw new Error("El archivo se ejecutó")\nfetch("https://ejemplo.invalid")',
  })
  assert.equal(motivos.length, 1)
  assert.match(motivos[0], /datos\.js se conecta a la red.*reglas\.md, regla 9/)
})

test('el nombre Kusi se rechaza en la consigna, las consignas y ayudas de los retos y el cierre', async (t) => {
  const guion = {
    ...GUION,
    consigna: 'Hazle caso a Kusi.',
    retos: [GUION.retos[0], { consigna: 'Ayuda a KUSI.', ayudas: ['Sé como Kusi.', 'Mira a Kusi.'] }],
    cierre: { mensaje: 'Kusi está feliz.' },
  }
  const { motivos } = await revisar(t, { 'guion-ejemplo.json': JSON.stringify(guion) })
  const campos = ['consigna', 'retos[1].consigna', 'retos[1].ayudas[0]', 'retos[1].ayudas[1]', 'cierre.mensaje']
  assert.equal(motivos.length, campos.length)
  for (const [indice, campo] of campos.entries()) {
    assert.ok(motivos[indice].includes('«' + campo + '»'), motivos[indice])
    assert.match(motivos[indice], /reglas\.md, reglas 7 y 14\.1/)
  }
})

for (const texto of ['aprenderá', 'aprenderán', 'sabrá', 'sabrán', 'entenderá', 'entenderán', 'Al terminar, el niño sabe']) {
  test('rechaza la promesa «' + texto + '» en el guion y en el README', async (t) => {
    const { motivos } = await revisar(t, {
      'guion-ejemplo.json': JSON.stringify({ ...GUION, retos: [{ ...GUION.retos[0], contenido: { meta: texto } }] }),
      'README.md': texto + '.',
    })
    assert.equal(motivos.length, 2)
    assert.match(motivos[0], /guion-ejemplo\.json promete aprendizaje/)
    assert.match(motivos[1], /README\.md promete aprendizaje/)
    for (const motivo of motivos) assert.match(motivo, /presenta, practica y comprueba.*reglas\.md, regla 14\.2/)
  })
}

test('bloquea una llamada a setTintFill en el juego y señala la alternativa en Phaser 4', async (t) => {
  const { motivos } = await revisar(t, { 'juego.js': CODIGO + '\n' + 'this.ficha.setTintFill(0xffffff)' })
  assert.equal(motivos.length, 1)
  assert.match(motivos[0], /juego\/juego\.js usa setTintFill, retirado en Phaser 4.*setTintMode.*reglas\.md, regla 2/)
})

test('una forma interactiva cerca del texto de un botón genera un aviso, sin bloquear el juego', async (t) => {
  const { motivos, avisos } = await revisar(t, {
    'juego.js': CODIGO + '\n' + [
      'const figura = escena.add.rectangle(50, 50, 90, 60)',
      'figura.setInteractive()',
      "escena.add.text(50, 50, 'Volver')",
    ].join('\n'),
  })
  assert.deepEqual(motivos, [])
  assert.equal(avisos.length, 1)
  assert.match(avisos[0], /botón de «Volver».*boton-\* del kit.*reglas\.md, regla 14\.8/)
})

test('un círculo interactivo del mundo lejos de una etiqueta de botón no genera avisos', async (t) => {
  assert.deepEqual(await revisar(t, {
    'juego.js': CODIGO + '\n' + [
      'this.add.circle(80, 60, 22).setInteractive()',
      "this.add.text(80, 60, 'Manzana')",
      '// this.ficha.setTintFill(0xffffff)',
      '// this.add.text(80, 60, "Escuchar")',
    ].join('\n'),
  }), { motivos: [], avisos: [] })
})

for (const estado of ['let cargada = null', 'function cargar(objeto) { return objeto }']) {
  test('bloquea llevar un objeto sin el botón Soltar cuando detecta «' + estado + '»', async (t) => {
    const { motivos } = await revisar(t, { 'juego.js': CODIGO + '\n' + estado })
    assert.equal(motivos.length, 1)
    assert.match(motivos[0], /falta hud\.botonSoltar.*reglas\.md, regla 14\.5/)
  })
}

test('un juego que lleva un objeto y usa hud.botonSoltar pasa', async (t) => {
  assert.deepEqual(await revisar(t, {
    'juego.js': CODIGO + '\n' + 'let cargada = null\nconst hud = preparar(escena)\nhud.botonSoltar({ alTocar: () => { cargada = null } })',
  }), { motivos: [], avisos: [] })
})

test('un mensaje sobre una textura cargada no indica que el protagonista lleve objetos', async (t) => {
  assert.deepEqual(await revisar(t, {
    'juego.js': CODIGO + '\n' + 'console.log("Textura cargada")',
  }), { motivos: [], avisos: [] })
})
