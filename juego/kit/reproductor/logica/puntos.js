export const MAXIMO_PUNTOS = 20
const MAXIMO_PRACTICAS = 3

export function puntosDelNivel(nivel, totalRetos, errores = 0) {
  // Redondear el acumulado y restar el anterior reparte los 20 puntos completos.
  const acumulado = (hasta) => Math.round(MAXIMO_PUNTOS * hasta / totalRetos)
  const valor = acumulado(nivel) - acumulado(nivel - 1)
  return Math.max(Math.ceil(valor / 2), valor - errores)
}

export function crearPuntos(totalRetos) {
  return { errores: Array(totalRetos).fill(0), porNivel: Array(totalRetos).fill(null), total: 0, ultimoOrden: 0 }
}

export function aplicarAvisoPuntos(puntos, { tipo, nivel, correcto, orden }) {
  const cantidad = puntos.porNivel.length
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > cantidad) return puntos
  const indice = nivel - 1
  if (puntos.porNivel[indice] !== null) return puntos
  const ordenado = Number.isSafeInteger(orden) && orden > 0
  if (ordenado && orden <= puntos.ultimoOrden) return puntos
  const ultimoOrden = ordenado ? orden : puntos.ultimoOrden
  if (tipo === 'accion' && correcto === false) {
    const errores = [...puntos.errores]
    errores[indice] += 1
    return { ...puntos, errores, ultimoOrden }
  }
  // Los puntos se ganan al terminar un reto. Las ayudas y las capturas sin
  // «correcto: false» no se descuentan y un reto solo se acredita una vez.
  if (tipo !== 'reto_completado') return puntos
  const ganados = puntosDelNivel(nivel, cantidad, puntos.errores[indice])
  const porNivel = [...puntos.porNivel]
  porNivel[indice] = ganados
  return { ...puntos, porNivel, total: puntos.total + ganados, ultimoOrden }
}

export function calcularMonedas(puntos, progreso) {
  const { mejoresPuntosPorNivel, practicasUsadas } = progreso ?? {}
  if (!Array.isArray(mejoresPuntosPorNivel) || !Number.isSafeInteger(practicasUsadas) || practicasUsadas < 0) {
    return puntos.total + 5
  }
  if (practicasUsadas >= MAXIMO_PRACTICAS) return 0
  // Comparar reto por reto conserva cada mejora aunque en otro reto el niño
  // haya conseguido menos que en su mejor intento.
  const mejores = mejoresPuntosPorNivel.map((anterior) => Number.isSafeInteger(anterior) && anterior >= 0 ? anterior : 0)
  const acumulado = mejores.reduce((suma, mejor) => suma + mejor, 0)
  const mejora = puntos.porNivel.reduce((suma, ganados, indice) =>
    suma + Math.max(0, (ganados ?? 0) - (mejores[indice] ?? 0)), 0)
  // Una versión puede repartir los puntos entre una cantidad distinta de retos.
  // Incluso en ese caso solo se convierten mejoras que caben en los 20 puntos.
  return 2 + Math.min(mejora, Math.max(0, MAXIMO_PUNTOS - acumulado))
}
