import { planDeCanto } from '../logica/canto.js'
import { leerSilencio } from './silencio.js'

function prepararAire(contexto) {
  const muestra = contexto.createBuffer(1, contexto.sampleRate, contexto.sampleRate)
  const datos = muestra.getChannelData(0)
  // Una semilla fija conserva el mismo soplo entre reproducciones y evita
  // depender de un archivo de audio para añadir aire a la voz.
  let semilla = 1
  for (let indice = 0; indice < datos.length; indice++) {
    semilla = (Math.imul(1664525, semilla) + 1013904223) >>> 0
    datos[indice] = semilla / 2147483648 - 1
  }
  return muestra
}

function programarVoz({ contexto, destino, muestra }, plan, inicio, voces) {
  const tono = contexto.createOscillator()
  tono.type = 'sawtooth'
  tono.frequency.value = plan.frecuencia

  const vibrato = contexto.createOscillator()
  vibrato.frequency.value = plan.vibrato.frecuencia
  const amplitudVibrato = contexto.createGain()
  amplitudVibrato.gain.value = plan.frecuencia * plan.vibrato.profundidad
  vibrato.connect(amplitudVibrato)
  amplitudVibrato.connect(tono.frequency)

  const aire = contexto.createBufferSource()
  aire.buffer = muestra
  aire.loop = true
  const entrada = contexto.createGain()
  const volumenAire = contexto.createGain()
  volumenAire.gain.value = 0.035
  tono.connect(entrada)
  aire.connect(volumenAire)
  volumenAire.connect(entrada)

  const pasaBajos = contexto.createBiquadFilter()
  pasaBajos.type = 'lowpass'
  pasaBajos.frequency.value = 4000
  const salida = contexto.createGain()
  pasaBajos.connect(salida)
  salida.connect(destino)

  // Cada filtro recibe la misma fuente. Si se conectaran en serie, cada uno
  // quitaría las resonancias de los otros dos y se perdería la vocal.
  const resonancias = plan.filtros.flatMap(({ frecuencia, q, ganancia }) => {
    const filtro = contexto.createBiquadFilter()
    filtro.type = 'bandpass'
    filtro.frequency.value = frecuencia
    filtro.Q.value = q
    const volumen = contexto.createGain()
    volumen.gain.value = ganancia
    entrada.connect(filtro)
    filtro.connect(volumen)
    volumen.connect(pasaBajos)
    return [filtro, volumen]
  })

  const { duracion, ataque, caida } = plan.envolvente
  const fin = inicio + duracion
  const volumenVoz = 0.5
  salida.gain.setValueAtTime(0, inicio)
  salida.gain.linearRampToValueAtTime(volumenVoz, inicio + ataque)
  salida.gain.setValueAtTime(volumenVoz, fin - caida)
  salida.gain.linearRampToValueAtTime(0, fin)

  const fuentes = [tono, aire, vibrato]
  const nodos = [...fuentes, amplitudVibrato, volumenAire, entrada, ...resonancias, pasaBajos, salida]
  const limpiar = () => {
    tono.onended = null
    for (const nodo of nodos) nodo.disconnect()
    voces.delete(apagar)
  }
  const apagar = () => {
    // Un stop inmediato también cancela una nota del coro programada para
    // más adelante. Se desconecta solo esta voz de la salida compartida.
    for (const fuente of fuentes) fuente.stop()
    limpiar()
  }

  voces.add(apagar)
  tono.onended = limpiar
  for (const fuente of fuentes) {
    fuente.start(inicio)
    fuente.stop(fin)
  }
}

export function crearCanto(escena) {
  const voces = new Set()
  let aire
  let destruido = false

  function audioDisponible() {
    const gestor = escena?.sound
    const contexto = gestor?.context
    if (destruido || leerSilencio() || gestor?.locked || contexto?.state !== 'running' || !gestor.destination) return null
    if (aire?.contexto !== contexto) aire = { contexto, muestra: prepararAire(contexto) }
    // La salida del gestor aplica el volumen y el silencio generales del juego.
    return { ...aire, destino: gestor.destination }
  }

  function cantar(vocal, opciones) {
    const plan = planDeCanto(vocal, opciones)
    const audio = plan && audioDisponible()
    if (!audio) return false
    programarVoz(audio, plan, audio.contexto.currentTime, voces)
    return true
  }

  function coro(lista, { tempo = 120 } = {}) {
    if (!Array.isArray(lista) || !lista.length || !Number.isFinite(tempo) || tempo <= 0) return 0
    const audio = audioDisponible()
    if (!audio) return 0
    const segundosPorPulso = 60 / tempo
    let inicio = audio.contexto.currentTime
    let notas = 0
    // El reloj del audio mantiene el ritmo aunque un cuadro del juego se demore.
    for (const entrada of lista) {
      const { vocal, voz, nota, duracion = 1 } = entrada ?? {}
      const plan = planDeCanto(vocal, { voz, nota, duracion: duracion * segundosPorPulso })
      if (!plan) continue
      programarVoz(audio, plan, inicio, voces)
      inicio += plan.envolvente.duracion
      notas++
    }
    return notas
  }

  function callar() {
    for (const apagar of voces) apagar()
  }

  function respetarSilencio() {
    // El botón del kit guarda su preferencia. Si cambia durante el canto,
    // se apagan tanto lo que ya está sonando como las notas que faltan.
    if (voces.size && leerSilencio()) callar()
  }

  const eventos = escena?.events
  function destruir() {
    destruido = true
    callar()
    aire = undefined
    eventos?.off('update', respetarSilencio)
    eventos?.off('shutdown', destruir)
    eventos?.off('destroy', destruir)
  }

  eventos?.on('update', respetarSilencio)
  eventos?.once('shutdown', destruir)
  eventos?.once('destroy', destruir)
  return { cantar, coro, callar, destruir }
}
