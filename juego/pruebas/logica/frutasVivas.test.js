import { test } from 'node:test'
import assert from 'node:assert/strict'
import { FrutasVivas, FLOTAR, calcularFlotar } from '../../kit/reproductor/efectos/FrutasVivas.js'

const CASILLA = 60
const cerca = (real, esperado, tolerancia = 1e-9) => {
  assert.ok(Math.abs(real - esperado) <= tolerancia, 'se esperaba ' + esperado + ' y salió ' + real)
}

// Frutas de mentira y una escena que dice cuáles tienen un tween en marcha.
function crearEscena(fruta = 4) {
  const bases = Array.from({ length: fruta }, (_, indice) => ({ x: 100 + indice * 60, y: 300 }))
  const dibujos = bases.map((base) => ({ x: base.x, y: base.y, visible: true }))
  const moviendose = new Set()
  const escena = { tweens: { isTweening: (dibujo) => moviendose.has(dibujo) } }
  return { escena, dibujos, bases, moviendose }
}

const avanzar = (frutas, segundos, cuadros = 1) => {
  for (let cuadro = 0; cuadro < cuadros; cuadro += 1) frutas.actualizar(segundos)
}

test('flotan despacio: unos píxeles y una subida y bajada cada pocos segundos', () => {
  // Muy despacio: más de 2 segundos por vuelta y una velocidad máxima de pocos píxeles por segundo.
  assert.ok(FLOTAR.periodo >= 2)
  const velocidadMaxima = (FLOTAR.amplitud * 53 * 2 * Math.PI) / FLOTAR.periodo
  assert.ok(velocidadMaxima < 8, 'la fruta casi no se nota que se mueve: ' + velocidadMaxima + ' px/s')
  // Y unos píxeles de recorrido en cualquier mapa.
  assert.ok(FLOTAR.amplitud * 53 >= 1.5 && FLOTAR.amplitud * 72 <= 5)
  cerca(calcularFlotar(0, 0, FLOTAR), 0)
  cerca(calcularFlotar(FLOTAR.periodo / 4, 0, FLOTAR), -FLOTAR.amplitud) // arriba, a un cuarto de vuelta
  cerca(calcularFlotar(FLOTAR.periodo * 3 / 4, 0, FLOTAR), FLOTAR.amplitud) // abajo, a tres cuartos
  cerca(calcularFlotar(FLOTAR.periodo, 0, FLOTAR), 0, 1e-9)
})

test('cada fruta tiene un desfase distinto, aunque haya siete objetos en el mapa', () => {
  // El nivel con más objetos lleva siete. Entre cualquier pareja la fase difiere
  // al menos un 8 % del periodo y, a lo largo de una vuelta, no van a la par.
  for (let primera = 0; primera < 7; primera += 1) {
    for (let segunda = primera + 1; segunda < 7; segunda += 1) {
      const resto = (((segunda - primera) * FLOTAR.desfase) % 1 + 1) % 1
      assert.ok(Math.min(resto, 1 - resto) >= 0.08, 'fases demasiado juntas en ' + primera + ' y ' + segunda)
      let mayorDiferencia = 0
      for (let paso = 0; paso < 120; paso += 1) {
        const t = (FLOTAR.periodo * paso) / 120
        mayorDiferencia = Math.max(mayorDiferencia, Math.abs(
          calcularFlotar(t, primera, FLOTAR) - calcularFlotar(t, segunda, FLOTAR),
        ))
      }
      assert.ok(mayorDiferencia > FLOTAR.amplitud * 0.4, 'las frutas ' + primera + ' y ' + segunda + ' no deben moverse a la par')
    }
  }
})

test('la fruta sube y baja alrededor de su casilla sin moverse de lado', () => {
  const { escena, dibujos, bases } = crearEscena()
  const frutas = new FrutasVivas(escena, dibujos, bases, { casilla: CASILLA })
  let menor = Infinity
  let mayor = -Infinity
  for (let cuadro = 0; cuadro < 60 * 7; cuadro += 1) {
    frutas.actualizar(1 / 60)
    for (const [indice, dibujo] of dibujos.entries()) {
      assert.equal(dibujo.x, bases[indice].x)
      menor = Math.min(menor, dibujo.y - bases[indice].y)
      mayor = Math.max(mayor, dibujo.y - bases[indice].y)
    }
  }
  cerca(mayor, FLOTAR.amplitud * CASILLA, 0.01)
  cerca(menor, -FLOTAR.amplitud * CASILLA, 0.01)
})

test('una fruta con un tween en marcha o ya comida no se toca, y al terminar el rebote vuelve sin saltos', () => {
  const { escena, dibujos, bases, moviendose } = crearEscena(2)
  const frutas = new FrutasVivas(escena, dibujos, bases, { casilla: CASILLA })
  avanzar(frutas, 1 / 60, 30)
  // Rebota: su tween manda y la fruta se queda donde el tween la deje.
  moviendose.add(dibujos[0])
  dibujos[0].y = 250
  avanzar(frutas, 1 / 60, 10)
  assert.equal(dibujos[0].y, 250)
  assert.equal(frutas.estado().mezcla[0], 0)
  // Comida: ya no se ve y no se mueve.
  dibujos[1].visible = false
  const quieta = dibujos[1].y
  avanzar(frutas, 1 / 60, 10)
  assert.equal(dibujos[1].y, quieta)

  // El tween termina y la fruta está otra vez en su sitio: el vaivén regresa poco a poco.
  moviendose.delete(dibujos[0])
  dibujos[0].y = bases[0].y
  let anterior = dibujos[0].y
  let saltoMaximo = 0
  for (let cuadro = 0; cuadro < 60; cuadro += 1) {
    frutas.actualizar(1 / 60)
    saltoMaximo = Math.max(saltoMaximo, Math.abs(dibujos[0].y - anterior))
    anterior = dibujos[0].y
  }
  assert.ok(saltoMaximo < 0.5, 'sin saltos de más de medio píxel por cuadro, salió ' + saltoMaximo)
  assert.equal(frutas.estado().mezcla[0], 1)
})

test('con la vida apagada las frutas se quedan quietas en su casilla', () => {
  const { escena, dibujos, bases } = crearEscena()
  const frutas = new FrutasVivas(escena, dibujos, bases, { casilla: CASILLA, activo: false })
  avanzar(frutas, 1 / 60, 300)
  dibujos.forEach((dibujo, indice) => assert.equal(dibujo.y, bases[indice].y))
})
