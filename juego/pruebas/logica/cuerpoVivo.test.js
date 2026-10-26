import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  calcularFase, calcularRebote, calcularRespiracion, calcularSacudida, leerFase, CuerpoVivo, PERFIL_CUY, PERFIL_ZORRO,
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

test('el rebote aparece y desaparece suavemente, y al detenerse el sprite recupera su tamaño', () => {
  const sprite = crearSpriteFalso({ indice: 1, progreso: 0 })
  // Sin respiración: el cuy quieto respira y no vuelve a medir exactamente lo mismo.
  const cuerpo = new CuerpoVivo(sprite, { ...PERFIL_CUY, respiracion: null }, { casilla: CASILLA })
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

test('la respiración estira y encoge el cuerpo entre un 2 % y un 3 % cada 2 segundos', () => {
  const respiracion = PERFIL_CUY.respiracion
  assert.ok(respiracion.amplitud >= 0.02 && respiracion.amplitud <= 0.03)
  assert.equal(respiracion.periodo, 2)
  cerca(calcularRespiracion(0, respiracion), 0)
  cerca(calcularRespiracion(0.5, respiracion), respiracion.amplitud)
  cerca(calcularRespiracion(1, respiracion), 0)
  cerca(calcularRespiracion(1.5, respiracion), -respiracion.amplitud)
  cerca(calcularRespiracion(2, respiracion), 0)
})

test('quieto, el cuy respira solo a lo alto y sin despegar los pies del suelo', () => {
  const cuerpo = new CuerpoVivo(crearSpriteFalso({ caminando: false }), PERFIL_CUY, { casilla: CASILLA })
  let maximo = -Infinity
  let minimo = Infinity
  for (let cuadro = 0; cuadro < 60 * 6; cuadro += 1) {
    avanzar(cuerpo, 1 / 60)
    // Se descartan los primeros segundos, mientras la respiración se asienta.
    if (cuadro > 60 * 2) {
      const cambio = cuerpo.sprite.scaleY / 0.5 - 1
      maximo = Math.max(maximo, cambio)
      minimo = Math.min(minimo, cambio)
    }
    assert.equal(cuerpo.sprite.scaleX, 0.5, 'respirar no ensancha el cuerpo')
    assert.equal(cuerpo.sprite.y, 200, 'los pies no se despegan del suelo')
    assert.equal(cuerpo.sprite.rotation, 0)
  }
  cerca(maximo, PERFIL_CUY.respiracion.amplitud, 0.001)
  cerca(minimo, -PERFIL_CUY.respiracion.amplitud, 0.001)
})

test('la respiración empieza y termina con suavidad al caminar y al hacer una expresión', () => {
  const sprite = crearSpriteFalso({ caminando: false })
  const cuerpo = new CuerpoVivo(sprite, PERFIL_CUY, { casilla: CASILLA })
  // Primer cuadro: todavía no hay respiración, aparece poco a poco.
  avanzar(cuerpo, 1 / 60)
  assert.ok(cuerpo.quietud < 0.2)
  avanzar(cuerpo, 1 / 60, 150)
  assert.ok(cuerpo.quietud > 0.99)

  // Al empezar a caminar se apaga sin saltos y el sprite recupera su alto.
  sprite.estadoMovimiento = 'caminar'
  avanzar(cuerpo, 1 / 60)
  assert.ok(cuerpo.quietud > 0.5, 'no se apaga de golpe')
  avanzar(cuerpo, 1 / 60, 120)
  assert.equal(cuerpo.quietud, 0)
  assert.equal(cuerpo.respiracion, 0)

  // Una expresión tampoco deja respirar al cuerpo.
  sprite.estadoMovimiento = 'reposo'
  sprite.estadoExpresivo = 'feliz'
  avanzar(cuerpo, 1 / 60, 120)
  assert.equal(cuerpo.respiracion, 0)
})

test('el zorro no respira ni con la vida apagada el cuy', () => {
  const zorro = new CuerpoVivo(crearSpriteFalso({ caminando: false }), PERFIL_ZORRO, { casilla: CASILLA })
  avanzar(zorro, 1 / 60, 300)
  assert.equal(zorro.respiracion, 0)
  assert.equal(zorro.sprite.scaleY, 0.5)

  const apagado = new CuerpoVivo(crearSpriteFalso({ caminando: false }), PERFIL_CUY, { casilla: CASILLA, activo: false })
  avanzar(apagado, 1 / 60, 300)
  assert.equal(apagado.respiracion, 0)
  assert.equal(apagado.sprite.scaleY, 0.5)
})

test('la sacudida va y viene de lado a lado y se apaga sola', () => {
  const sacudida = PERFIL_CUY.sacudida
  cerca(calcularSacudida(0, sacudida), 0)
  cerca(calcularSacudida(sacudida.duracion, sacudida), 0)
  cerca(calcularSacudida(sacudida.duracion * 2, sacudida), 0)
  let cambiosDeLado = 0
  let anterior = 0
  let mayor = 0
  for (let paso = 1; paso < 200; paso += 1) {
    const valor = calcularSacudida(sacudida.duracion * paso / 200, sacudida)
    assert.ok(Math.abs(valor) <= 1)
    if (anterior * valor < 0) cambiosDeLado += 1
    if (valor !== 0) anterior = valor
    mayor = Math.max(mayor, Math.abs(valor))
  }
  assert.ok(cambiosDeLado >= 4, 'va y viene varias veces')
  assert.ok(mayor > 0.5)
  // «Un poquito»: menos de un décimo de casilla hacia cada lado.
  assert.ok(sacudida.amplitud > 0.02 && sacudida.amplitud < 0.1)
  assert.ok(sacudida.duracion > 0.2 && sacudida.duracion < 0.5)
})

test('al sacudirse el cuerpo se desplaza de lado y vuelve a su sitio sin cambiar de tamaño', () => {
  const cuerpo = new CuerpoVivo(crearSpriteFalso({ caminando: false }), { ...PERFIL_CUY, respiracion: null }, { casilla: CASILLA })
  avanzar(cuerpo, 1 / 60, 10)
  assert.deepEqual(cuerpo.desplazamiento, { x: 0, y: 0 })
  assert.equal(cuerpo.sacudir(), true)
  let maximo = 0
  for (let cuadro = 0; cuadro < 60; cuadro += 1) {
    avanzar(cuerpo, 1 / 60)
    maximo = Math.max(maximo, Math.abs(cuerpo.desplazamiento.x))
    assert.equal(cuerpo.desplazamiento.y, 0, 'se sacude de lado, no sube ni baja')
    assert.equal(cuerpo.sprite.scaleX, 0.5)
    assert.equal(cuerpo.sprite.rotation, 0)
  }
  assert.ok(maximo > 1 && maximo < PERFIL_CUY.sacudida.amplitud * CASILLA + 1e-9)
  assert.equal(cuerpo.sacudiendo, false)
  assert.deepEqual(cuerpo.desplazamiento, { x: 0, y: 0 })
  assert.equal(cuerpo.sprite.x, 100)
  assert.equal(cuerpo.sacudidas, 1)
})

test('una sacudida nueva reinicia la anterior; sin vida o sin perfil no se sacude', () => {
  const cuerpo = new CuerpoVivo(crearSpriteFalso({ caminando: false }), PERFIL_CUY, { casilla: CASILLA })
  cuerpo.sacudir()
  avanzar(cuerpo, 1 / 60, 10)
  cuerpo.sacudir()
  assert.equal(cuerpo.tiempoSacudida, 0)
  assert.equal(cuerpo.sacudidas, 2)

  const zorro = new CuerpoVivo(crearSpriteFalso(), PERFIL_ZORRO, { casilla: CASILLA })
  assert.equal(zorro.sacudir(), false)
  const apagado = new CuerpoVivo(crearSpriteFalso(), PERFIL_CUY, { casilla: CASILLA, activo: false })
  assert.equal(apagado.sacudir(), false)
  avanzar(apagado, 1 / 60, 30)
  assert.deepEqual(apagado.desplazamiento, { x: 0, y: 0 })
})
