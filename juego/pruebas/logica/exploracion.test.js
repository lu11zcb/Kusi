import test from 'node:test'
import assert from 'node:assert/strict'
import { moverConColisiones, crearAdversario, avanzarAdversario, ADVERSARIO } from '../../kit/reproductor/logica/exploracion.js'

const LIMITES = { izquierda: 0, derecha: 1000, arriba: 0, abajo: 800 }

test('el protagonista se mueve libremente y no sale del mundo', () => {
  const libre = moverConColisiones({ x: 100, y: 100 }, { x: 1, y: 0 }, 200, 0.05, { limites: LIMITES })
  assert.ok(libre.x > 100 && libre.y === 100)
  assert.deepEqual(moverConColisiones({ x: 40, y: 40 }, { x: -1, y: -1 }, 500, 0.05, { limites: LIMITES, radio: 28 }), { x: 28, y: 28 })
  assert.equal(moverConColisiones({ x: 990, y: 400 }, { x: 1, y: 0 }, 500, 0.05, { limites: LIMITES }).x, 1000 - 28)
})

test('choca con un obstáculo y resbala a lo largo de él en vez de quedarse pegado', () => {
  const muro = { x: 300, y: 0, ancho: 40, alto: 600 }
  // De frente contra el muro: se detiene antes de atravesarlo.
  let p = { x: 240, y: 300 }
  for (let i = 0; i < 40; i++) p = moverConColisiones(p, { x: 1, y: 0 }, 300, 1 / 60, { obstaculos: [muro], radio: 28 })
  assert.ok(p.x <= 300 - 28 + 0.001, 'atravesó el muro: ' + p.x)
  // En diagonal contra el muro: sigue subiendo por el eje que está libre.
  p = { x: 260, y: 400 }
  for (let i = 0; i < 20; i++) p = moverConColisiones(p, { x: 1, y: -1 }, 300, 1 / 60, { obstaculos: [muro], radio: 28 })
  assert.ok(p.y < 400 && p.x <= 300 - 28 + 0.001)
})

test('en diagonal no corre más que en línea recta', () => {
  const recto = moverConColisiones({ x: 0, y: 0 }, { x: 1, y: 0 }, 300, 0.05)
  const diagonal = moverConColisiones({ x: 0, y: 0 }, { x: 1, y: 1 }, 300, 0.05)
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - recto.x) < 1e-9)
})

function jugar(adversario, objetivo, segundos, contexto = {}) {
  const banderas = { alertas: 0, capturas: 0, cansancios: 0 }
  const pasos = Math.round(segundos * 60)
  for (let i = 0; i < pasos; i++) {
    avanzarAdversario(adversario, objetivo, 1 / 60, { velocidadProtagonista: 380, ...contexto })
    if (adversario.alerto) banderas.alertas++
    if (adversario.capturo) banderas.capturas++
    if (adversario.canso) banderas.cansancios++
  }
  return banderas
}

test('el adversario patrulla despacio mientras el protagonista está lejos', () => {
  const a = crearAdversario({ x: 0, y: 0, patrulla: [{ x: 0, y: 0 }, { x: 300, y: 0 }] })
  jugar(a, { x: 5000, y: 5000 }, 2)
  assert.equal(a.estado, 'patrulla')
  assert.ok(a.x > 0)
  // 2 s a como mucho el 35 % de 380 px/s.
  assert.ok(a.x <= 380 * ADVERSARIO.proporcionPatrulla * 2 + 1)
})

test('al ver al protagonista avisa 0,6 s, luego lo persigue, más lento que él', () => {
  const a = crearAdversario({ x: 0, y: 0 })
  const objetivo = { x: 300, y: 0 }
  const primero = jugar(a, objetivo, 0.1)
  assert.equal(primero.alertas, 1)
  assert.equal(a.estado, 'aviso')
  const xAviso = a.x
  jugar(a, objetivo, 0.4)
  assert.equal(a.x, xAviso, 'durante el aviso no se mueve')
  jugar(a, objetivo, 0.3)
  assert.equal(a.estado, 'persigue')
  const antes = a.x
  jugar(a, { x: 5000, y: 0 }, 1)
  const avance = a.x - antes
  assert.ok(avance > 0 && avance <= 380 * ADVERSARIO.proporcionVelocidad * 1 + 2, 'avanzó ' + avance)
})

test('si alcanza al protagonista lo captura una vez y se cansa, y descansando no atrapa', () => {
  const a = crearAdversario({ x: 100, y: 0 })
  const banderas = jugar(a, { x: 130, y: 0 }, 1.2)
  assert.equal(banderas.capturas, 1)
  assert.equal(banderas.cansancios, 1)
  assert.equal(a.estado, 'descansa')
  // Descansa 2 s y en ese tiempo no atrapa aunque el protagonista esté encima.
  const mientras = jugar(a, { x: a.x, y: a.y }, 1.0)
  assert.equal(mientras.capturas, 0)
  assert.equal(a.estado, 'descansa')
  jugar(a, { x: a.x + 5000, y: 0 }, 0.7)
  assert.equal(a.estado, 'patrulla')
})

test('se cansa a los 5 segundos de perseguir aunque no lo alcance', () => {
  const a = crearAdversario({ x: 0, y: 0 })
  // El protagonista siempre va delante, a 300 px.
  let cansancios = 0
  for (let i = 0; i < 60 * 7; i++) {
    avanzarAdversario(a, { x: a.x + 300, y: 0 }, 1 / 60, { velocidadProtagonista: 380 })
    if (a.canso) cansancios++
  }
  assert.ok(cansancios >= 1)
})

test('el adversario no atraviesa los obstáculos', () => {
  const muro = { x: 150, y: -500, ancho: 40, alto: 1000 }
  const a = crearAdversario({ x: 50, y: 0 })
  jugar(a, { x: 300, y: 0 }, 4, { obstaculos: [muro] })
  assert.ok(a.x <= 150 - 30 + 0.001, 'atravesó el muro: ' + a.x)
})
