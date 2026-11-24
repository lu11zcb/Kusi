import test from 'node:test'
import assert from 'node:assert/strict'
import { crearMicrofono } from '../../kit/reproductor/interfaz/microfono.js'
import { alPrimerGesto } from '../../kit/reproductor/logica/voz.js'

const SIN_ESCUCHA = { oyo: false, vocal: null, seguro: false }

function entornoConMicrofono(leerMuestras = muestras => muestras.fill(0)) {
  const solicitudes = []
  const pistas = []
  const nodos = []
  const contextos = []
  const iniciado = Promise.withResolvers()
  function nodo() {
    const valor = {
      conexiones: [], desconexiones: 0,
      connect(destino) { this.conexiones.push(destino) },
      disconnect() { this.desconexiones++ },
      getFloatTimeDomainData(muestras) { leerMuestras(muestras) },
    }
    nodos.push(valor)
    return valor
  }
  const entorno = {
    navigator: {
      mediaDevices: {
        async getUserMedia(opciones) {
          solicitudes.push(opciones)
          const pista = { paradas: 0, stop() { this.paradas++ } }
          pistas.push(pista)
          return { getTracks: () => [pista] }
        },
      },
    },
    AudioContext: class {
      sampleRate = 48000
      state = 'suspended'
      get currentTime() { return performance.now() / 1000 }
      constructor() { contextos.push(this) }
      createMediaStreamSource() { return nodo() }
      createAnalyser() { return nodo() }
      async resume() { this.state = 'running'; iniciado.resolve() }
      async close() { this.state = 'closed' }
    },
  }
  return { entorno, solicitudes, pistas, nodos, contextos, iniciado: iniciado.promise }
}

test('el primer gesto real inicia una única solicitud y la pista de prueba se cierra', async () => {
  const { entorno, solicitudes, pistas } = entornoConMicrofono()
  const microfono = crearMicrofono(entorno)
  const eventos = new Map()
  const ventana = {
    navigator: { userActivation: { hasBeenActive: false } },
    addEventListener: (tipo, alTocar) => eventos.set(tipo, alTocar),
    removeEventListener: (tipo) => eventos.delete(tipo),
  }
  const quitar = alPrimerGesto(ventana, microfono.pedirMicrofono)
  eventos.get('pointerdown')({ isTrusted: true })
  ventana.navigator.userActivation.hasBeenActive = true
  eventos.get('pointerup')({ isTrusted: false })
  assert.equal(solicitudes.length, 0)
  eventos.get('pointerup')({ isTrusted: true })
  assert.equal(eventos.size, 0)
  assert.deepEqual(await Promise.all([microfono.pedirMicrofono(), microfono.pedirMicrofono()]), [true, true])
  assert.deepEqual(solicitudes, [{
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  }])
  assert.equal(pistas[0].paradas, 1)
  assert.equal(microfono.necesitaPermisoMicrofono(), false)
  quitar()
})

test('una negativa o un micrófono ausente se recuerdan y el parámetro 0 evita la solicitud', async () => {
  for (const nombre of ['NotAllowedError', 'NotFoundError']) {
    const { entorno } = entornoConMicrofono()
    let solicitudes = 0
    entorno.navigator.mediaDevices.getUserMedia = async () => {
      solicitudes++
      throw Object.assign(new Error(), { name: nombre })
    }
    const microfono = crearMicrofono(entorno)
    assert.equal(await microfono.pedirMicrofono(), null)
    assert.deepEqual(await microfono.escucharVocal(), SIN_ESCUCHA)
    assert.equal(await microfono.pedirMicrofono(), null)
    assert.equal(solicitudes, 1)
  }
  const { entorno, solicitudes } = entornoConMicrofono()
  entorno.location = { search: '?microfono=0' }
  const microfono = crearMicrofono(entorno)
  assert.equal(microfono.necesitaPermisoMicrofono(), false)
  assert.equal(await microfono.pedirMicrofono(), null)
  const niveles = []
  assert.deepEqual(await microfono.escucharVocal({ alNivel: nivel => niveles.push(nivel) }), SIN_ESCUCHA)
  assert.deepEqual(niveles, [0])
  assert.equal(solicitudes.length, 0)
})

test('la escucha espera a Kusi y al terminar libera pistas, nodos y contexto', async () => {
  const { entorno, solicitudes, pistas, nodos, contextos, iniciado } = entornoConMicrofono()
  let hablando = true
  const microfono = crearMicrofono(entorno, () => hablando)
  await microfono.pedirMicrofono()
  const resultado = microfono.escucharVocal({ segundos: 0.08 })
  await new Promise(setImmediate)
  assert.equal(solicitudes.length, 1)
  hablando = false
  await iniciado
  assert.deepEqual(nodos[0].conexiones, [nodos[1]])
  assert.equal(nodos[1].conexiones.length, 0)
  assert.deepEqual(await resultado, SIN_ESCUCHA)
  assert.deepEqual(pistas.map(pista => pista.paradas), [1, 1])
  assert.ok(nodos.every(nodo => nodo.desconexiones === 1))
  assert.equal(contextos[0].state, 'closed')
})

