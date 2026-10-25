// El cuerpo de los personajes del laberinto se mueve un poco con cada paso: sube
// unos píxeles y, al apoyar el pie, se aplasta apenas. Es una capa de efectos
// encima de las animaciones por cuadros: no cambia ningún dibujo y nunca rota ni
// inclina al personaje entero; solo lo sube y lo estira o achata desde los pies,
// porque el anclaje del dibujo está en la línea de apoyo.

// Perfil de cada personaje. Las alturas van en casillas, para seguir el tamaño
// del mapa; el aplaste es una fracción del tamaño del dibujo y se mantiene por
// debajo de 0,05, de modo que apenas se note como un cambio de forma.
export const PERFIL_CUY = Object.freeze({
  rebote: Object.freeze({
    altura: 0.06, // casillas que sube el cuerpo a mitad de cada paso
    aplaste: 0.035, // fracción que se ensancha y se achata al apoyar el pie
    ventanaAplaste: 0.3, // parte del paso que tarda en soltarse el aplaste (de 0 a 1)
    ventanaPrevia: 0.12, // parte del paso, antes del apoyo, en que el cuerpo ya se prepara
  }),
  // Rapidez, en veces por segundo, con la que el efecto aparece al empezar a
  // caminar y se apaga al detenerse. Evita saltos bruscos entre quieto y caminando.
  suavizado: Object.freeze({ subida: 14, bajada: 9 }),
})

// El zorro es más pesado: sube menos, se aplasta más y tarda más en soltarse.
export const PERFIL_ZORRO = Object.freeze({
  rebote: Object.freeze({
    altura: 0.04,
    aplaste: 0.045,
    ventanaAplaste: 0.42,
    ventanaPrevia: 0.14,
  }),
  suavizado: Object.freeze({ subida: 10, bajada: 7 }),
})

const limitar = (valor, minimo, maximo) => Math.min(Math.max(valor, minimo), maximo)
// Sube suavemente de 0 a 1: sin esquinas al empezar ni al terminar.
const suavizar = (progreso) => 0.5 - 0.5 * Math.cos(Math.PI * limitar(progreso, 0, 1))

// Fase del paso, de 0 a 1: vale 0 cuando se apoya un pie, 0,5 a mitad del paso y
// vuelve a 1 en el apoyo siguiente. El ciclo de caminar repite cuatro cuadros
// (0, 1, 2, 1): los pies se apoyan en el primero y en el tercero, así que cada
// pareja de cuadros es un paso. «indice» cuenta desde 1, como Phaser, y
// «progreso» es lo que ya avanzó el cuadro actual (de 0 a 1).
export function calcularFase(indice, progreso) {
  return (((indice - 1) % 2) + limitar(progreso, 0, 0.999999)) / 2
}

// Lee la fase del paso directamente del reloj de la animación del personaje, así
// el rebote sigue los mismos cuadros que se ven, también a cámara lenta.
export function leerFase(animaciones) {
  const cuadro = animaciones.currentFrame
  if (!cuadro) return 0
  const duracion = animaciones.nextTick > 0 ? animaciones.nextTick : animaciones.msPerFrame
  const progreso = duracion > 0 ? animaciones.accumulator / duracion : 0
  return calcularFase(cuadro.index, progreso)
}

// Cuánto sube el cuerpo y cuánto se aplasta en una fase del paso, ambos de 0 a 1.
// Sube con una curva suave y llega arriba a mitad del paso. El aplaste es máximo
// en el apoyo del pie: se suelta durante «ventanaAplaste» y, un poco antes del
// apoyo siguiente, el cuerpo ya empieza a prepararse («ventanaPrevia»). Los dos
// extremos del paso valen igual, así que el efecto no da saltos al repetirse.
export function calcularRebote(fase, { ventanaAplaste, ventanaPrevia }) {
  const altura = Math.sin(Math.PI * limitar(fase, 0, 1))
  const despues = fase < ventanaAplaste ? suavizar(1 - fase / ventanaAplaste) : 0
  const inicioPrevia = 1 - ventanaPrevia
  const antes = fase > inicioPrevia ? suavizar((fase - inicioPrevia) / ventanaPrevia) : 0
  return { altura, aplaste: Math.max(despues, antes) }
}

export class CuerpoVivo {
  // «sprite» ya tiene su escala base: la escena la fija antes de crear el cuerpo.
  constructor(sprite, perfil, { casilla, activo = true }) {
    this.sprite = sprite
    this.perfil = perfil
    this.casilla = casilla
    this.activo = activo
    this.escalaBase = { x: sprite.scaleX, y: sprite.scaleY }
    this.intensidad = 0
    this.fase = 0
    this.altura = 0
    this.aplaste = 0
    // Lo que se le sumó al sprite en este cuadro; la escena lo resta para saber
    // dónde está de verdad el personaje, sin los efectos.
    this.desplazamiento = { x: 0, y: 0 }
  }

  // Se llama una vez por cuadro, después de colocar el sprite en su casilla y de
  // avanzar su animación. La escena vuelve a colocarlo en cada cuadro, así que
  // el desplazamiento nunca se acumula.
  actualizar(segundos) {
    if (!this.activo) return
    const sprite = this.sprite
    // Una expresión (feliz, asustado) no cuenta como caminar aunque se desplace.
    const caminando = sprite.estadoMovimiento === 'caminar' && !sprite.estadoExpresivo
    const { subida, bajada } = this.perfil.suavizado
    const objetivo = caminando ? 1 : 0
    this.intensidad += (objetivo - this.intensidad) * (1 - Math.exp(-(caminando ? subida : bajada) * segundos))
    if (this.intensidad < 0.001) this.intensidad = 0
    // Al detenerse se conserva la última fase mientras el efecto se apaga.
    if (caminando) this.fase = leerFase(sprite.anims)

    const rebote = calcularRebote(this.fase, this.perfil.rebote)
    this.altura = rebote.altura * this.perfil.rebote.altura * this.casilla * this.intensidad
    this.aplaste = rebote.aplaste * this.perfil.rebote.aplaste * this.intensidad
    this.desplazamiento = { x: 0, y: this.altura === 0 ? 0 : -this.altura }
    // Más ancho y más bajo al aplastarse; los pies no se mueven porque el
    // anclaje del dibujo está en la línea de apoyo.
    sprite.setScale(this.escalaBase.x * (1 + this.aplaste), this.escalaBase.y * (1 - this.aplaste))
    sprite.x += this.desplazamiento.x
    sprite.y += this.desplazamiento.y
  }

  estado() {
    return {
      activo: this.activo,
      intensidad: this.intensidad,
      fase: this.fase,
      altura: this.altura,
      aplaste: this.aplaste,
      escalaX: this.sprite.scaleX,
      escalaY: this.sprite.scaleY,
      escalaBaseX: this.escalaBase.x,
      escalaBaseY: this.escalaBase.y,
      rotacion: this.sprite.rotation,
      desplazamiento: { ...this.desplazamiento },
    }
  }
}
