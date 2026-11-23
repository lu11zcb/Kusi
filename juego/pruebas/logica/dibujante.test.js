import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { randomUUID, createHash } from 'node:crypto'
import path from 'node:path'
import { comprobarPieza } from '../../kit/herramientas/comprobar_pieza.mjs'
import { prepararPieza } from '../../kit/herramientas/preparar_pieza.mjs'
import { dibujar, pedidoDeDibujo, MAX_INTENTOS_PIEZA } from '../../taller/dibujar.mjs'
import { guardarPng } from '../../kit/herramientas/animaciones/png_rgba.mjs'
import { revisarPiezas } from '../../taller/trabajador/comprobar.js'
import { tiraSobreBlanco } from '../ayudas/tira.js'

const escribirPng = (ruta, ancho, alto, pixeles) => guardarPng(ruta, { ancho, alto, datos: Buffer.from(pixeles) })

// Un dibujo como el que entrega la herramienta de imágenes: un círculo naranja con
// contorno de tinta sobre fondo blanco liso. «radio» 0 deja solo el fondo blanco.
function dibujoSobreBlanco(ruta, { lado = 800, radio = 280, contorno = 24 } = {}) {
  const pixeles = new Uint8Array(lado * lado * 4).fill(255)
  for (let y = 0; y < lado; y++) for (let x = 0; x < lado; x++) {
    const distancia = Math.hypot(x - lado / 2, y - lado / 2)
    if (radio === 0 || distancia > radio) continue
    const tinta = distancia > radio - contorno
    pixeles.set(tinta ? [75, 33, 14] : [240, 120, 48], (y * lado + x) * 4)
  }
  escribirPng(ruta, lado, lado, pixeles)
}

// El dibujante del taller sin la herramienta de imágenes: las pruebas dibujan su propio
// «original» (un círculo con contorno sobre fondo blanco), y la visión de macOS lo recorta
// de verdad. La primera vez se compila preparar_pieza.swift (unos 25 s).

const OBJETOS = new URL('../../kit/recursos/dibujos/objetos/', import.meta.url)
const carpetaTemporal = () => mkdtemp(path.join(tmpdir(), 'kusi-dibujante-'))
const noes = (resultado) => resultado.respuestas.filter((respuesta) => !respuesta.si).map((respuesta) => respuesta.pregunta)

test('el filtro del código deja pasar las ocho piezas aprobadas del kit y el fondo', () => {
  for (const id of ['fresa', 'platano', 'mango', 'mandarina', 'pina', 'zanahoria', 'papa', 'choclo']) {
    const resultado = comprobarPieza(new URL(id + '.png', OBJETOS).pathname)
    assert.equal(resultado.pasa, true, id + ': ' + noes(resultado).join(' | '))
  }
  assert.equal(comprobarPieza(new URL('../../kit/recursos/dibujos/mundo/fondo-patio.png', import.meta.url).pathname, { fondo: true }).pasa, true)
})

test('el filtro del código encuentra un fondo sin quitar, manchas sueltas, un halo y una silueta chica', async () => {
  const carpeta = await carpetaTemporal()
  const pieza = (nombre, pintar) => {
    const pixeles = new Uint8Array(256 * 256 * 4)
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) pintar(x, y, pixeles, (y * 256 + x) * 4)
    const ruta = path.join(carpeta, nombre + '.png')
    escribirPng(ruta, 256, 256, pixeles)
    return comprobarPieza(ruta)
  }
  // «halo»: el borde queda casi blanco, como cuando no se quitó bien el fondo.
  const circulo = (radio, halo = false) => (x, y, p, i) => {
    const d = Math.hypot(x - 128, y - 128)
    if (d > radio) return
    const color = d <= radio - 8 ? [240, 160, 120] : halo ? [250, 250, 245] : [75, 33, 14]
    p.set([...color, 255], i)
  }
  assert.equal(pieza('buena', circulo(100)).pasa, true)
  assert.ok(noes(pieza('con-fondo', (x, y, p, i) => { p.fill(255, i, i + 4) })).includes('¿Las cuatro esquinas son totalmente transparentes?'))
  assert.ok(noes(pieza('chica', circulo(60))).includes('¿El lado mayor de la silueta mide entre 180 y 215 px?'))
  assert.ok(noes(pieza('con-halo', circulo(100, true))).some((pregunta) => pregunta.includes('halo blanco')))
  const conMancha = pieza('con-mancha', (x, y, p, i) => {
    circulo(100)(x, y, p, i)
    if (x >= 10 && x < 16 && y >= 10 && y < 16) { p[i] = 75; p[i + 1] = 33; p[i + 2] = 14; p[i + 3] = 255 }
  })
  assert.ok(noes(conMancha).includes('¿Es una sola figura, sin manchas sueltas alrededor?'))
  assert.ok(noes(pieza('Mal-Nombre', circulo(100))).some((pregunta) => pregunta.includes('nombre')))
  await rm(carpeta, { recursive: true })
})

