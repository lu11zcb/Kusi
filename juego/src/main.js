// Arranque de los juegos de Kusi: la carga elige la familia del paquete.

import * as Phaser from 'phaser'
import '@fontsource/fredoka/500.css'
import '@fontsource/fredoka/600.css'
import '@fontsource/fredoka/700.css'
import { ANCHO, ALTO, LETRA } from './medidas.js'
import { EscenaCarga } from './escenas/EscenaCarga.js'
import { EscenaMercado } from './escenas/EscenaMercado.js'
import { EscenaLaberinto } from './escenas/EscenaLaberinto.js'
import { elegirRenderizador } from './logica/parametrosLaberinto.js'
import { CLAVE_RENDERIZADOR_PEDIDO } from './renderizador.js'
import { crearPuente, CLAVE_PUENTE } from './mensajes/puenteGuion.js'

// ?paquete=laberinto abre el laberinto con el guion de ejemplo; ?paquete=mensaje lo abre
// sin guion y espera el que le mande la página que lo contiene (la vista previa del
// panel). En los dos el laberinto acepta guiones por mensaje; la plaza, ninguno.
const PAQUETE_PEDIDO = new URLSearchParams(window.location.search).get('paquete')
const ES_LABERINTO = PAQUETE_PEDIDO === 'laberinto' || PAQUETE_PEDIDO === 'mensaje'

// El puente escucha desde el primer momento, antes de cargar la letra y de arrancar
// Phaser: un guion que llegue mientras el juego carga espera su turno y no se pierde.
const puente = ES_LABERINTO ? crearPuente(window) : null

async function empezar() {
  // Primero se carga la letra; si no, los textos del lienzo saldrían con otra letra.
  await Promise.all(['500', '600', '700'].map((peso) => document.fonts.load(`${peso} 32px ${LETRA}`, 'áéíóúñ¡¿')))

  const laberinto = ES_LABERINTO
  // Este tablero es 2D y está compuesto por filas estáticas. Canvas evita el
  // coste de los cambios de textura de WebGL en equipos sin GPU dedicada.
  // ?renderizador=auto devuelve la elección a Phaser para comparar los dos; la
  // plaza no lee ese parámetro y conserva AUTO siempre.
  const pedido = laberinto ? elegirRenderizador() : 'auto'
  const juego = new Phaser.Game({
    type: pedido === 'canvas' ? Phaser.CANVAS : Phaser.AUTO,
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
  // Las pruebas leen desde las escenas qué lienzo se pidió y cuál quedó activo.
  juego.registry.set(CLAVE_RENDERIZADOR_PEDIDO, pedido)
  // Las escenas del laberinto encuentran el puente aquí, antes de su primer cuadro.
  if (puente) juego.registry.set(CLAVE_PUENTE, puente)
}

empezar()
