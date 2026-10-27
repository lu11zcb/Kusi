// Solo vaivén de los alimentos sin carita. No hay ciclos de ojos ni cambios de cuadro.
export const FLOTAR = Object.freeze({ amplitud: .04, periodo: 3, desfase: .618 })
const SEGUNDOS_DE_RETORNO = .35
export function calcularFlotar(segundos, indice, { amplitud, periodo, desfase }) {
  return -amplitud * Math.sin(2 * Math.PI * (segundos / periodo + indice * desfase))
}
export function intensidadSiguiente(segundos) { return .18 + Math.sin(segundos * Math.PI) * .07 }
export class FrutasVivas {
  constructor(escena, dibujos, bases, { casilla, activo = true, brillos = [] }) {
    Object.assign(this, { escena, dibujos, bases, casilla, activo, brillos })
    this.siguiente = null; this.tiempo = 0; this.mezcla = dibujos.map(() => 1)
  }
  actualizar(segundos) {
    if (!this.activo || !Number.isFinite(segundos) || segundos <= 0) return
    this.tiempo += segundos
    this.dibujos.forEach((dibujo, indice) => {
      const brillo = this.brillos[indice]
      if (brillo) brillo.setAlpha(dibujo.visible && dibujo.getData?.('tipo') === this.siguiente ? intensidadSiguiente(this.tiempo) : 0)
      if (!dibujo.visible || this.escena.tweens.isTweening(dibujo)) { this.mezcla[indice] = 0; return }
      this.mezcla[indice] = Math.min(1, this.mezcla[indice] + segundos / SEGUNDOS_DE_RETORNO)
      dibujo.y = this.bases[indice].y + calcularFlotar(this.tiempo, indice, FLOTAR) * this.casilla * this.mezcla[indice]
    })
  }
  estado() { return { activo: this.activo, tiempo: this.tiempo, mezcla: [...this.mezcla], parpadeos: [],
    desplazamientos: this.dibujos.map((d, i) => d.y - this.bases[i].y) } }
}