test('el filtro reconoce tiras de 2 a 4 poses y mide la transparencia, el margen y los pies por cuadro', async (t) => {
  const carpeta = await carpetaTemporal()
  t.after(() => rm(carpeta, { recursive: true, force: true }))
  const archivo = path.join(carpeta, 'gesto.png')
  const revisar = (cuadros, { vacio, borde, desalineado, fondo = false } = {}) => {
    const ancho = 768 * cuadros
    const datos = Buffer.alloc(ancho * 768 * 4, fondo ? 255 : 0)
    const fila = Buffer.alloc(300 * 4, Buffer.from([75, 33, 14, 255]))
    for (let cuadro = 0; cuadro < cuadros; cuadro++) {
      if (cuadro + 1 === vacio) continue
      const inicio = cuadro * 768 + (cuadro + 1 === borde ? 768 - 300 : 234)
      const desfase = cuadro + 1 === desalineado ? -8 : 0
      for (let y = 32 + desfase; y < 736 + desfase; y++) fila.copy(datos, (y * ancho + inicio) * 4)
    }
    guardarPng(archivo, { ancho, alto: 768, datos })
    return comprobarPieza(archivo)
  }
  for (const cuadros of [2, 3, 4]) assert.equal(revisar(cuadros).pasa, true, 'Tira de ' + cuadros)
  assert.equal(revisar(5).pasa, false)
  assert.match(noes(revisar(2, { vacio: 2 })).join(' '), /Cuadro 2.*Hay una figura/)
  assert.match(noes(revisar(2, { borde: 1 })).join(' '), /Cuadro 1.*24 px transparentes/)
  assert.match(noes(revisar(2, { fondo: true })).join(' '), /Cuadro 2.*esquinas.*transparentes/)
  assert.match(noes(revisar(2, { desalineado: 2 })).join(' '), /pies.*misma fila/)
})

test('la pieza se recorta con la visión de macOS, se centra en 256 × 256 y pasa el filtro', { timeout: 240_000 }, async () => {
  const carpeta = await carpetaTemporal()
  dibujoSobreBlanco(path.join(carpeta, 'original.png'))
  await prepararPieza(path.join(carpeta, 'original.png'), path.join(carpeta, 'circulo.png'))
  const centrado = comprobarPieza(path.join(carpeta, 'circulo.png'))
  assert.equal(centrado.pasa, true, noes(centrado).join(' | '))
  assert.equal(centrado.silueta.ladoMayor, 200)

  // Apoyada: su punto más bajo queda en y = 244, como los pies de los personajes.
  await prepararPieza(path.join(carpeta, 'original.png'), path.join(carpeta, 'apoyado.png'), { apoyado: true })
  assert.equal(comprobarPieza(path.join(carpeta, 'apoyado.png')).silueta.maxY, 244)

  // Un fondo cubre 1672 × 941, sin transparencia.
  await prepararPieza(path.join(carpeta, 'original.png'), path.join(carpeta, 'fondo-prueba.png'), { fondo: true })
  assert.equal(comprobarPieza(path.join(carpeta, 'fondo-prueba.png'), { fondo: true }).pasa, true)

  // Una imagen toda blanca no tiene figura: no se inventa una pieza.
  dibujoSobreBlanco(path.join(carpeta, 'vacio.png'), { radio: 0 })
  await assert.rejects(prepararPieza(path.join(carpeta, 'vacio.png'), path.join(carpeta, 'nada.png')), /figura/)
  await rm(carpeta, { recursive: true })
})

