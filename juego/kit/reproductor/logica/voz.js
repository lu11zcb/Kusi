import { avanzarColaVoz, crearColaVoz, ESPERA_COMENTARIO } from './colaVoz.js'
import { normalizarFrase, PATRON_VOZ_NATURAL } from './textoVoz.js'

const VOCES_DESCARTADAS = /\b(?:Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i
const ARCHIVO_GRABADO = /^[a-f0-9]{12}\.m4a$/
const LIMITE_INICIO_VOZ = 2000
const LIMITE_TEXTO_SIN_VOZ = 1500

export function elegirVozEspanol(voces) {
  const candidatas = voces.filter((voz) => /^es(?:[-_]|$)/i.test(voz.lang) && !VOCES_DESCARTADAS.test(voz.name))
  const locales = candidatas.filter((voz) => voz.localService === true)
  return locales.find((voz) => PATRON_VOZ_NATURAL.test(voz.name))
    ?? locales.find((voz) => /\bPaulina\b/i.test(voz.name))
    ?? locales.find((voz) => /\bM[oó]nica\b/i.test(voz.name))
    ?? locales[0]
    ?? candidatas.find((voz) => /\bGoogle\s+español/i.test(voz.name))
    ?? null
}

// El límite libera la cola si el navegador omite el aviso de fin. Al cerrar la
// reproducción, cualquier evento que llegue tarde queda asociado a la frase anterior.
function esperarFin(signal, limite, { alEmpezar, alTrabar, reproducir, detener }) {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolver, rechazar) => {
    let terminada = false
    let empezo = false
    let esperaFin
    const empezar = () => {
      if (terminada || empezo) return
      empezo = true
      clearTimeout(esperaInicio)
      // El tiempo para decir la frase se cuenta desde que suena, incluso si el
      // navegador deja speechSynthesis.speaking en verdadero al atascarse.
      esperaFin = setTimeout(() => {
        terminar()
        detener?.()
        alTrabar?.()
      }, limite)
      alEmpezar()
    }
    const terminar = (error) => {
      if (terminada) return
      terminada = true
      clearTimeout(esperaFin)
      clearTimeout(esperaInicio)
      signal.removeEventListener('abort', abortar)
      if (error) rechazar(error)
      else resolver()
    }
    const abortar = () => { terminar(); detener?.() }
    const esperaInicio = setTimeout(() => terminar(new Error('no empezó')), LIMITE_INICIO_VOZ)
    signal.addEventListener('abort', abortar, { once: true })
    try {
      reproducir(empezar, (error) => {
        terminar(error ?? (empezo ? undefined : new Error('terminó sin empezar')))
      })
    } catch (error) {
      terminar(error)
    }
  })
}

function reproducirAudio(Audio, ruta, signal, limite, alEmpezar, alTrabar) {
  const audio = new Audio(ruta)
  return esperarFin(signal, limite, {
    alEmpezar,
    alTrabar,
    reproducir(empezar, terminar) {
      audio.onplaying = empezar
      audio.onended = () => terminar()
      audio.onerror = () => terminar(new Error('No se pudo reproducir ' + ruta))
      Promise.resolve(audio.play()).catch(terminar)
    },
    detener: () => audio.pause(),
  }).catch((error) => {
    // Suelta la grabación antes de pasar a la voz de respaldo.
    audio.pause()
    throw error
  })
}

