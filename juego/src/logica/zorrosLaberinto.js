// Los zorros comparten el desplazamiento por casillas con el cuy. Este módulo
// decide únicamente el rumbo: patrullar o seguir un camino corto hasta el niño.
import { avanzarMovimiento, pedirDireccion } from './movimientoLaberinto.js'

// Todos los ajustes de la persecución se expresan aquí: el radio cuenta pasos
// transitables del laberinto y los dos relojes cuentan segundos reales. Cambiar
// la velocidad del desplazamiento nunca acorta ni alarga estos intervalos.
export const DISTANCIA_PERSECUCION = 5
export const SEGUNDOS_PERSECUCION = 5
export const SEGUNDOS_DESCANSO = 2
export const SEGUNDOS_ALERTA = 0.6

const PASOS = {
  derecha: { fila: 0, columna: 1 },
  izquierda: { fila: 0, columna: -1 },
  abajo: { fila: 1, columna: 0 },
  arriba: { fila: -1, columna: 0 },
}
const CONTRARIAS = { derecha: 'izquierda', izquierda: 'derecha', arriba: 'abajo', abajo: 'arriba' }
const MARGEN_DECIMAL = 0.000000001

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

export function crearZorro(enemigo, mapa, { vivo = false, semilla = 1 } = {}) {
  const posicion = { fila: enemigo.fila, columna: enemigo.columna }
  // El paquete no exige una orientación. Se prefiere el eje horizontal; si el
  // zorro nace en un pasillo vertical, el primer rumbo posible lo respeta.
  const direccion = Object.keys(PASOS).find((rumbo) => puedeAvanzar(posicion, mapa, rumbo)) ?? 'derecha'
  const moviendose = puedeAvanzar(posicion, mapa, direccion)
  const estado = {
    ...posicion,
    direccion,
    direccionPendiente: null,
    progreso: 0,
    moviendose,
    movimiento: enemigo.movimiento,
    persiguiendo: false,
    segundosPersiguiendo: 0,
    segundosDescanso: 0,
    iniciosPersecucion: 0,
    inicio: { ...posicion, direccion, moviendose },
  }
  // Ambos tipos exploran el mapa. Solo persigue_cerca cambia de búsqueda a
  // persecución cuando detecta al jugador; patrulla sigue su recorrido.
  if (vivo) Object.assign(estado, {
    vivo: true, fase: 'buscar', segundosAlerta: 0, tramoPreparado: false,
    semillaInicial: (semilla >>> 0) || 1, semilla: (semilla >>> 0) || 1,
    visitas: { [claveCasilla(posicion.fila, posicion.columna)]: 1 },
  })
  return estado
}

// Restablecer la patrulla no toca el estado de los objetos recogidos por el cuy.
// Su posición inicial se conserva aparte para que la captura pueda repetirse.
export function restablecerZorro(estado) {
  Object.assign(estado, estado.inicio, {
    progreso: 0,
    direccionPendiente: null,
    persiguiendo: false,
    segundosPersiguiendo: 0,
    segundosDescanso: 0,
    iniciosPersecucion: 0,
  })
  if (estado.vivo) Object.assign(estado, {
    fase: 'buscar', segundosAlerta: 0, tramoPreparado: false, semilla: estado.semillaInicial,
    visitas: { [claveCasilla(estado.fila, estado.columna)]: 1 },
  })
  return estado
}

// La ruta acotada sirve a la vez para detectar al niño y para elegir el giro.
// Una ruta vacía también está dentro del radio; null incluye destinos inválidos,
// separados por muros o demasiado lejanos. Al perder el radio se rompe la racha
// de persecución, aunque el zorro aún deba terminar el tramo que había iniciado.
function actualizarPersecucion(estado, mapa, cuy) {
  const camino = estado.movimiento === 'persigue_cerca'
    ? buscarCamino(mapa, estado, cuy, DISTANCIA_PERSECUCION)
    : null
  if (camino !== null) {
    if (!estado.persiguiendo) estado.iniciosPersecucion += 1
    estado.persiguiendo = true
  } else {
    estado.persiguiendo = false
    estado.segundosPersiguiendo = 0
  }
  return camino
}

function elegirRumbo(estado, mapa, camino) {
  if (estado.persiguiendo && camino?.length) return camino[0]
  if (puedeAvanzar(estado, mapa, estado.direccion)) return estado.direccion
  const contraria = CONTRARIAS[estado.direccion]
  return puedeAvanzar(estado, mapa, contraria) ? contraria : null
}

function prepararTramo(estado, mapa, camino, casillasPorSegundo) {
  if (estado.progreso > 0) {
    estado.moviendose = true
    return
  }
  const direccion = elegirRumbo(estado, mapa, camino)
  if (!direccion) {
    estado.moviendose = false
    estado.direccionPendiente = null
    return
  }
  pedirDireccion(estado, direccion)
  // Un avance de cero solo resuelve el rumbo y la animación en el centro. Esto
  // permite reanudar exactamente al terminar el descanso sin gastar más tiempo.
  avanzarMovimiento(estado, mapa, 0, casillasPorSegundo)
}

