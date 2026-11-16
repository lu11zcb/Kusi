// El modelo de un juego con varios lugares: el niño viaja de un lugar a otro MANEJANDO UN VEHÍCULO del mundo
// (aquí un barco flotante) con el joystick, llega a un puerto, se detiene en él para bajar, explora la isla
// a pie (un lugar grande, no una plataforma) y vuelve al vehículo para seguir. Usa SOLO el kit —controles,
// interfaz común, lógica de exploración y de vehículo— y nada de botones de «ir a…» ni de saltar entre islas.
//
// Un juego de verdad cambia los dibujos (el vehículo, las islas, el mar o el cielo, los árboles y lo que se
// busca, todos del mundo de su aventura) y las reglas (qué se busca en cada lugar y por qué), pero se maneja igual:
//
//   en el vehículo   joystick → avanzarVehiculo; detenerse en el puerto → bajar
//   a pie            joystick → moverConColisiones por la isla; detenerse en la zona del vehículo → subir

import * as Phaser from 'phaser'
import { NUMERO } from '../../reproductor/medidas.js'
import { crearProtagonista, ALTURA_PROTAGONISTA } from '../../reproductor/dibujos/protagonista.js'
import { crearControles } from '../../reproductor/interfaz/controles.js'
import { crearHud } from '../../reproductor/interfaz/hud.js'
import { moverConColisiones } from '../../reproductor/logica/exploracion.js'
import { crearVehiculo, avanzarVehiculo, avanzarParada, enZona } from '../../reproductor/logica/vehiculo.js'
import { vistaDelMovimiento } from '../../reproductor/logica/controles.js'
import { ambiente, darVida, sombraBajo, ordenarPorY } from '../../reproductor/efectos/mundoVivo.js'

const MUNDO = { ancho: 2600, alto: 1500 }
const VELOCIDAD_A_PIE = 340
// Las islas son lugares grandes: el vehículo no las atraviesa y a pie se explora dentro de ellas.
export const ISLAS = [
  { id: 'a', x: 1000, y: 300, ancho: 700, alto: 700,
    puerto: { x: 700, y: 520, ancho: 240, alto: 180 }, // en el agua, a la izquierda de la isla (donde se detiene el vehículo)
    bajada: { x: 1060, y: 600 }, // dónde aparece el niño al bajar
    zonaVehiculo: { x: 1000, y: 560, ancho: 140, alto: 140 }, // a pie: detenerse aquí para volver a subir
    arboles: [{ x: 1250, y: 420, ancho: 70, alto: 70 }, { x: 1450, y: 760, ancho: 70, alto: 70 }, { x: 1300, y: 640, ancho: 90, alto: 50 }],
    cosas: [{ x: 1420, y: 470 }, { x: 1560, y: 830 }] },
  { id: 'b', x: 1900, y: 780, ancho: 600, alto: 560,
    puerto: { x: 1960, y: 500, ancho: 240, alto: 180 },
    bajada: { x: 2100, y: 830 },
    zonaVehiculo: { x: 2040, y: 790, ancho: 140, alto: 120 },
    arboles: [{ x: 2150, y: 1050, ancho: 80, alto: 80 }],
    cosas: [{ x: 2300, y: 1150 }] },
]
const ROCAS = [{ x: 600, y: 1000, ancho: 160, alto: 160 }]
const INICIO_VEHICULO = { x: 300, y: 610, angulo: 0 }

export class EscenaViaje extends Phaser.Scene {
  constructor() { super('viaje-ejemplo') }

  init(datos) { this.datos = datos }