async function sintetizar(entorno, texto, signal, limite, alEmpezar, alTrabar, obtenerVoces) {
  const sintesis = entorno.speechSynthesis
  if (!sintesis || typeof entorno.SpeechSynthesisUtterance !== 'function') throw new Error('sin síntesis')

  async function intentar(voz) {
    const frase = new entorno.SpeechSynthesisUtterance(texto)
    if (voz) frase.voice = voz
    frase.lang = voz?.lang ?? 'es-PE'
    frase.rate = 0.9
    let empezo = false
    try {
      await esperarFin(signal, limite, {
        alTrabar,
        alEmpezar() {
          empezo = true
          alEmpezar('síntesis', voz?.name ?? frase.lang)
        },
        reproducir(empezar, terminar) {
          frase.onstart = empezar
          frase.onend = () => terminar()
          frase.onerror = (evento) => terminar(new Error('error de síntesis' + (evento?.error ? ' (' + evento.error + ')' : '')))
          sintesis.speak(frase)
        },
        detener: () => sintesis.cancel?.(),
      })
      return true
    } catch (error) {
      if (empezo) throw error
      return false
    }
  }

  const voz = elegirVozEspanol(obtenerVoces())
  if (await intentar(voz) || signal.aborted) return
  sintesis.cancel?.()
  // Chrome puede volver a entregar los mismos nombres en objetos nuevos al cargar las voces.
  const alternativa = elegirVozEspanol(obtenerVoces().filter((otra) => otra.localService === true &&
    (voz?.localService !== true || otra.name !== voz.name || otra.lang !== voz.lang)))
  if (await intentar(alternativa) || signal.aborted) return
  sintesis.cancel?.()
  throw new Error('no empezó')
}

async function reproducir(entorno, { texto, grabacion }, signal, alEmpezar, alTrabar, obtenerVoces) {
  const limite = texto.length * 90 + 2000
  if (grabacion) {
    try {
      return await reproducirAudio(entorno.Audio, grabacion.ruta, signal, limite,
        () => alEmpezar('grabada', grabacion.voz), alTrabar)
    } catch {
      if (signal.aborted) return
      // Si el audio grabado falla, se pide la misma frase al motor de respaldo.
    }
  }
  const puente = entorno.window?.KusiPuente
  if (typeof puente?.decir === 'function') {
    try {
      puente.decir(texto)
      // El puente solo confirma el envío. Reservamos el tiempo estimado completo
      // para que Android no reciba otra frase antes de terminar la anterior.
      return esperarFin(signal, limite, {
        alEmpezar: () => alEmpezar('puente', 'nativa'),
        reproducir: (empezar) => empezar(),
      })
    } catch { /* Si el puente falla, queda la síntesis del navegador. */ }
  }
  return sintetizar(entorno, texto, signal, limite, alEmpezar, alTrabar, obtenerVoces)
}

