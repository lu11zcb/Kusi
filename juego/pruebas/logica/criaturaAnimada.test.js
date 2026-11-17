import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cuadroDeLaCriatura, miraDeLaCriatura, CICLO_CRIATURA, CUADRO_QUIETO, FPS_CRIATURA } from '../../kit/reproductor/logica/criatura.js'

test('quieta se queda en el cuadro del medio y caminando recorre el ciclo 0, 1, 2, 1', () => {
  for (const t of [0, 90, 5000]) assert.equal(cuadroDeLaCriatura(t, false), CUADRO_QUIETO)
  const paso = 1000 / FPS_CRIATURA
  const secuencia = [0, 1, 2, 3, 4, 5].map((i) => cuadroDeLaCriatura(i * paso + 1, true))
  assert.deepEqual(secuencia, [0, 1, 2, 1, 0, 1])
  assert.deepEqual([...CICLO_CRIATURA], [0, 1, 2, 1])
  assert.equal(cuadroDeLaCriatura(-50, true), 0, 'un reloj negativo no rompe nada')
})

test('mira a la derecha o a la izquierda según avanza y conserva la mirada al detenerse', () => {
  assert.equal(miraDeLaCriatura(3), 1)
  assert.equal(miraDeLaCriatura(-3), -1)
  assert.equal(miraDeLaCriatura(0.1, -1), -1)
  assert.equal(miraDeLaCriatura(-0.2, 1), 1)
  assert.equal(miraDeLaCriatura(0), 1)
})
