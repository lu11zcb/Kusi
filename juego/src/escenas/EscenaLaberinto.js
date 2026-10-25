// La familia laberinto tiene su propia escena y reutiliza la carga compartida.
import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { ajustarATamano } from '../dibujos/dibujos.js'
import { CuyAnimado } from '../dibujos/cuyAnimado.js'
import { ZorroAnimado } from '../dibujos/zorroAnimado.js'
import { crearBoton, dibujarGlobo } from '../interfaz/piezas.js'
import { avisos } from '../logica/avisos.js'
import { avisarPartida } from '../logica/partidaLaberinto.js'
import { decir } from '../logica/voz.js'

// La barra y el espacio de Kusi se reservan antes de medir el mapa. Incluso
// los niveles más grandes quedan completos dentro de la pantalla 1280 × 720.
const ZONA_MAPA = { x: 302, y: 168, ancho: 940, alto: 478 }
const VISTAS = { arriba: 'espaldas', abajo: 'frente', izquierda: 'izquierda', derecha: 'derecha' }

export class EscenaLaberinto extends Phaser.Scene {
  constructor() {
    super('laberinto')
  }

  init({ paquete, cuyAnimado, zorroAnimado, partida }) {
    this.paquete = paquete
    this.datosCuyAnimado = cuyAnimado
    this.datosZorroAnimado = zorroAnimado
    this.partida = partida
    this.indiceNivel = 0
    this.reto = paquete.retos[this.indiceNivel]
    this.indiceAyuda = 0
  }

  create() {
    this.cameras.main.setBackgroundColor(COLOR.crema)
    document.title = 'Kusi · Laberinto'
    this.calcularCuadricula()
    this.crearBarra()
    this.crearMapa()
    this.crearGuia()
    this.crearPersonajes()
    this.exponerParaPruebas()
    avisarPartida(this.partida, 'listo', { familia: 'laberinto', nivel: this.indiceNivel + 1 })
    this.events.once('shutdown', () => {
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
        this.add.rectangle(x, 74, lado, lado, indice === 0 ? 0xffe0a3 : 0xf6ebd8)
          .setRounded(16).setStrokeStyle(indice === 0 ? 4 : 2, indice === 0 ? 0xb4611f : 0xd8b990)
          .setDepth(1001)
        ajustarATamano(this.add.image(x, 73, tipo), lado - 10, lado - 10).setDepth(1002)
      })
    } else {
      ajustarATamano(this.add.image(344, 74, 'clase-' + regla.clase), 78, 78).setDepth(1002)
      const espacio = Math.min(70, 480 / regla.meta)
      for (let indice = 0; indice < regla.meta; indice += 1) {
        this.add.rectangle(432 + indice * espacio, 75, espacio - 12, 58, 0xf6ebd8)
          .setRounded(12).setStrokeStyle(3, 0xb99a70).setDepth(1001)
      }
    }

    this.botones = {
      sonido: crearBoton(this, 1030, 72, {
        ancho: 138, alto: 72, texto: 'Escuchar', tamano: 27,
        alTocar: () => decir(this.textoGlobo.text),
      }).setDepth(1003),
      ayuda: crearBoton(this, 1184, 72, {
        ancho: 118, alto: 72, texto: 'Ayuda', tamano: 28,
        alTocar: () => this.mostrarAyuda(),
      }).setDepth(1003),
    }
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

  mostrarAyuda() {
    const indice = Math.min(this.indiceAyuda, this.reto.ayudas.length - 1)
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

  exponerParaPruebas() {
    // Solo lectura, igual que en el mercado. Las pruebas realizan las acciones
    // con teclado y puntero reales; no existe un atajo para mover al personaje.
    this.leerEstado = () => ({
      familia: 'laberinto', nivel: this.indiceNivel + 1, mapa: this.reto.mapa.map((fila) => fila),
      casilla: this.casilla, origenMapa: { ...this.origenMapa },
      inicio: { ...this.inicio }, consigna: this.textoGlobo.text,
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
