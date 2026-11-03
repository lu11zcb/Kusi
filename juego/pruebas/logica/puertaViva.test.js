import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PuertaViva, CONFETI, REBOTE, calcularConfeti } from '../../src/efectos/PuertaViva.js'

const CASILLA = 60
const cerca = (real, esperado, tolerancia = 1e-9) => {
  assert.ok(Math.abs(real - esperado) <= tolerancia, 'se esperaba ' + esperado + ' y salió ' + real)
}

// Una puerta de mentira que acepta los métodos encadenados que usa el efecto.
function crearPuerta() {
  return {
    x: 400, y: 300, scaleX: 0.8, scaleY: 0.8, texture: { key: 'puerta-abierta' },
    setPosition(x, y) { this.x = x; this.y = y; return this },
    setScale(x, y) { this.scaleX = x; this.scaleY = y ?? x; return this },
  }
}

function crearEscena() {
  const escena = {
    trozos: [],
    tweens: {
      pendientes: [],
      eliminados: [],
      killTweensOf(objeto) { this.eliminados.push(objeto) },
      add(configuracion) { this.pendientes.push(configuracion) },
    },
    add: {
      rectangle(x, y, ancho, alto, color) {
        const trozo = {
          x, y, ancho, alto, color, alpha: 1, rotation: 0, escalaX: 1, escalaY: 1, destruido: false, profundidad: null,
          setDepth(valor) { this.profundidad = valor; return this },
          setPosition(nuevaX, nuevaY) { this.x = nuevaX; this.y = nuevaY; return this },
          setRotation(valor) { this.rotation = valor; return this },
          setScale(nuevaX, nuevaY) { this.escalaX = nuevaX; this.escalaY = nuevaY; return this },
          setAlpha(valor) { this.alpha = valor; return this },
          destroy() { this.destruido = true },
        }
        escena.trozos.push(trozo)
        return trozo
      },
    },
  }
  return escena
}

// El azar de las pruebas: una secuencia fija que recorre de 0 a casi 1.
function azarEnSecuencia() {
  let paso = 0
  return () => { paso += 1; return ((paso * 0.37) % 1) }
}

test('al abrirse, la puerta sube estirándose y cae rebotando hasta su sitio', () => {
  const escena = crearEscena()
  const puerta = crearPuerta()
  const efecto = new PuertaViva(escena, puerta, { casilla: CASILLA, azar: azarEnSecuencia() })
  efecto.abrir()
  assert.deepEqual(escena.tweens.eliminados, [puerta])
  const [subida] = escena.tweens.pendientes
  assert.equal(subida.targets, puerta)
  const salto = 300 - subida.y
  assert.ok(salto >= CASILLA * 0.08 && salto <= CASILLA * 0.25, 'salta unos pocos píxeles')
  assert.ok(subida.scaleY > 0.8, 'se estira a lo alto')
  assert.ok(subida.scaleX < 0.8, 'y se angosta un poco')
  assert.equal(subida.duration, REBOTE.subida)

  // Al llegar arriba cae con una curva de rebote hasta su posición y su tamaño de siempre.
  subida.onComplete()
  const caida = escena.tweens.pendientes.at(-1)
  assert.equal(caida.ease, 'Bounce.easeOut')
  assert.equal(caida.y, 300)
  assert.equal(caida.scaleX, 0.8)
  assert.equal(caida.scaleY, 0.8)
  assert.equal(caida.duration, REBOTE.caida)
})

test('salen dieciocho trozos de confeti de varios colores desde arriba de la puerta', () => {
  const escena = crearEscena()
  const efecto = new PuertaViva(escena, crearPuerta(), { casilla: CASILLA, azar: azarEnSecuencia() })
  assert.equal(efecto.abrir(), 18)
  assert.equal(CONFETI.cantidad, 18)
  assert.equal(escena.trozos.length, 18)
  const colores = new Set(escena.trozos.map((trozo) => trozo.color))
  assert.ok(colores.size >= 4, 'varios colores')
  for (const trozo of escena.trozos) {
    assert.equal(trozo.x, 400)
    assert.ok(trozo.y < 300, 'nacen en la parte alta de la puerta')
    assert.ok(trozo.profundidad > 5)
    assert.ok(trozo.ancho < trozo.alto, 'son tiritas, más altas que anchas')
  }
  assert.equal(efecto.estado().confetiSoltado, 18)
  assert.equal(efecto.estado().aperturas, 1)
})

