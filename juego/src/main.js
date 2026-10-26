// Arranque del laberinto de Kusi: prepara el puente y carga su guion.

import * as Phaser from 'phaser'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import { ANCHO, ALTO, LETRA } from './medidas.js'
import { EscenaCarga } from './escenas/EscenaCarga.js'
import { EscenaLaberinto } from './escenas/EscenaLaberinto.js'
import { elegirRenderizador } from './logica/parametrosLaberinto.js'
import { CLAVE_RENDERIZADOR_PEDIDO } from './renderizador.js'
import { crearPuente, CLAVE_PUENTE } from './mensajes/puenteGuion.js'

// Sin parámetros, o con ?paquete=laberinto, se usa el guion de ejemplo.
// ?paquete=mensaje espera el guion de la página que contiene el juego.

// El puente escucha desde el primer momento, antes de cargar la letra y de arrancar
// Phaser: un guion que llegue mientras el juego carga espera su turno y no se pierde.
const puente = crearPuente(window)

async function empezar() {
  // Primero se carga la letra; si no, los textos del lienzo saldrían con otra letra.
  await Promise.all(['500', '600', '700'].map((peso) => document.fonts.load(`${peso} 32px ${LETRA}`, 'áéíóúñ¡¿')))

  // Este tablero es 2D y se organiza en filas estáticas. Canvas evita el
  // coste de los cambios de textura de WebGL en equipos sin GPU dedicada.
  // ?renderizador=auto devuelve la elección a Phaser para comparar los dos.
  const pedido = elegirRenderizador()
  const juego = new Phaser.Game({
    type: pedido === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
    parent: 'juego',
    width: ANCHO,
    height: ALTO,
    backgroundColor: '#8fd0ef',
    // La escena ya limita las pausas largas. Sin el calentamiento de deltas de
    // Phaser, un móvil con menos FPS conserva los segundos reales del juego.
    fps: { smoothStep: false },
    // El laberinto amplía el lienzo en pantallas alargadas.
    scale: {
      mode: Phaser.Scale.EXPAND,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    // Cada dedo conserva su propio toque aunque otro toque la pantalla.
    input: {
      activePointers: 3,
    },
    scene: [EscenaCarga, EscenaLaberinto],
  })
  // Las pruebas leen desde las escenas qué lienzo se pidió y cuál quedó activo.
  juego.registry.set(CLAVE_RENDERIZADOR_PEDIDO, pedido)
  // Las escenas del laberinto encuentran el puente aquí, antes de su primer cuadro.
  juego.registry.set(CLAVE_PUENTE, puente)
}

empezar()
