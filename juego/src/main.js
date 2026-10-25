// Arranque de los juegos de Kusi: la carga elige la familia del paquete.

import * as Phaser from 'phaser'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import { ANCHO, ALTO, LETRA } from './medidas.js'
import { EscenaCarga } from './escenas/EscenaCarga.js'
import { EscenaMercado } from './escenas/EscenaMercado.js'
import { EscenaLaberinto } from './escenas/EscenaLaberinto.js'

async function empezar() {
  // Primero se carga la letra; si no, los textos del lienzo saldrían con otra letra.
  await Promise.all(['500', '600', '700'].map((peso) => document.fonts.load(`${peso} 32px ${LETRA}`, 'áéíóúñ¡¿')))

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'juego',
    width: ANCHO,
    height: ALTO,
    backgroundColor: '#8fd0ef',
    // Horizontal, 1280 x 720, se agranda o achica para caber y queda centrado
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Varios dedos a la vez: si otro dedo toca la pantalla, el joystick no se suelta
    input: {
      activePointers: 3,
    },
    scene: [EscenaCarga, EscenaMercado, EscenaLaberinto],
  })
}

empezar()