test('la escucha avisa un nivel por lectura y vuelve a cero al terminar', async (t) => {
  let tiempo = 0
  let amplitud = 0
  let semilla = 231
  const { entorno, iniciado } = entornoConMicrofono(muestras => {
    for (let indice = 0; indice < muestras.length; indice++) {
      semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0
      const ruido = 0.02 * (semilla / 2147483648 - 1)
      muestras[indice] = ruido + amplitud * Math.sin(2 * Math.PI * 240 * indice / 48000)
    }
  })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.mock.method(performance, 'now', () => tiempo)
  const microfono = crearMicrofono(entorno, () => false)
  await microfono.pedirMicrofono()
  const avisos = []
  const resultado = microfono.escucharVocal({ segundos: 0.56, alNivel: (...datos) => avisos.push(datos) })
  await iniciado

  // Cada lectura alcanza dos cuadros de audio, pero solo mueve las ondas una vez.
  for (const volumen of [0, 0, 0.045, 0.2, 0.2, 0.2, 0.2]) {
    amplitud = volumen
    tiempo += 80
    t.mock.timers.tick(16)
    await Promise.resolve()
  }

  assert.equal((await resultado).oyo, true)
  assert.equal(avisos.length, 8)
  assert.ok(avisos.every(([nivel, ...resto]) =>
    resto.length === 0 && typeof nivel === 'number' && nivel >= 0 && nivel <= 1))
  const [fondo, fondoEstable, vozSuave, subida, ...niveles] = avisos.map(([nivel]) => nivel)
  assert.equal(fondo, 0)
  assert.equal(fondoEstable, 0)
  assert.ok(vozSuave > 0 && vozSuave < subida && subida < 1)
  assert.ok(niveles.at(-2) > 0.9)
  assert.equal(niveles.at(-1), 0)
})

test('una escucha larga sigue abierta antes de los cuatro segundos y se cierra al llegar', async (t) => {
  const { entorno, pistas, contextos, iniciado } = entornoConMicrofono()
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let tiempo = 0
  t.mock.method(performance, 'now', () => tiempo)
  const microfono = crearMicrofono(entorno, () => false)
  await microfono.pedirMicrofono()
  const resultado = microfono.escucharVocal({ segundos: 8 })
  await iniciado

  for (const instante of [2600, 3999]) {
    tiempo = instante
    t.mock.timers.tick(16)
    await Promise.resolve()
    assert.equal(contextos[0].state, 'running')
    assert.equal(pistas[1].paradas, 0)
  }
  tiempo = 4000
  t.mock.timers.tick(16)
  assert.deepEqual(await resultado, SIN_ESCUCHA)
  assert.equal(contextos[0].state, 'closed')
  assert.equal(pistas[1].paradas, 1)
})

test('el cierre de la escena libera la captura en el acto, incluso si el flujo llega tarde', async () => {
  const { entorno, pistas, contextos, iniciado } = entornoConMicrofono()
  const microfono = crearMicrofono(entorno, () => false)
  await microfono.pedirMicrofono()
  const resultado = microfono.escucharVocal()
  await iniciado
  microfono.apagarMicrofono()
  assert.equal(pistas[1].paradas, 1)
  assert.equal(contextos[0].state, 'closed')
  assert.deepEqual(await resultado, SIN_ESCUCHA)

  const flujoTardio = Promise.withResolvers()
  entorno.navigator.mediaDevices.getUserMedia = () => flujoTardio.promise
  const tardio = microfono.escucharVocal()
  await new Promise(setImmediate)
  microfono.apagarMicrofono()
  let paradas = 0
  flujoTardio.resolve({ getTracks: () => [{ stop: () => paradas++ }] })
  assert.deepEqual(await tardio, SIN_ESCUCHA)
  assert.equal(paradas, 1)
  assert.equal(contextos.length, 1)
})

test('un permiso temporal vencido se trata como una negativa sin pedirlo de nuevo', async () => {
  const { entorno, solicitudes } = entornoConMicrofono()
  entorno.navigator.permissions = { query: async () => ({ state: 'prompt' }) }
  const microfono = crearMicrofono(entorno, () => false)
  await microfono.pedirMicrofono()
  assert.deepEqual(await microfono.escucharVocal(), SIN_ESCUCHA)
  assert.equal(await microfono.pedirMicrofono(), null)
  assert.equal(solicitudes.length, 1)
})
