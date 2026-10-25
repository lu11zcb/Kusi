// La familia laberinto tiene su propia escena y reutiliza la carga compartida.
import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { ajustarATamano } from '../dibujos/dibujos.js'
import { CuyAnimado } from '../dibujos/cuyAnimado.js'
import { ZorroAnimado } from '../dibujos/zorroAnimado.js'
import { crearBoton, dibujarGlobo } from '../interfaz/piezas.js'
import { avisos } from '../logica/avisos.js'
import { avisarPartida, crearPartidaLaberinto } from '../logica/partidaLaberinto.js'
import { crearRegla, comerEnCasilla } from '../logica/reglasLaberinto.js'
import { decir } from '../logica/voz.js'
import {
  crearMovimiento, pedirDireccion, avanzarMovimiento, direccionDelDeslizamiento,
} from '../logica/movimientoLaberinto.js'

// Velocidad en casillas por segundo, independiente del tamaño del dibujo.
export const CASILLAS_POR_SEGUNDO = 3

// La barra y el espacio de Kusi se reservan antes de medir el mapa. Incluso
// los niveles más grandes quedan completos dentro de la pantalla 1280 × 720.
const ZONA_MAPA = { x: 302, y: 168, ancho: 940, alto: 478 }
const VISTAS = { arriba: 'espaldas', abajo: 'frente', izquierda: 'izquierda', derecha: 'derecha' }

export class EscenaLaberinto extends Phaser.Scene {
  constructor() {
    super('laberinto')
  }

