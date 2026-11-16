// El cuento con que empieza cada juego del taller: pocas páginas que pasan una tras otra
// y cuentan por qué el niño va a jugar. Cada página es una ilustración del cuento (las
// láminas que dibujó el taller, fondo-cuento-<n>) con Kusi y una frase corta abajo; sin
// láminas, es el escenario del juego con las piezas con que se va a jugar. No habla: se
// lee y se mira. El niño pasa de página con «Seguir» (o tocando la imagen) y puede saltarlo.
// La carga le da { paginas, piezas, siguiente: { clave, datos } }.

import * as Phaser from 'phaser'
import { COLOR, NUMERO, estiloTexto } from '../medidas.js'
import { crearBoton } from '../interfaz/piezas.js'
import { ajustarATamano } from '../dibujos/dibujos.js'
import { crearHablaKusi, avanzarHablaKusi } from '../logica/hablaKusi.js'
import { repartirPiezas, fondoDelCuento, laminasDelCuento, laminaDePagina } from '../logica/historia.js'
import { vidaActiva } from '../efectos/vida.js'

const FADE = 260

export class EscenaHistoria extends Phaser.Scene {
  constructor() {
    super('historia')
  }

  init(datos) {
    this.paginas = Array.isArray(datos?.paginas) ? datos.paginas : []
    this.piezasDelJuego = Array.isArray(datos?.piezas) ? datos.piezas : []
    this.siguiente = datos?.siguiente ?? null
    this.indice = 0
    this.terminada = false
    this.cambiando = false
  }

  create() {
    const { width: ancho, height: alto } = this.scale
    this.cameras.main.setBackgroundColor(COLOR.arena)
    document.title = 'Kusi · La historia'

    // El escenario: el fondo del juego si trae uno, y si no el patio del kit. Se cubre toda
    // la pantalla y se suaviza con un velo crema para que lo de encima se lea bien.
    this.laminas = laminasDelCuento(this.piezasDelJuego).filter((clave) => this.textures.exists(clave))
    if (!this.laminas.length) {
      const fondo = fondoDelCuento(this.piezasDelJuego)
      const clave = fondo && this.textures.exists(fondo) ? fondo : 'fondo-cenital'
      if (this.textures.exists(clave)) {
        const imagen = this.add.image(ancho / 2, alto / 2, clave)
        imagen.setScale(Math.max(ancho / imagen.width, alto / imagen.height))
      }
      this.add.rectangle(ancho / 2, alto / 2, ancho, alto, NUMERO.crema, 0.32)
    }

    // Abajo, la franja con la frase de la página y el botón.
    const franjaAlto = 170
    const franjaY = alto - 24 - franjaAlto / 2
    this.add.rectangle(ancho / 2, franjaY, ancho - 80, franjaAlto, NUMERO.papel, 0.97)
      .setStrokeStyle(4, NUMERO.tinta).setRounded(26).setDepth(10)
    this.texto = this.add.text(ancho * 0.29, franjaY, '', estiloTexto(34, COLOR.tinta, {
      align: 'left', wordWrap: { width: ancho * 0.45 },
    })).setOrigin(0, 0.5).setDepth(11)
    this.puntos = this.paginas.map((_, numero) =>
      this.add.circle(ancho / 2 - (this.paginas.length - 1) * 16 + numero * 32, franjaY - franjaAlto / 2 - 22, 9, NUMERO.tinta, 0.35).setDepth(11))
    this.boton = crearBoton(this, ancho - 190, franjaY, { ancho: 260, alto: 84, texto: 'Seguir', tamano: 36, alTocar: () => this.avanzar() }).setDepth(11)
    this.saltar = crearBoton(this, ancho - 110, 56, {
      ancho: 170, alto: 62, texto: 'Saltar', tamano: 26, relleno: NUMERO.crema, radio: 18, alTocar: () => this.empezar(),
    }).setDepth(11)

    // Kusi, de pie sobre la franja, respirando.
    const kusiAlto = Math.min(alto * 0.5, 360)
    this.kusi = this.add.image(ancho * 0.14, franjaY - franjaAlto / 2 + 70, 'kusi-animado', 9).setOrigin(0.5, 1)
      .setDisplaySize(kusiAlto, kusiAlto).setDepth(12)
    this.habla = crearHablaKusi(vidaActiva())

    this.reparto = repartirPiezas(this.piezasDelJuego, this.paginas.length)
    this.capa = null
    this.mostrar(0, false)
    // Tocar la imagen (no los botones) también pasa de página.
    this.input.on('pointerup', (puntero, tocados) => {
      if (tocados.length === 0 && puntero.y < franjaY - franjaAlto / 2) this.avanzar()
    })
  }

  // Dibuja la página: las piezas aparecen una por una con un saltito; la anterior se desvanece.
  mostrar(indice, conTransicion = true) {
    const { width: ancho, height: alto } = this.scale
    const anterior = this.capa
    if (anterior) this.tweens.add({ targets: anterior, alpha: 0, duration: FADE, onComplete: () => anterior.destroy() })

    this.texto.setText(this.paginas[indice] ?? '')
    this.boton.etiqueta.setText(indice >= this.paginas.length - 1 ? '¡Empezar!' : 'Seguir')
    this.puntos.forEach((punto, numero) => punto.setAlpha(numero === indice ? 1 : 0.35))

    const capa = this.add.container(0, 0).setAlpha(conTransicion ? 0 : 1).setDepth(1)
    const clave = laminaDePagina(this.laminas, indice)
    if (clave) {
      // La ilustración de la página cubre la pantalla y se acerca despacio, como un cuento animado.
      const lamina = this.add.image(ancho / 2, alto / 2, clave)
      const escala = Math.max(ancho / lamina.width, alto / lamina.height)
      lamina.setScale(escala)
      capa.add(lamina)
      this.tweens.add({ targets: lamina, scale: escala * 1.07, duration: 7000, ease: 'Sine.InOut' })
    } else {
      const piezas = this.reparto[indice] ?? []
      const zona = { x: ancho * 0.42, ancho: ancho * 0.5, y: alto * 0.1, alto: alto * 0.5 }
      piezas.forEach((pieza, numero) => {
        if (!this.textures.exists(pieza)) return
        const imagen = this.add.image(zona.x + zona.ancho * (numero + 0.5) / piezas.length, zona.y + zona.alto / 2, pieza)
        ajustarATamano(imagen, Math.min(240, zona.ancho / piezas.length - 20), 240)
        const final = imagen.scale
        capa.add(imagen)
        imagen.setScale(0)
        this.tweens.add({ targets: imagen, scale: final, ease: 'Back.Out', duration: 420, delay: 250 + numero * 220 })
      })
    }
    this.tweens.add({ targets: capa, alpha: 1, duration: FADE })
    this.capa = capa
    this.indice = indice
  }

  avanzar() {
    if (this.terminada || this.cambiando) return
    if (this.indice >= this.paginas.length - 1) return this.empezar()
    this.cambiando = true
    this.mostrar(this.indice + 1)
    this.time.delayedCall(FADE, () => { this.cambiando = false })
  }

  // La última página o «Saltar»: se abre el juego.
  empezar() {
    if (this.terminada) return
    this.terminada = true
    const { clave, datos } = this.siguiente ?? {}
    if (clave) this.scene.start(clave, datos)
  }

  update(_tiempo, delta) {
    if (this.terminada) return
    this.kusi.setFrame(avanzarHablaKusi(this.habla, delta / 1000).cuadro)
  }
}
