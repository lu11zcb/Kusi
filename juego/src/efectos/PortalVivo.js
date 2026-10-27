// El portal sigue pegado al suelo: no salta, no cambia su colisión y no lanza
// confeti. Solo la luz acompaña la apertura; vida=0 conserva ambos dibujos.
export function pulsoPortal(segundos) {
  return 0.12 + 0.07 * Math.sin(segundos * Math.PI * 2 / 1.5)
}

export class PortalVivo {
  constructor(escena, puerta, { casilla, activo = true }) {
    this.puerta = puerta
    this.activo = activo
    this.aperturas = 0
    this.tiempo = 0
    this.abierto = false
    this.base = { x: puerta.x, y: puerta.y, escalaX: puerta.scaleX, escalaY: puerta.scaleY }
    this.brillo = escena.add.ellipse(puerta.x, puerta.y + casilla * 0.1,
      casilla * 1.05, casilla * 0.62, 0xffd878, 1).setDepth(2.6).setAlpha(0)
  }
  abrir() {
    if (this.abierto) return
    this.abierto = true
    if (this.activo) this.aperturas += 1
  }
  actualizar(segundos) {
    if (!this.activo || !this.abierto) return
    this.tiempo += segundos
    this.brillo.setAlpha(pulsoPortal(this.tiempo))
  }
  estado() {
    return { activo: this.activo, aperturas: this.aperturas, tiempo: this.tiempo,
      brillo: this.brillo.alpha, base: { ...this.base },
      puerta: { x: this.puerta.x, y: this.puerta.y, escalaX: this.puerta.scaleX,
        escalaY: this.puerta.scaleY, textura: this.puerta.texture.key } }
  }
}
