import test from 'node:test'
import assert from 'node:assert/strict'
import {
  analizarCuadro, clasificarVocal, decidir, SEGUNDOS_POR_CUADRO,
} from '../../kit/reproductor/logica/escucharVocal.js'

const FRECUENCIA = 16000
// Frecuencias de partida independientes del canto y de la tabla del reconocedor.
const FORMANTES_ADULTA = {
  a: [840, 1550, 2870, 3900],
  e: [510, 2140, 2940, 3800],
  i: [315, 2580, 3350, 4120],
  o: [470, 1090, 2930, 4040],
  u: [315, 880, 2830, 3990],
}

function generadorDeRuido(semilla = 231) {
  return () => {
    semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0
    return semilla / 2147483648 - 1
  }
}

function resonador(ancho, muestreo) {
  const radio = Math.exp(-Math.PI * ancho / muestreo)
  let salida = 0
  let previa = 0
  return (entrada, frecuencia) => {
    const coeficiente = 2 * radio * Math.cos(2 * Math.PI * frecuencia / muestreo)
    const valor = (1 - coeficiente + radio ** 2) * entrada + coeficiente * salida - radio ** 2 * previa
    previa = salida
    salida = valor
    return valor
  }
}

function sintetizar(vocal, { tono, escala, duracion, desvio, muestreo, ruidoAmbiente = 0.004 }) {
  const ruido = generadorDeRuido(tono)
  const formantes = FORMANTES_ADULTA[vocal].map(frecuencia => frecuencia * escala)
  const filtros = [95, 130, 170, 240].map(ancho => resonador(ancho * escala, muestreo))
  const muestras = new Float32Array(Math.round((duracion + 0.24) * muestreo))
  let fase = 0
  let pulsoPrevio = 0
  let maximo = 0
  for (let indice = 0; indice < muestras.length; indice++) {
    const tiempo = indice / muestreo - 0.08
    const amplitud = Math.max(0, Math.min(1, tiempo / 0.035, (duracion - tiempo) / 0.065))
    const vibrato = 1 + 0.025 * Math.sin(2 * Math.PI * 4.7 * tiempo) + 0.008 * ruido()
    fase = (fase + tono * vibrato / muestreo) % 1
    // Apertura lenta y cierre rápido. La derivada del pulso y la cascada de
    // resonadores imitan la excitación glotal y la respuesta del tracto vocal.
    let pulso = 0
    if (fase < 0.59) pulso = 0.5 * (1 - Math.cos(Math.PI * fase / 0.59))
    else if (fase < 0.78) pulso = Math.cos(Math.PI * (fase - 0.59) / (2 * 0.19))
    let salida = (pulso - pulsoPrevio) * (1 + 0.12 * Math.sin(2 * Math.PI * 3.2 * tiempo)) + 0.002 * ruido()
    pulsoPrevio = pulso

    for (const [canal, filtrar] of filtros.entries()) {
      const deriva = 1 + desvio * (0.65 + 0.35 * Math.sin(2 * Math.PI * 2 * tiempo + canal))
      salida = filtrar(salida, formantes[canal] * deriva)
    }
    muestras[indice] = amplitud * salida
    maximo = Math.max(maximo, Math.abs(muestras[indice]))
  }
  return muestras.map(valor => 0.42 * valor / maximo + ruidoAmbiente * ruido())
}

function analizar(muestras, muestreo = FRECUENCIA) {
  const cuadros = []
  const longitud = Math.round(muestreo * SEGUNDOS_POR_CUADRO)
  for (let inicio = 0; inicio + longitud <= muestras.length; inicio += longitud) {
    cuadros.push(analizarCuadro(muestras.subarray(inicio, inicio + longitud), muestreo))
  }
  return cuadros
}

const VOCES = [
  ['adulta grave', 180, 1, 0.4, -0.10, 16000],
  ['adulta aguda', 235, 1.03, 0.7, 0.10, 44100],
  ['de niño', 300, 1.20, 0.65, -0.10, 19200],
  ['de niña', 380, 1.31, 1, 0.10, 48000],
]