test('el pedido sigue la guía de estilo, pide fondo blanco y nunca nombra programas', () => {
  const pedido = pedidoDeDibujo({ id: 'olla-de-barro', que: 'clay cooking pot', intento: 2, correccion: 'the outline was open' })
  for (const frase of ['hand-painted cartoon style', 'warm dark brown outlines', 'one highlight, light from the upper left',
    'plain flat white', 'No face', 'olla-de-barro-intento-2.png', 'the outline was open']) {
    assert.ok(pedido.includes(frase), frase)
  }
  // El pedido habla de «la herramienta de imágenes», nunca de un programa con nombre.
  assert.match(pedido, /^Use your image generation tool/)
  assert.match(pedidoDeDibujo({ id: 'fondo-chacra', que: 'a farm', fondo: true, intento: 1 }), /top-down camera[\s\S]*central 75%/)
})

test('el pedido de un fondo trabaja el suelo en toda la imagen y nunca lo pide vacío', () => {
  const pedido = pedidoDeDibujo({ id: 'fondo-plaza', que: 'a village plaza', fondo: true, intento: 1 })
  assert.match(pedido, /fills the WHOLE picture[\s\S]*never one flat color/)
  assert.match(pedido, /also in the middle/)
  assert.match(pedido, /nothing tall standing up/)
  assert.doesNotMatch(pedido, /calm and empty/)
})

test('el pedido de una figura entera la pide completa, con sus partes separadas y con personalidad', () => {
  const pedido = pedidoDeDibujo({ id: 'figura-muneco', que: 'a clay doll', figura: true, intento: 1 })
  for (const frase of ['COMPLETE and in one piece', 'a clay doll', 'arms slightly away from the body', 'will cut it into pieces',
    'creative', 'plain flat white', 'figura-muneco-intento-1.png']) assert.ok(pedido.includes(frase), frase)
})

test('el mundo de la aventura se le dice a cada pieza para que nada sea de otro mundo', () => {
  for (const tipo of [{}, { fondo: true }, { cuento: true }, { figura: true }]) {
    const id = tipo.fondo ? 'fondo-cielo' : tipo.cuento ? 'fondo-cuento-1' : tipo.figura ? 'figura-nube' : 'cometa'
    const pedido = pedidoDeDibujo({ id, que: 'x', ...tipo, mundo: 'a kingdom made only of soft white clouds', intento: 1 })
    assert.ok(pedido.includes('World of this game: a kingdom made only of soft white clouds.'), JSON.stringify(tipo))
    assert.ok(pedido.includes('do not add anything from another world'), JSON.stringify(tipo))
  }
  assert.doesNotMatch(pedidoDeDibujo({ id: 'cometa', que: 'x', intento: 1 }), /World of this game/)
})

test('el pedido de una lámina del cuento pide una escena sin personajes y deja libre la esquina de Kusi', () => {
  const pedido = pedidoDeDibujo({ id: 'fondo-cuento-1', que: 'a small shop with an empty shelf', cuento: true, intento: 1 })
  for (const frase of ['storybook illustration', 'a small shop with an empty shelf', 'No people, no animals and no characters',
    'lower-left corner and the bottom 25%', 'No text', 'fondo-cuento-1-intento-1.png']) {
    assert.ok(pedido.includes(frase), frase)
  }
  assert.doesNotMatch(pedido, /top-down/)
})

// Una carpeta de trabajo de mentira y un dibujante de mentira, que «dibuja» lo que se le pida.
async function trabajoDePrueba() {
  const carpeta = path.join(await carpetaTemporal(), randomUUID())
  await mkdir(carpeta, { recursive: true })
  await writeFile(path.join(carpeta, 'trabajo.json'), '{}')
  return carpeta
}
const roles = { dibujante: { programa: 'dibujante-de-prueba', argumentos: ['{pedido}'], carpeta: '{temporal}', costo_por_imagen_usd: null } }
function dibujanteDePrueba(entregas) {
  const pedidos = []
  return {
    pedidos,
    lanzarRol: async (comando) => {
      pedidos.push(comando.argumentos[0])
      const archivo = /copy it into the current folder as (\S+\.png)/.exec(comando.argumentos[0])[1]
      const entrega = entregas.shift()
      if (entrega === 'bien') dibujoSobreBlanco(path.join(comando.carpeta, archivo))
      if (entrega === 'vacio') dibujoSobreBlanco(path.join(comando.carpeta, archivo), { radio: 0 })
      if (entrega === 'tira') tiraSobreBlanco(path.join(comando.carpeta, archivo))
      if (entrega === 'tira-sin-un-cuadro') tiraSobreBlanco(path.join(comando.carpeta, archivo), { vacio: 2 })
      if (entrega === 'gesto') tiraSobreBlanco(path.join(comando.carpeta, archivo), { patas: [[-90, 90], [-124, 60]] })
      return { codigo: 0, agotado: false, salida: 'GUARDADO ' + archivo + '\ntokens used\n1,234', errores: '' }
    },
  }
}