  create() {
    this.cameras.main.setBackgroundColor('#bfe6ff') // el cielo (el color lo pone el mundo del juego)
    this.cameras.main.setBounds(0, 0, MUNDO.ancho, MUNDO.alto)

    // El cielo no está vacío: nubes que pasan todo el tiempo y chispas de luz (reglas.md, 13.22).
    this.nubes = ambiente(this, { area: { x: 0, y: 0, ancho: MUNDO.ancho, alto: MUNDO.alto }, color: 0xffffff, cantidad: 14, velocidad: 14, direccion: { x: 1, y: 0 }, escala: [3, 6], alfa: 0.55, profundidad: 2 })
    for (const isla of ISLAS) {
      this.add.rectangle(isla.x + isla.ancho / 2, isla.y + isla.alto / 2, isla.ancho, isla.alto, NUMERO.crema).setStrokeStyle(8, NUMERO.tinta).setRounded?.(60)
      for (const a of isla.arboles) this.add.rectangle(a.x + a.ancho / 2, a.y + a.alto / 2, a.ancho, a.alto, NUMERO.verde).setStrokeStyle(4, NUMERO.tinta).setRounded?.(24)
      this.add.rectangle(isla.puerto.x + isla.puerto.ancho / 2, isla.puerto.y + isla.puerto.alto / 2, isla.puerto.ancho, isla.puerto.alto, NUMERO.naranja, 0.35).setStrokeStyle(5, NUMERO.naranja)
      isla.dibujosCosas = isla.cosas.map((c) => this.add.circle(c.x, c.y, 22, NUMERO.naranja).setStrokeStyle(4, NUMERO.tinta))
      isla.pendientes = isla.cosas.length
    }
    for (const r of ROCAS) this.add.rectangle(r.x + r.ancho / 2, r.y + r.alto / 2, r.ancho, r.alto, NUMERO.terracota).setStrokeStyle(5, NUMERO.tinta).setRounded?.(40)

    // El vehículo (un barco hecho de formas; en un juego real, una figura entera dibujada) y el protagonista.
    this.vehiculo = crearVehiculo(INICIO_VEHICULO)
    this.dibujoVehiculo = this.add.container(this.vehiculo.x, this.vehiculo.y, [
      this.add.rectangle(0, 0, 150, 56, NUMERO.terracota).setStrokeStyle(5, NUMERO.tinta).setRounded?.(22),
      this.add.triangle(0, -50, 0, -40, 40, 30, -40, 30, NUMERO.crema).setStrokeStyle(4, NUMERO.tinta),
    ]).setDepth(8)
    this.protagonista = crearProtagonista(this, { alto: 90 * ALTURA_PROTAGONISTA }).setDepth(10)
    this.modo = 'vehiculo'
    this.isla = null
    this.posicion = { x: this.vehiculo.x, y: this.vehiculo.y }
    this.parada = {}
    this.reunidas = 0
    this.total = ISLAS.reduce((suma, isla) => suma + isla.cosas.length, 0)
    this.objetivo = this.add.zone(this.posicion.x, this.posicion.y, 10, 10)
    this.cameras.main.startFollow(this.objetivo, true, 0.1, 0.1)

    this.controles = crearControles(this)
    this.hud = crearHud(this, { alEscuchar: () => this.hud.decir('Maneja el barco hasta un puerto y detente para bajar.') })
    this.marcador = this.hud.indicador({ texto: '0 / ' + this.total })
    this.barra = this.add.rectangle(0, 0, 160, 16, NUMERO.verde).setOrigin(0, 0.5).setScrollFactor(0).setDepth(4001).setVisible(false)
    this.hud.decir('Maneja el barco con el joystick y busca un puerto.')
    this.vista = 'derecha'
  }

  update(_tiempo, delta) {
    const segundos = delta / 1000
    const vector = this.controles.leer()
    if (this.modo === 'vehiculo') this.enVehiculo(vector, segundos)
    else this.aPie(vector, segundos)
    this.objetivo.setPosition(this.posicion.x, this.posicion.y)

    // La barra de «detenerse»: se llena mientras el niño espera en una zona, para que se vea por qué espera.
    const progreso = this.parada.progreso ?? 0
    this.barra.setVisible(progreso > 0).setPosition(this.scale.width / 2 - 80, this.scale.height - 250).setSize(160 * progreso, 16)

    window.__viaje = { modo: this.modo, x: Math.round(this.posicion.x), y: Math.round(this.posicion.y), angulo: Number(this.vehiculo.angulo.toFixed(2)),
      velocidad: Math.round(this.vehiculo.velocidad), isla: this.isla?.id ?? null, reunidas: this.reunidas, progreso,
      islas: ISLAS.map((i) => ({ id: i.id, puerto: i.puerto, bajada: i.bajada, zonaVehiculo: i.zonaVehiculo, cosas: i.cosas })), controles: this.controles.estado() }
  }

