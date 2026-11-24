import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { crearAvanceTutorial, debeMostrarTutorial, marcarTutorial, tutorialVisto } from '../../kit/reproductor/logica/tutorial.js'
import { crearTutorial } from '../../kit/reproductor/interfaz/tutorial.js'

test('repite la frase a los seis segundos de cada paso', () => {
  const avance = crearAvanceTutorial([{ hecho: () => false }])
  for (let cuadro = 0; cuadro < 359; cuadro += 1) {
    assert.equal(avance.actualizar(1 / 60), undefined)
  }
  assert.equal(avance.actualizar(1 / 60), 'repetir')
  assert.equal(avance.actualizar(5.99), undefined)
  assert.equal(avance.actualizar(0.01), 'repetir')
  assert.equal(avance.actualizar(30), 'repetir')
  assert.equal(avance.actualizar(0), undefined)
})

test('comprueba solo el paso activo, felicita y reinicia la espera al pasar al siguiente', () => {
  let toco = false
  let arrastro = false
  let vecesQuePreguntoPorElArrastre = 0
  const tocar = { hecho: () => toco }
  const arrastrar = { hecho: () => { vecesQuePreguntoPorElArrastre += 1; return arrastro } }
  const avance = crearAvanceTutorial([tocar, arrastrar])
  assert.equal(avance.paso, tocar)
  assert.equal(avance.actualizar(5), undefined)
  toco = true
  assert.equal(avance.actualizar(1), 'celebrar')
  assert.equal(avance.actualizar(0.5), 'pausa')
  assert.equal(avance.actualizar(0.25), 'paso')
  assert.equal(vecesQuePreguntoPorElArrastre, 0)
  assert.equal(avance.paso, arrastrar)
  assert.equal(avance.actualizar(5), undefined)
  arrastro = true
  assert.equal(avance.actualizar(1), 'fin')
  assert.equal(avance.terminado, true)
  assert.equal(avance.actualizar(6), undefined)
  assert.equal(vecesQuePreguntoPorElArrastre, 2)
})

test('el tutorial vacío termina desde el inicio', () => {
  const avance = crearAvanceTutorial([])
  assert.equal(avance.terminado, true)
  assert.equal(avance.actualizar(6), undefined)
})

test('recuerda la partida por id y el apagado por URL no la marca como vista', () => {
  const partida = { id: 'tutorial-primera-partida' }
  assert.equal(debeMostrarTutorial(partida, '?vida=0&tutorial=0'), false)
  assert.equal(tutorialVisto(partida), false)
  assert.equal(debeMostrarTutorial(partida, '?vida=0'), true)
  marcarTutorial(partida)
  assert.equal(tutorialVisto({ ...partida }), true)
  assert.equal(tutorialVisto(partida.id), true)
  assert.equal(debeMostrarTutorial(partida), false)
  assert.equal(debeMostrarTutorial({ id: 'tutorial-partida-nueva' }), true)
})

test('una partida local sin id se recuerda por su objeto', () => {
  const partida = {}
  marcarTutorial(partida)
  assert.equal(tutorialVisto(partida), true)
  assert.equal(tutorialVisto({}), false)
  marcarTutorial(null)
  assert.equal(tutorialVisto(null), false)
})

function prepararEscena({ conImagen = false } = {}) {
  const dibujos = []
  const voz = []
  const perilla = []
  const crearDibujo = (clave) => {
    const dibujo = {
      clave, width: 256, height: 256, circulos: [], puntos: [], vecesDestruido: 0,
      setScrollFactor() { return this }, setOrigin() { return this }, setDepth() { return this },
      setScale(escala) { this.escala = escala; return this },
      setPosition(x, y) { this.posicion = { x, y }; return this },
      setVisible(visible) { this.visible = visible },
      clear() { this.circulos = []; this.puntos = [] },
      lineStyle() {}, fillStyle() {}, fillRoundedRect() {}, strokeRoundedRect() {},
      strokeCircle(x, y, radio) { this.circulos.push({ x, y, radio }) },
      fillCircle(x, y) { this.puntos.push({ x, y }) },
      destroy() { this.vecesDestruido += 1 },
    }
    dibujos.push(dibujo)
    return dibujo
  }
  const escena = {
    partida: {},
    events: new EventEmitter(),
    textures: { exists: () => conImagen },
    add: { graphics: () => crearDibujo(), image: (_x, _y, clave) => crearDibujo(clave) },
    controles: { demostrarJoystick: (punto) => perilla.push(punto) },
  }
  const hud = { decir: (frase, opciones) => voz.push([frase, opciones.tipo]) }
  return { escena, hud, dibujos, voz, perilla }
}

