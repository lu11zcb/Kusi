const CLAVE_TUTORIAL = 'kusi-joystick-ilustrado-v2'
let mostradaEnEstaSesion = false
function primeraVez() {
  if (mostradaEnEstaSesion) return false
  try { if (localStorage.getItem(CLAVE_TUTORIAL) === 'vista') return false; localStorage.setItem(CLAVE_TUTORIAL, 'vista') } catch {}
  mostradaEnEstaSesion = true
  return true
}
export function crearManoLaberinto(escena, punto) {
  if (escena.indiceNivel !== 0 || !primeraVez()) return null
  const mano = escena.add.image(punto.x + 20, punto.y + 43, 'mano-tutorial', 0).setDisplaySize(64, 80).setDepth(1100)
  const tutorial = { visible: true, tiempo: 0,
    actualizar(segundos) {
      if (!this.visible) return
      this.tiempo += Math.max(0, segundos)
      if (this.tiempo >= 6) { this.ocultar(); return }
      if (!escena.vida) return
      const fase = this.tiempo % 2
      const avance = fase < .4 ? 0 : fase < 1.2 ? Math.sin((fase - .4) / .8 * Math.PI) * 30 : 0
      mano.setPosition(punto.x + 20 + avance, punto.y + 43).setFrame(Math.floor(this.tiempo / .35) % 3)
    },
    ocultar() { if (!this.visible) return; this.visible = false; mano.destroy() },
  }
  escena.events.once('shutdown', () => tutorial.ocultar())
  return tutorial
}
