import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { partirHistoria } from '../../kit/reproductor/logica/historia.js'
import { archivoDeFrase, elegirVozDeMac, juntarFrases, planearGrabaciones } from '../../taller/vozGrabada.mjs'
import { grabarVoz } from '../../taller/grabar_voz.mjs'

const listado = [
  'Anna (Premium) de_DE # Hallo.',
  'Mónica es_ES # Hola.',
  'Paulina (Enhanced) es_MX # Hola.',
  'Mónica (Premium) es_ES # Hola.',
].join('\n')

test('el grabador junta las mismas páginas del cuento, el guion y las frases del juego', () => {
  const historia = 'En la plaza del pueblo, Kusi buscaba a sus amigos para celebrar con ellos una gran fiesta. ' +
    'Al llegar al campo, vio que todas las frutas se habían caído y pidió ayuda para recogerlas.'
  const guion = { historia, consigna: ' Busca\n las frutas. ',
    retos: [{ consigna: 'Busca las frutas.', ayudas: ['Mira junto al árbol.', '  Mira debajo.  '] }],
    cierre: { mensaje: '¡Gracias!' } }
  assert.equal(partirHistoria(historia).length, 2)
  assert.deepEqual(juntarFrases(guion, ['', 'Juntaste\t dos.', '¡Gracias!']), [
    ...partirHistoria(historia), 'Busca las frutas.', 'Mira junto al árbol.', 'Mira debajo.', '¡Gracias!', 'Juntaste dos.',
  ])
  assert.equal(archivoDeFrase('  hola\n mundo '), '459567d3bde4.m4a')
})

test('elige la primera voz natural de macOS en español e indica cuáles están instaladas si falta', () => {
  assert.equal(elegirVozDeMac(listado), 'Paulina (Enhanced)')
  assert.equal(elegirVozDeMac('Mónica (Mejorada) es-ES # Hola.'), 'Mónica (Mejorada)')
  assert.throws(() => elegirVozDeMac('Anna (Premium) de_DE # Hallo.\nMónica es_ES # Hola.'),
    /Gestionar voces… → Español\. Voces en español disponibles: Mónica/)
})

test('un índice anterior solo reutiliza archivos presentes de la misma voz', () => {
  const hola = archivoDeFrase('Hola')
  const indice = { voz: 'Paulina', frases: { Hola: hola, Adiós: archivoDeFrase('Adiós') } }
  const presentes = new Set([hola])
  assert.deepEqual(planearGrabaciones(['Hola', 'Adiós'], 'Paulina', indice, presentes).faltan,
    [['Adiós', indice.frases.Adiós]])
  assert.deepEqual(planearGrabaciones(['Hola'], 'Mónica', indice, presentes).faltan, [['Hola', hola]])
})

test('el grabador escribe AAC e índice, recupera un archivo perdido y conserva la voz anterior si falla la conversión', async (t) => {
  const carpeta = await mkdtemp(path.join(tmpdir(), 'kusi-grabar-voz-'))
  t.after(() => rm(carpeta, { recursive: true, force: true }))
  const carpetaVoz = path.join(carpeta, 'voz')
  const rutaIndice = path.join(carpetaVoz, 'voz.json')
  const frases = ['¿Jugamos?', '¡Ya tienes una!', '¡Ya tienes dos!']
  await mkdir(path.join(carpeta, 'juego'))
  await writeFile(path.join(carpeta, 'juego', 'guion-ejemplo.json'), JSON.stringify({ consigna: frases[0] }))
  await writeFile(path.join(carpeta, 'juego', 'frases.js'),
    'export const frasesDeKusi = () => ["una", "dos"].map(n => "¡Ya tienes " + n + "!")')

  const pedidos = []
  const say = async (argumentos) => {
    if (argumentos[1] === '?') return { stdout: listado }
    const [selector, voz, opcionSalida, aiff, separador, frase] = argumentos
    assert.deepEqual([selector, opcionSalida, separador], ['-v', '-o', '--'])
    pedidos.push(frase)
    await writeFile(aiff, voz + ' dice: ' + frase)
  }
  const afconvert = async ([aiff, opcionFormato, formato, opcionDatos, codec, audio]) => {
    assert.deepEqual([opcionFormato, formato, opcionDatos, codec], ['-f', 'm4af', '-d', 'aac'])
    await writeFile(audio, await readFile(aiff))
  }
  const funciones = { say, afconvert }
  const voz = 'Paulina (Enhanced)'
  assert.deepEqual(await grabarVoz({ carpeta }, funciones), { voz, grabadas: 3, ya_estaban: 0, total: 3 })
  assert.deepEqual(pedidos, frases)
  const indice = JSON.parse(await readFile(rutaIndice, 'utf8'))
  assert.deepEqual(indice, { voz, frases: Object.fromEntries(frases.map((frase) => [frase, archivoDeFrase(frase)])) })
  assert.deepEqual((await readdir(carpetaVoz)).sort(), [...Object.values(indice.frases), 'voz.json'].sort())

  pedidos.length = 0
  assert.deepEqual(await grabarVoz({ carpeta, voz }, funciones), { voz, grabadas: 0, ya_estaban: 3, total: 3 })
  assert.deepEqual(pedidos, [])
  const rutaPrimera = path.join(carpetaVoz, indice.frases[frases[0]])
  await rm(rutaPrimera)
  assert.equal((await grabarVoz({ carpeta, voz }, funciones)).grabadas, 1)
  assert.deepEqual(pedidos, [frases[0]])

  let conversiones = 0
  await assert.rejects(grabarVoz({ carpeta, voz: 'Mónica' }, {
    say, async afconvert(argumentos) {
      if (++conversiones === 2) throw new Error('falló AAC')
      await afconvert(argumentos)
    },
  }), /falló AAC/)
  assert.deepEqual(JSON.parse(await readFile(rutaIndice, 'utf8')), indice)
  assert.equal(await readFile(rutaPrimera, 'utf8'), voz + ' dice: ' + frases[0])
  assert.equal((await grabarVoz({ carpeta, voz: 'Mónica' }, funciones)).grabadas, 3)
})
