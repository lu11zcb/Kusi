import { analizarCuadro, decidir, SEGUNDOS_POR_CUADRO } from '../logica/escucharVocal.js'
import { vozOcupada } from '../logica/voz.js'

const SIN_ESCUCHA = Object.freeze({ oyo: false, vocal: null, seguro: false })
const ESPERA_ENTRE_LECTURAS = 16
const MAXIMO_SEGUNDOS_DE_ESCUCHA = 4
const RMS_MINIMO_NIVEL = 0.002
const RMS_VOZ_FUERTE = 0.04
const AUDIO = { echoCancellation: true, noiseSuppression: true, autoGainControl: true }

function detenerPistas(flujo) {
  for (const pista of flujo?.getTracks() ?? []) pista.stop()
}

function esperar(signal) {
  if (signal.aborted) return Promise.resolve()
  return new Promise((resolver) => {
    const reloj = setTimeout(terminar, ESPERA_ENTRE_LECTURAS)
    signal.addEventListener('abort', terminar, { once: true })
    function terminar() {
      clearTimeout(reloj)
      signal.removeEventListener('abort', terminar)
      resolver()
    }
  })
}

export function crearMicrofono(entorno = globalThis, kusiHabla = vozOcupada) {
  let permiso = null
  let permisoResuelto = false
  let escucha = null
  const dispositivos = () => entorno.navigator?.mediaDevices
  const contextoDeAudio = () => entorno.AudioContext ?? entorno.webkitAudioContext
  const puedeEscuchar = () => new URLSearchParams(entorno.location?.search).get('microfono') !== '0' &&
    typeof dispositivos()?.getUserMedia === 'function' && typeof contextoDeAudio() === 'function'

  function necesitaPermisoMicrofono() {
    return !permisoResuelto && puedeEscuchar()
  }

  function pedirMicrofono() {
    if (!puedeEscuchar()) return Promise.resolve(null)
    // Se llama dentro del primer gesto. Cerramos la pista de prueba enseguida
    // para que el dispositivo quede libre durante todo el cuento.
    permiso ??= (async () => {
      try {
        const flujo = await dispositivos().getUserMedia({ audio: AUDIO })
        detenerPistas(flujo)
        return true
      } catch {
        return null
      } finally {
        permisoResuelto = true
      }
    })()
    return permiso
  }

  async function permisoVigente() {
    // El anfitrión de la app concede o rechaza la captura sin otro diálogo.
    if (entorno.KusiPuente) return true
    try {
      const estado = await entorno.navigator?.permissions?.query({ name: 'microphone' })
      // Si el permiso temporal venció, seguimos sin micrófono en esta sesión.
      return !estado || estado.state === 'granted'
    } catch {
      // Algunos entornos conceden la captura pero no exponen este permiso.
      return true
    }
  }

  async function tomarCuadros(segundos, signal, alNivel) {
    let contexto, flujo, entrada, analizador, muestras
    function liberar() {
      detenerPistas(flujo)
      flujo = null
      entrada?.disconnect()
      entrada = null
      analizador?.disconnect()
      analizador = null
      if (contexto && contexto.state !== 'closed') void contexto.close().catch(() => {})
      contexto = null
      muestras?.fill(0)
      muestras = null
    }
    signal.addEventListener('abort', liberar, { once: true })
    try {
      if (!await permiso || signal.aborted) return SIN_ESCUCHA
      // Incluye las frases que siguen en cola o aún no empezaron a sonar.
      while (!signal.aborted && kusiHabla()) await esperar(signal)
      if (signal.aborted) return SIN_ESCUCHA
      if (!await permisoVigente()) {
        permiso = Promise.resolve(null)
        return SIN_ESCUCHA
      }
      if (signal.aborted) return SIN_ESCUCHA

      flujo = await dispositivos().getUserMedia({ audio: AUDIO })
      if (signal.aborted || kusiHabla()) return SIN_ESCUCHA
      const Contexto = contextoDeAudio()
      contexto = new Contexto()
      entrada = contexto.createMediaStreamSource(flujo)
      analizador = contexto.createAnalyser()
      const longitud = Math.round(contexto.sampleRate * SEGUNDOS_POR_CUADRO)
      analizador.fftSize = 2 ** Math.ceil(Math.log2(2 * longitud))
      muestras = new Float32Array(analizador.fftSize)
      // Sin conexión a la salida, la voz no se reproduce. El búfer se vuelve
      // a usar en cada lectura y la decisión guarda solo los datos del análisis.
      entrada.connect(analizador)
      void contexto.resume().catch(() => {})
      const limiteInicio = performance.now() + 1000
      while (!signal.aborted && contexto.state !== 'running' && performance.now() < limiteInicio) await esperar(signal)
      if (signal.aborted || contexto.state !== 'running') return SIN_ESCUCHA

      const cuadros = []
      const limite = performance.now() + segundos * 1000
      let ultimaLectura = contexto.currentTime
      let ruidoDeFondo
      let nivel = 0
      while (!signal.aborted) {
        if (kusiHabla()) return SIN_ESCUCHA
        const tiempo = contexto.currentTime
        const nuevas = Math.round((tiempo - ultimaLectura) * contexto.sampleRate)
        const bloques = Math.floor(Math.min(nuevas, muestras.length) / longitud)
        if (bloques > 0) {
          analizador.getFloatTimeDomainData(muestras)
          // El reloj de audio evita contar dos veces una muestra o perder los
          // huecos pequeños que deja el temporizador entre lecturas.
          let inicio = muestras.length - (nuevas > muestras.length ? bloques * longitud : nuevas)
          for (let bloque = 0; bloque < bloques; bloque++) {
            cuadros.push(analizarCuadro(muestras.subarray(inicio, inicio + longitud), contexto.sampleRate))
            inicio += longitud
          }
          ultimaLectura = tiempo - (muestras.length - inicio) / contexto.sampleRate
          if (alNivel) {
            // El último cuadro representa lo que se oye ahora, aunque una
            // lectura haya recuperado varios cuadros para reconocer la vocal.
            const { voz, rms = 0 } = cuadros.at(-1)
            if (!voz) {
              // Solo los cuadros sin tono actualizan el fondo, para que una
              // vocal sostenida no suba su propio umbral.
              ruidoDeFondo ??= rms
              ruidoDeFondo += 0.2 * (rms - ruidoDeFondo)
            }
            const umbral = Math.max(RMS_MINIMO_NIVEL, 1.4 * (ruidoDeFondo ?? 0))
            const objetivo = Math.min(1, (rms - umbral) / Math.max(RMS_VOZ_FUERTE, umbral))
            // Suaviza las variaciones de la voz y apaga las ondas en silencio.
            nivel = objetivo > 0 ? (nivel + objetivo) / 2 : 0
            alNivel(nivel)
            if (signal.aborted) break
          }
        }
        if (performance.now() >= limite) return decidir(cuadros)
        await esperar(signal)
      }
      return SIN_ESCUCHA
    } catch (error) {
      if (error?.name === 'NotAllowedError' || error?.name === 'NotFoundError') permiso = Promise.resolve(null)
      return SIN_ESCUCHA
    } finally {
      signal.removeEventListener('abort', liberar)
      liberar()
    }
  }

  // Llamar al terminar la frase de Kusi. Si queda voz en la cola, se espera
  // antes de abrir la pista. Escuchar nunca solicita el permiso inicial.
  async function escucharVocal({ segundos = 2.5, alNivel } = {}) {
    let control
    try {
      if (!permiso || escucha || !puedeEscuchar() || !Number.isFinite(segundos) || segundos <= 0) return SIN_ESCUCHA
      control = new AbortController()
      escucha = control
      return await tomarCuadros(Math.min(segundos, MAXIMO_SEGUNDOS_DE_ESCUCHA), control.signal, alNivel)
    } finally {
      if (escucha === control) escucha = null
      alNivel?.(0)
    }
  }

  function apagarMicrofono() {
    escucha?.abort()
    escucha = null
  }

  return { necesitaPermisoMicrofono, pedirMicrofono, escucharVocal, apagarMicrofono }
}

export const { necesitaPermisoMicrofono, pedirMicrofono, escucharVocal, apagarMicrofono } = crearMicrofono()
