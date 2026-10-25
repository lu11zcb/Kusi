import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularFase, calcularRebote, leerFase, CuerpoVivo, PERFIL_CUY, PERFIL_ZORRO,
} from '../../src/efectos/CuerpoVivo.js'

const CASILLA = 60
const cerca = (real, esperado, tolerancia = 1e-9) => {
  assert.ok(Math.abs(real - esperado) <= tolerancia, 'se esperaba ' + esperado + ' y salió ' + real)
}

// Un sprite de mentira con lo que lee el cuerpo: su movimiento, su reloj de
// animación y el método para cambiar la escala.
function crearSpriteFalso({ caminando = true, expresion = null, indice = 1, progreso = 0 } = {}) {
  return {
    estadoMovimiento: caminando ? 'caminar' : 'reposo',
    estadoExpresivo: expresion,
    x: 100, y: 200, scaleX: 0.5, scaleY: 0.5, rotation: 0,
    anims: { currentFrame: { index: indice }, accumulator: progreso * 125, nextTick: 125, msPerFrame: 125 },
    setScale(x, y) { this.scaleX = x; this.scaleY = y; return this },
  }
}

// Reproduce lo que hace la escena en cada cuadro: coloca el sprite y deja que el
// cuerpo le sume su efecto. Devuelve la posición base usada.
function avanzar(cuerpo, segundos, cuadros = 1) {
  for (let cuadro = 0; cuadro < cuadros; cuadro += 1) {
    cuerpo.sprite.x = 100
    cuerpo.sprite.y = 200
    cuerpo.actualizar(segundos)
  }
}

test('la fase del paso vale 0 al apoyar un pie y 0,5 en el cuadro de paso', () => {
  // El ciclo 0,1,2,1 llega a Phaser como los índices 1,2,3,4: cada pareja es un paso.
  cerca(calcularFase(1, 0), 0)
  cerca(calcularFase(1, 0.5), 0.25)
  cerca(calcularFase(2, 0), 0.5)
  cerca(calcularFase(2, 0.5), 0.75)
  cerca(calcularFase(3, 0), 0)
  cerca(calcularFase(4, 0.4), 0.7)
  // Un cuadro que ya se pasó de tiempo no sale del paso.
  assert.ok(calcularFase(4, 5) < 1)
  assert.equal(calcularFase(1, -3), 0)
})

test('la fase se lee del reloj de la animación, con su duración propia de cuadro', () => {
  cerca(leerFase({ currentFrame: { index: 3 }, accumulator: 50, nextTick: 100, msPerFrame: 125 }), 0.25)
  // Sin nextTick se usa la duración nominal del cuadro.
  cerca(leerFase({ currentFrame: { index: 2 }, accumulator: 62.5, nextTick: 0, msPerFrame: 125 }), 0.75)
  assert.equal(leerFase({ currentFrame: null, accumulator: 0, nextTick: 0, msPerFrame: 0 }), 0)
})

test('el cuerpo sube a mitad del paso y se aplasta en el apoyo, sin saltos entre un paso y otro', () => {
  for (const perfil of [PERFIL_CUY, PERFIL_ZORRO]) {
    const { rebote } = perfil
    cerca(calcularRebote(0, rebote).altura, 0)
    cerca(calcularRebote(0.5, rebote).altura, 1)
    cerca(calcularRebote(1, rebote).altura, 0, 1e-12)
    cerca(calcularRebote(0, rebote).aplaste, 1)
    cerca(calcularRebote(0.999999, rebote).aplaste, 1, 1e-6)
    // A mitad del paso el cuerpo está estirado: nada de aplaste.
    cerca(calcularRebote(0.5, rebote).aplaste, 0)
    cerca(calcularRebote(rebote.ventanaAplaste, rebote).aplaste, 0)
    cerca(calcularRebote(1 - rebote.ventanaPrevia, rebote).aplaste, 0)
    // Entre el apoyo y el fin de la ventana el aplaste solo baja.
    let anterior = 1
    for (let paso = 1; paso <= 20; paso += 1) {
      const actual = calcularRebote(rebote.ventanaAplaste * paso / 20, rebote).aplaste
      assert.ok(actual <= anterior + 1e-12, 'el aplaste debe soltarse sin rebotar')
      anterior = actual
    }
  }
})

