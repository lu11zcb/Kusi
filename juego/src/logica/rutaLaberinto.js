// Este módulo decide recorridos entre centros de casillas. No conoce Phaser,
// animaciones ni las reglas que deciden si una fruta es correcta para el reto.
const DESPLAZAMIENTOS = [
  { direccion: 'arriba', fila: -1, columna: 0 },
  { direccion: 'abajo', fila: 1, columna: 0 },
  { direccion: 'izquierda', fila: 0, columna: -1 },
  { direccion: 'derecha', fila: 0, columna: 1 },
]

function claveDeCasilla(fila, columna) {
  return fila + ':' + columna
}

function esCamino(mapa, fila, columna) {
  const casilla = mapa[fila]?.[columna]
  return casilla === '.' || casilla === 'C' || casilla === 'P'
}

// La cola recorre primero las casillas a una distancia de un paso, después las
// de dos, etc. La primera visita guarda así un camino de longitud mínima.
// El origen se acepta aunque tenga un objeto: el cuy siempre puede salir de él.
function buscarCaminos(mapa, origen, bloqueadas = new Set()) {
  const claveOrigen = claveDeCasilla(origen.fila, origen.columna)
  const visitadas = new Map([[claveOrigen, {
    fila: origen.fila, columna: origen.columna, anterior: null, direccion: null,
  }]])
  const pendientes = [claveOrigen]

  for (let indice = 0; indice < pendientes.length; indice += 1) {
    const claveActual = pendientes[indice]
    const actual = visitadas.get(claveActual)

    for (const desplazamiento of DESPLAZAMIENTOS) {
      const fila = actual.fila + desplazamiento.fila
      const columna = actual.columna + desplazamiento.columna
      const clave = claveDeCasilla(fila, columna)
      if (!esCamino(mapa, fila, columna) || visitadas.has(clave)
        || bloqueadas.has(clave)) continue

      visitadas.set(clave, {
        fila, columna, anterior: claveActual, direccion: desplazamiento.direccion,
      })
      pendientes.push(clave)
    }
  }

  return visitadas
}

// Los muros, el exterior y las zonas desconectadas se ajustan a la casilla más
// cercana que el cuy sí puede alcanzar. Comparar cuadrados conserva la distancia
// euclídea entre centros sin necesitar raíces. Los empates usan fila y columna,
// de modo que el resultado no depende del orden de exploración de la cola.
function elegirDestino(alcanzables, toque) {
  let destino = null
  let menorDistancia = Infinity

  for (const casilla of alcanzables.values()) {
    const distancia = (casilla.fila - toque.fila) ** 2
      + (casilla.columna - toque.columna) ** 2
    if (destino === null || distancia < menorDistancia || (distancia === menorDistancia
      && (casilla.fila < destino.fila
        || (casilla.fila === destino.fila && casilla.columna < destino.columna)))) {
      destino = { fila: casilla.fila, columna: casilla.columna }
      menorDistancia = distancia
    }
  }

  return destino
}

function reconstruirPasos(visitadas, destino) {
  const pasos = []
  let casilla = visitadas.get(claveDeCasilla(destino.fila, destino.columna))

  while (casilla.anterior !== null) {
    pasos.push({
      fila: casilla.fila, columna: casilla.columna, direccion: casilla.direccion,
    })
    casilla = visitadas.get(casilla.anterior)
  }

  return pasos.reverse()
}

// Devuelve un plan nuevo y no modifica mapa, origen, toque ni objetos.
// «toque» usa coordenadas relativas a los centros: un decimal permite conservar
// la posición exacta del puntero dentro de la casilla. El borde entre dos celdas
// pertenece a la siguiente fila o columna, igual que al convertir desde píxeles.
// «frutaObjetivo» conserva el índice original del objeto realmente tocado,
// también si el destino coincide con el origen. Solo ese objeto debe recogerse:
// los demás se atraviesan sin comer cuando no existe una ruta que los evite.
// Un origen sin camino o coordenadas no finitas no puede producir un recorrido.
export function planearRuta(mapa, origen, toque, objetos = []) {
  const sinRuta = { destino: null, pasos: [], frutaObjetivo: null }
  if (!Number.isInteger(origen?.fila) || !Number.isInteger(origen?.columna)
    || !Number.isFinite(toque?.fila) || !Number.isFinite(toque?.columna)
    || !esCamino(mapa, origen.fila, origen.columna)) return sinRuta

  // Esta exploración también sirve como alternativa si evitar objetos corta el
  // único pasillo disponible. Las frutas nunca vuelven inalcanzable el destino.
  const alcanzables = buscarCaminos(mapa, origen)
  const casillaTocada = {
    fila: Math.floor(toque.fila + 0.5),
    columna: Math.floor(toque.columna + 0.5),
  }
  const tocoCaminoAlcanzable = alcanzables.has(claveDeCasilla(casillaTocada.fila, casillaTocada.columna))
  const destino = tocoCaminoAlcanzable ? casillaTocada : elegirDestino(alcanzables, toque)
  // Ajustar un toque sobre muro o exterior nunca equivale a tocar la fruta que
  // casualmente ocupa el camino elegido. Ese objeto continúa en su casilla.
  const indiceObjetivo = tocoCaminoAlcanzable ? objetos.findIndex((objeto) => !objeto.recogido
    && objeto.fila === destino.fila && objeto.columna === destino.columna) : -1
  const frutaObjetivo = indiceObjetivo === -1 ? null : indiceObjetivo
  const bloqueadas = new Set()

  objetos.forEach((objeto, indice) => {
    if (!objeto.recogido && indice !== frutaObjetivo) {
      bloqueadas.add(claveDeCasilla(objeto.fila, objeto.columna))
    }
  })

  const sinOtrasFrutas = buscarCaminos(mapa, origen, bloqueadas)
  const caminoElegido = sinOtrasFrutas.has(claveDeCasilla(destino.fila, destino.columna))
    ? sinOtrasFrutas : alcanzables

  return { destino, pasos: reconstruirPasos(caminoElegido, destino), frutaObjetivo }
}
