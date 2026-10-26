// Azar local: el aspecto de un nivel no depende de los efectos o de la partida.
export function crearAzarLaberinto(semilla) {
  let estado = 2166136261
  for (const letra of String(semilla)) estado = Math.imul(estado ^ letra.charCodeAt(0), 16777619)
  return () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0
    return estado / 4294967296
  }
}

export function repartirMuros(mapa, semilla) {
  const azar = crearAzarLaberinto(semilla)
  return mapa.flatMap((texto, fila) => [...texto].flatMap((simbolo, columna) =>
    simbolo === '#' ? [{ fila, columna, variante: azar() < 0.5 ? 'muro-adobe-1' : 'muro-adobe-2' }] : []))
}
