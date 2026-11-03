import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CapturaLaberinto, CONGELADO, TEMBLOR, calcularTemblor } from '../../juegos/laberinto/efectos/CapturaLaberinto.js'

const ANCHO = 1280

// Una escena de mentira con una cámara que recuerda su scroll, un administrador de
// tweens con escala de tiempo y dos zorros con reloj de animación propio.
function crearEscena() {
  const zorros = [{ anims: { timeScale: 1 } }, { anims: { timeScale: 1 } }]
  const escena = {
    tweens: { timeScale: 1 },
    cameras: { main: { scrollX: 0, scrollY: 0, setScroll(x, y) { this.scrollX = x; this.scrollY = y } } },
  }
  return { escena, zorros }
}

test('el temblor arranca desde quieto, va y viene y se apaga solo', () => {
  assert.deepEqual(calcularTemblor(0, TEMBLOR), { x: 0, y: calcularTemblor(0, TEMBLOR).y })
  assert.equal(calcularTemblor(0, TEMBLOR).x, 0)
  assert.deepEqual(calcularTemblor(TEMBLOR.duracion, TEMBLOR), { x: 0, y: 0 })
  assert.deepEqual(calcularTemblor(TEMBLOR.duracion * 3, TEMBLOR), { x: 0, y: 0 })

  let cambios = 0
  let anterior = 0
  let ultimo = 1
  let mayorX = 0
  let mayorY = 0
  for (let paso = 1; paso < 400; paso += 1) {
    const { x, y } = calcularTemblor((TEMBLOR.duracion * paso) / 400, TEMBLOR)
    mayorX = Math.max(mayorX, Math.abs(x))
    mayorY = Math.max(mayorY, Math.abs(y))
    if (anterior * x < 0) cambios += 1
    if (x !== 0) anterior = x
    // La envolvente solo baja: nunca vuelve a sacudir con más fuerza.
    const fuerza = Math.hypot(x, y)
    assert.ok(fuerza <= ultimo + 1)
    ultimo = fuerza
  }
  assert.ok(cambios >= 3, 'va y viene varias veces')
  assert.ok(mayorX <= 1 && mayorY <= TEMBLOR.alto + 1e-9)
})

test('es muy suave: unos pocos píxeles, sin marear', () => {
  // Menos de 4 píxeles de ida en una pantalla de 1280 y menos de medio segundo.
  assert.ok(TEMBLOR.amplitud * ANCHO <= 4)
  assert.ok(TEMBLOR.duracion <= 0.6)
  assert.ok(TEMBLOR.frecuencia <= 10)
  // Un instante: menos de un cuarto de segundo.
  assert.ok(CONGELADO.segundos > 0.08 && CONGELADO.segundos < 0.25)
})

test('al empezar, congela los tweens y la animación de los zorros y mueve la cámara', () => {
  const { escena, zorros } = crearEscena()
  const captura = new CapturaLaberinto(escena, { ancho: ANCHO, congelables: zorros })
  assert.equal(captura.iniciar(), true)
  assert.equal(captura.estado().congelado, true)
  assert.equal(escena.tweens.timeScale, 0)
  assert.deepEqual(zorros.map((zorro) => zorro.anims.timeScale), [0, 0])

  // Un cuadro después la cámara ya tiembla y sigue congelado.
  const resultado = captura.actualizar(1 / 60)
  assert.deepEqual(resultado, { congelado: true, termino: false })
  assert.ok(escena.cameras.main.scrollX !== 0 || escena.cameras.main.scrollY !== 0)
  assert.ok(Math.abs(escena.cameras.main.scrollX) <= TEMBLOR.amplitud * ANCHO)
})

test('al terminar el congelado avisa una sola vez, reanuda todo y el temblor sigue un rato', () => {
  const { escena, zorros } = crearEscena()
  const captura = new CapturaLaberinto(escena, { ancho: ANCHO, congelables: zorros })
  captura.iniciar()
  let terminos = 0
  let cuadrosCongelado = 0
  for (let cuadro = 0; cuadro < 60; cuadro += 1) {
    const { congelado, termino } = captura.actualizar(1 / 60)
    if (congelado) cuadrosCongelado += 1
    if (termino) terminos += 1
    if (termino) {
      assert.equal(escena.tweens.timeScale, 1)
      assert.deepEqual(zorros.map((zorro) => zorro.anims.timeScale), [1, 1])
    }
  }
  assert.equal(terminos, 1)
  assert.ok(Math.abs(cuadrosCongelado / 60 - CONGELADO.segundos) < 2 / 60, 'dura lo previsto')
  // El temblor dura más que el congelado y termina con la cámara en su sitio.
  assert.equal(captura.estado().temblando, false)
  assert.equal(escena.cameras.main.scrollX, 0)
  assert.equal(escena.cameras.main.scrollY, 0)
  assert.equal(captura.estado().congelados, 1)
})

test('salir de la escena en pleno congelado deja todo reanudado', () => {
  const { escena, zorros } = crearEscena()
  const captura = new CapturaLaberinto(escena, { ancho: ANCHO, congelables: zorros })
  captura.iniciar()
  captura.actualizar(1 / 60)
  captura.destruir()
  assert.equal(escena.tweens.timeScale, 1)
  assert.deepEqual(zorros.map((zorro) => zorro.anims.timeScale), [1, 1])
  assert.equal(captura.estado().congelado, false)
  assert.equal(captura.estado().temblando, false)
})

test('el temblor se suma al encuadre de la escena y al apagarse la cámara vuelve a él', () => {
  const { escena, zorros } = crearEscena()
  // Una pantalla alargada deja el mundo centrado: la cámara mira 160 px a la izquierda.
  const encuadre = { x: -160, y: 0 }
  const captura = new CapturaLaberinto(escena, { ancho: ANCHO, congelables: zorros, desfase: () => encuadre })
  captura.iniciar()
  let mayorDesvio = 0
  for (let cuadro = 0; cuadro < 60; cuadro += 1) {
    captura.actualizar(1 / 60)
    mayorDesvio = Math.max(mayorDesvio, Math.abs(escena.cameras.main.scrollX - encuadre.x))
    assert.ok(Math.abs(escena.cameras.main.scrollX - encuadre.x) <= TEMBLOR.amplitud * ANCHO + 1e-9)
  }
  assert.ok(mayorDesvio > 0.5, 'tiembla alrededor del encuadre')
  assert.equal(captura.estado().temblando, false)
  assert.equal(escena.cameras.main.scrollX, -160)
  assert.equal(escena.cameras.main.scrollY, 0)
})

test('con la vida apagada no congela ni tiembla y la escena aplica la captura de golpe', () => {
  const { escena, zorros } = crearEscena()
  const captura = new CapturaLaberinto(escena, { ancho: ANCHO, congelables: zorros, activo: false })
  assert.equal(captura.iniciar(), false)
  assert.deepEqual(captura.actualizar(1 / 60), { congelado: false, termino: false })
  assert.equal(escena.tweens.timeScale, 1)
  assert.equal(escena.cameras.main.scrollX, 0)
  assert.equal(captura.estado().congelados, 0)
})