test('la mano de respaldo toca y arrastra, Kusi felicita y cada paso deja sitio al siguiente', () => {
  const { escena, hud, dibujos, voz } = prepararEscena()
  let hecho = false
  let cierres = 0
  const tutorial = crearTutorial(escena, hud, {
    pasos: [
      { frase: 'Toca.', gesto: 'tocar', objetivo: () => ({ x: 90, y: 100 }), hecho: () => hecho },
      { frase: 'Arrastra.', gesto: 'arrastrar', objetivo: () => ({ x: 100, y: 80 }), hacia: () => ({ x: 200, y: 80 }), hecho: () => hecho },
    ],
    alTerminar: () => { cierres += 1 },
  })
  const [mano, efectos] = dibujos
  assert.equal(mano.clave, undefined)
  assert.deepEqual(mano.posicion, { x: 90, y: 66 })
  tutorial.actualizar(6)
  tutorial.actualizar(0.95)
  assert.deepEqual(mano.posicion, { x: 90, y: 100 })
  assert.ok(mano.escala < 1)
  assert.equal(efectos.circulos.length, 2)

  hecho = true
  tutorial.actualizar(0)
  assert.equal(mano.visible, false)
  hecho = false
  tutorial.actualizar(0.65)
  assert.equal(mano.visible, true)
  tutorial.actualizar(0.72)
  assert.ok(mano.posicion.x > 100 && mano.posicion.x < 200)
  assert.ok(efectos.puntos.length > 0)

  hecho = true
  tutorial.actualizar(0)
  tutorial.actualizar(10)
  assert.deepEqual(voz, ['Toca.', 'Toca.', '¡Muy bien!', 'Arrastra.', '¡Muy bien!'].map((frase) => [frase, 'respuesta']))
  assert.equal(tutorial.terminado, true)
  assert.equal(cierres, 1)
  escena.events.emit('shutdown')
  assert.deepEqual(dibujos.map((dibujo) => dibujo.vecesDestruido), [1, 1])
  assert.equal(escena.events.listenerCount('destroy'), 0)
})

test('con vida apagada la mano ilustrada empuja el joystick y el cierre limpia la demostración', () => {
  const ubicacion = Object.getOwnPropertyDescriptor(globalThis, 'location')
  Object.defineProperty(globalThis, 'location', { value: { search: '?vida=0' }, configurable: true })
  try {
    const { escena, hud, dibujos, voz, perilla } = prepararEscena({ conImagen: true })
    const pasos = [{ frase: 'Mueve el joystick.', gesto: 'joystick', objetivo: () => ({ x: 10, y: 20 }), hacia: () => ({ x: 70, y: 20 }), hecho: () => false }]
    const tutorial = crearTutorial(escena, hud, { pasos, alTerminar: () => assert.fail('la escena salió antes del gesto') })
    tutorial.actualizar(0.96)
    assert.equal(dibujos.length, 1)
    assert.equal(dibujos[0].clave, 'mano-guia')
    assert.equal(dibujos[0].escala, 112 / 256)
    assert.deepEqual(perilla, [{ x: 10, y: 20 }, { x: 70, y: 20 }])
    escena.events.emit('shutdown')
    tutorial.destruir()
    tutorial.actualizar(6)
    assert.equal(dibujos[0].vecesDestruido, 1)
    assert.equal(perilla.at(-1), undefined)
    assert.equal(voz.length, 1)
    assert.equal(escena.events.eventNames().length, 0)

    let cierres = 0
    const repetido = crearTutorial(escena, hud, { pasos, alTerminar: () => { cierres += 1 } })
    assert.equal(repetido.terminado, true)
    assert.equal(cierres, 1)
    assert.equal(dibujos.length, 1)
  } finally {
    if (ubicacion) Object.defineProperty(globalThis, 'location', ubicacion)
    else delete globalThis.location
  }
})
