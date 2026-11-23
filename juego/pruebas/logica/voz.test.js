import test from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { avanzarColaVoz, crearColaVoz } from '../../kit/reproductor/logica/colaVoz.js'
import { crearVoz, elegirVozEspanol, instalarActivacionVoz } from '../../kit/reproductor/logica/voz.js'

class Frase {
  constructor(texto) { this.text = texto }
}

function prepararCola() {
  let cola = crearColaVoz()
  const avanzar = (tipo, frase, ahora = 0) => {
    cola = avanzarColaVoz(cola, { tipo, frase, ahora })
    return cola
  }
  const pedir = (texto, tipo = 'respuesta', ahora = 0) => {
    const frase = { texto, tipo, caduca: tipo === 'comentario' ? ahora + 4000 : null }
    avanzar('pedir', frase, ahora)
    return frase
  }
  return { avanzar, pedir, estado: () => cola }
}

test('al terminar la respuesta activa se oyen las dos respuestas pendientes en orden', () => {
  const { avanzar, pedir, estado } = prepararCola()
  const consigna = pedir('Consigna')
  avanzar('tocar')
  avanzar('empezar', consigna)
  const explicacion = pedir('¡Sí! El tronco une las partes del cuerpo.')
  const logro = pedir('¡Inti está más abrigado!')
  assert.equal(estado().actual, consigna)
  assert.equal(avanzar('terminar', consigna).actual, explicacion)
  assert.equal(avanzar('terminar', explicacion).actual, logro)
  assert.equal(avanzar('terminar', logro).actual, null)
})

test('una tercera respuesta descarta la más antigua de las que esperan', () => {
  const { avanzar, pedir, estado } = prepararCola()
  avanzar('tocar')
  const consigna = pedir('Consigna')
  avanzar('empezar', consigna)
  const descartada = pedir('Primera pista')
  const segunda = pedir('Segunda pista')
  const tercera = pedir('Tercera pista')
  assert.equal(estado().actual, consigna)
  assert.equal(avanzar('terminar', descartada).actual, consigna)
  assert.equal(avanzar('terminar', consigna).actual, segunda)
  assert.equal(avanzar('terminar', segunda).actual, tercera)
  assert.equal(avanzar('terminar', tercera).actual, null)
})

test('una nueva respuesta toma el turno solo si la respuesta activa lleva más de 7 s sonando', () => {
  const { avanzar, pedir, estado } = prepararCola()
  avanzar('tocar')
  const explicacion = pedir('Explicación')
  pedir('Pista antes de empezar', 'respuesta', 7500)
  assert.equal(estado().actual, explicacion)
  avanzar('empezar', explicacion, 7500)
  pedir('A los 7 s', 'respuesta', 14500)
  assert.equal(estado().actual, explicacion)
  const nueva = pedir('Después de 7 s', 'respuesta', 14501)
  assert.equal(estado().actual, nueva)
  assert.equal(avanzar('terminar', explicacion).actual, nueva)
  assert.equal(avanzar('terminar', nueva, 14502).actual, null)
})

test('una pregunta espera su turno y una nueva frase del reto interrumpe la pregunta activa', () => {
  const { avanzar, pedir, estado } = prepararCola()
  avanzar('tocar')
  const explicacion = pedir('Mira los colores.')
  avanzar('empezar', explicacion)
  const pregunta = pedir('¿Dónde va el sombrero?', 'pregunta')
  assert.equal(estado().actual, explicacion)
  assert.equal(avanzar('terminar', explicacion).actual, pregunta)
  const otraPregunta = pedir('¿Y de qué color es?', 'pregunta')
  assert.equal(estado().actual, otraPregunta)
  const respuesta = pedir('¡Va en la cabeza!')
  assert.equal(estado().actual, respuesta)
})

test('las respuestas tienen prioridad sobre una pregunta en espera', () => {
  const { avanzar, pedir } = prepararCola()
  avanzar('tocar')
  const explicacion = pedir('Mira los colores.')
  avanzar('empezar', explicacion)
  pedir('¿Dónde va el sombrero?', 'pregunta')
  const respuesta = pedir('¡Va en la cabeza!')
  const logro = pedir('¡Encontraste el sombrero!')
  pedir('¿Y de qué color es?', 'pregunta')
  assert.equal(avanzar('terminar', explicacion).actual, respuesta)
  assert.equal(avanzar('terminar', respuesta).actual, logro)
  assert.equal(avanzar('terminar', logro).actual, null)
})

