import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { setImmediate } from 'node:timers/promises'
import { crearHud } from '../../kit/reproductor/interfaz/hud.js'
import { callarVoz, habilitarVoz } from '../../kit/reproductor/logica/voz.js'

function crearEscena() {
  const piezas = []
  class Pieza extends EventEmitter {
    setData() { return this }
    setDepth() { return this }
    setDisplaySize() { return this }
    setOrigin() { return this }
    setPosition() { return this }
    setScrollFactor() { return this }
    setStrokeStyle() { return this }
    setInteractive() { return this }
    setWordWrapWidth() { return this }
    setFontSize() { return this }
    setAlpha(alfa) { this.alfa = alfa; return this }
    setFrame(cuadro) { this.cuadro = cuadro; return this }
    setText(texto) { this.texto = texto; this.width = texto.length * 12; return this }
    clear() {}
    fillStyle() {}
    lineStyle() {}
    fillRoundedRect() {}
    strokeRoundedRect() {}
    fillTriangle() {}
    lineBetween() {}
    destroy() {}
  }
  const agregar = (clave) => {
    const pieza = new Pieza()
    pieza.clave = clave
    pieza.height = 32
    piezas.push(pieza)
    return pieza
  }
  return {
    piezas,
    scale: { width: 1200 },
    events: new EventEmitter(),
    add: {
      circle: () => agregar('aro'),
      image: (_x, _y, clave, cuadro) => agregar(clave).setFrame(cuadro),
      graphics: () => agregar('globo'),
      text: (_x, _y, texto) => agregar('texto').setText(texto),
    },
    tweens: { killTweensOf() {}, add() {} },
    time: {
      delayedCall(demora, ejecutar) {
        const id = setTimeout(ejecutar, demora)
        return { remove: () => clearTimeout(id) }
      },
    },
  }
}

function preparar(t, { activar = true, motor = true } = {}) {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const frases = []
  const cancelaciones = []
  const sintetizador = {
    speak: (frase) => frases.push(frase),
    cancel: () => cancelaciones.push(true),
  }
  globalThis.SpeechSynthesisUtterance = class {
    constructor(texto) { this.texto = texto }
  }
  globalThis.speechSynthesis = motor ? sintetizador : undefined
  if (activar) habilitarVoz()
  cancelaciones.length = 0
  const escena = crearEscena()
  const hud = crearHud(escena)
  t.after(() => {
    hud.destruir()
    callarVoz()
    delete globalThis.SpeechSynthesisUtterance
    delete globalThis.speechSynthesis
  })
  return { hud, escena, frases, cancelaciones }
}

test('sin voz, decir espera a que se lea el globo aunque sea fijo', async (t) => {
  const { hud, escena, frases } = preparar(t, { activar: false })
  const eventos = []
  const frase = 'Busca las cartas.'
  const lectura = 3500 + frase.length * 55
  hud.decir(frase, { fijo: true, alTerminar: (evento) => eventos.push(evento) })

  t.mock.timers.tick(1500)
  const globo = escena.piezas.find((pieza) => pieza.clave === 'globo')
  assert.equal(globo.alfa, 1)
  t.mock.timers.tick(lectura - 1)
  await setImmediate()
  assert.deepEqual(eventos, [])
  t.mock.timers.tick(1)
  await setImmediate()
  assert.deepEqual(eventos, [{ interrumpida: false }])
  assert.equal(globo.alfa, 1)

  // Si el primer toque llega después de leer, el texto anterior ya pasó.
  habilitarVoz()
  t.mock.timers.tick(10000)
  assert.deepEqual(frases, [])
  assert.equal(eventos.length, 1)
})

test('si la voz empieza tarde, decir cancela el reloj del globo y espera el audio', async (t) => {
  const { hud, frases } = preparar(t)
  const eventos = []
  const frase = 'Sigue el camino de piedras y busca la pareja de la carta.'
  hud.decir(frase, { alTerminar: (evento) => eventos.push(evento) })

  t.mock.timers.tick(1500)
  frases[0].onstart()
  t.mock.timers.tick(3500 + frase.length * 55)
  await setImmediate()
  assert.deepEqual(eventos, [])
  frases[0].onend()
  frases[0].onend()
  await setImmediate()
  assert.deepEqual(eventos, [{ interrumpida: false }])
})

test('decirSeguidas espera el fin de cada voz y avisa una vez al final', async (t) => {
  const { hud, frases } = preparar(t)
  const eventos = []
  hud.decirSeguidas(['Primera.', 'Segunda.', 'Última.'], { alTerminar: (evento) => eventos.push(evento) })
  hud.decir('Comentario para después.', { esperar: true })

  for (const [i, texto] of ['Primera.', 'Segunda.', 'Última.'].entries()) {
    assert.deepEqual(frases.slice(i).map((frase) => frase.texto), [texto])
    frases[i].onstart()
    await setImmediate()
    assert.deepEqual(eventos, [])
    frases[i].onend()
    await setImmediate()
  }
  assert.deepEqual(eventos, [{ interrumpida: false }])
  assert.equal(frases[3].texto, 'Comentario para después.')
})

test('decirSeguidas usa el tiempo de lectura para todas las frases cuando falla la voz', async (t) => {
  const { hud, escena } = preparar(t, { motor: false })
  t.mock.method(console, 'warn', () => {})
  const eventos = []
  const frases = ['Primera.', 'Segunda.']
  hud.decirSeguidas(frases, { alTerminar: (evento) => eventos.push(evento) })
  const texto = escena.piezas.find((pieza) => pieza.texto === '')

  for (const frase of frases) {
    await setImmediate()
    assert.equal(texto.texto, frase)
    assert.deepEqual(eventos, [])
    t.mock.timers.tick(3500 + frase.length * 55)
  }
  await setImmediate()
  assert.deepEqual(eventos, [{ interrumpida: false }])
})

test('una respuesta nueva corta la secuencia, incluso si la primera voz aún no empezó', async (t) => {
  const { hud, frases, cancelaciones } = preparar(t)
  const eventos = []
  hud.decirSeguidas(['A punto de empezar.', 'Esta frase no debe sonar.'], {
    alTerminar: (evento) => eventos.push(evento),
  })
  hud.decir('Respuesta nueva.')
  frases[0].onstart()
  frases[0].onend()
  frases[1].onstart()
  frases[1].onend()
  await setImmediate()
  assert.deepEqual(frases.map((frase) => frase.texto), ['A punto de empezar.', 'Respuesta nueva.'])
  assert.equal(cancelaciones.length, 1)
  assert.deepEqual(eventos, [{ interrumpida: true }])
})

test('decir sin alTerminar mantiene la cola de respuestas y celebrar cambia los cuadros del HUD', async (t) => {
  const { hud, escena, frases } = preparar(t)
  const kusi = escena.piezas.find((pieza) => pieza.clave === 'kusi-animado')
  hud.decir('Consigna.')
  frases[0].onstart()
  hud.decir('Respuesta.')
  assert.equal(frases.length, 1)
  hud.celebrar()
  escena.events.emit('update', 0, 0)
  assert.equal(kusi.cuadro, 12)
  escena.events.emit('update', 200, 200)
  assert.equal(kusi.cuadro, 13)
  assert.ok(kusi.y < 94)
  frases[0].onend()
  await setImmediate()
  assert.equal(frases[1].texto, 'Respuesta.')
})