  // ---- en el vehículo ----
  enVehiculo(vector, segundos) {
    avanzarVehiculo(this.vehiculo, vector, segundos, { obstaculos: [...ISLAS, ...ROCAS], limites: { izquierda: 0, derecha: MUNDO.ancho, arriba: 0, abajo: MUNDO.alto } })
    this.posicion = { x: this.vehiculo.x, y: this.vehiculo.y }
    this.dibujoVehiculo.setPosition(this.vehiculo.x, this.vehiculo.y).setVisible(true)
    // El barco mira hacia donde va, sin darse la vuelta de cabeza.
    this.dibujoVehiculo.setScale(Math.cos(this.vehiculo.angulo) < -0.1 ? -1 : 1, 1)
    this.dibujoVehiculo.y = this.vehiculo.y + Math.sin(this.time.now / 350) * 4 // se mece sobre el agua
    this.protagonista.setPosition(this.vehiculo.x, this.vehiculo.y - 36)
    this.protagonista.animarMovimiento('frente', 0, segundos, this.time.now)

    const puerto = ISLAS.find((i) => enZona(this.vehiculo, i.puerto))
    avanzarParada(this.parada, { dentro: !!puerto, velocidad: this.vehiculo.velocidad }, segundos)
    if (this.parada.confirmada && puerto) this.bajar(puerto)
  }

  bajar(isla) {
    this.modo = 'pie'
    this.isla = isla
    this.posicion = { ...isla.bajada }
    this.protagonista.setPosition(this.posicion.x, this.posicion.y)
    this.vehiculo.velocidad = 0
    this.parada = {}
    this.hud.decir('¡Llegamos! Explora la isla y busca lo que hay en ella.')
  }

  // ---- a pie ----
  aPie(vector, segundos) {
    const isla = this.isla
    const antes = { ...this.posicion }
    this.posicion = moverConColisiones(this.posicion, vector, VELOCIDAD_A_PIE, segundos, {
      limites: { izquierda: isla.x, derecha: isla.x + isla.ancho, arriba: isla.y, abajo: isla.y + isla.alto }, obstaculos: isla.arboles, radio: 30,
    })
    this.protagonista.setPosition(this.posicion.x, this.posicion.y)
    const dx = this.posicion.x - antes.x
    const dy = this.posicion.y - antes.y
    this.vista = vistaDelMovimiento(dx, dy, this.vista)
    this.protagonista.animarMovimiento(this.vista, Math.hypot(dx, dy), segundos, this.time.now)

    isla.dibujosCosas.forEach((cosa) => {
      if (cosa.visible && Phaser.Math.Distance.Between(cosa.x, cosa.y, this.posicion.x, this.posicion.y - 40) < 60) {
        cosa.setVisible(false)
        isla.pendientes -= 1
        this.reunidas += 1
        this.marcador.poner(this.reunidas + ' / ' + this.total)
        this.marcador.resaltar()
        this.protagonista.mostrarEstado('feliz')
      }
    })
    // Para volver al barco: detenerse en su zona (a pie, quieto y dentro).
    const velocidad = Math.hypot(dx, dy) / Math.max(segundos, 0.001)
    avanzarParada(this.parada, { dentro: enZona(this.posicion, isla.zonaVehiculo), velocidad }, segundos)
    if (this.parada.confirmada) this.subir()
  }

  subir() {
    this.modo = 'vehiculo'
    this.vehiculo.x = this.isla.puerto.x + this.isla.puerto.ancho / 2
    this.vehiculo.y = this.isla.puerto.y + this.isla.puerto.alto / 2
    this.vehiculo.velocidad = 0
    this.posicion = { x: this.vehiculo.x, y: this.vehiculo.y }
    this.parada = {}
    this.hud.decir(this.reunidas >= this.total ? '¡Lo encontramos todo! Gran viaje.' : '¡Al barco! Busca otro puerto.')
    this.isla = null
  }
}