test('el comentario más reciente espera hasta que la voz quede libre y cede el turno a una respuesta', () => {
  const { avanzar, pedir, estado } = prepararCola()
  avanzar('tocar')
  const pregunta = pedir('¿Qué falta?', 'pregunta')
  pedir('Sale el sol.', 'comentario')
  const aviso = pedir('Sopla el viento.', 'comentario')
  assert.equal(estado().actual, pregunta)
  const respuesta = pedir('Falta el sombrero.')
  assert.equal(estado().actual, respuesta)
  const pendiente = pedir('Busca debajo del árbol.')
  assert.equal(avanzar('terminar', respuesta, 1000).actual, pendiente)
  assert.equal(avanzar('terminar', pendiente, 3999).actual, aviso)
  const nueva = pedir('¡Encontraste el sombrero!')
  assert.equal(estado().actual, nueva)
})

test('el comentario que sigue esperando a los 4 s se descarta', () => {
  const { avanzar, pedir, estado } = prepararCola()
  avanzar('tocar')
  const respuesta = pedir('Escucha la explicación.')
  pedir('Sopla el viento.', 'comentario')
  assert.equal(avanzar('terminar', respuesta, 4000).actual, null)
  assert.equal(estado().comentario, null)
})

test('el respaldo prefiere voces locales naturales, Paulina, Mónica y otras locales antes de Google', () => {
  const voz = (name, lang = 'es-MX', localService = true) => ({ name, lang, localService })
  const descartadas = ['Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley'].map((nombre) => voz(nombre + ' (Premium)'))
  const paulina = voz('Paulina')
  const monica = voz('Mónica', 'es-ES')
  const francisca = voz('Francisca')
  const google = voz('Google español de Estados Unidos', 'es-US', false)
  const remota = voz('Otra voz (Premium)', 'es-US', false)
  const otras = [...descartadas, voz('Anna (Premium)', 'de-DE'), remota, { name: 'Alma (Premium)', lang: 'es-PE' }]
  for (const calidad of ['Premium', 'Mejorada', 'Enhanced']) {
    const natural = voz('Francisca (' + calidad + ')')
    assert.equal(elegirVozEspanol([...otras, google, francisca, monica, paulina, natural]), natural)
  }
  assert.equal(elegirVozEspanol([...otras, google, francisca, monica, paulina]), paulina)
  assert.equal(elegirVozEspanol([...otras, google, francisca, monica]), monica)
  assert.equal(elegirVozEspanol([...otras, google, francisca]), francisca)
  assert.equal(elegirVozEspanol([...otras, google]), google)
  assert.equal(elegirVozEspanol(otras), null)
})

test('el primer clic, toque o tecla reales desbloquean la voz desde la captura de la ventana', () => {
  const gestos = [
    { type: 'pointerdown', pointerType: 'mouse' },
    { type: 'pointerdown', pointerType: 'touch' },
    { type: 'touchstart' },
    { type: 'keydown' },
    { type: 'pointerup', pointerType: 'touch', inicio: 'pointerdown' },
    { type: 'touchend', inicio: 'touchstart' },
  ]
  for (const gesto of gestos) {
    const escuchas = new Map()
    const userActivation = { hasBeenActive: false }
    const ventana = {
      navigator: { userActivation },
      addEventListener(tipo, manejar, opciones) {
        assert.equal(opciones.capture, true)
        escuchas.set(tipo, manejar)
      },
      removeEventListener(tipo, manejar, opciones) {
        assert.equal(opciones.capture, true)
        assert.equal(escuchas.get(tipo), manejar)
        escuchas.delete(tipo)
      },
    }
    const eventos = []
    const voz = crearVoz({ entorno: {
      SpeechSynthesisUtterance: Frase,
      speechSynthesis: {
        cancel() { eventos.push('cancelar') },
        speak(frase) { eventos.push(frase.text); frase.onstart(); frase.onend() },
      },
    }, informar() {}, advertir() {} })
    instalarActivacionVoz(ventana, voz.habilitarVoz)
    assert.deepEqual([...escuchas.keys()], ['pointerdown', 'touchstart', 'keydown', 'pointerup', 'touchend'])
    voz.decir('La consigna')
    const manejar = escuchas.get(gesto.type)
    if (gesto.inicio) escuchas.get(gesto.inicio)({ type: gesto.inicio, pointerType: 'touch', isTrusted: true })
    assert.deepEqual(eventos, [])
    userActivation.hasBeenActive = true
    manejar({ ...gesto, isTrusted: false })
    assert.deepEqual(eventos, [])
    manejar({ ...gesto, isTrusted: true })
    voz.habilitarVoz()
    assert.deepEqual(eventos, ['cancelar', 'La consigna'])
    assert.equal(escuchas.size, 0)
  }
})

