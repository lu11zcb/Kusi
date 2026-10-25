// Los zorros comparten el desplazamiento por casillas con el cuy. Este módulo
// decide únicamente el rumbo: patrullar o seguir un camino corto hasta el niño.
import { avanzarMovimiento, pedirDireccion } from './movimientoLaberinto.js'

const PASOS = {
  derecha: { fila: 0, columna: 1 },
  izquierda: { fila: 0, columna: -1 },
  abajo: { fila: 1, columna: 0 },
  arriba: { fila: -1, columna: 0 },
}
const CONTRARIAS = { derecha: 'izquierda', izquierda: 'derecha', arriba: 'abajo', abajo: 'arriba' }
const MARGEN_DECIMAL = 0.000000001
export const DISTANCIA_PERSECUCION = 3

const claveCasilla = (fila, columna) => fila + ',' + columna
const esCamino = (mapa, fila, columna) => ['.', 'C', 'P'].includes(mapa[fila]?.[columna])

function puedeAvanzar(estado, mapa, direccion) {
  const paso = PASOS[direccion]
  return Boolean(paso && esCamino(mapa, estado.fila + paso.fila, estado.columna + paso.columna))
}

// La búsqueda en anchura mide el recorrido por los pasillos, no la distancia
// recta a través de un muro. Retorna los rumbos de un camino mínimo; [] significa
// que ambos personajes ya están en la misma casilla y null que no hay ruta
// dentro del máximo solicitado. El límite se cuenta en pasos entre casillas.
export function buscarCamino(mapa, origen, destino, maximo = Infinity) {
  if (!Number.isInteger(origen?.fila) || !Number.isInteger(origen?.columna) ||
      !Number.isInteger(destino?.fila) || !Number.isInteger(destino?.columna) ||
      !(maximo >= 0) || !esCamino(mapa, origen.fila, origen.columna) ||
      !esCamino(mapa, destino.fila, destino.columna)) return null

  const inicio = claveCasilla(origen.fila, origen.columna)
  const llegada = claveCasilla(destino.fila, destino.columna)
  const cola = [{ fila: origen.fila, columna: origen.columna, distancia: 0 }]
  const anteriores = new Map([[inicio, null]])

  for (let indice = 0; indice < cola.length; indice += 1) {
    const casilla = cola[indice]
    const clave = claveCasilla(casilla.fila, casilla.columna)
    if (clave === llegada) {
      const camino = []
      let anterior = anteriores.get(clave)
      while (anterior) {
        camino.push(anterior.direccion)
        anterior = anteriores.get(anterior.desde)
      }
      return camino.reverse()
    }
    if (casilla.distancia >= maximo) continue

    for (const [direccion, paso] of Object.entries(PASOS)) {
      const fila = casilla.fila + paso.fila
      const columna = casilla.columna + paso.columna
      const siguiente = claveCasilla(fila, columna)
      if (!esCamino(mapa, fila, columna) || anteriores.has(siguiente)) continue
      anteriores.set(siguiente, { desde: clave, direccion })
      cola.push({ fila, columna, distancia: casilla.distancia + 1 })
    }
  }
  return null
}

export function crearZorro(enemigo, mapa) {
  const posicion = { fila: enemigo.fila, columna: enemigo.columna }
  // El paquete no exige una orientación. Se prefiere el eje horizontal; si el
  // zorro nace en un pasillo vertical, el primer rumbo posible lo respeta.
  const direccion = Object.keys(PASOS).find((rumbo) => puedeAvanzar(posicion, mapa, rumbo)) ?? 'derecha'
  const moviendose = puedeAvanzar(posicion, mapa, direccion)
  return {
    ...posicion,
    direccion,
    direccionPendiente: null,
    progreso: 0,
    moviendose,
    movimiento: enemigo.movimiento,
    inicio: { ...posicion, direccion, moviendose },
  }
}

// Restablecer la patrulla no toca el estado de los objetos recogidos por el cuy.
// Su posición inicial se conserva aparte para que la captura pueda repetirse.
export function restablecerZorro(estado) {
  Object.assign(estado, estado.inicio, { progreso: 0, direccionPendiente: null })
  return estado
}

function elegirRumbo(estado, mapa, cuy) {
  if (estado.movimiento === 'persigue_cerca') {
    const camino = buscarCamino(mapa, estado, cuy, DISTANCIA_PERSECUCION)
    if (camino?.length) return camino[0]
  }
  if (puedeAvanzar(estado, mapa, estado.direccion)) return estado.direccion
  const contraria = CONTRARIAS[estado.direccion]
  return puedeAvanzar(estado, mapa, contraria) ? contraria : null
}

// Cada tramo termina en el siguiente centro. Así una actualización larga revisa
// la persecución en todas las esquinas y revierte la patrulla en cada muro,
// mientras el avance y la interpolación siguen perteneciendo al módulo común.
export function avanzarZorro(estado, mapa, cuy, segundos, casillasPorSegundo = 1.8) {
  if (!Number.isFinite(segundos) || segundos <= 0 ||
      !Number.isFinite(casillasPorSegundo) || casillasPorSegundo <= 0) return estado
  let distancia = segundos * casillasPorSegundo
  if (!Number.isFinite(distancia)) return estado

  while (distancia > MARGEN_DECIMAL) {
    if (estado.progreso === 0) {
      const direccion = elegirRumbo(estado, mapa, cuy)
      if (!direccion) {
        estado.moviendose = false
        estado.direccionPendiente = null
        break
      }
      pedirDireccion(estado, direccion)
    }
    const tramo = Math.min(distancia, 1 - estado.progreso)
    avanzarMovimiento(estado, mapa, tramo / casillasPorSegundo, casillasPorSegundo)
    distancia = Math.max(0, distancia - tramo)
  }
  return estado
}

// Sirve también para el estado del cuy, que conserva el mismo contrato de
// fila/columna de origen más progreso hacia la siguiente casilla.
export function posicionEnCasillas(estado) {
  const paso = PASOS[estado.direccion]
  const progreso = estado.progreso ?? 0
  return {
    fila: estado.fila + (paso?.fila ?? 0) * progreso,
    columna: estado.columna + (paso?.columna ?? 0) * progreso,
  }
}

// Las posiciones interpoladas detectan el contacto antes de coincidir en un
// centro y permiten capturar al cruzarse en sentidos opuestos por un pasillo.
// La escena avanza en pasos pequeños para revisar también esos cruces.
export function seAtrapan(cuy, zorro, distancia = 0.55) {
  const posicionCuy = posicionEnCasillas(cuy)
  const posicionZorro = posicionEnCasillas(zorro)
  return Math.hypot(posicionCuy.fila - posicionZorro.fila,
    posicionCuy.columna - posicionZorro.columna) <= distancia
}
