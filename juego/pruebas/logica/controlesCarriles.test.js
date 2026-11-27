import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createRequire, registerHooks } from 'node:module'
import { dirname, join } from 'node:path'

const cargar = createRequire(import.meta.url)
const carpetaTeclado = join(dirname(cargar.resolve('phaser/package.json')), 'src/input/keyboard/keys')
const Tecla = cargar(join(carpetaTeclado, 'Key.js'))
const rutaControles = new URL('../../kit/reproductor/interfaz/controles.js', import.meta.url)
// El motor completo necesita un navegador. Usamos su clase de tecla real para probar la repetición.
const enlace = registerHooks({
  resolve(especificador, contexto, siguiente) {
    if (especificador === 'phaser' && contexto.parentURL === rutaControles.href) {
      const modulo = 'export const Input = { Keyboard: { KeyCodes: ' +
        JSON.stringify(cargar(join(carpetaTeclado, 'KeyCodes.js'))) + ' } };' +
        'export const Math = { Distance: { Between: (x, y, a, b) => globalThis.Math.hypot(x - a, y - b) } };'
      return { shortCircuit: true, url: 'data:text/javascript,' + encodeURIComponent(modulo) }
    }
    return siguiente(especificador, contexto)
  },
})
const { crearControles } = await import(rutaControles.href)
enlace.deregister()

function prepararEscena({ conImagenes = true } = {}) {
  const dibujos = []
  const input = new EventEmitter()
  const scale = Object.assign(new EventEmitter(), { width: 1280, height: 720 })
  let teclas
  input.keyboard = {
    addKeys(codigos, _capturar, repetir) {
      teclas = Object.fromEntries(Object.entries(codigos)
        .map(([nombre, codigo]) => [nombre, new Tecla(this, codigo).setEmitOnRepeat(repetir)]))
      return teclas
    },
    removeKey() {},
  }
  const dibujar = (tipo, x = 0, y = 0, nombre) => {
    const figura = {
      tipo, x, y, nombre, escala: 1, lineas: [],
      add() {}, setData() {}, destroy() {},
      setPosition(x, y) { this.x = x; this.y = y; return this },
      setScale(escala) { this.escala = escala; return this },
      setDisplaySize() { return this }, setAlpha() { return this },
      setDepth() { return this }, setScrollFactor() { return this }, setOrigin() { return this },
      setFillStyle() { return this }, setStrokeStyle() { return this },
      lineStyle() {}, fillStyle() {}, fillCircle() {},
      lineBetween(...puntos) { this.lineas.push(puntos) },
    }
    dibujos.push(figura)
    return figura
  }
  const escena = {
    input, scale, events: new EventEmitter(),
    textures: { exists: () => conImagenes },
    add: Object.fromEntries(['image', 'container', 'text', 'circle', 'graphics', 'triangle']
      .map(tipo => [tipo, (...argumentos) => dibujar(tipo, ...argumentos)])),
  }
  return { escena, dibujos, tecla: nombre => teclas[nombre] }
}

test('los botones de carril ocupan los lados de la pantalla y tienen su etiqueta debajo', () => {
  const { escena, dibujos } = prepararEscena()
  const controles = crearControles(escena, { carriles: true, saltar: true })
  const { subir, bajar } = controles.estado()
  assert.deepEqual(controles.estado(), {
    joystick: null, saltar: null,
    subir: { x: 142, y: 592, radio: 62 },
    bajar: { x: 1164, y: 592, radio: 62 },
  })
  assert.deepEqual(dibujos.filter(pieza => pieza.tipo === 'image').map(pieza => pieza.nombre),
    ['boton-subir', 'boton-bajar'])
  assert.deepEqual(dibujos.filter(pieza => pieza.tipo === 'text').map(({ nombre, x, y }) => [nombre, x, y]), [
    ['Subir', subir.x, subir.y + subir.radio + 12],
    ['Bajar', bajar.x, bajar.y + bajar.radio + 12],
  ])
})

