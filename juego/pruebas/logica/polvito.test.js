import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  Polvito, PASOS_POR_NUBE, PARTICULAS_MINIMAS, PARTICULAS_MAXIMAS, DURACION_MS,
} from '../../kit/reproductor/efectos/Polvito.js'

const CASILLA = 60

// Una bolita de mentira: acepta los mismos métodos encadenados que una figura
// de Phaser y recuerda lo que se le pidió.
function crearBolita(x, y) {
  const bolita = {
    x, y, visible: true, activa: true, escala: 1, alfa: 1, color: null, profundidad: null,
    setDepth(valor) { this.profundidad = valor; return this },
    setFillStyle(color) { this.color = color; return this },
    setPosition(nuevaX, nuevaY) { this.x = nuevaX; this.y = nuevaY; return this },
    setScale(valor) { this.escala = valor; return this },
    setAlpha(valor) { this.alfa = valor; return this },
    setVisible(valor) { this.visible = valor; return this },
    setActive(valor) { this.activa = valor; return this },
  }
  return bolita
}

// Una escena de mentira con un reloj que se mueve a mano y tweens que se
// guardan para completarlos cuando la prueba lo decida.
function crearEscenaFalsa() {
  const escena = {
    time: { now: 10_000 },
    creadas: [],
    tweens: {
      pendientes: [],
      add(configuracion) { this.pendientes.push(configuracion) },
    },
    add: {
      circle(x, y) {
        const bolita = crearBolita(x, y)
        escena.creadas.push(bolita)
        return bolita
      },
    },
  }
  return escena
}

const pisar = (polvito, escena, pasos, { espera = 250, direccion = 'derecha', clave = 'cuy' } = {}) => {
  const nubes = []
  for (let paso = 0; paso < pasos; paso += 1) {
    escena.time.now += espera
    nubes.push(polvito.alPisar(clave, 300, 400, direccion))
  }
  return nubes
}

test('sale una nube con el primer paso y después una cada dos pasos', () => {
  assert.equal(PASOS_POR_NUBE, 2)
  const escena = crearEscenaFalsa()
  const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => 0 })
  const nubes = pisar(polvito, escena, 6)
  assert.deepEqual(nubes.map((cantidad) => cantidad > 0), [true, false, true, false, true, false])
  assert.equal(polvito.estado().nubes, 3)
  assert.equal(polvito.estado().pasosContados, 6)
})

test('la cuenta de pasos empieza de nuevo cuando el personaje se detiene un momento', () => {
  const escena = crearEscenaFalsa()
  const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => 0 })
  assert.deepEqual(pisar(polvito, escena, 2).map((cantidad) => cantidad > 0), [true, false])
  // Una pausa larga: el siguiente paso vuelve a ser el primero y suelta nube.
  escena.time.now += 2000
  assert.ok(polvito.alPisar('cuy', 300, 400, 'derecha') > 0)
})

test('cada personaje lleva su propia cuenta de pasos', () => {
  const escena = crearEscenaFalsa()
  const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => 0 })
  escena.time.now += 250
  assert.ok(polvito.alPisar('cuy', 100, 100, 'derecha') > 0)
  assert.ok(polvito.alPisar('zorro', 200, 100, 'izquierda', 1.3) > 0)
  escena.time.now += 250
  assert.equal(polvito.alPisar('cuy', 100, 100, 'derecha'), 0)
  assert.equal(polvito.alPisar('zorro', 200, 100, 'izquierda', 1.3), 0)
})

test('cada nube tiene tres o cuatro bolitas según el azar', () => {
  assert.equal(PARTICULAS_MINIMAS, 3)
  assert.equal(PARTICULAS_MAXIMAS, 4)
  for (const [azar, esperado] of [[0, 3], [0.49, 3], [0.5, 4], [0.999, 4]]) {
    const escena = crearEscenaFalsa()
    const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => azar })
    assert.equal(polvito.nube(300, 400, 'derecha'), esperado)
    assert.equal(escena.creadas.length, esperado)
    assert.equal(escena.tweens.pendientes.length, esperado)
  }
})

