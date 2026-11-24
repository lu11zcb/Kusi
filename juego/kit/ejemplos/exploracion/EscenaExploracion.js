// El modelo de un juego de exploración vista desde arriba: el niño recorre con el joystick un lugar más
// grande que la pantalla, esquiva obstáculos y a un adversario amable, y reúne lo que hay repartido por
// el mundo. Es una escena mínima que sirve de guía al programador (y de prueba del kit): usa SOLO el kit
// —los controles, la interfaz común y la lógica de exploración— y nada de botones de «ir a…».
//
// Un juego de verdad cambia los dibujos (el suelo, los obstáculos, lo que se reúne y el adversario, todos
// del mundo de su aventura) y las reglas (qué se reúne y por qué, los niveles), pero se maneja igual.
//
//   crearControles → leer() cada cuadro → moverConColisiones → mover al protagonista
//   crearAdversario → avanzarAdversario → si capturo: el protagonista vuelve al inicio, sin perder nada

import * as Phaser from 'phaser'
import { COLOR, NUMERO } from '../../reproductor/medidas.js'
import { crearProtagonista, ALTURA_PROTAGONISTA } from '../../reproductor/dibujos/protagonista.js'
import { crearControles } from '../../reproductor/interfaz/controles.js'
import { crearHud } from '../../reproductor/interfaz/hud.js'
import { crearTutorial } from '../../reproductor/interfaz/tutorial.js'
import { moverConColisiones, crearAdversario, avanzarAdversario } from '../../reproductor/logica/exploracion.js'
import { repartirYColocar, darVida, ambiente, sombraBajo, ordenarPorY } from '../../reproductor/efectos/mundoVivo.js'
import { cantidadParaDensidad } from '../../reproductor/logica/decorado.js'
import { vistaDelMovimiento } from '../../reproductor/logica/controles.js'

const MUNDO = { ancho: 2000, alto: 1200 }
const VELOCIDAD = 360
const INICIO = { x: 200, y: 600 }
// Piedras, casas o muros: no se atraviesan (rectángulos).
export const OBSTACULOS = [
  { x: 520, y: 200, ancho: 80, alto: 520 }, { x: 520, y: 880, ancho: 80, alto: 320 },
  { x: 1000, y: 0, ancho: 80, alto: 460 }, { x: 1000, y: 700, ancho: 80, alto: 500 },
  { x: 1440, y: 300, ancho: 300, alto: 80 },
]
const COSAS = [{ x: 760, y: 260 }, { x: 760, y: 960 }, { x: 1260, y: 600 }, { x: 1700, y: 160 }, { x: 1800, y: 1000 }]
// Los límites de la pantalla de juego: arriba y abajo hay interfaz (reglas.md, 13.17).
const LIMITES = { izquierda: 0, derecha: MUNDO.ancho, arriba: 0, abajo: MUNDO.alto }

export class EscenaExploracion extends Phaser.Scene {
  constructor() { super('exploracion-ejemplo') }

