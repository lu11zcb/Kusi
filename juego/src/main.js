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

  const laberinto = new URLSearchParams(window.location.search).get('paquete') === 'laberinto'
  new Phaser.Game({
    // Este tablero es 2D y está compuesto por filas estáticas. Canvas evita el
    // coste de los cambios de textura de WebGL en equipos sin GPU dedicada.
    type: laberinto ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'juego',
    width: ANCHO,
    height: ALTO,
    backgroundColor: '#8fd0ef',
    // La escena ya limita las pausas largas. Sin el calentamiento de deltas de
    // Phaser, un móvil con menos FPS conserva los segundos reales del juego.
    fps: { smoothStep: !laberinto },
    // El laberinto amplía el lienzo en pantallas alargadas. La plaza conserva FIT.
    scale: {
      mode: laberinto ? Phaser.Scale.EXPAND : Phaser.Scale.FIT,
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
