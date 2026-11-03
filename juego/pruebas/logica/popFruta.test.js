import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PopFruta, CANTIDAD_ESTRELLITAS } from '../../src/efectos/PopFruta.js'

const CASILLA = 60

// Una fruta de mentira con lo que usa el efecto.
function crearFruta(x = 300, y = 400) {
  return {
    x, y, scaleX: 0.5, scaleY: 0.5, alpha: 1, visible: true,
    setVisible(valor) { this.visible = valor; return this },
  }
}

// Una escena de mentira: guarda las estrellas que se crean y los tweens pedidos
// para completarlos cuando la prueba lo decida.
function crearEscenaFalsa() {
  const escena = {
    estrellas: [],
    tweens: {
      pendientes: [],
      eliminados: [],
      killTweensOf(objeto) { this.eliminados.push(objeto) },
      add(configuracion) { this.pendientes.push(configuracion) },
    },
    add: {
      star(x, y, puntos, interior, exterior, color) {
        const estrella = {
          x, y, puntos, interior, exterior, color, alpha: 1, destruida: false, profundidad: null, escala: null,
          setDepth(valor) { this.profundidad = valor; return this },
          setScale(valor) { this.escala = valor; return this },
          setStrokeStyle(grosor, color) { this.borde = { grosor, color }; return this },
          destroy() { this.destruida = true },
        }
        escena.estrellas.push(estrella)
        return estrella
      },
    },
  }
  return escena
}

test('al comer bien la fruta crece, se desvanece y salen cinco estrellitas', () => {
  assert.equal(CANTIDAD_ESTRELLITAS, 5)
  const escena = crearEscenaFalsa()
  const pop = new PopFruta(escena, { casilla: CASILLA, azar: () => 0.5 })
  const fruta = crearFruta()
  assert.equal(pop.comer(fruta), 5)
  assert.deepEqual(escena.tweens.eliminados, [fruta], 'se cancela el tween que tuviera la fruta')

  const [crecer, ...viajes] = escena.tweens.pendientes
  assert.equal(crecer.targets, fruta)
  assert.ok(crecer.scaleX > fruta.scaleX && crecer.scaleY > fruta.scaleY, 'crece')
  assert.equal(crecer.alpha.value, 0, 'desaparece')
  assert.ok(crecer.duracionMs === undefined && crecer.duration > 100 && crecer.duration < 400)
  assert.equal(fruta.visible, true, 'sigue a la vista mientras hace el pop')
  crecer.onComplete()
  assert.equal(fruta.visible, false, 'al terminar el pop ya no se ve')

  assert.equal(escena.estrellas.length, 5)
  assert.equal(viajes.length, 5)
  for (const estrella of escena.estrellas) {
    assert.equal(estrella.puntos, 5, 'cada estrellita tiene cinco puntas')
    assert.ok(estrella.borde.grosor > 0, 'lleva un borde oscuro para verse sobre la arena')
    assert.equal(estrella.x, 300)
    assert.equal(estrella.y, 400)
    assert.ok(estrella.profundidad > 5, 'se ve por encima de los personajes')
  }
  assert.equal(pop.estado().pops, 1)
  assert.equal(pop.estado().estrellitas, 5)
  assert.equal(pop.estado().estrellitasVivas, 5)
})

test('las estrellitas salen en todas direcciones y se alejan unos 0,6 casillas', () => {
  const escena = crearEscenaFalsa()
  const pop = new PopFruta(escena, { casilla: CASILLA, azar: () => 0.5 })
  pop.comer(crearFruta())
  const viajes = escena.tweens.pendientes.slice(1)
  const angulos = viajes.map((viaje) => Math.atan2(viaje.y - 400, viaje.x - 300)).sort((a, b) => a - b)
  const huecos = angulos.map((angulo, indice) => (
    (angulos[(indice + 1) % angulos.length] - angulo + Math.PI * 2) % (Math.PI * 2)
  ))
  for (const hueco of huecos) assert.ok(Math.abs(hueco - (Math.PI * 2) / 5) < 1e-9, 'quedan repartidas en el círculo')
  for (const viaje of viajes) {
    const distancia = Math.hypot(viaje.x - 300, viaje.y - 400)
    assert.ok(distancia > CASILLA * 0.4 && distancia < CASILLA * 0.8, 'viajan una distancia de unos 0,6 casillas')
    assert.ok(viaje.alpha.value === 0 && viaje.duration > 300 && viaje.duration < 700)
  }
})

test('cada estrellita se destruye al terminar su viaje', () => {
  const escena = crearEscenaFalsa()
  const pop = new PopFruta(escena, { casilla: CASILLA })
  pop.comer(crearFruta())
  assert.equal(pop.estado().estrellitasVivas, 5)
  escena.tweens.pendientes.slice(1).forEach((viaje) => viaje.onComplete())
  assert.equal(pop.estado().estrellitasVivas, 0)
  assert.equal(escena.estrellas.every((estrella) => estrella.destruida), true)
  // El total soltado se conserva aunque ya no haya ninguna a la vista.
  assert.equal(pop.estado().estrellitas, 5)
})

test('dos frutas comidas suman diez estrellitas y dos pops', () => {
  const escena = crearEscenaFalsa()
  const pop = new PopFruta(escena, { casilla: CASILLA })
  pop.comer(crearFruta(100, 100))
  pop.comer(crearFruta(200, 100))
  assert.equal(pop.estado().estrellitas, 10)
  assert.equal(pop.estado().pops, 2)
  assert.deepEqual(pop.estado().ultimo, { x: 200, y: 100 })
})

test('con la vida apagada la fruta desaparece de golpe, sin pop ni estrellitas', () => {
  const escena = crearEscenaFalsa()
  const pop = new PopFruta(escena, { casilla: CASILLA, activo: false })
  const fruta = crearFruta()
  assert.equal(pop.comer(fruta), 0)
  assert.equal(fruta.visible, false)
  assert.equal(escena.estrellas.length, 0)
  assert.equal(escena.tweens.pendientes.length, 0)
  assert.deepEqual(escena.tweens.eliminados, [fruta])
  assert.equal(pop.estado().pops, 0)
})
