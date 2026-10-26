// Polvito: al caminar, cada dos pasos sale una nubecita de tierra detrás de los
// pies. Son tres o cuatro bolitas que se abren, suben un poco y se desvanecen en
// medio segundo. Es una capa de efectos: se dibujan debajo del personaje y no
// cambian nada de su movimiento.

// Cada cuántos pasos sale una nube. Cuenta desde el primer paso: al empezar a
// caminar sale una enseguida y después una cada dos apoyos de pie.
export const PASOS_POR_NUBE = 2
// Bolitas por nube: se sortea entre estos dos valores.
export const PARTICULAS_MINIMAS = 3
export const PARTICULAS_MAXIMAS = 4
// Milisegundos que tarda cada bolita en desvanecerse del todo.
export const DURACION_MS = 500
// Si pasa más de este tiempo, en segundos, sin pisar, se considera que el
// personaje se detuvo y la cuenta de pasos vuelve a empezar.
const SEGUNDOS_PARA_REINICIAR = 0.6

// Colores de tierra, bastante más oscuros que el camino de arena para que se
// noten sin tapar al personaje.
const COLORES = [0x9c7a4d, 0xb08d5b, 0x84643a]
const OPACIDAD = 0.75
// Medidas en casillas, para seguir el tamaño del mapa. «tamano» las multiplica:
// el zorro, más pesado, levanta una nube más grande.
const RADIO = 0.085
const ATRAS = 0.26 // qué tan detrás del centro de los pies nace la nube
const LARGO = 0.24 // cuánto se estira la nube hacia atrás al nacer, como una estela
const DERIVA = 0.22 // cuánto se alejan hacia atrás mientras se desvanecen
const SUBIDA = 0.12 // cuánto suben mientras se desvanecen
const ABRIR_EN_VERTICAL = 0.3 // de lado a lado, al caminar hacia arriba o hacia abajo
const ABRIR_EN_HORIZONTAL = 0.07 // de arriba abajo, al caminar hacia los lados
const CRECIMIENTO = 1.8 // veces que crece cada bolita al desvanecerse
const PROFUNDIDAD = 4 // sobre el piso y las sombras, bajo los personajes

// Hacia dónde camina el personaje en cada rumbo, en x e y.
const RUMBOS = Object.freeze({
  derecha: [1, 0], izquierda: [-1, 0], abajo: [0, 1], arriba: [0, -1],
})

export class Polvito {
  // «azar» devuelve un número de 0 a 1; las pruebas lo reemplazan por uno fijo.
  constructor(escena, { casilla, activo = true, azar = Math.random }) {
    this.escena = escena
    this.casilla = casilla
    this.activo = activo
    this.azar = azar
    this.libres = []
    this.pasos = new Map() // de cada personaje: pasos seguidos y el momento del último
    this.nubes = 0
    this.pasosContados = 0
    this.particulasEmitidas = 0
    this.particulasVivas = 0
    this.historial = []
  }

  // Se llama cada vez que un pie se apoya. «clave» identifica al personaje; x e y
  // son su centro en el suelo, sin el rebote; «direccion» es el rumbo que lleva.
  alPisar(clave, x, y, direccion, tamano = 1) {
    if (!this.activo) return 0
    const ahora = (this.escena.time?.now ?? globalThis.performance.now()) / 1000
    const cuenta = this.pasos.get(clave)
    const seguidos = cuenta && ahora - cuenta.ultimo <= SEGUNDOS_PARA_REINICIAR ? cuenta.seguidos : 0
    this.pasos.set(clave, { seguidos: seguidos + 1, ultimo: ahora })
    this.pasosContados += 1
    return seguidos % PASOS_POR_NUBE === 0 ? this.nube(x, y, direccion, tamano) : 0
  }

  // Suelta una nube y devuelve cuántas bolitas tiene.
  nube(x, y, direccion, tamano = 1) {
    const [dx, dy] = RUMBOS[direccion] ?? [0, 0]
    const cantidad = PARTICULAS_MINIMAS + Math.floor(this.azar() * (PARTICULAS_MAXIMAS - PARTICULAS_MINIMAS + 1))
    const casilla = this.casilla * tamano
    // Perpendicular al rumbo: de lado a lado al caminar en vertical, y de arriba
    // abajo, muy poco, al caminar de lado.
    const abrir = dy !== 0 ? ABRIR_EN_VERTICAL : ABRIR_EN_HORIZONTAL
    const perpendicularX = dy !== 0 ? 1 : 0
    const perpendicularY = dy !== 0 ? 0 : 1

    const inicios = []
    for (let indice = 0; indice < cantidad; indice += 1) {
      // Las bolitas se reparten a lo ancho de la nube, con un poco de desorden.
      const reparto = (cantidad > 1 ? indice / (cantidad - 1) : 0.5) - 0.5
      const lateral = (reparto * 2 + (this.azar() - 0.5) * 0.4) * abrir * casilla
      // Las bolitas nacen una tras otra hacia atrás, como una estela, y no
      // amontonadas en un solo punto.
      const atras = (ATRAS + (reparto + 0.5) * LARGO) * casilla
      const inicioX = x - dx * atras + perpendicularX * lateral
      const inicioY = y - dy * atras + perpendicularY * lateral
      const alejarse = (0.7 + 0.6 * this.azar()) * DERIVA * casilla
      const finX = inicioX - dx * alejarse + perpendicularX * lateral * 0.6
      const finY = inicioY - dy * alejarse + perpendicularY * lateral * 0.6 - SUBIDA * casilla
      this.soltar(inicioX, inicioY, finX, finY, tamano)
      inicios.push({ x: inicioX, y: inicioY })
    }
    this.nubes += 1
    this.historial.push({ x, y, direccion, tamano, cantidad, nube: this.nubes, inicios })
    if (this.historial.length > 8) this.historial.shift()
    return cantidad
  }

  soltar(inicioX, inicioY, finX, finY, tamano) {
    let bolita = this.libres.pop()
    if (!bolita) {
      bolita = this.escena.add.circle(0, 0, this.casilla * RADIO, COLORES[0], OPACIDAD).setDepth(PROFUNDIDAD)
    }
    const color = COLORES[Math.floor(this.azar() * COLORES.length) % COLORES.length]
    bolita.setFillStyle(color, OPACIDAD).setPosition(inicioX, inicioY)
      .setScale(tamano).setAlpha(1).setVisible(true).setActive(true)
    this.particulasEmitidas += 1
    this.particulasVivas += 1
    this.escena.tweens.add({
      targets: bolita, x: finX, y: finY, scale: tamano * CRECIMIENTO, alpha: 0,
      duration: DURACION_MS, ease: 'Sine.easeOut',
      onComplete: () => {
        bolita.setVisible(false).setActive(false)
        this.libres.push(bolita)
        this.particulasVivas -= 1
      },
    })
  }

  estado() {
    return {
      activo: this.activo,
      nubes: this.nubes,
      pasosContados: this.pasosContados,
      particulasEmitidas: this.particulasEmitidas,
      particulasVivas: this.particulasVivas,
      // Las últimas nubes, con el punto del que nació cada bolita; sirve para revisar
      // que salen detrás de los pies.
      historial: this.historial.map((nube) => ({ ...nube, inicios: nube.inicios.map((inicio) => ({ ...inicio })) })),
    }
  }
}