export function crearVoz({
  entorno = globalThis,
  ahora = () => performance.now(),
  informar = (mensaje) => console.info(mensaje),
  advertir = (mensaje) => console.warn(mensaje),
} = {}) {
  let cola = crearColaVoz()
  let reproduccion = null
  let grabaciones = new Map()
  let voces = []

  function cambiar(orden) {
    const anterior = cola.actual
    cola = avanzarColaVoz(cola, { ...orden, ahora: ahora() })
    const frase = cola.actual
    if (anterior !== frase) {
      const previa = reproduccion
      reproduccion = null
      if (previa) {
        clearTimeout(previa.esperaTexto)
        clearTimeout(previa.esperaComentario)
        const interrumpida = orden.tipo !== 'terminar'
        if (interrumpida) previa.control?.abort()
        if (previa.empezo) anterior.alTerminar?.({ interrumpida })
        else if (!interrumpida) previa.alSinVoz?.()
      }
      if (!frase || cola.actual !== frase || reproduccion) return
      const actual = { control: null, empezo: false, esperaTexto: null, alSinVoz: frase.alSinVoz }
      if (frase.caduca !== null) {
        actual.esperaComentario = setTimeout(() => cambiar({ tipo: 'vencer', frase }), Math.ceil(frase.caduca - ahora()))
      } else if (frase.alSinVoz) {
        actual.esperaTexto = setTimeout(() => {
          actual.alSinVoz = null
          frase.alSinVoz()
        }, LIMITE_TEXTO_SIN_VOZ)
      }
      reproduccion = actual
    }

    const actual = reproduccion
    if (!cola.habilitada || !actual || actual.control) return
    if (frase.caduca !== null && frase.caduca <= ahora()) {
      cambiar({ tipo: 'vencer', frase })
      return
    }
    actual.control = new AbortController()
    const alEmpezar = (motor, voz) => {
      if (reproduccion !== actual || actual.empezo) return
      const inicio = ahora()
      if (frase.caduca !== null && frase.caduca <= inicio) {
        cambiar({ tipo: 'vencer', frase })
        return
      }
      actual.empezo = true
      clearTimeout(actual.esperaTexto)
      clearTimeout(actual.esperaComentario)
      cola = avanzarColaVoz(cola, { tipo: 'empezar', frase, ahora: inicio })
      informar('[Kusi] voz: ' + motor + ' ' + voz + ' «' + frase.texto + '»')
      frase.alEmpezar?.()
    }
    const terminar = () => cambiar({ tipo: 'terminar', frase })
    const alTrabar = () => advertir('[Kusi] voz trabada: «' + frase.texto + '»')
    reproducir(entorno, frase, actual.control.signal, alEmpezar, alTrabar, () => voces).then(terminar, (error) => {
      if (reproduccion !== actual) return
      advertir('[Kusi] voz sin sonido: ' + (error?.message ?? String(error)) + ' «' + frase.texto + '»')
      terminar()
    })
  }

  function pedir(texto, { tipo, esperar, alEmpezar, alSinVoz, alTerminar } = {}, orden = 'pedir') {
    texto = normalizarFrase(texto)
    if (!texto) return false
    tipo ??= esperar ? 'comentario' : 'respuesta'
    const esComentario = orden === 'pedir' && tipo === 'comentario'
    const frase = {
      texto, tipo, grabacion: grabaciones.get(texto), alEmpezar, alTerminar,
      caduca: esComentario ? ahora() + ESPERA_COMENTARIO : null,
      alSinVoz: esComentario ? undefined : alSinVoz,
    }
    cambiar({ tipo: orden, frase })
    return true
  }

  return {
    configurarVoz(voz) {
      const nombre = voz?.indice?.voz ?? 'sin identificar'
      grabaciones = new Map(Object.entries(voz?.indice?.frases ?? {}).flatMap(([texto, archivo]) =>
        typeof archivo === 'string' && ARCHIVO_GRABADO.test(archivo)
          ? [[texto, { ruta: voz.ruta + archivo, voz: nombre }]] : []))
    },
    decir: (texto, opciones) => pedir(texto, opciones),
    repetirVoz: (texto, opciones) => pedir(texto, opciones, 'repetir'),
    habilitarVoz() {
      if (cola.habilitada) return
      const sintesis = entorno.speechSynthesis
      const actualizarVoces = () => { voces = sintesis?.getVoices?.() ?? [] }
      // La primera frase puede salir con es-PE mientras Chrome carga las voces.
      sintesis?.addEventListener?.('voiceschanged', actualizarVoces)
      actualizarVoces()
      sintesis?.cancel?.()
      cambiar({ tipo: 'tocar' })
    },
    callarVoz: () => cambiar({ tipo: 'callar' }),
    vozOcupada: () => cola.actual !== null,
  }
}

export const { decir, repetirVoz, configurarVoz, habilitarVoz, callarVoz, vozOcupada } = crearVoz()

export function alPrimerGesto(ventana, alActivar) {
  const eventos = ['pointerdown', 'touchstart', 'keydown', 'pointerup', 'touchend']
  const captura = { capture: true }
  function quitar() {
    for (const tipo of eventos) ventana.removeEventListener(tipo, activar, captura)
  }
  function activar(evento) {
    if (!evento.isTrusted) return
    // Algunos navegadores habilitan el audio del primer toque al levantar el dedo.
    // Conservamos la frase pendiente hasta que ese mismo gesto pueda reproducirla.
    if (ventana.navigator?.userActivation?.hasBeenActive === false) return
    quitar()
    alActivar()
  }
  // El gesto llega a la ventana antes de que los controles del lienzo lo manejen.
  for (const tipo of eventos) ventana.addEventListener(tipo, activar, captura)
  return quitar
}

export function instalarActivacionVoz(ventana = window, habilitar = habilitarVoz) {
  return alPrimerGesto(ventana, habilitar)
}
