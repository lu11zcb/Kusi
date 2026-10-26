// Cuando el zorro atrapa al cuy el juego se congela un instante y la pantalla
// tiembla muy suave, sin marear. Solo después el cuy vuelve al inicio y se
// asusta. Es una capa de efectos: no cambia las reglas de la captura, solo
// retrasa unos instantes el momento en que se aplican.

// Cuánto dura el congelado, en segundos: lo justo para notar el golpe.
export const CONGELADO = Object.freeze({ segundos: 0.18 })
// El temblor de la pantalla. La amplitud es una fracción del ancho de la
// pantalla (0,002 son unos 2,6 px), la frecuencia son idas y vueltas por segundo
// y la duración, los segundos hasta que se apaga solo. Solo mueve la cámara de
// lado y un poco arriba y abajo: nunca la gira ni le hace zoom.
export const TEMBLOR = Object.freeze({ amplitud: 0.002, frecuencia: 8, duracion: 0.45, alto: 0.6 })

// Cuánto se corre la cámara, de -1 a 1 en cada eje, «segundos» después de
// empezar. Arranca desde quieto, va y viene con una onda y se apaga con suavidad
// hasta valer 0 al cumplirse la duración. El eje vertical usa otra onda y menos
// fuerza para que el temblor no sea una línea recta.
export function calcularTemblor(segundos, { frecuencia, duracion, alto }) {
  if (segundos < 0 || segundos >= duracion) return { x: 0, y: 0 }
  const quedan = 1 - segundos / duracion
  const envolvente = quedan * quedan
  const onda = 2 * Math.PI * frecuencia * segundos
  return { x: Math.sin(onda) * envolvente, y: Math.sin(onda * 1.31 + 1.1) * envolvente * alto }
}

// Donde mira la cámara cuando no tiembla. Una escena con el mundo centrado en una
// pantalla más grande indica su propio encuadre con la opción «desfase».
const SIN_DESFASE = () => ({ x: 0, y: 0 })

export class CapturaLaberinto {
  // «congelables» son los sprites cuya animación se detiene mientras dura el
  // congelado; la del cuy no hace falta porque la escena deja de avanzarla.
  // «desfase» devuelve el encuadre de la cámara: el temblor se suma a él y,
  // al apagarse, la cámara vuelve exactamente ahí.
  constructor(escena, { ancho, congelables = [], activo = true, desfase = SIN_DESFASE }) {
    this.escena = escena
    this.ancho = ancho
    this.congelables = congelables
    this.activo = activo
    this.desfase = desfase
    this.congelado = false
    this.temblando = false
    this.restante = 0
    this.transcurrido = 0
    this.congelados = 0
    this.scroll = { x: 0, y: 0 }
  }

  // Empieza el congelado y el temblor. Devuelve false si la vida está apagada: la
  // escena entonces aplica la captura de golpe, como antes.
  iniciar() {
    if (!this.activo) return false
    this.congelado = true
    this.temblando = true
    this.restante = CONGELADO.segundos
    this.transcurrido = 0
    this.congelados += 1
    // Los tweens (polvo, estrellas, frutas) y la animación del zorro también se
    // detienen; la escala de tiempo cero no los adelanta al reanudarse.
    this.escena.tweens.timeScale = 0
    this.congelables.forEach((sprite) => { sprite.anims.timeScale = 0 })
    return true
  }

  // Se llama una vez por cuadro con el tiempo real. Devuelve si el juego sigue
  // congelado y si el congelado terminó justo ahora, que es cuando la escena debe
  // aplicar la captura de verdad.
  actualizar(segundos) {
    let termino = false
    if (this.temblando) {
      this.transcurrido += segundos
      const factor = calcularTemblor(this.transcurrido, TEMBLOR)
      this.scroll = { x: factor.x * TEMBLOR.amplitud * this.ancho, y: factor.y * TEMBLOR.amplitud * this.ancho }
      if (this.transcurrido >= TEMBLOR.duracion) {
        this.temblando = false
        this.scroll = { x: 0, y: 0 }
      }
      const encuadre = this.desfase()
      this.escena.cameras.main.setScroll(encuadre.x + this.scroll.x, encuadre.y + this.scroll.y)
    }
    if (this.congelado) {
      this.restante -= segundos
      if (this.restante <= 0) {
        this.descongelar()
        termino = true
      }
    }
    return { congelado: this.congelado, termino }
  }

  descongelar() {
    this.congelado = false
    this.restante = 0
    // Al cerrar la escena Phaser puede haber destruido ya el administrador de
    // tweens o los sprites: cada cosa se revisa antes de tocarla.
    if (this.escena.tweens) this.escena.tweens.timeScale = 1
    this.congelables.forEach((sprite) => { if (sprite.anims) sprite.anims.timeScale = 1 })
  }

  // Al salir de la escena nada debe quedar detenido. La cámara no hace falta
  // devolverla a su sitio: Phaser crea una nueva al reiniciar la escena.
  destruir() {
    if (this.congelado) this.descongelar()
    this.temblando = false
    this.scroll = { x: 0, y: 0 }
  }

  estado() {
    return {
      activo: this.activo,
      congelado: this.congelado,
      congelados: this.congelados,
      restante: this.restante,
      temblando: this.temblando,
      transcurrido: this.transcurrido,
      scroll: { ...this.scroll },
    }
  }
}