test('el confeti sube en abanico, gira, cae por su peso y se apaga al final', () => {
  const parametros = { ...CONFETI, gravedad: CONFETI.gravedad * CASILLA }
  const trozo = { vx: 100, vy: -4 * CASILLA, giro: 0.5, fase: 0.3 }
  const inicio = calcularConfeti(trozo, 0, parametros)
  assert.deepEqual({ x: inicio.x, y: inicio.y, alfa: inicio.alfa }, { x: 0, y: 0, alfa: 1 })
  // Primero sube (y negativa), después la gravedad lo baja más allá de donde salió.
  const alturas = Array.from({ length: 21 }, (_, paso) => calcularConfeti(trozo, paso / 20, parametros).y)
  const cima = Math.min(...alturas)
  assert.ok(cima < -CASILLA * 0.4, 'sube bastante')
  assert.ok(alturas.at(-1) > cima, 'termina más abajo que la cima')
  assert.ok(alturas.indexOf(cima) > 0 && alturas.indexOf(cima) < 20)
  // Va hacia un lado a velocidad constante y nunca se vuelve invisible antes de caer.
  cerca(calcularConfeti(trozo, 0.5, parametros).x, 100 * 0.55, 1e-9)
  assert.equal(calcularConfeti(trozo, CONFETI.desvanece, parametros).alfa, 1)
  cerca(calcularConfeti(trozo, 1, parametros).alfa, 0)
  for (let paso = 0; paso <= 20; paso += 1) {
    const { aleteo, alfa } = calcularConfeti(trozo, paso / 20, parametros)
    assert.ok(aleteo >= 0.2 && aleteo <= 1.0001)
    assert.ok(alfa >= 0 && alfa <= 1)
  }
  assert.notEqual(calcularConfeti(trozo, 0.6, parametros).rotacion, 0, 'gira')
})

test('cada trozo sigue su propio camino y se destruye al terminar', () => {
  const escena = crearEscena()
  const efecto = new PuertaViva(escena, crearPuerta(), { casilla: CASILLA, azar: azarEnSecuencia() })
  efecto.abrir()
  const vuelos = escena.tweens.pendientes.slice(1)
  assert.equal(vuelos.length, 18)
  for (const vuelo of vuelos) {
    assert.equal(vuelo.duration, 1100)
    vuelo.targets.t = 0.4
    vuelo.onUpdate()
  }
  const xs = escena.trozos.map((trozo) => trozo.x)
  assert.ok(Math.min(...xs) < 400 && Math.max(...xs) > 400, 'se abren hacia los dos lados')
  assert.equal(efecto.estado().confetiVivo, 18)

  for (const vuelo of vuelos) {
    vuelo.targets.t = 1
    vuelo.onUpdate()
    vuelo.onComplete()
  }
  assert.equal(escena.trozos.every((trozo) => trozo.alpha === 0 && trozo.destruido), true)
  assert.equal(efecto.estado().confetiVivo, 0)
  assert.equal(efecto.estado().confetiSoltado, 18)
})

test('con la vida apagada la puerta solo se abre, sin rebote ni confeti', () => {
  const escena = crearEscena()
  const puerta = crearPuerta()
  const efecto = new PuertaViva(escena, puerta, { casilla: CASILLA, activo: false })
  assert.equal(efecto.abrir(), 0)
  assert.equal(escena.tweens.pendientes.length, 0)
  assert.equal(escena.trozos.length, 0)
  assert.equal(efecto.estado().aperturas, 0)
  assert.deepEqual({ x: puerta.x, y: puerta.y, escalaX: puerta.scaleX }, { x: 400, y: 300, escalaX: 0.8 })
})
