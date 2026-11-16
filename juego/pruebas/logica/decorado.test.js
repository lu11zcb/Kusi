import test from 'node:test'
import assert from 'node:assert/strict'
import { generador, repartirDecorado, cantidadParaDensidad, profundidadPorY, avanzarParticula, PANTALLA } from '../../kit/reproductor/logica/decorado.js'

test('el generador con la misma semilla repite sus números, y con otra da otros', () => {
  const a = generador(5), b = generador(5), c = generador(6)
  const sa = [a(), a(), a()], sb = [b(), b(), b()], sc = [c(), c(), c()]
  assert.deepEqual(sa, sb)
  assert.notDeepEqual(sa, sc)
  assert.ok(sa.every((n) => n >= 0 && n < 1))
})

test('el decorado se reparte sin amontonarse, dentro del área y lejos de lo que se evita', () => {
  const area = { x: 0, y: 0, ancho: 2000, alto: 1200 }
  const evitar = [{ x: 800, y: 400, ancho: 400, alto: 200 }]
  const puntos = repartirDecorado({ area, cantidad: 60, separacion: 120, margen: 40, evitar, semilla: 3 })
  assert.ok(puntos.length >= 40, 'caben pocos: ' + puntos.length)
  for (const p of puntos) {
    assert.ok(p.x >= 40 && p.x <= 1960 && p.y >= 40 && p.y <= 1160)
    assert.equal(p.x > 760 && p.x < 1240 && p.y > 360 && p.y < 640, false, 'cayó en la zona que se evita')
    assert.ok(p.variante >= 0 && p.variante < 3 && p.escala >= 0.85 && p.escala <= 1.2)
  }
  for (let i = 0; i < puntos.length; i++) for (let j = i + 1; j < puntos.length; j++) {
    assert.ok(Math.hypot(puntos[i].x - puntos[j].x, puntos[i].y - puntos[j].y) >= 119, 'dos adornos amontonados')
  }
  assert.deepEqual(puntos, repartirDecorado({ area, cantidad: 60, separacion: 120, margen: 40, evitar, semilla: 3 }))
})

test('si no caben todos los adornos, devuelve los que caben sin quedarse en un ciclo', () => {
  const puntos = repartirDecorado({ area: { x: 0, y: 0, ancho: 300, alto: 300 }, cantidad: 200, separacion: 150, margen: 20 })
  assert.ok(puntos.length >= 1 && puntos.length < 200)
})

test('la cantidad de adornos crece con el tamaño del lugar', () => {
  assert.equal(cantidadParaDensidad({ ancho: PANTALLA.ancho, alto: PANTALLA.alto }, 14), 14)
  assert.equal(cantidadParaDensidad({ ancho: PANTALLA.ancho * 3, alto: PANTALLA.alto * 2 }, 14), 84)
  assert.equal(cantidadParaDensidad({ ancho: 10, alto: 10 }), 1)
})

test('lo que está más abajo se dibuja delante', () => {
  assert.ok(profundidadPorY(800) > profundidadPorY(200))
})

test('una partícula flota y, al salirse del área, vuelve a entrar por el lado opuesto', () => {
  const area = { x: 0, y: 0, ancho: 1000, alto: 600 }
  const nueva = avanzarParticula({ x: 100, y: 100, vx: 50, vy: 10 }, 1, area)
  assert.deepEqual(nueva, { x: 150, y: 110 })
  const salida = avanzarParticula({ x: 1035, y: 300, vx: 100, vy: 0 }, 1, area)
  assert.ok(salida.x < 200, 'no volvió a entrar: ' + salida.x)
})
