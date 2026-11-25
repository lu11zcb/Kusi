// Orden de un ranking: primero quien tiene más; con lo mismo, primero quien llegó antes a esa
// cantidad (la fecha más antigua). Sin fecha (todavía sin puntos o sin juegos) va al final de
// su grupo. Cada uno tiene su propio puesto: no hay puestos compartidos.
export type ConPuesto<T> = { item: T; puesto: number }

const momento = (fecha: string | null | undefined) => {
  const valor = fecha ? Date.parse(fecha) : NaN
  return Number.isFinite(valor) ? valor : Number.POSITIVE_INFINITY
}

export function ordenarRanking<T>(items: readonly T[], valor: (item: T) => number, alcanzadoEn: (item: T) => string | null | undefined): ConPuesto<T>[] {
  return [...items]
    .sort((a, b) => valor(b) - valor(a) || momento(alcanzadoEn(a)) - momento(alcanzadoEn(b)))
    .map((item, indice) => ({ item, puesto: indice + 1 }))
}