test('la síntesis habla de inmediato en es-PE si la lista está vacía y usa la voz en español cuando llega', async () => {
  let voces = []
  let alCambiarVoces
  const frases = []
  const entorno = {
    SpeechSynthesisUtterance: Frase,
    speechSynthesis: {
      getVoices: () => voces,
      addEventListener(evento, escuchar) {
        assert.equal(evento, 'voiceschanged')
        alCambiarVoces = escuchar
      },
      speak(frase) { frases.push(frase); frase.onstart(); frase.onend() },
    },
  }
  const voz = crearVoz({ entorno, informar() {}, advertir() {} })
  voz.decir('Junta las frutas.')
  voz.habilitarVoz()
  assert.equal(frases[0].text, 'Junta las frutas.')
  assert.equal(frases[0].lang, 'es-PE')
  assert.equal(Object.hasOwn(frases[0], 'voice'), false)
  await setImmediate()

  const monica = { name: 'Mónica', lang: 'es-ES', localService: true }
  voces = [{ name: 'Eddy', lang: 'es-MX', localService: true }, monica]
  assert.equal(typeof alCambiarVoces, 'function')
  alCambiarVoces()
  voz.decir('Prueba otra vez.')
  assert.equal(frases[1].voice, monica)
  assert.equal(frases[1].lang, 'es-ES')
})

test('si la síntesis omite onend, el límite cancela esa frase y libera la siguiente', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const frases = [], eventos = []
  const entorno = {
    SpeechSynthesisUtterance: Frase,
    speechSynthesis: {
      speaking: true,
      speak(frase) { frases.push(frase) },
      cancel() { eventos.push('cancelada') },
    },
  }
  const voz = crearVoz({ entorno, informar() {}, advertir: (aviso) => eventos.push(aviso) })
  const texto = 'Primera frase.'
  voz.habilitarVoz()
  assert.deepEqual(eventos, ['cancelada'])
  eventos.length = 0
  voz.decir(texto, { alTerminar: () => eventos.push('fin de la primera') })
  voz.decir('Segunda frase.', { alTerminar: () => eventos.push('fin de la segunda') })
  t.mock.timers.tick(1000)
  frases[0].onstart()
  t.mock.timers.tick(texto.length * 90 + 1999)
  await setImmediate()
  assert.deepEqual(frases.map((frase) => frase.text), [texto])
  assert.deepEqual(eventos, [])

  t.mock.timers.tick(1)
  await setImmediate()
  const trasElAtasco = ['cancelada', '[Kusi] voz trabada: «' + texto + '»', 'fin de la primera']
  assert.deepEqual(frases.map((frase) => frase.text), [texto, 'Segunda frase.'])
  assert.deepEqual(eventos, trasElAtasco)
  assert.equal(entorno.speechSynthesis.speaking, true)

  frases[0].onend()
  await setImmediate()
  assert.deepEqual(eventos, trasElAtasco)
  frases[1].onstart()
  frases[1].onend()
  await setImmediate()
  t.mock.timers.tick(10000)
  assert.deepEqual(eventos, [...trasElAtasco, 'fin de la segunda'])
})