  init(datos) { this.datos = { ...datos, partida: datos?.partida ?? {} } }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.arena)
    this.cameras.main.setBounds(0, 0, MUNDO.ancho, MUNDO.alto)

    // El suelo no es un color liso: bandas suaves y manchas, para que se vea trabajado. Un juego de verdad usa
    // las imágenes del suelo de su mundo, repetidas por todo el lugar.
    for (let y = 0; y < MUNDO.alto; y += 160) this.add.rectangle(MUNDO.ancho / 2, y + 80, MUNDO.ancho, 160, (y / 160) % 2 ? 0xf6dcae : 0xf9e4be).setDepth(0)

    // Decorado lleno (reglas.md, 13.13): matas, piedras y flores repartidas por todo el lugar, sin pisar los caminos
    // ni las cosas que se tocan, y a la profundidad de su altura (se pasa detrás o delante de ellas).
    this.crearDibujosDeEjemplo()
    this.decorado = repartirYColocar(this, {
      area: { x: 0, y: 0, ancho: MUNDO.ancho, alto: MUNDO.alto }, cantidad: cantidadParaDensidad({ ancho: MUNDO.ancho, alto: MUNDO.alto }, 14),
      claves: ['ejemplo-mata', 'ejemplo-flor', 'ejemplo-piedra'], evitar: [...OBSTACULOS, ...COSAS.map((c) => ({ x: c.x - 60, y: c.y - 60, ancho: 120, alto: 120 })), { x: INICIO.x - 100, y: INICIO.y - 100, ancho: 200, alto: 200 }],
      semilla: 11,
    })
    // Cosas que flotan por el mundo todo el tiempo.
    this.ambiente = ambiente(this, { area: { x: 0, y: 0, ancho: MUNDO.ancho, alto: MUNDO.alto }, color: 0xfff2a8, cantidad: 22, velocidad: 18, direccion: { x: 1, y: -0.4 }, alfa: 0.9 })

    for (const o of OBSTACULOS) {
      this.add.rectangle(o.x + o.ancho / 2, o.y + o.alto / 2, o.ancho, o.alto, NUMERO.terracota).setStrokeStyle(5, NUMERO.tinta).setRounded?.(18).setDepth(5)
    }
    this.cosas = COSAS.map((c) => {
      const cosa = this.add.circle(c.x, c.y, 22, NUMERO.naranja).setStrokeStyle(4, NUMERO.tinta).setDepth(6)
      // Lo que se reúne no está quieto: flota (reglas.md, 13.12).
      darVida(this, cosa, 'flotar')
      return cosa
    })
    this.reunidas = 0
    this.capturas = 0

    // El adversario: aquí un círculo rojo con ojos; en un juego de verdad, una figura dibujada del mundo.
    this.adversario = crearAdversario({ x: 400, y: 600, patrulla: [{ x: 400, y: 600 }, { x: 400, y: 380 }, { x: 400, y: 820 }] })
    this.dibujoAdversario = this.add.container(this.adversario.x, this.adversario.y, [
      this.add.circle(0, 0, 30, NUMERO.rojo).setStrokeStyle(4, NUMERO.tinta),
      this.add.circle(-10, -6, 5, NUMERO.tinta), this.add.circle(10, -6, 5, NUMERO.tinta),
    ]).setDepth(9)

    this.protagonista = crearProtagonista(this, { alto: 100 * ALTURA_PROTAGONISTA })
    this.posicion = { ...INICIO }
    this.protagonista.setPosition(this.posicion.x, this.posicion.y)
    ordenarPorY(this.protagonista)
    sombraBajo(this, this.protagonista, { ancho: 80, alto: 24 })
    this.cameras.main.startFollow(this.protagonista, true, 0.12, 0.12)

    this.controles = crearControles(this)
    const explicarReto = () => this.hud.decir('Junta todo y cuídate del rojo.')
    this.hud = crearHud(this, { alEscuchar: explicarReto })
    this.marcador = this.hud.indicador({ texto: '0 / ' + this.cosas.length })
    const centroDelJoystick = () => this.controles.estado().joystick
    this.tutorial = crearTutorial(this, this.hud, {
      pasos: [{
        frase: 'Mueve el joystick para caminar.',
        gesto: 'joystick',
        objetivo: centroDelJoystick,
        hacia: () => {
          const { x, y } = centroDelJoystick()
          return { x: x + 60, y }
        },
        // Cuenta un desplazamiento real, también con las flechas, para que el
        // niño pueda empezar a jugar con cualquiera de los controles del kit.
        hecho: () => Phaser.Math.Distance.Between(this.posicion.x, this.posicion.y, INICIO.x, INICIO.y) >= 24,
      }],
      alTerminar: explicarReto,
    })
  }

  // Dibujos de ejemplo hechos con formas (en un juego de verdad, son las piezas dibujadas del mundo).
  crearDibujosDeEjemplo() {
    const hacer = (clave, dibujar, ancho, alto) => {
      if (this.textures.exists(clave)) return
      const g = this.make.graphics({ x: 0, y: 0, add: false })
      dibujar(g)
      g.generateTexture(clave, ancho, alto)
      g.destroy()
    }
    hacer('ejemplo-mata', (g) => { g.fillStyle(NUMERO.verde, 1); g.fillCircle(24, 36, 20); g.fillCircle(46, 40, 16); g.lineStyle(4, NUMERO.tinta, 1); g.strokeCircle(24, 36, 20); g.strokeCircle(46, 40, 16) }, 72, 64)
    hacer('ejemplo-flor', (g) => { g.fillStyle(0xe8618c, 1); g.fillCircle(20, 20, 14); g.fillStyle(0xffd34a, 1); g.fillCircle(20, 20, 6); g.lineStyle(3, NUMERO.tinta, 1); g.strokeCircle(20, 20, 14) }, 40, 40)
    hacer('ejemplo-piedra', (g) => { g.fillStyle(0xb9a58d, 1); g.fillEllipse(34, 26, 56, 36); g.lineStyle(4, NUMERO.tinta, 1); g.strokeEllipse(34, 26, 56, 36) }, 68, 52)
  }

  update(_tiempo, delta) {
    const segundos = delta / 1000
    this.cuadros = (this.cuadros ?? 0) + 1
    const vector = this.controles.leer()
    const antes = { ...this.posicion }
    this.posicion = moverConColisiones(this.posicion, vector, VELOCIDAD, segundos, { limites: LIMITES, obstaculos: OBSTACULOS, radio: 30 })
    this.protagonista.setPosition(this.posicion.x, this.posicion.y)
    ordenarPorY(this.protagonista) // pasa delante o detrás de lo que tiene alrededor
    const dx = this.posicion.x - antes.x
    const dy = this.posicion.y - antes.y
    // Las vistas del molde son frente, espaldas, derecha e izquierda (no «arriba» ni «abajo»).
    this.vista = vistaDelMovimiento(dx, dy, this.vista)
    this.protagonista.animarMovimiento(this.vista, Math.hypot(dx, dy), segundos, this.time.now)

    this.tutorial.actualizar(segundos)
    // El niño puede ensayar con calma antes de que el adversario patrulle.
    if (this.tutorial.terminado) {
      avanzarAdversario(this.adversario, this.posicion, segundos, { velocidadProtagonista: VELOCIDAD, obstaculos: OBSTACULOS, limites: LIMITES })
      this.dibujoAdversario.setPosition(this.adversario.x, this.adversario.y)
      this.dibujoAdversario.setScale(this.adversario.mira, this.adversario.estado === 'descansa' ? 0.85 : 1)
      if (this.adversario.alerto) this.hud.decir('¡Cuidado, viene el rojo!', { esperar: true })
      if (this.adversario.capturo) this.alCapturar()
    }

    for (const cosa of this.cosas) {
      if (cosa.visible && Phaser.Math.Distance.Between(cosa.x, cosa.y, this.posicion.x, this.posicion.y - 40) < 60) {
        cosa.setVisible(false)
        this.reunidas += 1
        this.marcador.poner(this.reunidas + ' / ' + this.cosas.length)
        this.marcador.resaltar()
        this.protagonista.mostrarEstado('feliz')
      }
    }
    // Las pruebas y el revisor leen aquí qué pasa.
    window.__exploracion = { x: Math.round(this.posicion.x), y: Math.round(this.posicion.y), reunidas: this.reunidas, capturas: this.capturas, cuadros: this.cuadros, vector,
      adversario: { estado: this.adversario.estado, x: Math.round(this.adversario.x), y: Math.round(this.adversario.y) },
      cosas: this.cosas.map((c) => ({ x: c.x, y: c.y, visible: c.visible })), controles: this.controles.estado() }
  }

  // Sin castigo: el protagonista vuelve al inicio con todo lo que ya reunió, y Kusi da ánimo.
  alCapturar() {
    this.capturas += 1
    this.posicion = { ...INICIO }
    this.protagonista.mostrarEstado('asustado')
    this.hud.decir('¡Casi! Vuelve a intentarlo, ya llevas ' + this.reunidas + '.')
  }
}
