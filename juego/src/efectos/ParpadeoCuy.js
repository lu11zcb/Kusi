// El cuy parpadea de vez en cuando mientras espera de frente. Es una capa de
// efectos: no cambia ningún dibujo, solo pide al motor de cuadros el estado
// «parpadeo» del manifiesto (cuadros 15, 16, 17, 16 y 15 de la hoja, a 16 fps).

// Segundos que espera quieto y de frente antes de parpadear. El tiempo se sortea
// entre estos dos valores para que los parpadeos no marquen un ritmo fijo.
export const ESPERA_MINIMA = 2.5
export const ESPERA_MAXIMA = 5.5
const ESTADO_PARPADEO = 'parpadeo'
// Solo existe la tira frontal: de lado o de espaldas el cuy no parpadea.
const VISTA_PARPADEO = 'frente'

export class ParpadeoCuy {
  // «azar» devuelve un número entre 0 y 1; las pruebas lo reemplazan por uno fijo.
  constructor(cuy, { activo = true, azar = Math.random } = {}) {
    this.cuy = cuy
    this.activo = activo
    this.azar = azar
    this.parpadeos = 0
    this.restante = null
  }

  sortearEspera() {
    return ESPERA_MINIMA + this.azar() * (ESPERA_MAXIMA - ESPERA_MINIMA)
  }

  // Se llama una vez por cuadro, antes de animarMovimiento. «caminando» dice si
  // el cuy se desplazó en este cuadro. La cuenta solo avanza quieto y de frente,
  // sin otra expresión en curso; cualquier otra situación la reinicia, así un
  // parpadeo nunca llega justo al soltar una expresión o al detenerse.
  actualizar(segundos, caminando) {
    if (!this.activo) return false
    if (caminando) {
      // Si el niño empieza a caminar a mitad de un parpadeo, manda el caminar:
      // el cuy no se desliza con los ojos cerrados.
      this.cuy.interrumpirEstado(ESTADO_PARPADEO)
      this.restante = null
      return false
    }
    const quietoDeFrente = this.cuy.direccionAnimada === VISTA_PARPADEO && !this.cuy.estadoExpresivo
    if (!quietoDeFrente) {
      this.restante = null
      return false
    }
    if (this.restante === null) this.restante = this.sortearEspera()
    this.restante -= segundos
    if (this.restante > 0) return false

    this.restante = null
    if (!this.cuy.mostrarEstado(ESTADO_PARPADEO, VISTA_PARPADEO)) return false
    this.parpadeos += 1
    return true
  }
}