test('Escuchar corta y repite inmediatamente el audio grabado que sonó, sin perder el comentario en espera', async () => {
  const audios = [], eventos = [], registros = [], avisos = []
  class Audio {
    constructor(ruta) { this.ruta = ruta; audios.push(this) }
    play() { return Promise.resolve() }
    pause() { eventos.push('pausa') }
  }
  const entorno = { Audio, window: { KusiPuente: { decir: (texto) => eventos.push('nativo ' + texto) } } }
  const voz = crearVoz({ entorno, informar: (registro) => registros.push(registro), advertir: (aviso) => avisos.push(aviso) })
  voz.configurarVoz({ ruta: '/voz/', indice: { voz: 'Paulina (Mejorada)', frases: {
    'Una frase': '100000000001.m4a', Otra: '100000000002.m4a', Última: '100000000003.m4a',
  } } })
  const opciones = { alEmpezar: () => eventos.push('inicio'), alTerminar: () => eventos.push('fin') }
  voz.decir('  Una\t frase ', opciones)
  assert.deepEqual(audios, [])
  voz.habilitarVoz()
  assert.deepEqual(audios.map((audio) => audio.ruta), ['/voz/100000000001.m4a'])
  assert.deepEqual(eventos, [])
  assert.deepEqual(registros, [])
  audios[0].onplaying()
  audios[0].onplaying()
  voz.decir('Última', { esperar: true })
  voz.decir(' Otra ', { esperar: true })
  assert.equal(audios.length, 1)
  assert.deepEqual(eventos, ['inicio'])
  voz.repetirVoz('Una frase', opciones)
  assert.equal(audios[1].ruta, '/voz/100000000001.m4a')
  audios[0].onended()
  audios[1].onplaying()
  audios[1].onended()
  await setImmediate()
  assert.equal(audios[2].ruta, '/voz/100000000002.m4a')
  assert.deepEqual(eventos, ['inicio', 'pausa', 'fin', 'inicio', 'fin'])
  voz.callarVoz()
  assert.deepEqual(eventos, ['inicio', 'pausa', 'fin', 'inicio', 'fin', 'pausa'])
  assert.deepEqual(registros, Array(2).fill('[Kusi] voz: grabada Paulina (Mejorada) «Una frase»'))
  assert.deepEqual(avisos, [])
})

test('la cola avanza y registra el atasco si una grabación nunca avisa que terminó', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const eventos = [], registros = []
  const entorno = {
    Audio: class {
      play() { this.onplaying() }
      pause() { eventos.push('pausa') }
    },
    window: { KusiPuente: { decir: (texto) => eventos.push(texto) } },
  }
  const voz = crearVoz({ entorno, informar: (registro) => registros.push(registro), advertir: (aviso) => registros.push(aviso) })
  voz.configurarVoz({ ruta: '/voz/', indice: { frases: { Hola: '100000000004.m4a' } } })
  voz.habilitarVoz()
  voz.decir('Hola', { alTerminar: () => eventos.push('fin de la grabación') })
  voz.decir('Sigue jugando.', { esperar: true })
  t.mock.timers.tick('Hola'.length * 90 + 2000)
  await setImmediate()
  assert.deepEqual(eventos, ['pausa', 'fin de la grabación', 'Sigue jugando.'])
  assert.deepEqual(registros.slice(-2), ['[Kusi] voz trabada: «Hola»', '[Kusi] voz: puente nativa «Sigue jugando.»'])
  voz.callarVoz()
})

