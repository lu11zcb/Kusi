// Comer bien: la fruta hace «pop» (crece un momento y desaparece) y salen cinco
// estrellitas. Es una capa de efectos sobre la regla del juego: la fruta ya está
// comida cuando se llama, y con ?vida=0 simplemente desaparece como antes.

// Estrellitas que salen de la fruta al comerla bien.
export const CANTIDAD_ESTRELLITAS = 5
// El pop de la fruta: cuánto crece, en veces su tamaño, y cuánto tarda en
// desaparecer, en milisegundos.
const POP = Object.freeze({ escala: 1.45, duracionMs: 220 })
// Las estrellitas. Las medidas van en casillas para seguir el tamaño del mapa.
const ESTRELLITAS = Object.freeze({
  radioInterior: 0.07,
  radioExterior: 0.15,
  alcance: 0.65, // casillas que viajan desde la fruta
  duracionMs: 480,
  giro: 1.6, // radianes que giran mientras viajan; solo gira la estrellita
  // Amarillos y naranjas vivos, con un borde oscuro para que se vean sobre la arena.
  colores: Object.freeze([0xffd23f, 0xff9f1c, 0xffe066, 0xffb627, 0xfff1a8]),
  borde: Object.freeze({ grosor: 2, color: 0xb4611f }),
  profundidad: 6, // sobre los personajes y bajo la barra
})

export class PopFruta {
  // «azar» devuelve un número de 0 a 1; las pruebas lo reemplazan por uno fijo.
  constructor(escena, { casilla, activo = true, azar = Math.random }) {
    this.escena = escena
    this.casilla = casilla
    this.activo = activo
    this.azar = azar
    this.pops = 0
    this.estrellitasSoltadas = 0
    this.estrellas = new Set()
    this.ultimo = null
  }

  // «dibujo» es la imagen de la fruta que se acaba de comer. Devuelve cuántas
  // estrellitas salieron, que son cero sin vida.
  comer(dibujo) {
    this.escena.tweens.killTweensOf(dibujo)
    if (!this.activo) {
      dibujo.setVisible(false)
      return 0
    }
    const { x, y } = dibujo
    this.pops += 1
    this.ultimo = { x, y }
    // Crece rápido y se desvanece al final, para que el pop se vea antes de irse.
    this.escena.tweens.add({
      targets: dibujo,
      scaleX: dibujo.scaleX * POP.escala,
      scaleY: dibujo.scaleY * POP.escala,
      alpha: { value: 0, ease: 'Quad.easeIn' },
      duration: POP.duracionMs,
      ease: 'Quad.easeOut',
      onComplete: () => dibujo.setVisible(false),
    })
    this.salirEstrellitas(x, y)
    return CANTIDAD_ESTRELLITAS
  }

  salirEstrellitas(x, y) {
    // Se reparten en círculo, con el anillo girado al azar y un poco de desorden
    // en cada una para que no parezca un dibujo fijo.
    const giroInicial = this.azar() * Math.PI * 2
    for (let indice = 0; indice < CANTIDAD_ESTRELLITAS; indice += 1) {
      const angulo = giroInicial + (indice / CANTIDAD_ESTRELLITAS) * Math.PI * 2 + (this.azar() - 0.5) * 0.4
      const distancia = (0.85 + 0.3 * this.azar()) * ESTRELLITAS.alcance * this.casilla
      const color = ESTRELLITAS.colores[indice % ESTRELLITAS.colores.length]
      const estrella = this.escena.add.star(
        x, y, 5, ESTRELLITAS.radioInterior * this.casilla, ESTRELLITAS.radioExterior * this.casilla, color,
      ).setDepth(ESTRELLITAS.profundidad).setScale(0.5)
        .setStrokeStyle(ESTRELLITAS.borde.grosor, ESTRELLITAS.borde.color)
      this.estrellas.add(estrella)
      this.estrellitasSoltadas += 1
      this.escena.tweens.add({
        targets: estrella,
        x: x + Math.cos(angulo) * distancia,
        y: y + Math.sin(angulo) * distancia,
        scale: 1.1,
        rotation: (this.azar() < 0.5 ? -1 : 1) * ESTRELLITAS.giro,
        alpha: { value: 0, ease: 'Quad.easeIn' },
        duration: ESTRELLITAS.duracionMs,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          this.estrellas.delete(estrella)
          estrella.destroy()
        },
      })
    }
  }

  estado() {
    return {
      activo: this.activo,
      pops: this.pops,
      estrellitas: this.estrellitasSoltadas,
      estrellitasVivas: this.estrellas.size,
      estrellas: [...this.estrellas].map((estrella) => ({ x: estrella.x, y: estrella.y, alpha: estrella.alpha })),
      ultimo: this.ultimo ? { ...this.ultimo } : null,
    }
  }
}
