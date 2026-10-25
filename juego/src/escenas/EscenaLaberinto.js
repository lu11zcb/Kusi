// La familia laberinto tiene su propia escena y reutiliza la carga compartida.
import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, estiloTexto } from '../medidas.js'

export class EscenaLaberinto extends Phaser.Scene {
  constructor() {
    super('laberinto')
  }

  init({ paquete, cuyAnimado, zorroAnimado }) {
    this.paquete = paquete
    this.datosCuyAnimado = cuyAnimado
    this.datosZorroAnimado = zorroAnimado
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.crema)
    this.add.text(ANCHO / 2, ALTO / 2, this.paquete.titulo, estiloTexto(40)).setOrigin(0.5)
  }
}