test('si el AAC falla, la voz web registra el reemplazo cuando empieza a sonar', async () => {
  const avisos = [], frases = [], eventos = [], registros = []
  const monica = { name: 'Mónica', lang: 'es-ES', localService: true }
  const entorno = {
    Audio: class {
      play() { return Promise.reject(new Error('AAC ilegible')) }
      pause() {}
    },
    SpeechSynthesisUtterance: Frase,
    speechSynthesis: { getVoices: () => [monica], speak: (frase) => frases.push(frase) },
  }
  const voz = crearVoz({ entorno, informar: (registro) => registros.push(registro), advertir: (aviso) => avisos.push(aviso) })
  voz.configurarVoz({ ruta: '/voz/', indice: { frases: { Hola: '100000000004.m4a' } } })
  voz.habilitarVoz()
  voz.decir('Hola', { alEmpezar: () => eventos.push('inicio'), alTerminar: () => eventos.push('fin') })
  await setImmediate()
  assert.deepEqual(avisos, [])
  assert.deepEqual(registros, [])
  assert.equal(frases[0].voice, monica)
  assert.deepEqual(eventos, [])
  frases[0].onstart()
  assert.deepEqual(eventos, ['inicio'])
  assert.deepEqual(registros, ['[Kusi] voz: síntesis Mónica «Hola»'])
  frases[0].onend()
  await setImmediate()
  assert.deepEqual(eventos, ['inicio', 'fin'])
})

test('si una grabación no empieza, se muestra el texto a los 1,5 s y se prueba otra voz', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const eventos = []
  let audio
  const voz = crearVoz({ entorno: {
    Audio: class {
      constructor() { audio = this }
      play() {}
      pause() { eventos.push('pausa') }
    },
    SpeechSynthesisUtterance: Frase,
    speechSynthesis: { speak(frase) { frase.onstart(); frase.onend() } },
  }, informar() {}, advertir: assert.fail })
  voz.configurarVoz({ ruta: '/voz/', indice: { frases: { Hola: '100000000004.m4a' } } })
  voz.habilitarVoz()
  voz.decir('Hola', {
    alEmpezar: () => eventos.push('voz'),
    alSinVoz: () => eventos.push('texto'),
    alTerminar: () => eventos.push('fin'),
  })

  t.mock.timers.tick(1500)
  assert.deepEqual(eventos, ['texto'])
  t.mock.timers.tick(500)
  await setImmediate()
  audio.onplaying()
  audio.onended()
  assert.deepEqual(eventos, ['texto', 'pausa', 'voz', 'fin'])
})

test('sin síntesis se registra el motivo de que la frase quede sin sonido', async () => {
  const avisos = [], eventos = []
  const voz = crearVoz({ entorno: {}, informar: assert.fail, advertir: (aviso) => avisos.push(aviso) })
  voz.habilitarVoz()
  voz.decir('Busca las prendas.', {
    alEmpezar: assert.fail,
    alSinVoz: () => eventos.push('mostrar'),
    alTerminar: assert.fail,
  })
  await setImmediate()
  assert.deepEqual(eventos, ['mostrar'])
  assert.deepEqual(avisos, ['[Kusi] voz sin sonido: sin síntesis «Busca las prendas.»'])
})

test('el texto aparece después de 1,5 s sin voz y un turno sustituido ya no pinta su frase', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const eventos = []
  let fraseActiva
  const voz = crearVoz({ entorno: {
    SpeechSynthesisUtterance: Frase,
    speechSynthesis: { speak: (frase) => { fraseActiva = frase } },
  }, informar() {}, advertir: assert.fail })
  const decir = (texto, esperar = false) => voz.decir(texto, {
    esperar,
    alSinVoz: () => eventos.push('texto ' + texto),
    alEmpezar: () => eventos.push('audio ' + texto),
  })
  decir('Primera')
  t.mock.timers.tick(1499)
  assert.deepEqual(eventos, [])
  decir('Respuesta')
  decir('Comentario', true)
  t.mock.timers.tick(1499)
  assert.deepEqual(eventos, [])
  t.mock.timers.tick(1)
  assert.deepEqual(eventos, ['texto Respuesta'])
  voz.habilitarVoz()
  fraseActiva.onstart()
  fraseActiva.onend()
  await setImmediate()
  t.mock.timers.tick(1499)
  assert.equal(fraseActiva.text, 'Comentario')
  assert.deepEqual(eventos, ['texto Respuesta', 'audio Respuesta'])
  fraseActiva.onstart()
  fraseActiva.onend()
  await setImmediate()
  t.mock.timers.tick(1)
  assert.deepEqual(eventos, ['texto Respuesta', 'audio Respuesta', 'audio Comentario'])
})

