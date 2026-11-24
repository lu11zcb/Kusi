import test from 'node:test'
import assert from 'node:assert/strict'
import {
  aplicarAvisoPuntos, calcularMonedas, crearPuntos, puntosDelNivel,
} from '../../kit/reproductor/logica/puntos.js'
import { frasesDeKusi, fraseDeMonedas } from '../../kit/reproductor/datos/frases.js'

function completarRetos(...errores) {
  let puntos = crearPuntos(errores.length)
  for (const [indice, cantidad] of errores.entries()) {
    const nivel = indice + 1
    for (let intento = 0; intento < cantidad; intento += 1) {
      puntos = aplicarAvisoPuntos(puntos, { tipo: 'accion', nivel, correcto: false })
    }
    puntos = aplicarAvisoPuntos(puntos, { tipo: 'reto_completado', nivel })
  }
  return puntos
}

test('reparte como Spring y suma 20 para cada cantidad admitida de niveles', () => {
  assert.deepEqual(completarRetos(0, 0, 0).porNivel, [7, 6, 7])
  for (let cantidad = 1; cantidad <= 5; cantidad += 1) {
    const niveles = Array.from({ length: cantidad }, (_, indice) => puntosDelNivel(indice + 1, cantidad))
    assert.equal(niveles.reduce((total, valor) => total + valor, 0), 20)
  }
  assert.deepEqual(completarRetos(5, 5, 5).porNivel, [4, 3, 4])
})

test('solo descuenta errores booleanos anteriores al cierre de ese nivel', () => {
  const inicial = crearPuntos(3)
  const error = { tipo: 'accion', nivel: 1, correcto: false, orden: 1 }
  const avisos = [
    error, error,
    { tipo: 'accion', nivel: 1, correcto: 'false', orden: 2 },
    { tipo: 'accion', nivel: 1, correcto: true, orden: 3 },
    { tipo: 'ayuda', nivel: 1, orden: 4 },
    { tipo: 'accion', nivel: 1, atrapado: true, orden: 5 },
    { tipo: 'reto_completado', nivel: 1, orden: 6 },
    { tipo: 'accion', nivel: 1, correcto: false, orden: 7 },
    { tipo: 'reto_completado', nivel: 1, orden: 8 },
    { tipo: 'reto_completado', nivel: 2, orden: 9 },
    { tipo: 'reto_completado', nivel: 4, orden: 10 },
  ]
  const puntos = avisos.reduce(aplicarAvisoPuntos, inicial)
  assert.deepEqual(puntos.porNivel, [6, 6, null])
  assert.equal(puntos.total, 12)
  assert.equal(inicial.total, 0)
})

test('reproduce las monedas de la primera partida y las tres prácticas de Spring', () => {
  const primera = completarRetos(5, 0, 0)
  assert.equal(primera.total, 17)
  assert.equal(calcularMonedas(primera), 22)
  const practica = (errores, mejor, practicasUsadas) => calcularMonedas(completarRetos(errores, 0, 0), {
    mejoresPuntosPorNivel: [mejor, 6, 7], practicasUsadas,
  })
  assert.equal(practica(2, 4, 0), 3)
  assert.equal(practica(5, 5, 1), 2)
  assert.equal(practica(1, 5, 2), 3)
  assert.equal(practica(0, 6, 3), 0)
  assert.equal(calcularMonedas(completarRetos(0), { mejoresPuntosPorNivel: [6, 6, 7], practicasUsadas: 1 }), 3)
})

test('el kit lista las frases de premio y prueba docente en 60 caracteres o menos', () => {
  const frases = frasesDeKusi()
  assert.ok(frases.includes('¡Ganaste 22 monedas!'))
  assert.ok(frases.includes('Los puntos de esta prueba no se guardan.'))
  assert.ok(frases.every((frase) => frase.length <= 60))
  assert.equal(fraseDeMonedas(1), '¡Ganaste 1 moneda!')
})
