import * as Phaser from 'phaser'
import { COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { observarAvisosPartida } from '../logica/partida.js'
import { calcularMonedas } from '../logica/puntos.js'
import { crearHudPuntos } from '../interfaz/hud.js'
import { mostrarPremio } from '../interfaz/premio.js'
import { FRASE_PRUEBA_DOCENTE, fraseDeMonedas } from '../datos/frases.js'
import { repetirVoz } from '../logica/voz.js'
import { vidaActiva } from '../efectos/vida.js'
import { leerSilencio } from '../efectos/silencio.js'
import { SONIDO_PUNTOS } from '../efectos/SonidosLaberinto.js'

const DURACION_VUELO = 480
const TIEMPO_PREMIO_NATIVO = 6500

function esPruebaDocente(ventana) {
  const parametros = new URLSearchParams(ventana.location.search)
  // El panel actual no agrega una marca propia: usa el modo mensaje en un iframe.
  return parametros.has('prueba_docente') ||
    (ventana.parent !== ventana && parametros.get('paquete') === 'mensaje')
}

// Una cámara fija para los dos tipos de juego. La escena sigue viva cuando se
// reinicia un nivel, así el vuelo puede acabar en la misma pastilla.
export class EscenaPuntos extends Phaser.Scene {
  constructor() {
    super({ key: 'puntos', active: true })
  }

  create() {
    this.hud = crearHudPuntos(this)
    this.hud.mostrar(false)
    this.animar = vidaActiva()
    const recolocar = () => {
      if (this.esLaberinto) this.hud.colocar(184, 44)
      else this.hud.colocar(this.scale.width - 20, 146)
    }
    this.scale.on('resize', recolocar)
    this.recolocar = recolocar
    const dejarDeObservar = observarAvisosPartida((aviso, entregarFin) => this.recibirAviso(aviso, entregarFin))
    const limpiar = () => {
      this.limpiarPartida()
      dejarDeObservar()
      this.scale.off('resize', recolocar)
      this.events.off('shutdown', limpiar)
      this.events.off('destroy', limpiar)
    }
    this.events.once('shutdown', limpiar)
    this.events.once('destroy', limpiar)
  }

  prepararLaberinto(escenaJuego) {
    const alAbrir = ({ settings }) => this.abrirJuego(escenaJuego, settings.data)
    escenaJuego.events.on('start', alAbrir)
    this.dejarDeEscucharJuego = () => escenaJuego.events.off('start', alAbrir)
  }

  abrirJuego(escenaJuego, { paquete, partida } = {}) {
    if (!partida || partida.id === this.idPartida || !paquete?.retos?.length) return
    this.cerrarPremio?.()
    this.cancelarVuelo()
    this.escenaJuego = escenaJuego
    this.esLaberinto = paquete.familia === 'laberinto'
    this.pruebaDocente = esPruebaDocente(window)
    this.progreso = paquete.progreso
    this.idPartida = partida.id
    this.hud.empezar(paquete.retos.length)
    this.recolocar()
    this.hud.mostrar(true)
    this.scene.bringToTop()
  }

  limpiarPartida() {
    this.cerrarPremio?.()
    this.dejarDeEscucharJuego?.()
    this.dejarDeEscucharJuego = null
    this.escenaJuego = null
    this.idPartida = null
    this.hud?.mostrar(false)
    this.cancelarVuelo()
  }

  recibirAviso(aviso, entregarFin) {
    if (!this.idPartida || aviso.partida !== this.idPartida) return false
    if (aviso.tipo === 'fallo') {
      this.hud.mostrar(false)
      this.cancelarVuelo()
      return false
    }
    if (aviso.tipo === 'fin') return this.celebrarFin(entregarFin)
    const ganados = this.hud.recibir(aviso)
    if (ganados > 0 && this.animar) this.celebrarPuntos(ganados)
    return false
  }

  celebrarPuntos(ganados) {
    this.cancelarVuelo()
    const origen = { x: this.scale.width / 2, y: this.scale.height * 0.55 }
    const destino = this.hud.centro()
    const cifra = this.add.text(origen.x, origen.y, '+' + ganados, estiloTexto(58, COLOR.crema, {
      stroke: COLOR.tinta, strokeThickness: 8,
    })).setOrigin(0.5).setDepth(4004)
    const brillo = this.add.circle(destino.x, destino.y, 27).setStrokeStyle(4, NUMERO.naranjaClaro)
      .setAlpha(0).setDepth(4003)
    this.vuelo = [cifra, brillo]
    this.tweens.add({
      targets: cifra, ...destino, scale: 0.55, duration: DURACION_VUELO, ease: 'Cubic.InOut',
      onComplete: () => {
        cifra.setVisible(false)
        brillo.setAlpha(1)
        this.tweens.add({
          targets: brillo, alpha: 0, scale: 1.7, duration: 175,
          onComplete: () => this.cancelarVuelo(),
        })
      },
    })
    if (!leerSilencio() && !this.sound.locked && this.cache.audio.exists(SONIDO_PUNTOS)) {
      this.sound.play(SONIDO_PUNTOS, { volume: 0.13 })
    }
  }

  cancelarVuelo() {
    if (!this.vuelo) return
    this.tweens.killTweensOf(this.vuelo)
    for (const pieza of this.vuelo) pieza.destroy()
    this.vuelo = null
  }

  celebrarFin(entregarFin) {
    if (this.cerrarPremio) return true
    const puntaje = this.hud.puntaje()
    const monedas = this.pruebaDocente ? null : calcularMonedas(puntaje, this.progreso)
    let retirarTarjeta, espera, cierreNativo
    const cerrar = () => {
      espera?.remove()
      cierreNativo?.remove()
      retirarTarjeta?.()
      this.cerrarPremio = null
      entregarFin?.()
    }
    const abrir = () => {
      retirarTarjeta = mostrarPremio(this, { puntos: puntaje.total, monedas, alContinuar: cerrar })
      // La tarjeta toma el turno de voz antes de que el puente nativo cierre el juego.
      repetirVoz(monedas === null ? FRASE_PRUEBA_DOCENTE : fraseDeMonedas(monedas))
    }
    this.cerrarPremio = cerrar
    // El último «+N» termina su viaje antes de que aparezca la tarjeta.
    const demora = this.vuelo ? DURACION_VUELO + 175 : 0
    if (entregarFin) cierreNativo = this.time.delayedCall(demora + TIEMPO_PREMIO_NATIVO, cerrar)
    if (demora) espera = this.time.delayedCall(demora, abrir)
    else abrir()
    return true
  }
}
