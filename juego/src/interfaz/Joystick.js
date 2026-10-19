// Joystick redondo: el niño arrastra la perilla hacia cualquier lado.
// `valor` es { x, y }: hacia dónde empuja y con cuánta fuerza (largo de 0 a 1). { 0, 0 } es quieto.

import { NUMERO, PROFUNDIDAD, ZONA_MUERTA } from '../medidas.js'
import { fijarEnPantalla } from './piezas.js'

const RADIO_BASE = 96
const RADIO_PERILLA = 50 // 100 px de diámetro: grande para dedos de 6 años
const RECORRIDO = 66 // cuánto se puede alejar la perilla del centro

export class Joystick {
  constructor(escena, x, y) {
    this.escena = escena
    this.centroX = x
    this.centroY = y
    this.valor = { x: 0, y: 0 }
    this.punteroId = null // el dedo que está usando el joystick
    this.activo = false

    // Base redonda con una flechita hacia cada lado
    const base = escena.add.graphics({ x, y })
    base.fillStyle(0xffffff, 0.45)
    base.lineStyle(4, NUMERO.tinta, 0.55)
    base.fillCircle(0, 0, RADIO_BASE)
    base.strokeCircle(0, 0, RADIO_BASE)
    base.fillStyle(NUMERO.tinta, 0.55)
    base.fillTriangle(-84, 0, -64, -16, -64, 16)
    base.fillTriangle(84, 0, 64, -16, 64, 16)
    base.fillTriangle(0, -84, -16, -64, 16, -64)
    base.fillTriangle(0, 84, -16, 64, 16, 64)

    // Perilla con brillo
    this.perilla = escena.add.container(x, y, [
      escena.add.circle(0, 0, RADIO_PERILLA, NUMERO.naranja).setStrokeStyle(5, NUMERO.tinta),
      escena.add.circle(-15, -17, 13, 0xffffff, 0.55),
    ])

    // Zona de toque más grande que el dibujo, para que sea fácil acertarle
    const zona = escena.add.zone(x, y, RADIO_BASE * 2 + 70, RADIO_BASE * 2 + 70).setInteractive()

    for (const objeto of [base, this.perilla, zona]) {
      fijarEnPantalla(objeto)
      objeto.setDepth(PROFUNDIDAD.controles)
    }

    // Un dedo toca el joystick; desde ahí solo ese dedo lo mueve
    zona.on('pointerdown', (puntero) => {
      if (!this.activo || this.punteroId !== null) return
      this.punteroId = puntero.id
      this.mover(puntero.x, puntero.y)
    })
    escena.input.on('pointermove', (puntero) => {
      if (puntero.id === this.punteroId) this.mover(puntero.x, puntero.y)
    })
    const alSoltar = (puntero) => {
      if (puntero.id === this.punteroId) this.soltar()
    }
    escena.input.on('pointerup', alSoltar)
    escena.input.on('pointerupoutside', alSoltar)
  }

  // Lleva la perilla hacia el dedo (sin pasar del borde) y calcula el valor.
  mover(xDelDedo, yDelDedo) {
    const dx = xDelDedo - this.centroX
    const dy = yDelDedo - this.centroY
    const largo = Math.hypot(dx, dy)
    const alcance = Math.min(largo, RECORRIDO)
    const direccionX = largo ? dx / largo : 0
    const direccionY = largo ? dy / largo : 0
    this.escena.tweens.killTweensOf(this.perilla)
    this.perilla.setPosition(this.centroX + direccionX * alcance, this.centroY + direccionY * alcance)
    // Los primeros px no cuentan, para que el cuy no se mueva solo
    const fuerza = Math.max(0, alcance - ZONA_MUERTA) / (RECORRIDO - ZONA_MUERTA)
    this.valor = { x: direccionX * fuerza, y: direccionY * fuerza }
  }

  // El dedo se levantó: la perilla vuelve al centro.
  soltar() {
    this.punteroId = null
    this.valor = { x: 0, y: 0 }
    this.escena.tweens.add({ targets: this.perilla, x: this.centroX, y: this.centroY, duration: 180, ease: 'Back.easeOut' })
  }

  activar() {
    this.activo = true
  }

  // Mientras hay una ventana o un globo abierto, el joystick no responde.
  desactivar() {
    this.activo = false
    if (this.punteroId !== null) this.soltar()
  }
}