test('un comentario caduca si todavía espera playing y su globo nunca aparece', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'] })
  const audios = [], eventos = []
  const voz = crearVoz({ ahora: Date.now, entorno: {
    Audio: class {
      play() { audios.push(this) }
      pause() { eventos.push('pausa') }
    },
  }, informar() {}, advertir: assert.fail })
  voz.configurarVoz({ ruta: '/voz/', indice: { frases: {
    Explicación: '100000000001.m4a', Viento: '100000000002.m4a',
  } } })
  voz.habilitarVoz()
  voz.decir('Explicación')
  audios[0].onplaying()
  voz.decir('Viento', { tipo: 'comentario', alEmpezar: assert.fail, alSinVoz: assert.fail })
  // La explicación termina antes del límite de su audio. El comentario ya consumió
  // parte de su plazo en la cola y aun así debe esperar la confirmación de playing.
  t.mock.timers.tick(2900)
  audios[0].onended()
  await setImmediate()
  assert.equal(audios.length, 2)
  t.mock.timers.tick(1099)
  assert.deepEqual(eventos, [])
  t.mock.timers.tick(1)
  audios[1].onplaying()
  await setImmediate()
  assert.deepEqual(eventos, ['pausa'])
})

test('a los 2 s sin onstart cancela y vuelve a decir la misma frase con otra voz local', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const paulina = { name: 'Paulina', lang: 'es-MX', localService: true }
  const monica = { name: 'Mónica', lang: 'es-ES', localService: true }
  const frases = [], eventos = []
  const entorno = {
    SpeechSynthesisUtterance: Frase,
    speechSynthesis: {
      getVoices: () => [monica, paulina],
      speak(frase) { frases.push(frase); eventos.push('decir ' + frase.voice.name) },
      cancel() { eventos.push('cancelar') },
    },
  }
  const voz = crearVoz({ entorno, informar() {}, advertir: assert.fail })
  voz.habilitarVoz()
  voz.decir('Primera.', { alEmpezar: () => eventos.push('inicio'), alTerminar: () => eventos.push('fin') })
  t.mock.timers.tick(1999)
  await setImmediate()
  assert.deepEqual(eventos, ['cancelar', 'decir Paulina'])

  t.mock.timers.tick(1)
  await setImmediate()
  assert.deepEqual(eventos, ['cancelar', 'decir Paulina', 'cancelar', 'decir Mónica'])
  assert.deepEqual(frases.map((frase) => frase.text), ['Primera.', 'Primera.'])
  frases[0].onstart()
  frases[0].onend()
  assert.equal(eventos.at(-1), 'decir Mónica')
  frases[1].onstart()
  frases[1].onend()
  await setImmediate()
  assert.deepEqual(eventos.slice(-2), ['inicio', 'fin'])
})

test('sin otra voz local reintenta solo con es-PE y si ambas fallan deja pasar la siguiente frase', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const paulina = { name: 'Paulina', lang: 'es-MX', localService: true }
  const google = { name: 'Google español', lang: 'es-ES', localService: false }
  const frases = [], avisos = [], registros = []
  const entorno = {
    SpeechSynthesisUtterance: Frase,
    speechSynthesis: { getVoices: () => [google, paulina], speak: (frase) => frases.push(frase) },
  }
  const voz = crearVoz({ entorno, informar: (registro) => registros.push(registro), advertir: (aviso) => avisos.push(aviso) })
  voz.habilitarVoz()
  voz.decir('Primera.')
  voz.decir('Segunda.')
  t.mock.timers.tick(2000)
  await setImmediate()
  assert.equal(frases[1].lang, 'es-PE')
  assert.equal(Object.hasOwn(frases[1], 'voice'), false)
  assert.deepEqual(avisos, [])

  t.mock.timers.tick(2000)
  await setImmediate()
  frases[1].onstart()
  frases[2].onstart()
  frases[2].onend()
  await setImmediate()
  assert.deepEqual(frases.map((frase) => frase.text), ['Primera.', 'Primera.', 'Segunda.'])
  assert.deepEqual(avisos, ['[Kusi] voz sin sonido: no empezó «Primera.»'])
  assert.deepEqual(registros, ['[Kusi] voz: síntesis Paulina «Segunda.»'])
})
