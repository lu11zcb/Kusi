import { COLOR, NUMERO, estiloTexto } from '../medidas.js'

const CLAVE_TUTORIAL = 'kusi-laberinto-deslizar-v1'
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

export function crearManoLaberinto(escena) {
  if (!esPrimeraVez()) return null
  const etiqueta = escena.add.text(334, 478, 'Desliza', estiloTexto(23, COLOR.tinta)).setOrigin(0.5).setDepth(1100)
  const trazo = escena.add.graphics().setDepth(1100)
  trazo.lineStyle(4, NUMERO.terracota).beginPath().moveTo(293, 508).lineTo(375, 508)
    .moveTo(364, 499).lineTo(375, 508).lineTo(364, 517).strokePath()

  // Mano con el índice extendido: un icono vectorial sencillo, sin imágenes
  // nuevas ni texto que el niño deba leer para reconocer el gesto de deslizar.
  const mano = escena.add.image(302, 558, 'mano-deslizar').setDisplaySize(66, 77).setDepth(1101)
  const gesto = escena.tweens.add({ targets: mano, x: 350, duration: 900,
    ease: 'Sine.easeInOut', yoyo: true, repeat: -1, hold: 300, repeatDelay: 400 })
  return {
    visible: true,
    ocultar() {
      if (!this.visible) return
      this.visible = false
      gesto.stop()
      mano.destroy()
      etiqueta.destroy()
      trazo.destroy()
    },
  }
}
