import { texturaMuro, varianteMuro } from '../dibujos/kitFinal.js'

// Azar local: el aspecto de un nivel no depende de los efectos o de la partida.
export function crearAzarLaberinto(semilla) {
  let estado = 2166136261
  for (const letra of String(semilla)) estado = Math.imul(estado ^ letra.charCodeAt(0), 16777619)
  return () => {
    estado = (Math.imul(1664525, estado) + 1013904223) >>> 0
    return estado / 4294967296
  }
}

// El título de la barra de arriba. Con «orden» pide seguir el patrón; con «solo_clase»
// pide buscar solo la clase del nivel (frutas o verduras).
export function tituloDeBarra(regla) {
  if (regla.tipo === 'orden') return 'Sigue el orden'
  return regla.clase === 'verdura' ? 'Busca verduras' : 'Busca frutas'
}

export function repartirMuros(mapa, semilla) {
  return mapa.flatMap((texto, fila) => [...texto].flatMap((simbolo, columna) =>
    simbolo === '#' ? [{ fila, columna, variante: varianteMuro(semilla, fila, columna),
      textura: texturaMuro(mapa, fila, columna, semilla) }] : []))
}
