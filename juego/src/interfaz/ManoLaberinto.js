import { NUMERO } from '../medidas.js'

const CLAVE_TUTORIAL = 'kusi-laberinto-tocar-v1'
const PUNTO_PREDETERMINADO = { x: 636, y: 271 }
const PROFUNDIDAD = 1100
const MANO = {
  ancho: 60,
  alto: 70,
  desfaseX: 42,
  desfaseY: 65,
  recorrido: 8,
  duracion: 140,
  pausaApoyo: 80,
  pausaEntreToques: 1220,
}
const ANILLO = {
  radio: 28,
  escalaFinal: 1.4,
  grosor: 3,
  opacidadInicial: 0.85,
  opacidadFinal: 0.12,
  demora: 140,
  duracion: 600,
  pausa: 980,
  opacidadReducida: 0.38,
  duracionReducida: 480,
}
let mostradaEnEstaSesion = false

function esPrimeraVez() {
  if (mostradaEnEstaSesion) return false
  try {
    if (localStorage.getItem(CLAVE_TUTORIAL) === 'vista') return false
    localStorage.setItem(CLAVE_TUTORIAL, 'vista')
  } catch {
    // Algunos WebView no permiten almacenamiento. La memoria del módulo basta
    // para no repetir la mano durante esta sesión ni al volver a jugar.
  }
  mostradaEnEstaSesion = true
  return true
}

export function crearManoLaberinto(escena, puntoFruta = PUNTO_PREDETERMINADO) {
  if (!esPrimeraVez()) return null

  // El anillo rodea la fruta sin rellenarla. El índice queda junto a su borde
  // inferior derecho y se acerca verticalmente; la palma deja libre la comida.
  const anillo = escena.add.circle(puntoFruta.x, puntoFruta.y, ANILLO.radio, 0, 0)
    .setStrokeStyle(ANILLO.grosor, NUMERO.terracota).setAlpha(ANILLO.opacidadInicial)
    .setDepth(PROFUNDIDAD)
  const mano = escena.add.image(puntoFruta.x + MANO.desfaseX, puntoFruta.y + MANO.desfaseY, 'mano-deslizar')
    .setDisplaySize(MANO.ancho, MANO.alto).setDepth(PROFUNDIDAD + 1)
  const movimientoReducido = typeof window !== 'undefined'
    && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)
  const gestos = []

  if (movimientoReducido) {
    // Con menos movimiento la mano queda quieta y solo cambia la intensidad
    // del anillo: el objetivo sigue claro sin desplazamientos ni crecimiento.
    gestos.push(escena.tweens.add({ targets: anillo, alpha: ANILLO.opacidadReducida,
      duration: ANILLO.duracionReducida, ease: 'Sine.easeInOut', yoyo: true,
      repeat: -1, repeatDelay: MANO.pausaEntreToques }))
  } else {
    gestos.push(escena.tweens.add({ targets: mano,
      y: mano.y - MANO.recorrido, duration: MANO.duracion, ease: 'Sine.easeInOut',
      yoyo: true, repeat: -1, hold: MANO.pausaApoyo, repeatDelay: MANO.pausaEntreToques }))
    gestos.push(escena.tweens.add({ targets: anillo,
      scaleX: ANILLO.escalaFinal, scaleY: ANILLO.escalaFinal, alpha: ANILLO.opacidadFinal,
      delay: ANILLO.demora, duration: ANILLO.duracion, ease: 'Sine.easeOut',
      repeat: -1, repeatDelay: ANILLO.pausa }))
  }

  const tutorial = {
    visible: true,
    ocultar() {
      if (!this.visible) return
      this.visible = false
      gestos.forEach((gesto) => gesto.stop())
      mano.destroy()
      anillo.destroy()
    },
  }
  escena.events?.once('shutdown', () => tutorial.ocultar())
  return tutorial
}