test('las bolitas nacen detrás de los pies, según el rumbo, y se alejan hacia atrás', () => {
  const casos = {
    derecha: (inicio, fin) => inicio.x < 300 && fin.x < inicio.x,
    izquierda: (inicio, fin) => inicio.x > 300 && fin.x > inicio.x,
    abajo: (inicio, fin) => inicio.y < 400 && fin.y < inicio.y,
    // Hacia arriba la nube queda debajo de los pies; sube un poco al desvanecerse
    // pero se aleja más de lo que sube.
    arriba: (inicio, fin) => inicio.y > 400 && fin.y > inicio.y,
  }
  for (const [direccion, comprobar] of Object.entries(casos)) {
    const escena = crearEscenaFalsa()
    const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => 0.5 })
    polvito.nube(300, 400, direccion)
    escena.tweens.pendientes.forEach((tween, indice) => {
      const inicio = { x: escena.creadas[indice].x, y: escena.creadas[indice].y }
      assert.ok(comprobar(inicio, { x: tween.x, y: tween.y }), 'rumbo ' + direccion + ' bolita ' + indice)
    })
  }
})

test('al caminar de frente las bolitas se abren de lado a lado y al caminar de lado se quedan juntas', () => {
  const abierto = (direccion, eje) => {
    const escena = crearEscenaFalsa()
    const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => 0.5 })
    polvito.nube(300, 400, direccion)
    const valores = escena.creadas.map((bolita) => bolita[eje])
    return Math.max(...valores) - Math.min(...valores)
  }
  assert.ok(abierto('abajo', 'x') > CASILLA * 0.3)
  assert.ok(abierto('derecha', 'y') < CASILLA * 0.2)
})

test('cada bolita se desvanece en medio segundo, crece y se recicla para la nube siguiente', () => {
  assert.equal(DURACION_MS, 500)
  const escena = crearEscenaFalsa()
  const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => 0 })
  polvito.nube(300, 400, 'derecha')
  assert.equal(polvito.estado().particulasVivas, 3)
  for (const tween of escena.tweens.pendientes) {
    assert.equal(tween.duration, 500)
    assert.equal(tween.alpha, 0)
    assert.ok(tween.scale > 1)
    assert.ok(tween.y < 400 + 1, 'la bolita sube mientras se desvanece')
  }
  escena.tweens.pendientes.splice(0).forEach((tween) => tween.onComplete())
  assert.equal(polvito.estado().particulasVivas, 0)
  assert.equal(escena.creadas.filter((bolita) => bolita.visible).length, 0)

  // La nube siguiente reutiliza las mismas tres bolitas: no se crean más figuras.
  polvito.nube(320, 400, 'derecha')
  assert.equal(escena.creadas.length, 3)
  assert.equal(escena.creadas.every((bolita) => bolita.visible && bolita.activa), true)
})

test('el zorro, más pesado, levanta una nube más grande', () => {
  const escena = crearEscenaFalsa()
  const polvito = new Polvito(escena, { casilla: CASILLA, azar: () => 0 })
  polvito.nube(300, 400, 'derecha', 1)
  polvito.nube(300, 400, 'derecha', 1.3)
  const normal = escena.tweens.pendientes.slice(0, 3)
  const grande = escena.tweens.pendientes.slice(3)
  assert.ok(grande[0].scale > normal[0].scale)
  assert.ok(Math.abs(grande[0].x - 300) > Math.abs(normal[0].x - 300))
})

test('con la vida apagada no sale ninguna nube', () => {
  const escena = crearEscenaFalsa()
  const polvito = new Polvito(escena, { casilla: CASILLA, activo: false })
  assert.deepEqual(pisar(polvito, escena, 6), [0, 0, 0, 0, 0, 0])
  assert.equal(escena.creadas.length, 0)
  assert.equal(polvito.estado().nubes, 0)
})
