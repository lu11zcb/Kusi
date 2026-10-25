// Puerta viva: al abrirse, la puerta rebota y salen confeti. Es una capa de
// efectos: la puerta ya está abierta para la regla del juego cuando se llama, y
// con ?vida=0 solo cambia de dibujo como antes.

// El rebote de la puerta. El salto va en casillas; «estirar» es la fracción que
// se alarga a lo alto mientras sube y se achica de ancho; las duraciones van en
// milisegundos. La caída usa un rebote que se amortigua solo.
export const REBOTE = Object.freeze({ salto: 0.14, estirar: 0.1, subida: 130, caida: 520 })

// El confeti. Las medidas van en casillas (y en casillas por segundo) para seguir
// el tamaño del mapa. Cada trozo sube en abanico, gira y cae por su peso.
export const CONFETI = Object.freeze({
  cantidad: 18,
  colores: Object.freeze([0xf3a12b, 0xc2412f, 0x5aa04a, 0x8fd0ef, 0xffd56d, 0xf28ab2]),
  ancho: 0.1,
  alto: 0.17,
  subida: Object.freeze({ minima: 3.2, maxima: 5.2 }), // velocidad inicial hacia arriba
  abanico: 2.6, // velocidad máxima hacia cada lado
  gravedad: 9, // casillas por segundo al cuadrado
  giroMaximo: 9, // radianes por segundo
  duracionMs: 1100,
  desvanece: 0.65, // fracción de la vida a partir de la que se va apagando
  profundidad: 6, // sobre los personajes y bajo la barra
})

// Dónde está un trozo de confeti, en casillas respecto del punto de salida,
// «t» (de 0 a 1) del tiempo que dura. Es un tiro parabólico: sube con su
// velocidad inicial y la gravedad lo frena y lo hace caer. Los datos de cada
// trozo son su velocidad horizontal «vx», la vertical «vy» (negativa es hacia
// arriba), su giro y su fase de aleteo.
export function calcularConfeti({ vx, vy, giro, fase }, t, { gravedad, duracionMs, desvanece, giroMaximo }) {
  const segundos = (t * duracionMs) / 1000
  const aparecer = t < desvanece ? 1 : Math.max(0, 1 - (t - desvanece) / (1 - desvanece))
  return {
    x: vx * segundos,
    y: vy * segundos + 0.5 * gravedad * segundos * segundos,
    rotacion: giro * giroMaximo * segundos,
    // Al girar se ve de canto y de frente, como una hojita de papel.
    aleteo: Math.abs(Math.cos(giro * giroMaximo * segundos * 0.7 + fase)) * 0.8 + 0.2,
    alfa: aparecer,
  }
}

export class PuertaViva {
  // «azar» devuelve un número de 0 a 1; las pruebas lo reemplazan por uno fijo.
  constructor(escena, puerta, { casilla, activo = true, azar = Math.random }) {
    this.escena = escena
    this.puerta = puerta
    this.casilla = casilla
    this.activo = activo
    this.azar = azar
    this.aperturas = 0
    this.confetiSoltado = 0
    this.confeti = new Set()
    this.base = { x: puerta.x, y: puerta.y, escalaX: puerta.scaleX, escalaY: puerta.scaleY }
    this.colores = []
  }

  // La puerta acaba de abrirse. Devuelve cuántos trozos de confeti salieron.
  abrir() {
    if (!this.activo) return 0
    this.aperturas += 1
    this.rebotar()
    return this.lanzarConfeti()
  }

  // Sube un poco estirándose y cae rebotando hasta quedarse en su sitio.
  rebotar() {
    const { x, y, escalaX, escalaY } = this.base
    this.escena.tweens.killTweensOf(this.puerta)
    this.puerta.setPosition(x, y).setScale(escalaX, escalaY)
    this.escena.tweens.add({
      targets: this.puerta,
      y: y - REBOTE.salto * this.casilla,
      scaleX: escalaX * (1 - REBOTE.estirar * 0.6),
      scaleY: escalaY * (1 + REBOTE.estirar),
      duration: REBOTE.subida,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.escena.tweens.add({
          targets: this.puerta, y, scaleX: escalaX, scaleY: escalaY,
          duration: REBOTE.caida, ease: 'Bounce.easeOut',
        })
      },
    })
  }

  lanzarConfeti() {
    // El confeti sale de la parte de arriba de la puerta.
    const salidaX = this.base.x
    const salidaY = this.base.y - this.casilla * 0.3
    for (let indice = 0; indice < CONFETI.cantidad; indice += 1) {
      const color = CONFETI.colores[indice % CONFETI.colores.length]
      const trozo = {
        vx: (this.azar() * 2 - 1) * CONFETI.abanico * this.casilla,
        vy: -(CONFETI.subida.minima + this.azar() * (CONFETI.subida.maxima - CONFETI.subida.minima)) * this.casilla,
        giro: (this.azar() * 2 - 1),
        fase: this.azar() * Math.PI,
      }
      const parametros = { ...CONFETI, gravedad: CONFETI.gravedad * this.casilla }
      const pieza = this.escena.add.rectangle(
        salidaX, salidaY, CONFETI.ancho * this.casilla, CONFETI.alto * this.casilla, color,
      ).setDepth(CONFETI.profundidad)
      const avance = { t: 0 }
      this.confeti.add(pieza)
      this.confetiSoltado += 1
      this.colores.push(color)
      this.escena.tweens.add({
        targets: avance, t: 1, duration: CONFETI.duracionMs, ease: 'Linear',
        onUpdate: () => {
          const lugar = calcularConfeti(trozo, avance.t, parametros)
          pieza.setPosition(salidaX + lugar.x, salidaY + lugar.y).setRotation(lugar.rotacion)
            .setScale(lugar.aleteo, 1).setAlpha(lugar.alfa)
        },
        onComplete: () => {
          this.confeti.delete(pieza)
          pieza.destroy()
        },
      })
    }
    return CONFETI.cantidad
  }

  estado() {
    return {
      activo: this.activo,
      aperturas: this.aperturas,
      confetiSoltado: this.confetiSoltado,
      confetiVivo: this.confeti.size,
      colores: [...new Set(this.colores)],
      base: { ...this.base },
      puerta: {
        x: this.puerta.x, y: this.puerta.y, escalaX: this.puerta.scaleX, escalaY: this.puerta.scaleY,
        textura: this.puerta.texture?.key ?? null,
      },
      piezas: [...this.confeti].map((pieza) => ({ x: pieza.x, y: pieza.y, alpha: pieza.alpha })),
    }
  }
}