  init({ paquete, cuyAnimado, zorroAnimado, partida, indiceNivel = 0, iniciada = false }) {
    this.paquete = paquete
    this.datosCuyAnimado = cuyAnimado
    this.datosZorroAnimado = zorroAnimado
    this.partida = partida
    this.indiceNivel = indiceNivel
    this.reto = paquete.retos[this.indiceNivel]
    this.indiceAyuda = 0
    this.movimiento = crearMovimiento(this.reto.mapa)
    this.regla = crearRegla(this.reto)
    this.multiplicador = new URLSearchParams(window.location.search).get('rapido') === '1' ? 4 : 1
    this.iniciada = iniciada
    this.terminada = false
    this.cambiandoNivel = false
    this.mensajeCierre = ''
    this.iniciosDeslizamiento = new Map()
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.crema)
    document.title = 'Kusi · Laberinto'
    this.calcularCuadricula()
    this.crearBarra()
    this.crearMapa()
    this.crearGuia()
    this.crearPersonajes()
    this.crearControles()
    this.exponerParaPruebas()
    if (this.indiceNivel === 0) avisarPartida(this.partida, 'listo', { familia: 'laberinto', nivel: 1 })
    this.events.once('shutdown', () => {
      this.input.keyboard.off('keydown', this.alPulsarFlecha)
      this.input.off('pointerdown', this.alIniciarDeslizamiento)
      this.input.off('pointerup', this.alTerminarDeslizamiento)
      this.input.off('pointerupoutside', this.alTerminarDeslizamiento)
      this.iniciosDeslizamiento.clear()
      if (window.kusi?.estado === this.leerEstado) delete window.kusi
    })
  }

  calcularCuadricula() {
    const filas = this.reto.mapa.length
    const columnas = this.reto.mapa[0].length
    this.casilla = Math.floor(Math.min(ZONA_MAPA.ancho / columnas, ZONA_MAPA.alto / filas))
    this.origenMapa = {
      x: ZONA_MAPA.x + (ZONA_MAPA.ancho - columnas * this.casilla) / 2,
      y: ZONA_MAPA.y + (ZONA_MAPA.alto - filas * this.casilla) / 2,
    }
  }

  centroCasilla(fila, columna) {
    return {
      x: this.origenMapa.x + (columna + 0.5) * this.casilla,
      y: this.origenMapa.y + (fila + 0.5) * this.casilla,
    }
  }

  crearBarra() {
    this.casilleros = []
    this.add.rectangle(ANCHO / 2, 76, ANCHO - 40, 112, NUMERO.papel)
      .setRounded(24).setStrokeStyle(3, 0xd8b990).setDepth(1000)
    this.add.text(48, 38, this.reto.regla.tipo === 'orden' ? 'Sigue el orden' : 'Busca frutas',
      estiloTexto(32)).setDepth(1001)
    this.add.text(48, 82, 'Nivel ' + (this.indiceNivel + 1) + ' de ' + this.paquete.retos.length,
      estiloTexto(23, COLOR.tintaSuave)).setDepth(1001)

    const regla = this.reto.regla
    if (regla.tipo === 'orden') {
      const espacio = Math.min(110, 600 / regla.secuencia.length)
      const lado = Math.min(78, espacio - 10)
      regla.secuencia.forEach((tipo, indice) => {
        const x = 346 + indice * espacio
        const fondo = this.add.rectangle(x, 74, lado, lado, indice === 0 ? 0xffe0a3 : 0xf6ebd8)
          .setRounded(16).setStrokeStyle(indice === 0 ? 4 : 2, indice === 0 ? 0xb4611f : 0xd8b990)
          .setDepth(1001)
        ajustarATamano(this.add.image(x, 73, tipo), lado - 10, lado - 10).setDepth(1002)
        this.casilleros.push({ fondo, marca: this.crearMarca(x + lado * 0.34, 74 + lado * 0.34) })
      })
    } else {
      ajustarATamano(this.add.image(344, 74, 'clase-' + regla.clase), 78, 78).setDepth(1002)
      const espacio = Math.min(70, 480 / regla.meta)
      for (let indice = 0; indice < regla.meta; indice += 1) {
        const x = 432 + indice * espacio
        const fondo = this.add.rectangle(x, 75, espacio - 12, 58, 0xf6ebd8)
          .setRounded(12).setStrokeStyle(3, 0xb99a70).setDepth(1001)
        this.casilleros.push({ fondo, marca: this.crearMarca(x, 75) })
      }
    }

    this.botones = {
      sonido: crearBoton(this, 1030, 72, {
        ancho: 138, alto: 72, texto: 'Escuchar', tamano: 27,
        alTocar: () => {
          if (!this.esDeslizamiento(this.input.activePointer)) decir(this.textoGlobo.text)
        },
      }).setDepth(1003),
      ayuda: crearBoton(this, 1184, 72, {
        ancho: 118, alto: 72, texto: 'Ayuda', tamano: 28,
        alTocar: () => {
          if (!this.esDeslizamiento(this.input.activePointer)) this.mostrarAyuda()
        },
      }).setDepth(1003),
    }
  }

  crearMarca(x, y) {
    const marca = this.add.graphics().setPosition(x, y).setDepth(1004).setVisible(false)
    marca.fillStyle(0x326b39).fillCircle(0, 0, 13)
    marca.lineStyle(4, 0xffffff).beginPath().moveTo(-7, 0).lineTo(-2, 5).lineTo(7, -6).strokePath()
    return marca
  }

  actualizarBarra() {
    this.casilleros.forEach(({ fondo, marca }, indice) => {
      const recogido = indice < this.regla.recogidos
      const siguiente = !this.regla.completada && indice === this.regla.recogidos
      fondo.setFillStyle(recogido ? 0xdceac4 : siguiente ? 0xffe0a3 : 0xf6ebd8)
        .setStrokeStyle(siguiente ? 4 : 2, siguiente ? 0xb4611f : 0xb99a70)
      marca.setVisible(recogido)
    })
  }

  crearMapa() {
    const { mapa } = this.reto
    const ancho = mapa[0].length * this.casilla
    const alto = mapa.length * this.casilla
    this.add.tileSprite(this.origenMapa.x - 16, this.origenMapa.y - 16,
      ancho + 32, alto + 32, 'pasto').setOrigin(0).setDepth(0)
    mapa.forEach((filaTexto, fila) => {
      for (let columna = 0; columna < filaTexto.length; columna += 1) {
        const simbolo = filaTexto[columna]
        const punto = this.centroCasilla(fila, columna)
        this.add.image(punto.x, punto.y, simbolo === '#' ? 'muro-adobe' : 'camino-tierra')
          .setDisplaySize(this.casilla, this.casilla).setDepth(1)
        if (simbolo === 'P') {
          this.puerta = this.add.image(punto.x, punto.y, 'puerta-cerrada')
            .setDisplaySize(this.casilla, this.casilla).setDepth(2)
        }
        if (simbolo === 'C') this.inicio = { fila, columna }
      }
    })
    this.dibujosObjetos = this.reto.objetos.map((objeto) => {
      const punto = this.centroCasilla(objeto.fila, objeto.columna)
      return ajustarATamano(this.add.image(punto.x, punto.y, objeto.tipo),
        this.casilla * 0.78, this.casilla * 0.78).setDepth(3)
    })
    this.add.text(ZONA_MAPA.x + ZONA_MAPA.ancho / 2, 675,
      'Desliza para caminar · También puedes usar las flechas', estiloTexto(24, COLOR.tinta))
      .setOrigin(0.5)
  }

  crearGuia() {
    this.add.text(142, 179, '¡Vamos, cuy!', estiloTexto(32)).setOrigin(0.5)
    const globo = dibujarGlobo(this.add.graphics(), 236, 250)
    globo.setPosition(142, 355)
    this.textoGlobo = this.add.text(142, 355, this.reto.consigna,
      estiloTexto(25, COLOR.tinta, { wordWrap: { width: 204 }, lineSpacing: 3 })).setOrigin(0.5)
    this.add.ellipse(142, 675, 132, 16, 0x4b211b, 0.12)
    this.dibujoKusi = ajustarATamano(this.add.image(142, 674, 'kusi-frente').setOrigin(0.5, 1), 164, 180)
  }

  mostrarAyuda(numero = null) {
    const indice = numero === null ? Math.min(this.indiceAyuda, this.reto.ayudas.length - 1) : numero - 1
    this.textoGlobo.setText(this.reto.ayudas[indice])
    this.indiceAyuda += 1
    avisarPartida(this.partida, 'ayuda', { nivel: this.indiceNivel + 1, ayuda: indice + 1 })
    decir(this.textoGlobo.text)
  }

  crearPersonajes() {
    const punto = this.centroCasilla(this.inicio.fila, this.inicio.columna)
    this.sombraCuy = this.add.ellipse(punto.x, punto.y + this.casilla * 0.3,
      this.casilla * 0.76, this.casilla * 0.18, 0x4b211b, 0.15).setDepth(4)
    // La escala se calcula desde la línea de apoyo del manifiesto. Conserva su
    // anclaje original y deja al cuy de unas 1,2 casillas de alto a cualquier tamaño.
    this.cuy = new CuyAnimado(this, this.datosCuyAnimado)
      .setScale(this.casilla * 1.2 / this.datosCuyAnimado.anclaje.y)
      .setPosition(punto.x, punto.y + this.casilla * 0.4).setDepth(5)
    this.zorros = this.reto.enemigos.map((enemigo) => {
      const posicion = this.centroCasilla(enemigo.fila, enemigo.columna)
      return new ZorroAnimado(this, this.datosZorroAnimado)
        .setScale(this.casilla * 1.2 * 1.3 / this.datosZorroAnimado.anclaje.y)
        .setPosition(posicion.x, posicion.y + this.casilla * 0.4).setDepth(5)
    })
  }

  // Una pulsación elige el rumbo y no exige sostener la tecla. Ignorar la
  // repetición del sistema evita que una tecla sostenida borre un giro guardado.
  crearControles() {
    const direcciones = {
      ArrowUp: 'arriba', ArrowDown: 'abajo', ArrowLeft: 'izquierda', ArrowRight: 'derecha',
    }
    this.input.keyboard.addCapture(Object.keys(direcciones))
    this.alPulsarFlecha = (evento) => {
      const direccion = direcciones[evento.key]
      if (!direccion || evento.repeat) return
      evento.preventDefault()
      this.elegirRumbo(direccion)
    }
    this.input.keyboard.on('keydown', this.alPulsarFlecha)

    // Cada dedo conserva su propio origen. El umbral se mide en píxeles de la
    // pantalla, para que 30 px sigan siendo 30 al reducir el lienzo en un móvil.
    this.alIniciarDeslizamiento = (puntero) => {
      this.iniciosDeslizamiento.set(puntero.id, this.puntoEnPantalla(puntero))
    }
    this.alTerminarDeslizamiento = (puntero) => {
      const direccion = this.esDeslizamiento(puntero)
      this.iniciosDeslizamiento.delete(puntero.id)
      if (direccion) this.elegirRumbo(direccion)
    }
    this.input.on('pointerdown', this.alIniciarDeslizamiento)
    this.input.on('pointerup', this.alTerminarDeslizamiento)
    this.input.on('pointerupoutside', this.alTerminarDeslizamiento)
  }

  puntoEnPantalla(puntero) {
    const lienzo = this.game.canvas.getBoundingClientRect()
    return { x: puntero.x * lienzo.width / ANCHO, y: puntero.y * lienzo.height / ALTO }
  }

  esDeslizamiento(puntero) {
    const inicio = this.iniciosDeslizamiento.get(puntero.id)
    return inicio ? direccionDelDeslizamiento(inicio, this.puntoEnPantalla(puntero)) : null
  }

  elegirRumbo(direccion) {
    if (this.terminada || this.cambiandoNivel) return
    pedirDireccion(this.movimiento, direccion)
    if (!this.iniciada) {
      this.iniciada = true
      avisarPartida(this.partida, 'inicio', { nivel: this.indiceNivel + 1 })
    }
  }

  procesarCasilla({ fila, columna }) {
    const resultado = comerEnCasilla(this.regla, this.reto.regla, fila, columna)
    if (resultado) {
      avisarPartida(this.partida, 'accion', {
        nivel: this.indiceNivel + 1, objeto: resultado.objeto, correcto: resultado.correcto,
      })
      const dibujo = this.dibujosObjetos[resultado.indice]
      if (resultado.correcto) {
        this.tweens.killTweensOf(dibujo)
        dibujo.setVisible(false)
        this.actualizarBarra()
        this.cuy.mostrarEstado('feliz', 'frente')
        if (this.regla.completada) this.puerta.setTexture('puerta-abierta')
      } else {
        // Solo rebota la fruta. El cuy conserva su posición, velocidad y giro
        // guardado; cruzar otra vez esta casilla permite intentar de nuevo.
        const objeto = this.regla.objetos[resultado.indice]
        const base = this.centroCasilla(objeto.fila, objeto.columna)
        this.tweens.killTweensOf(dibujo)
        dibujo.setPosition(base.x, base.y)
        this.tweens.add({ targets: dibujo, y: base.y - this.casilla * 0.2,
          duration: 110, yoyo: true, ease: 'Sine.easeOut' })
        this.mostrarAyuda(resultado.ayuda)
      }
    }
    if (this.reto.mapa[fila][columna] === 'P' && this.regla.completada) {
      this.completarNivel()
      return false
    }
    return true
  }

  datosParaNivel(indiceNivel, partida = this.partida) {
    return {
      paquete: this.paquete, cuyAnimado: this.datosCuyAnimado, zorroAnimado: this.datosZorroAnimado,
      partida, indiceNivel, iniciada: partida === this.partida && this.iniciada,
    }
  }

  completarNivel() {
    if (this.cambiandoNivel || this.terminada) return
    avisarPartida(this.partida, 'reto_completado', { nivel: this.indiceNivel + 1 })
    if (this.indiceNivel + 1 < this.paquete.retos.length) {
      this.cambiandoNivel = true
      this.scene.restart(this.datosParaNivel(this.indiceNivel + 1))
    } else {
      this.terminada = true
      this.mensajeCierre = this.paquete.cierre?.mensaje ?? '¡Lo lograste! Gracias por ayudar a Kusi.'
      avisarPartida(this.partida, 'fin', { niveles: this.paquete.retos.length })
      this.mostrarCierre()
    }
  }

  mostrarCierre() {
    this.add.rectangle(ANCHO / 2, ALTO / 2, ANCHO, ALTO, NUMERO.crema, 0.97).setDepth(2000)
    ajustarATamano(this.add.image(ANCHO / 2, 300, 'kusi-frente').setOrigin(0.5, 1), 180, 204).setDepth(2001)
    this.add.text(ANCHO / 2, 386, this.mensajeCierre, estiloTexto(40, COLOR.tinta, {
      wordWrap: { width: 820 }, lineSpacing: 8,
    })).setOrigin(0.5).setDepth(2001)
    this.botones.repetir = crearBoton(this, ANCHO / 2, 554, {
      ancho: 320, alto: 82, texto: 'Jugar otra vez', tamano: 32,
      alTocar: () => this.scene.restart(this.datosParaNivel(0, crearPartidaLaberinto())),
    }).setDepth(2002)
  }

  posicionMovimiento() {
    const { fila, columna, progreso, direccion } = this.movimiento
    const avanceFila = direccion === 'arriba' ? -progreso : direccion === 'abajo' ? progreso : 0
    const avanceColumna = direccion === 'izquierda' ? -progreso : direccion === 'derecha' ? progreso : 0
    return this.centroCasilla(fila + avanceFila, columna + avanceColumna)
  }

  update(tiempo, delta) {
    if (!this.cuy || delta <= 0) return
    // Una pestaña que vuelve de segundo plano no debe teletransportar al niño.
    // La lógica pura sí consume deltas completos; la escena limita la pausa visual.
    const segundos = Math.min(delta, 100) / 1000
    const anterior = this.posicionMovimiento()
    if (!this.terminada && !this.cambiandoNivel) {
      avanzarMovimiento(this.movimiento, this.reto.mapa, segundos, CASILLAS_POR_SEGUNDO * this.multiplicador,
        (casilla) => this.procesarCasilla(casilla))
    }
    const punto = this.posicionMovimiento()
    this.cuy.setPosition(punto.x, punto.y + this.casilla * 0.4)
    this.sombraCuy.setPosition(punto.x, punto.y + this.casilla * 0.3)
    const distancia = this.movimiento.moviendose ? Math.hypot(punto.x - anterior.x, punto.y - anterior.y) : 0
    this.cuy.animarMovimiento(VISTAS[this.movimiento.direccion], distancia, segundos, tiempo)
  }

  exponerParaPruebas() {
    // Solo lectura, igual que en el mercado. Las pruebas realizan las acciones
    // con teclado y puntero reales; no existe un atajo para mover al personaje.
    this.leerEstado = () => ({
      familia: 'laberinto', nivel: this.indiceNivel + 1, mapa: this.reto.mapa.map((fila) => fila),
      casilla: this.casilla, origenMapa: { ...this.origenMapa },
      inicio: { ...this.inicio }, consigna: this.textoGlobo.text,
      movimiento: { ...this.movimiento }, velocidad: CASILLAS_POR_SEGUNDO * this.multiplicador,
      regla: { ...this.regla, objetos: this.regla.objetos.map((objeto) => ({ ...objeto })) },
      puertaAbierta: this.regla.completada, terminada: this.terminada, mensajeCierre: this.mensajeCierre,
      cuyX: this.cuy.x, cuyY: this.cuy.y,
      animacionCuy: {
        clave: this.cuy.anims.currentAnim?.key, fotograma: this.cuy.frame.name,
        estado: this.cuy.estadoMovimiento, flipX: this.cuy.flipX,
      },
    })
    window.kusi = {
      listo: true, avisos, estado: this.leerEstado,
      ubicar: (nombre) => {
        const boton = this.botones[nombre]
        if (!boton) return null
        const lienzo = this.game.canvas.getBoundingClientRect()
        return { x: lienzo.left + boton.x * lienzo.width / ANCHO, y: lienzo.top + boton.y * lienzo.height / ALTO }
      },
    }
  }
}
