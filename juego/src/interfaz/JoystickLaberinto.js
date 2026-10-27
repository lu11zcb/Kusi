import { JOYSTICK, leerGestoJoystick } from '../logica/joystickLaberinto.js'

// La base nunca se desplaza ni se oculta. Solo un dedo puede conducir, y el
// gesto se mide en píxeles visibles: hasta 18 px de zona muerta, reducida
// en celulares para conservar un recorrido útil dentro de la base.
export class JoystickLaberinto {
  constructor(escena) {
    this.escena = escena
    this.centro = { x: escena.guia.joystick.x, y: escena.guia.joystick.y }
    this.radio = escena.guia.joystick.radio ?? 92
    this.radioPerilla = escena.guia.joystick.radioPerilla ?? 44
    this.puntero = null
    this.direccion = null
    this.base = escena.add.image(this.centro.x, this.centro.y, 'joystick-base')
      .setDisplaySize(this.radio * 2, this.radio * 2).setDepth(1005)
    this.perilla = escena.add.image(this.centro.x, this.centro.y, 'joystick-perilla')
      .setDisplaySize(this.radioPerilla * 2, this.radioPerilla * 2).setDepth(1006)
  }
  iniciar(puntero) {
    if (this.puntero !== null) return false
    const mundo = this.escena.cameras.main.getWorldPoint(puntero.x, puntero.y)
    if (Math.hypot(mundo.x - this.centro.x, mundo.y - this.centro.y) > this.radio) return false
    this.puntero = puntero.id
    return true
  }
  mover(puntero) {
    if (puntero.id !== this.puntero) return null
    const lienzo = this.escena.game.canvas.getBoundingClientRect()
    const centro = this.escena.proyectar(this.centro.x, this.centro.y)
    const escala = lienzo.width / this.escena.scale.width * this.escena.cameras.main.zoom
    const punto = { x: lienzo.left + puntero.x * lienzo.width / this.escena.scale.width,
      y: lienzo.top + puntero.y * lienzo.height / this.escena.scale.height }
    const gesto = leerGestoJoystick(centro, punto,
      { radio: this.radio * escala, radioPerilla: this.radioPerilla * escala, zonaMuerta: Math.min(JOYSTICK.zonaMuerta, (this.radio - this.radioPerilla) * escala * .55) })
    this.direccion = gesto.direccion
    this.perilla.setPosition(this.centro.x + gesto.x / escala, this.centro.y + gesto.y / escala)
    return gesto
  }
  soltar(puntero = null) {
    if (puntero && puntero.id !== this.puntero) return false
    if (this.puntero === null) return false
    this.puntero = null
    this.direccion = null
    this.perilla.setPosition(this.centro.x, this.centro.y)
    return true
  }
  estado() {
    return { visible: true, puntero: this.puntero, direccion: this.direccion,
      radio: this.radio, centro: { ...this.centro }, perilla: { x: this.perilla.x, y: this.perilla.y } }
  }
}
