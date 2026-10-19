// Joystick de un solo eje: el niño arrastra la perilla a la izquierda o a la derecha.
// `valor` va de -1 (todo a la izquierda) a 1 (todo a la derecha); 0 es quieto.

import * as Phaser from 'phaser'
import { NUMERO, PROFUNDIDAD, ZONA_MUERTA } from '../medidas.js'
import { fijarEnPantalla } from './piezas.js'

const ANCHO_BASE = 250
const ALTO_BASE = 124
const RADIO_PERILLA = 54 // 108 px de diámetro: grande para dedos de 6 años
const RECORRIDO = 78 // cuánto se puede alejar la perilla del centro

export class Joystick {
  constructor(escena, x, y) {
    this.escena = escena
    this.centroX = x
    this.valor = 0
    this.punteroId = null // el dedo que está usando el joystick
    this.activo = false

    // Base en forma de píldora con dos flechas
    const base = escena.add.graphics({ x, y })
    base.fillStyle(0xffffff, 0.45)
    base.lineStyle(4, NUMERO.tinta, 0.55)
    base.fillRoundedRect(-ANCHO_BASE / 2, -ALTO_BASE / 2, ANCHO_BASE, ALTO_BASE, ALTO_BASE / 2)
    base.strokeRoundedRect(-ANCHO_BASE / 2, -ALTO_BASE / 2, ANCHO_BASE, ALTO_BASE, ALTO_BASE / 2)
    base.fillStyle(NUMERO.tinta, 0.55)
    base.fillTriangle(-108, 0, -86, -18, -86, 18)
    base.fillTriangle(108, 0, 86, -18, 86, 18)

    // Perilla con brillo
    this.perilla = escena.add.container(x, y, [
      escena.add.circle(0, 0, RADIO_PERILLA, NUMERO.naranja).setStrokeStyle(5, NUMERO.tinta),
      escena.add.circle(-16, -18, 14, 0xffffff, 0.55),
    ])

    // Zona de toque más grande que el dibujo, para que sea fácil acertarle
    const zona = escena.add.zone(x, y, ANCHO_BASE + 80, ALTO_BASE + 90).setInteractive()

    for (const objeto of [base, this.perilla, zona]) {
      fijarEnPantalla(objeto)
      objeto.setDepth(PROFUNDIDAD.controles)
    }

    // Un dedo toca el joystick; desde ahí solo ese dedo lo mueve (el otro puede apretar «Saltar»)
    zona.on('pointerdown', (puntero) => {
      if (!this.activo || this.punteroId !== null) return
      this.punteroId = puntero.id
      this.mover(puntero.x)
    })
    escena.input.on('pointermove', (puntero) => {
      if (puntero.id === this.punteroId) this.mover(puntero.x)
    })
    const alSoltar = (puntero) => {
      if (puntero.id === this.punteroId) this.soltar()
    }
    escena.input.on('pointerup', alSoltar)
    escena.input.on('pointerupoutside', alSoltar)
  }

  // Lleva la perilla hasta el dedo (sin pasar del borde) y calcula el valor.
  mover(xDelDedo) {
    const distancia = Phaser.Math.Clamp(xDelDedo - this.centroX, -RECORRIDO, RECORRIDO)
    this.escena.tweens.killTweensOf(this.perilla)
    this.perilla.x = this.centroX + distancia
    // Los primeros px no cuentan, para que el cuy no se mueva solo
    const util = Math.abs(distancia) - ZONA_MUERTA
    this.valor = util <= 0 ? 0 : (Math.sign(distancia) * util) / (RECORRIDO - ZONA_MUERTA)
  }

  // El dedo se levantó: la perilla vuelve al centro.
  soltar() {
    this.punteroId = null
    this.valor = 0
    this.escena.tweens.add({ targets: this.perilla, x: this.centroX, duration: 180, ease: 'Back.easeOut' })
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
