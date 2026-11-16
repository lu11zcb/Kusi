// El modelo de un juego que se maneja de verdad: el niño mueve a su protagonista con el joystick y
// salta con un botón, por plataformas separadas, y reúne cosas. Es una escena mínima que sirve de
// guía al programador (y de prueba del kit): usa SOLO el kit —los controles, la interfaz común, la
// física de plataformas y el salto con aplastón— y nada de botones de «ir a…».
//
// Un juego de verdad cambia los dibujos (plataformas, fondo y objetos del mundo de su aventura) y las
// reglas (qué se reúne, el adversario, los niveles), pero se maneja igual.
//
//   crearControles → leer() cada cuadro → avanzarCuerpo → mover al protagonista y animarlo

import * as Phaser from 'phaser'
import { COLOR, NUMERO } from '../../reproductor/medidas.js'
import { crearProtagonista, ALTURA_PROTAGONISTA } from '../../reproductor/dibujos/protagonista.js'
import { crearControles } from '../../reproductor/interfaz/controles.js'
import { crearHud } from '../../reproductor/interfaz/hud.js'
import { crearCuerpo, avanzarCuerpo, separacionComoda } from '../../reproductor/logica/plataformas.js'
import { formaDelSalto } from '../../reproductor/logica/salto.js'

// Plataformas separadas por un hueco que se cruza saltando (separacionComoda dice cuánto).
const { hueco, subida } = separacionComoda()
// Las plataformas quedan por encima de la franja de abajo, que es de los controles (regla 13.14).
const SUELO = 430
export const PLATAFORMAS = [
  { x: 40, y: SUELO, ancho: 360 },
  { x: 400 + hueco, y: SUELO, ancho: 320 },
  { x: 720 + hueco * 2, y: SUELO - subida, ancho: 320 },
  { x: 1040 + hueco * 3 - 40, y: SUELO, ancho: 360 },
]
const ANCHO_MUNDO = 1040 + hueco * 3 + 360

export class EscenaPlataformas extends Phaser.Scene {
  constructor() { super('plataformas-ejemplo') }

  init(datos) { this.datos = datos }

  create() {
    const { width: ancho, height: alto } = this.scale
    this.cameras.main.setBackgroundColor(COLOR.arena)
    this.cameras.main.setBounds(0, 0, ANCHO_MUNDO, alto)

    for (const p of PLATAFORMAS) {
      this.add.rectangle(p.x + p.ancho / 2, p.y + 40, p.ancho, 80, NUMERO.terracota).setStrokeStyle(5, NUMERO.tinta).setRounded?.(22)
    }
    this.cosas = PLATAFORMAS.map((p) => this.add.circle(p.x + p.ancho / 2, p.y - 90, 18, NUMERO.naranja).setStrokeStyle(4, NUMERO.tinta))
    this.reunidas = 0

    this.protagonista = crearProtagonista(this, { alto: 120 * ALTURA_PROTAGONISTA })
    this.cuerpo = crearCuerpo({ x: 140, y: SUELO })
    this.protagonista.setPosition(this.cuerpo.x, this.cuerpo.y).setDepth(10)
    this.cameras.main.startFollow(this.protagonista, true, 0.12, 0.12)

    // La interfaz y los controles, siempre los del kit.
    this.controles = crearControles(this, { saltar: true })
    this.hud = crearHud(this, { alEscuchar: () => this.hud.decir('Cruza las plataformas y junta todo.') })
    this.marcador = this.hud.indicador({ texto: '0 / ' + this.cosas.length })
    this.hud.decir('Mueve con el joystick y salta con el botón.')
    this.partida = this.datos?.partida
  }

  update(_tiempo, delta) {
    const segundos = delta / 1000
    const { x, saltar } = this.controles.leer()
    const antes = this.cuerpo.x
    avanzarCuerpo(this.cuerpo, { x, saltar }, PLATAFORMAS, segundos, { limites: { izquierda: 40, derecha: ANCHO_MUNDO - 40, abajo: this.scale.height + 200 } })
    this.protagonista.setPosition(this.cuerpo.x, this.cuerpo.y)
    // Se aplasta al despegar y al caer, y mira hacia donde camina.
    const forma = formaDelSalto(this.cuerpo.enSuelo ? 0.5 : Math.min(1, 0.2 + Math.abs(this.cuerpo.vy) / 2400))
    if (!this.cuerpo.enSuelo) this.protagonista.setScale(this.protagonista.scaleX, this.protagonista.scaleY)
    this.protagonista.animarMovimiento(this.cuerpo.x >= antes ? 'derecha' : 'izquierda', Math.abs(this.cuerpo.x - antes), segundos, this.time.now)
    void forma

    this.cosas.forEach((cosa, indice) => {
      if (cosa.visible && Phaser.Math.Distance.Between(cosa.x, cosa.y, this.cuerpo.x, this.cuerpo.y - 60) < 70) {
        cosa.setVisible(false)
        this.reunidas += 1
        this.marcador.poner(this.reunidas + ' / ' + this.cosas.length)
        this.marcador.resaltar()
        this.protagonista.mostrarEstado('feliz')
        void indice
      }
    })
    // Las pruebas y el revisor leen aquí qué pasa.
    window.__plataformas = { x: Math.round(this.cuerpo.x), y: Math.round(this.cuerpo.y), enSuelo: this.cuerpo.enSuelo,
      reunidas: this.reunidas, controles: this.controles.estado() }
  }
}
