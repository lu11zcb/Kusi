// Frutas vivas: las frutas y verduras del mapa suben y bajan muy despacio dentro
// de su casilla, cada una con un desfase distinto, para que el camino no se vea
// como una foto. Es una capa de efectos: la fruta sigue en su casilla para la
// regla del juego y solo se mueve su dibujo unos píxeles.

// Cuánto flota. La amplitud va en casillas, hacia arriba y hacia abajo de su
// sitio; el periodo es lo que tarda en subir y bajar una vez, en segundos.
export const FLOTAR = Object.freeze({
  amplitud: 0.04,
  periodo: 3,
  // Cada fruta va retrasada esta fracción del periodo respecto de la anterior. El
  // 0,618 de la razón áurea reparte las fases lo más parejo posible, así que
  // ninguna coincide con otra aunque haya siete objetos en el mapa.
  desfase: 0.618,
})
// Segundos que tarda la fruta en recuperar su vaivén después de un rebote, para
// que no dé un salto al volver a flotar.
const SEGUNDOS_DE_RETORNO = 0.35

// Cuánto se aleja la fruta número «indice» de su sitio, en casillas, «segundos»
// después de empezar el nivel. Negativo es hacia arriba, como en la pantalla.
export function calcularFlotar(segundos, indice, { amplitud, periodo, desfase }) {
  return -amplitud * Math.sin(2 * Math.PI * (segundos / periodo + indice * desfase))
}

export class FrutasVivas {
  // «dibujos» y «bases» van en el mismo orden: la imagen de cada fruta y el
  // centro de su casilla.
  constructor(escena, dibujos, bases, { casilla, activo = true }) {
    this.escena = escena
    this.dibujos = dibujos
    this.bases = bases
    this.casilla = casilla
    this.activo = activo
    this.tiempo = 0
    // De 0 a 1 por fruta: cuánto del vaivén se aplica. Vale 0 mientras la fruta
    // tiene un tween en marcha (rebote o pop) y sube de nuevo al terminar.
    this.mezcla = dibujos.map(() => 1)
  }

  actualizar(segundos) {
    if (!this.activo) return
    this.tiempo += segundos
    this.dibujos.forEach((dibujo, indice) => {
      // Una fruta comida ya no se mueve, y mientras rebota o hace pop manda su tween.
      if (!dibujo.visible || this.escena.tweens.isTweening(dibujo)) {
        this.mezcla[indice] = 0
        return
      }
      this.mezcla[indice] = Math.min(1, this.mezcla[indice] + segundos / SEGUNDOS_DE_RETORNO)
      const desplazamiento = calcularFlotar(this.tiempo, indice, FLOTAR) * this.casilla * this.mezcla[indice]
      dibujo.y = this.bases[indice].y + desplazamiento
    })
  }

  estado() {
    return {
      activo: this.activo,
      tiempo: this.tiempo,
      mezcla: [...this.mezcla],
      desplazamientos: this.dibujos.map((dibujo, indice) => dibujo.y - this.bases[indice].y),
    }
  }
}