test('los botones de carril y sus etiquetas quedan a la misma altura antes y después de resize', () => {
  const { escena, dibujos } = prepararEscena()
  crearControles(escena, { carriles: true })
  const [botonSubir, botonBajar] = dibujos.filter(pieza => pieza.tipo === 'container')
  const [etiquetaSubir, etiquetaBajar] = dibujos.filter(pieza => pieza.tipo === 'text')
  assert.equal(botonSubir.y, botonBajar.y)
  assert.equal(etiquetaSubir.y, etiquetaBajar.y)

  // Cambiamos la altura para comprobar que ambos controles se recolocan con el lienzo.
  const alturaInicial = botonSubir.y
  const cambioDeAltura = 100
  escena.scale.height += cambioDeAltura
  escena.scale.emit('resize')
  assert.equal(botonSubir.y, alturaInicial + cambioDeAltura)
  assert.equal(botonSubir.y, botonBajar.y)
  assert.equal(etiquetaSubir.y, botonSubir.y + 62 + 12)
  assert.equal(etiquetaSubir.y, etiquetaBajar.y)
})

test('cada toque de carril da un solo pulso, aunque se mantenga o se arrastre el dedo', () => {
  const { escena, dibujos } = prepararEscena()
  const controles = crearControles(escena, { carriles: true })
  const { subir, bajar } = controles.estado()
  const [botonSubir, botonBajar] = dibujos.filter(pieza => pieza.tipo === 'container')
  const dedoSube = { id: 1, x: subir.x + subir.radio, y: subir.y }
  const dedoBaja = { id: 2, x: bajar.x, y: bajar.y }
  escena.input.emit('pointerdown', { ...dedoSube, x: dedoSube.x + 1 })
  assert.equal(controles.leer().y, 0)
  escena.input.emit('pointerdown', dedoSube)
  assert.equal(botonSubir.escala, 0.92)
  assert.equal(controles.leer().y, -1)
  escena.input.emit('pointermove', { ...dedoBaja, id: dedoSube.id })
  assert.equal(controles.leer().y, 0)
  assert.equal(controles.leer().y, 0)
  escena.input.emit('pointerupoutside', dedoSube)
  assert.equal(botonSubir.escala, 1)

  escena.input.emit('pointerdown', dedoBaja)
  assert.equal(botonBajar.escala, 0.92)
  escena.input.emit('pointerup', dedoBaja)
  escena.input.emit('pointerdown', dedoSube)
  escena.input.emit('pointerup', dedoSube)
  assert.deepEqual([controles.leer().y, controles.leer().y, controles.leer().y], [1, -1, 0])
  assert.equal(botonBajar.escala, 1)
})

test('las flechas y W/S dan un pulso por pulsación incluso si el teclado manda repeticiones', () => {
  const { escena, tecla } = prepararEscena()
  const controles = crearControles(escena, { carriles: true })
  for (const [nombre, sentido] of [['arriba', -1], ['w', -1], ['abajo', 1], ['s', 1]]) {
    const boton = tecla(nombre)
    boton.onDown({ timeStamp: 10 })
    assert.equal(controles.leer().y, sentido)
    boton.onDown({ timeStamp: 20, repeat: true })
    assert.equal(controles.leer().y, 0)
    boton.onUp({ timeStamp: 30 })
    boton.onDown({ timeStamp: 40 })
    boton.onUp({ timeStamp: 50 })
    assert.equal(controles.leer().y, sentido)
    assert.equal(controles.leer().y, 0)
  }
})

test('si faltan los dibujos, las flechas de respaldo señalan arriba y abajo y el toque funciona', () => {
  const { escena, dibujos } = prepararEscena({ conImagenes: false })
  const controles = crearControles(escena, { carriles: true })
  const puntas = dibujos.filter(pieza => pieza.tipo === 'graphics')
    .map(pieza => pieza.lineas[1].slice(2))
  assert.deepEqual(puntas, [[0, -24], [0, 24]])
  escena.input.emit('pointerdown', { id: 1, ...controles.estado().bajar })
  assert.equal(controles.leer().y, 1)
})

test('el modo de salto conserva el joystick y distingue entre tocar y sostener Saltar', () => {
  const { escena } = prepararEscena()
  const controles = crearControles(escena, { saltar: true })
  const { joystick, saltar } = controles.estado()
  assert.deepEqual(saltar, { x: 1164, y: 612, radio: 62 })
  escena.input.emit('pointerdown', { id: 1, x: joystick.x + joystick.radio, y: joystick.y })
  escena.input.emit('pointerdown', { id: 2, ...saltar })
  assert.deepEqual(controles.leer(), { x: 1, y: 0, saltar: true, saltarSostenido: true })
  assert.deepEqual(controles.leer(), { x: 1, y: 0, saltar: false, saltarSostenido: true })
  escena.input.emit('pointerup', { id: 2, ...saltar })
  assert.deepEqual(controles.leer(), { x: 1, y: 0, saltar: false, saltarSostenido: false })
})