test('una pieza que pasa queda en piezas/, con su original, su pedido y su registro', { timeout: 240_000 }, async () => {
  const carpeta = await trabajoDePrueba()
  const { lanzarRol } = dibujanteDePrueba(['bien'])
  const resultado = await dibujar({ carpeta, id: 'olla-de-barro', que: 'clay cooking pot', apoyado: true }, { roles, lanzarRol })
  assert.equal(resultado.pasa, true, JSON.stringify(resultado))
  assert.equal(resultado.siguiente, 'revisor')
  assert.ok(existsSync(path.join(carpeta, 'piezas', 'olla-de-barro.png')))
  assert.ok(existsSync(path.join(carpeta, 'piezas', 'origen', 'olla-de-barro-intento-1.png')))
  assert.match(await readFile(path.join(carpeta, 'piezas', 'pedidos.md'), 'utf8'), /## olla-de-barro, intento 1[\s\S]*pasa el filtro/)
  const registro = JSON.parse(await readFile(path.join(carpeta, 'piezas', 'registro.json'), 'utf8'))
  assert.deepEqual({ ...registro['olla-de-barro'], segundos: 0 }, { tipo: 'objeto', intentos: 1, pasa: true, imagenes: 1, tokens: 1234, costo_por_imagen_usd: null, segundos: 0 })
  await rm(path.dirname(carpeta), { recursive: true })
})

test('si no pasa hay 2 correcciones; después, la pieza no se entrega y se usa el respaldo', { timeout: 240_000 }, async () => {
  const carpeta = await trabajoDePrueba()
  const { lanzarRol, pedidos } = dibujanteDePrueba(['vacio', 'nada', 'vacio', 'bien'])
  const primero = await dibujar({ carpeta, id: 'cuchara-de-palo', que: 'wooden spoon' }, { roles, lanzarRol })
  assert.deepEqual([primero.pasa, primero.siguiente], [false, 'corregir'])
  assert.match(primero.motivo, /figura/)
  const segundo = await dibujar({ carpeta, id: 'cuchara-de-palo', que: 'wooden spoon', correccion: primero.motivo }, { roles, lanzarRol })
  assert.deepEqual([segundo.intento, segundo.pasa, segundo.siguiente], [2, false, 'corregir'])
  assert.match(segundo.motivo, /no entregó/)
  assert.match(pedidos[1], /This is a correction[\s\S]*figura/)
  const tercero = await dibujar({ carpeta, id: 'cuchara-de-palo', que: 'wooden spoon' }, { roles, lanzarRol })
  assert.deepEqual([tercero.intento, tercero.siguiente], [MAX_INTENTOS_PIEZA, 'respaldo'])
  // No hay un cuarto intento, y la pieza que no pasó no queda para entregarse.
  const cuarto = await dibujar({ carpeta, id: 'cuchara-de-palo', que: 'wooden spoon' }, { roles, lanzarRol })
  assert.deepEqual([cuarto.pasa, cuarto.siguiente], [false, 'respaldo'])
  assert.equal(pedidos.length, 3)
  assert.equal(existsSync(path.join(carpeta, 'piezas', 'cuchara-de-palo.png')), false)
  await rm(path.dirname(carpeta), { recursive: true })
})

test('el dibujante solo trabaja en la carpeta de un trabajo y con un id válido', async () => {
  const carpeta = await trabajoDePrueba()
  const { lanzarRol, pedidos } = dibujanteDePrueba([])
  assert.match((await dibujar({ carpeta: tmpdir(), id: 'olla', que: 'x' }, { roles, lanzarRol })).motivo, /carpeta/)
  assert.match((await dibujar({ carpeta, id: 'Olla Grande', que: 'x' }, { roles, lanzarRol })).motivo, /id/)
  assert.match((await dibujar({ carpeta, id: 'chacra', que: 'x', fondo: true }, { roles, lanzarRol })).motivo, /fondo-/)
  assert.match((await dibujar({ carpeta, id: 'olla', que: '' }, { roles, lanzarRol })).motivo, /--que/)
  // Una lámina del cuento es «fondo-cuento-<n>»; ni un fondo del juego ni un objeto pueden llamarse así.
  for (const mal of [{ id: 'fondo-tienda', cuento: true }, { id: 'fondo-cuento-1', fondo: true }, { id: 'fondo-cuento-1' },
    { id: 'fondo-cuento-0', cuento: true }, { id: 'fondo-cuento-1', cuento: true, fondo: true },
    { id: 'muneco', figura: true }, { id: 'figura-', figura: true }, { id: 'figura-muneco' }, { id: 'figura-muneco', figura: true, fondo: true }]) {
    assert.match((await dibujar({ carpeta, que: 'x', ...mal }, { roles, lanzarRol })).motivo, /fondo-cuento-<n>/, JSON.stringify(mal))
  }
  assert.equal(pedidos.length, 0)
  await rm(path.dirname(carpeta), { recursive: true })
})

test('el trabajador exige una revisión aprobada de los bytes finales y un informe dentro de revision/', async () => {
  const carpeta = await trabajoDePrueba()
  try {
    await mkdir(path.join(carpeta, 'piezas'))
    await mkdir(path.join(carpeta, 'revision'))
    const archivo = path.join(carpeta, 'piezas', 'olla.png')
    await copyFile(new URL('papa.png', OBJETOS), archivo)
    assert.match((await revisarPiezas(carpeta)).join(' '), /aprobación del revisor/)
    const revision = { id: 'olla', sha256: createHash('sha256').update(await readFile(archivo)).digest('hex'),
      veredicto: 'aprobado', informe: 'piezas.md' }
    const guardar = () => writeFile(path.join(carpeta, 'revision', 'piezas.json'), JSON.stringify({ piezas: [revision] }))
    await guardar()
    assert.match((await revisarPiezas(carpeta)).join(' '), /aprobación del revisor/)
    await writeFile(path.join(carpeta, 'revision', 'piezas.md'), 'Informe de prueba: pieza aprobada.\n')
    assert.deepEqual(await revisarPiezas(carpeta), [])
    revision.veredicto = 'rechazado'
    await guardar()
    assert.match((await revisarPiezas(carpeta)).join(' '), /aprobación del revisor/)
    revision.veredicto = 'aprobado'
    revision.informe = '../trabajo.json'
    await guardar()
    assert.match((await revisarPiezas(carpeta)).join(' '), /aprobación del revisor/)
    revision.informe = 'piezas.md'
    await guardar()
    await copyFile(new URL('fresa.png', OBJETOS), archivo)
    assert.match((await revisarPiezas(carpeta)).join(' '), /aprobación del revisor/)
  } finally { await rm(path.dirname(carpeta), { recursive: true }) }
})

test('un fallo al arrancar consume intento, sin falsificar originales y sin un cuarto lanzamiento', async () => {
  const carpeta = await trabajoDePrueba()
  let lanzamientos = 0
  const lanzarRol = async () => { lanzamientos++; throw new Error('no arrancó') }
  try {
    for (let intento = 1; intento <= 4; intento++) {
      const resultado = await dibujar({ carpeta, id: 'olla', que: 'clay pot' }, { roles, lanzarRol })
      assert.equal(resultado.pasa, false)
      assert.equal(resultado.siguiente, intento < 3 ? 'corregir' : 'respaldo')
    }
    assert.equal(lanzamientos, 3)
    assert.deepEqual(await readdir(path.join(carpeta, 'piezas', 'origen')), [])
    const registro = JSON.parse(await readFile(path.join(carpeta, 'piezas', 'registro.json'), 'utf8'))
    assert.equal(registro.olla.intentos, 3)
    assert.equal(registro.olla.imagenes, 0)
  } finally { await rm(path.dirname(carpeta), { recursive: true }) }
})

test('dos piezas que terminan juntas conservan ambos registros y el consumo de sus correcciones', async () => {
  const carpeta = await trabajoDePrueba()
  const lanzarRol = async () => ({ codigo: 1, agotado: false, salida: 'tokens used\n123', errores: '' })
  try {
    await Promise.all(['olla', 'cuchara'].map((id) => dibujar({ carpeta, id, que: id }, { roles, lanzarRol })))
    await dibujar({ carpeta, id: 'olla', que: 'pot' }, { roles, lanzarRol })
    const registro = JSON.parse(await readFile(path.join(carpeta, 'piezas', 'registro.json'), 'utf8'))
    assert.deepEqual(Object.keys(registro).sort(), ['cuchara', 'olla'])
    assert.equal(registro.olla.tokens, 246)
    assert.equal(registro.cuchara.tokens, 123)
  } finally { await rm(path.dirname(carpeta), { recursive: true }) }
})

test('una criatura animada se pide como tira de 3 cuadros y queda en piezas/ como una hoja de 768 × 256', { timeout: 240_000 }, async () => {
  const pedido = pedidoDeDibujo({ id: 'criatura-bicho', que: 'a friendly beetle that walks', criatura: true, mundo: 'a garden of clay', intento: 1 })
  for (const frase of ['THREE times side by side', 'facing RIGHT', 'SAME character', 'wide image', 'never scary', 'plain flat white',
    'World of this game: a garden of clay', 'criatura-bicho-intento-1.png']) assert.ok(pedido.includes(frase), frase)

  const carpeta = await trabajoDePrueba()
  const { lanzarRol } = dibujanteDePrueba(['tira'])
  const resultado = await dibujar({ carpeta, id: 'criatura-bicho', que: 'a friendly beetle that walks', criatura: true }, { roles, lanzarRol })
  assert.equal(resultado.pasa, true, JSON.stringify(resultado))
  assert.equal(resultado.siguiente, 'revisor')
  assert.equal(comprobarPieza(path.join(carpeta, 'piezas', 'criatura-bicho.png'), { criatura: true }).pasa, true)
  const registro = JSON.parse(await readFile(path.join(carpeta, 'piezas', 'registro.json'), 'utf8'))
  assert.equal(registro['criatura-bicho'].tipo, 'criatura')

  // Un cuadro sin figura se corrige (con el motivo), y no queda pieza.
  const mala = await trabajoDePrueba()
  const segundo = await dibujar({ carpeta: mala, id: 'criatura-bicho', que: 'beetle', criatura: true }, { roles, lanzarRol: dibujanteDePrueba(['tira-sin-un-cuadro']).lanzarRol })
  assert.equal(segundo.pasa, false)
  assert.equal(segundo.siguiente, 'corregir')
  assert.match(segundo.motivo, /Cuadro 3/)
  assert.equal(existsSync(path.join(mala, 'piezas', 'criatura-bicho.png')), false)

  // El id tiene que ser criatura-<nombre>, y no se mezcla con otro tipo.
  assert.match((await dibujar({ carpeta, id: 'bicho', que: 'beetle', criatura: true }, { roles, lanzarRol })).motivo, /criatura-<nombre>/)
  assert.equal((await dibujar({ carpeta, id: 'criatura-otro', que: 'x', criatura: true, figura: true }, { roles, lanzarRol })).pasa, false)
  assert.equal((await dibujar({ carpeta, id: 'criatura-otro', que: 'x' }, { roles, lanzarRol })).pasa, false, 'un objeto no se llama criatura-…')
})

test('el dibujante prepara una tira de gestos y el trabajador la reconoce por su tamaño', { timeout: 240_000 }, async (t) => {
  const carpeta = await trabajoDePrueba()
  t.after(() => rm(path.dirname(carpeta), { recursive: true, force: true }))
  const { lanzarRol, pedidos } = dibujanteDePrueba(['gesto'])
  const opcion = { carpeta, id: 'comer-manzana', que: 'Inti lifts an apple and takes one bite' }
  for (const tira of [1, 2.5, 5]) {
    assert.match((await dibujar({ ...opcion, tira }, { roles, lanzarRol })).motivo, /entre 2 y 4/)
  }
  assert.equal((await dibujar({ ...opcion, tira: 2, figura: true }, { roles, lanzarRol })).pasa, false)
  assert.equal(pedidos.length, 0)

  const resultado = await dibujar({ ...opcion, tira: 2 }, { roles, lanzarRol })
  assert.equal(resultado.pasa, true, JSON.stringify(resultado))
  assert.equal(resultado.siguiente, 'revisor')
  assert.match(pedidos[0], /2 equally sized square panels.*Inti lifts an apple.*feet on one shared imaginary ground line/)
  const registro = JSON.parse(await readFile(path.join(carpeta, 'piezas', 'registro.json'), 'utf8'))
  assert.equal(registro['comer-manzana'].tipo, 'tira-figura')
  const motivos = await revisarPiezas(carpeta)
  assert.equal(motivos.length, 1, motivos.join('\n'))
  assert.match(motivos[0], /comer-manzana.*aprobación del revisor/)
})