function iniciarDescanso(estado) {
  estado.persiguiendo = false
  estado.segundosPersiguiendo = 0
  // segundosDescanso es el tiempo que falta para volver a decidir el rumbo.
  // No alteramos fila, columna, dirección ni progreso: también se puede descansar
  // a mitad de una casilla y continuar luego desde la misma posición visible.
  estado.segundosDescanso = SEGUNDOS_DESCANSO
  estado.moviendose = false
  estado.direccionPendiente = null
}

// Consumimos el delta en orden cronológico, cortándolo en cada centro, al cumplir
// cinco segundos seguidos de persecución o al acabar los dos de descanso. Así un
// cuadro largo puede contener persecución, descanso y reanudación, y un efecto de
// rapidez solo modifica la distancia recorrida durante cada intervalo activo.
export function avanzarZorro(estado, mapa, cuy, segundos, casillasPorSegundo = 1.8) {
  if (!Number.isFinite(segundos) || segundos <= 0 ||
      !Number.isFinite(casillasPorSegundo) || casillasPorSegundo <= 0) return estado
  if (!Number.isFinite(segundos * casillasPorSegundo)) return estado
  if (estado.vivo) return avanzarZorroVivo(estado, mapa, cuy, segundos, casillasPorSegundo)
  let restante = segundos

  while (restante > 0) {
    if (estado.segundosDescanso > 0) {
      const descanso = Math.min(restante, estado.segundosDescanso)
      estado.segundosDescanso = Math.max(0, estado.segundosDescanso - descanso)
      restante = Math.max(0, restante - descanso)
      if (restante < MARGEN_DECIMAL) restante = 0
      if (estado.segundosDescanso > MARGEN_DECIMAL) continue
      estado.segundosDescanso = 0
      // La posición del niño puede haber cambiado durante la espera: solo entra
      // en una nueva persecución si sigue existiendo un camino de hasta cinco.
      const camino = actualizarPersecucion(estado, mapa, cuy)
      prepararTramo(estado, mapa, camino, casillasPorSegundo)
      if (restante === 0) break
    }

    const camino = actualizarPersecucion(estado, mapa, cuy)
    prepararTramo(estado, mapa, camino, casillasPorSegundo)
    if (!estado.moviendose && !estado.persiguiendo) break

    const hastaCentro = estado.moviendose ? (1 - estado.progreso) / casillasPorSegundo : Infinity
    const hastaDescanso = estado.persiguiendo ? SEGUNDOS_PERSECUCION - estado.segundosPersiguiendo : Infinity
    const tramo = Math.min(restante, hastaCentro, hastaDescanso)
    if (estado.moviendose) avanzarMovimiento(estado, mapa, tramo, casillasPorSegundo)
    if (estado.persiguiendo) estado.segundosPersiguiendo += tramo
    restante = Math.max(0, restante - tramo)
    // Una resta como 0.1 - (5 - 4.9) puede dejar una fracción mínima positiva.
    // No dejamos que ese residuo consuma parte del descanso recién iniciado.
    if (restante < MARGEN_DECIMAL) restante = 0

    if (estado.persiguiendo && estado.segundosPersiguiendo >= SEGUNDOS_PERSECUCION - MARGEN_DECIMAL) {
      iniciarDescanso(estado)
    } else if (estado.progreso === 0) {
      // Reflejamos la entrada o salida del radio incluso si el delta acaba justo
      // al llegar. El próximo giro seguirá resolviéndose siempre en el centro.
      actualizarPersecucion(estado, mapa, cuy)
    }
  }
  return estado
}

// Generador congruente de 32 bits: una misma semilla y los mismos giros producen
// el mismo paseo. La escena nunca usa Math.random para decidir por dónde va.
function sortearSalida(estado, cantidad) {
  estado.semilla = (Math.imul(1664525, estado.semilla) + 1013904223) >>> 0
  return Math.floor(estado.semilla / 4294967296 * cantidad)
}

export function elegirCaminoDeBusqueda(estado, mapa) {
  // Busca el pasillo menos visitado que esté más cerca. Así recorre también
  // ramales y callejones, en lugar de repetir al azar un pequeño circuito.
  const cola = [{ fila: estado.fila, columna: estado.columna, distancia: 0 }]
  const vistas = new Set([claveCasilla(estado.fila, estado.columna)])
  let candidatas = [], menosVisitas = Infinity, distancia = Infinity
  for (let i = 0; i < cola.length; i += 1) {
    const actual = cola[i]
    for (const [direccion, paso] of Object.entries(PASOS)) {
      const fila = actual.fila + paso.fila, columna = actual.columna + paso.columna
      const clave = claveCasilla(fila, columna)
      if (!esCamino(mapa, fila, columna) || vistas.has(clave)) continue
      vistas.add(clave)
      const siguiente = { fila, columna, distancia: actual.distancia + 1, rumbo: actual.rumbo ?? direccion }
      cola.push(siguiente)
      const visitas = estado.visitas?.[clave] ?? 0
      if (visitas < menosVisitas || visitas === menosVisitas && siguiente.distancia < distancia) {
        menosVisitas = visitas; distancia = siguiente.distancia; candidatas = []
      }
      if (visitas === menosVisitas && siguiente.distancia === distancia) candidatas.push(siguiente.rumbo)
    }
  }
  const sinVolver = candidatas.filter(direccion => direccion !== CONTRARIAS[estado.direccion])
  const rumbos = sinVolver.length ? sinVolver : candidatas
  return rumbos.length ? rumbos[sortearSalida(estado, rumbos.length)] : null
}

