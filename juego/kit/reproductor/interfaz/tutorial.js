import { NUMERO } from '../medidas.js'
import { vidaActiva } from '../efectos/vida.js'
import { callarVoz } from '../logica/voz.js'
import { crearAvanceTutorial, debeMostrarTutorial, marcarTutorial } from '../logica/tutorial.js'

export { tutorialVisto, marcarTutorial } from '../logica/tutorial.js'

const PROFUNDIDAD = 10000
const LADO_IMAGEN_MANO = 112 // El margen transparente deja la mano visible en unos 90 px.
const DORADO = 0xf3c66b
const PERIODO_GESTO = 1.6

function dibujarMano(escena) {
  if (escena.textures.exists('mano-guia')) {
    // El origen queda cerca de la punta del índice, sobre el objetivo del gesto.
    const mano = escena.add.image(0, 0, 'mano-guia').setOrigin(0.22, 0.16)
    return { mano, escala: LADO_IMAGEN_MANO / Math.max(mano.width, mano.height) }
  }

  const mano = escena.add.graphics()
  // La punta del dedo coincide con el origen. La palma queda abajo a la derecha
  // para que el niño vea el centro del botón incluso cuando la mano lo señala.
  mano.lineStyle(5, NUMERO.tinta, 1)
  mano.fillStyle(0xffffff, 1)
  mano.fillCircle(37, 56, 30)
  mano.strokeCircle(37, 56, 30)
  mano.fillRoundedRect(-10, 0, 22, 60, 11)
  mano.strokeRoundedRect(-10, 0, 22, 60, 11)
  mano.fillCircle(24, 51, 14)
  return { mano, escala: 1 }
}

function suave(valor) {
  const fraccion = Math.max(0, Math.min(1, valor))
  return fraccion * fraccion * (3 - 2 * fraccion)
}

function dibujarGesto(mano, escala, efectos, paso, segundos, controles) {
  const origen = paso.objetivo()
  const fase = segundos % PERIODO_GESTO / PERIODO_GESTO
  let x = origen.x
  let y = origen.y
  let tamano = escala

  if (efectos) {
    efectos.clear()
    // El anillo conserva el lugar donde empieza el gesto mientras la mano se mueve.
    const pulso = (1 - Math.cos(fase * 2 * Math.PI)) / 2
    efectos.lineStyle(4, DORADO, 0.55 + pulso * 0.35)
    efectos.strokeCircle(x, y, 30 + pulso * 8)
  }

  if (paso.gesto === 'tocar') {
    const contacto = suave(fase / 0.3) * (1 - suave((fase - 0.43) / 0.27))
    y -= 34 * (1 - contacto)
    if (efectos) {
      tamano *= 1 - contacto * 0.12
      const onda = (fase - 0.3) / 0.4
      if (onda >= 0 && onda < 1) {
        efectos.lineStyle(4, DORADO, 0.95 * (1 - onda))
        efectos.strokeCircle(origen.x, origen.y, 12 + onda * 42)
      }
    }
  } else {
    const destino = paso.hacia?.() ?? origen
    const ida = suave((fase - 0.13) / 0.43)
    const vuelta = suave((fase - 0.7) / 0.3)
    const avance = ida * (1 - vuelta)
    const dx = destino.x - origen.x
    const dy = destino.y - origen.y
    x += dx * avance
    y += dy * avance

    if (paso.gesto === 'joystick') {
      controles?.demostrarJoystick?.({ x, y })
    } else {
      // La mano regresa levantada, para que el regreso no parezca otro arrastre.
      y -= 26 * Math.sin(Math.PI * vuelta)
    }
    if (paso.gesto === 'arrastrar' && efectos && fase < 0.7) {
      // Solo queda estela durante el arrastre. El regreso prepara otra demostración.
      for (let punto = 1; punto <= 5; punto += 1) {
        const tramo = avance - punto * 0.085
        if (tramo <= 0) break
        efectos.fillStyle(DORADO, 0.9 - punto * 0.13)
        efectos.fillCircle(origen.x + dx * tramo, origen.y + dy * tramo, 5)
      }
    }
  }

  mano.setPosition(x, y).setScale(tamano)
}

export function crearTutorial(escena, hud, {
  pasos, alTerminar, partida = escena.partida ?? escena.datos?.partida, controles = escena.controles,
}) {
  const busqueda = globalThis.location?.search ?? ''
  const avance = crearAvanceTutorial(pasos)
  if (avance.terminado || !debeMostrarTutorial(partida, busqueda)) {
    alTerminar?.()
    return { terminado: true, actualizar() {}, destruir() {} }
  }

  const { mano, escala } = dibujarMano(escena)
  mano.setScrollFactor(0).setDepth(PROFUNDIDAD + 1)
  const efectos = vidaActiva(busqueda)
    ? escena.add.graphics().setScrollFactor(0).setDepth(PROFUNDIDAD)
    : null
  let segundosDelGesto = 0
  let terminado = false
  let destruido = false

  function quitarDibujos() {
    mano.destroy()
    efectos?.destroy()
  }

  function destruir() {
    if (destruido) return
    destruido = true
    if (!terminado) {
      if (avance.paso?.gesto === 'joystick') controles?.demostrarJoystick?.()
      quitarDibujos()
    }
    terminado = true
    escena.events.off('shutdown', destruir)
    escena.events.off('destroy', destruir)
    // La voz de la escena también puede tener una frase en espera al salir del juego.
    callarVoz()
  }

  function mostrarPaso() {
    segundosDelGesto = 0
    dibujarGesto(mano, escala, efectos, avance.paso, 0, controles)
    mano.setVisible(true)
    efectos?.setVisible(true)
    hud.decir(avance.paso.frase, { tipo: 'respuesta' })
  }

  escena.events.once('shutdown', destruir)
  escena.events.once('destroy', destruir)
  mostrarPaso()
  marcarTutorial(partida)

  return {
    get terminado() { return terminado },
    actualizar(segundos) {
      if (terminado) return
      const paso = avance.paso
      const cambio = avance.actualizar(segundos)
      if (cambio === 'pausa') return
      if (cambio === 'paso') {
        mostrarPaso()
        return
      }
      if (cambio === 'fin' || cambio === 'celebrar') {
        if (paso.gesto === 'joystick') controles?.demostrarJoystick?.()
        mano.setVisible(false)
        efectos?.setVisible(false)
        hud.decir('¡Muy bien!', { tipo: 'respuesta' })
        if (cambio === 'fin') {
          quitarDibujos()
          terminado = true
          alTerminar?.()
        }
        return
      }
      if (cambio === 'repetir') hud.decir(paso.frase, { tipo: 'respuesta' })
      segundosDelGesto += segundos
      dibujarGesto(mano, escala, efectos, paso, segundosDelGesto, controles)
    },
    destruir,
  }
}