for (const vocal of 'aeiou') {
  for (const [voz, tono, escala, duracion, desvio, muestreo] of VOCES) {
    test('reconoce la ' + vocal + ' con voz ' + voz + ' y ruido de fondo', () => {
      const muestras = sintetizar(vocal, { tono, escala, duracion, desvio, muestreo })
      const cuadros = analizar(muestras, muestreo)
      const resultado = decidir(cuadros)
      assert.equal(resultado.oyo, true)
      assert.equal(resultado.vocal, vocal)
      assert.ok(cuadros.some(cuadro => cuadro.voz && Math.abs(cuadro.tono - tono) < 0.07 * tono))
    })
  }
}

test('confirma vocales claras y deja sin confirmar una pronunciación entre dos vocales', () => {
  for (const vocal of 'ai') {
    const muestras = sintetizar(vocal, { tono: 180, escala: 1, duracion: 0.68, desvio: 0, muestreo: FRECUENCIA })
    assert.deepEqual(decidir(analizar(muestras)), { oyo: true, vocal, seguro: true })
  }
  const a = { voz: true, f1: 900, f2: 1600 }
  const e = { voz: true, f1: 480, f2: 2160 }
  const mezcla = [...Array(5).fill(a), ...Array(5).fill(e)]
  assert.equal(decidir(mezcla).seguro, false)
  assert.equal(decidir([...mezcla, a, a]).seguro, false)
  assert.deepEqual(clasificarVocal(null, 1600), { vocal: null, distancia: Infinity })
})

test('compara todos los cuadros con la escala del tono predominante en la escucha', () => {
  // El mismo par de resonancias puede corresponder a una O en una voz
  // grave o a una U en una voz aguda. Los cambios de tono de unos cuadros
  // no deben cambiar la escala con que se evalúan esos cuadros.
  const cuadro = { voz: true, f1: 430, f2: 1250, f3: 3300 }
  const grave = { ...cuadro, tono: 160 }
  const agudo = { ...cuadro, tono: 260 }
  assert.deepEqual(decidir([...Array(6).fill(grave), ...Array(4).fill(agudo)]),
    { oyo: true, vocal: 'o', seguro: true })
  assert.deepEqual(decidir([...Array(6).fill(agudo), ...Array(4).fill(grave)]),
    { oyo: true, vocal: 'u', seguro: true })
})

test('escucha la vocal y deja la confirmación pendiente si F2 es demasiado ancho', () => {
  // Con las frecuencias fijas, un pico más ancho se acerca a la siguiente
  // resonancia y hace menos fiable la medida de su centro.
  const cuadro = { voz: true, tono: 185, f1: 340, f2: 2600, f3: 3200 }
  assert.deepEqual(decidir(Array(8).fill({ ...cuadro, anchoF2: 110 })),
    { oyo: true, vocal: 'i', seguro: true })
  assert.deepEqual(decidir(Array(8).fill({ ...cuadro, anchoF2: 240 })),
    { oyo: true, vocal: 'i', seguro: false })
})

test('detecta voz con tonos cercanos a los extremos del intervalo', () => {
  for (const tono of [85, 580]) {
    const muestras = sintetizar('a', { tono, escala: 1, duracion: 0.48, desvio: 0, muestreo: FRECUENCIA })
    const cuadros = analizar(muestras)
    assert.equal(decidir(cuadros).oyo, true)
    assert.ok(cuadros.some(cuadro => cuadro.voz && Math.abs(cuadro.tono - tono) < 0.05 * tono))
  }
})

test('silencio, ruido, aplauso y golpe corto no cuentan como voz', () => {
  const ruido = generadorDeRuido()
  const silencio = new Float32Array(2 * FRECUENCIA)
  const ruidoDeFondo = silencio.map(() => 0.2 * ruido())
  const aplauso = silencio.map((_, indice) => indice < 0.12 * FRECUENCIA ? ruido() * Math.exp(-indice / 190) : 0)
  const golpe = silencio.map((_, indice) => indice < 0.12 * FRECUENCIA
    ? Math.sin(2 * Math.PI * 320 * indice / FRECUENCIA) * Math.exp(-indice / 500) : 0)
  for (const muestras of [silencio, ruidoDeFondo, aplauso, golpe]) {
    assert.deepEqual(decidir(analizar(muestras)), { oyo: false, vocal: null, seguro: false })
  }
})