function entrarEnAlerta(estado) {
  estado.fase = 'alerta'
  estado.segundosAlerta = SEGUNDOS_ALERTA
  estado.moviendose = false
  estado.direccionPendiente = null
  estado.iniciosPersecucion += 1
}

function prepararTramoVivo(estado, mapa, camino, velocidad) {
  if (estado.progreso > 0) { estado.moviendose = true; return }
  if (estado.tramoPreparado) return
  const direccion = estado.fase === 'perseguir' ? camino?.[0] : elegirCaminoDeBusqueda(estado, mapa)
  estado.tramoPreparado = true
  estado.direccionPendiente = null
  if (!direccion) { estado.moviendose = false; return }
  pedirDireccion(estado, direccion)
  avanzarMovimiento(estado, mapa, 0, velocidad)
}

// Buscar, alerta, perseguir y cansado son estados exclusivos. Los temporizadores
// se consumen en segundos reales; un cuadro largo puede atravesar varios estados
// y cada llegada a un centro permite decidir otro giro sin cruzar un muro.
function avanzarZorroVivo(estado, mapa, cuy, segundos, velocidad) {
  let restante = segundos
  while (restante > MARGEN_DECIMAL) {
    if (estado.fase === 'alerta' || estado.fase === 'cansado') {
      const campo = estado.fase === 'alerta' ? 'segundosAlerta' : 'segundosDescanso'
      const paso = Math.min(restante, estado[campo])
      estado[campo] = Math.max(0, estado[campo] - paso)
      restante = Math.max(0, restante - paso)
      estado.moviendose = false
      if (estado[campo] > MARGEN_DECIMAL) break
      estado[campo] = 0
      estado.fase = estado.fase === 'alerta' ? 'perseguir' : 'buscar'
      estado.persiguiendo = estado.fase === 'perseguir'
      estado.segundosPersiguiendo = 0
      estado.tramoPreparado = false
      continue
    }

    if (estado.fase === 'buscar' && estado.movimiento === 'persigue_cerca' &&
        buscarCamino(mapa, estado, cuy, DISTANCIA_PERSECUCION) !== null) {
      entrarEnAlerta(estado)
      continue
    }
    const camino = estado.fase === 'perseguir' ? buscarCamino(mapa, estado, cuy) : null
    if (estado.fase === 'perseguir' && camino === null) {
      estado.fase = 'buscar'
      estado.persiguiendo = false
      estado.segundosPersiguiendo = 0
      estado.tramoPreparado = false
    }
    prepararTramoVivo(estado, mapa, camino, velocidad)
    if (!estado.moviendose && estado.fase === 'buscar') break
    const hastaCentro = estado.moviendose ? (1 - estado.progreso) / velocidad : Infinity
    const hastaCansancio = estado.fase === 'perseguir' ? SEGUNDOS_PERSECUCION - estado.segundosPersiguiendo : Infinity
    const paso = Math.min(restante, hastaCentro, hastaCansancio)
    if (estado.moviendose) avanzarMovimiento(estado, mapa, paso, velocidad, () => {
      estado.tramoPreparado = false
      const clave = claveCasilla(estado.fila, estado.columna)
      estado.visitas[clave] = (estado.visitas[clave] ?? 0) + 1
      // El giro lo decide este módulo en la próxima iteración del mismo delta.
      return false
    })
    if (estado.fase === 'perseguir') estado.segundosPersiguiendo += paso
    restante = Math.max(0, restante - paso)
    if (estado.fase === 'perseguir' && estado.segundosPersiguiendo >= SEGUNDOS_PERSECUCION - MARGEN_DECIMAL) {
      iniciarDescanso(estado)
      estado.fase = 'cansado'
      estado.tramoPreparado = false
    }
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
// centro y permiten capturar al cruzarse en direcciones contrarias por un pasillo.
// La escena avanza en pasos pequeños para revisar también esos cruces.
export function seAtrapan(cuy, zorro, distancia = 0.55) {
  const posicionCuy = posicionEnCasillas(cuy)
  const posicionZorro = posicionEnCasillas(zorro)
  return Math.hypot(posicionCuy.fila - posicionZorro.fila,
    posicionCuy.columna - posicionZorro.columna) <= distancia
}