test('los perfiles aplastan menos del 5 %, suben unos píxeles y el zorro es más pesado', () => {
  for (const perfil of [PERFIL_CUY, PERFIL_ZORRO]) {
    assert.ok(perfil.rebote.aplaste > 0.01 && perfil.rebote.aplaste < 0.05)
    // En un mapa chico (casilla de 53 px) y en uno grande (72 px) siguen siendo unos píxeles.
    assert.ok(perfil.rebote.altura * 53 >= 1.5 && perfil.rebote.altura * 72 <= 6)
  }
  assert.ok(PERFIL_ZORRO.rebote.altura < PERFIL_CUY.rebote.altura)
  assert.ok(PERFIL_ZORRO.rebote.aplaste > PERFIL_CUY.rebote.aplaste)
  assert.ok(PERFIL_ZORRO.rebote.ventanaAplaste > PERFIL_CUY.rebote.ventanaAplaste)
  assert.ok(PERFIL_ZORRO.suavizado.subida < PERFIL_CUY.suavizado.subida)
})

test('al apoyar el pie el sprite queda más ancho y más bajo; a mitad del paso, más alto', () => {
  const apoyo = new CuerpoVivo(crearSpriteFalso({ indice: 1, progreso: 0 }), PERFIL_CUY, { casilla: CASILLA })
  avanzar(apoyo, 1 / 60, 90)
  const aplaste = PERFIL_CUY.rebote.aplaste
  cerca(apoyo.sprite.scaleX, 0.5 * (1 + aplaste), 1e-4)
  cerca(apoyo.sprite.scaleY, 0.5 * (1 - aplaste), 1e-4)
  assert.ok(apoyo.sprite.scaleX > 0.5 && apoyo.sprite.scaleY < 0.5)
  // En el apoyo el cuerpo está abajo: no se le resta altura.
  cerca(apoyo.sprite.y, 200, 1e-6)

  const paso = new CuerpoVivo(crearSpriteFalso({ indice: 2, progreso: 0 }), PERFIL_CUY, { casilla: CASILLA })
  avanzar(paso, 1 / 60, 90)
  cerca(paso.sprite.y, 200 - PERFIL_CUY.rebote.altura * CASILLA, 1e-4)
  cerca(paso.sprite.scaleX, 0.5, 1e-9)
  cerca(paso.sprite.scaleY, 0.5, 1e-9)
  assert.equal(paso.sprite.rotation, 0)
  assert.deepEqual(paso.desplazamiento.x, 0)
  assert.ok(paso.desplazamiento.y < 0)
})

test('el efecto aparece y desaparece suavemente, y al detenerse el sprite recupera su tamaño', () => {
  const sprite = crearSpriteFalso({ indice: 1, progreso: 0 })
  const cuerpo = new CuerpoVivo(sprite, PERFIL_CUY, { casilla: CASILLA })
  avanzar(cuerpo, 1 / 60)
  assert.ok(cuerpo.intensidad > 0 && cuerpo.intensidad < 0.35, 'el primer cuadro no salta a toda su fuerza')
  avanzar(cuerpo, 1 / 60, 90)
  assert.ok(cuerpo.intensidad > 0.99)

  sprite.estadoMovimiento = 'reposo'
  avanzar(cuerpo, 1 / 60)
  assert.ok(cuerpo.intensidad > 0.5, 'al detenerse tampoco se apaga de golpe')
  avanzar(cuerpo, 1 / 60, 120)
  assert.equal(cuerpo.intensidad, 0)
  assert.equal(sprite.scaleX, 0.5)
  assert.equal(sprite.scaleY, 0.5)
  assert.equal(sprite.y, 200)
})

test('una expresión o la vida apagada no mueven el cuerpo', () => {
  const feliz = new CuerpoVivo(crearSpriteFalso({ expresion: 'feliz' }), PERFIL_CUY, { casilla: CASILLA })
  avanzar(feliz, 1 / 60, 60)
  assert.equal(feliz.intensidad, 0)
  assert.equal(feliz.sprite.scaleX, 0.5)

  const apagado = new CuerpoVivo(crearSpriteFalso({ indice: 2 }), PERFIL_CUY, { casilla: CASILLA, activo: false })
  avanzar(apagado, 1 / 60, 60)
  assert.equal(apagado.sprite.scaleX, 0.5)
  assert.equal(apagado.sprite.scaleY, 0.5)
  assert.equal(apagado.sprite.y, 200)
  assert.equal(apagado.altura, 0)
})
