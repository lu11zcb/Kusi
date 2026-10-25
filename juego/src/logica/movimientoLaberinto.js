// Esta lógica solo conoce casillas y tiempo. Phaser se encarga de dibujar la
// posición intermedia y de animar al personaje, sin decidir por dónde camina.
const DESPLAZAMIENTOS = {
  arriba: { fila: -1, columna: 0 },
  abajo: { fila: 1, columna: 0 },
  izquierda: { fila: 0, columna: -1 },
  derecha: { fila: 0, columna: 1 },
}

// Evita que errores mínimos de decimales dejen al cuy casi en una esquina.
const MARGEN_DECIMAL = 0.000000001

function puedeAvanzar(estado, mapa, direccion) {
  const desplazamiento = DESPLAZAMIENTOS[direccion]
  if (!desplazamiento) return false

  const fila = estado.fila + desplazamiento.fila
  const columna = estado.columna + desplazamiento.columna
  const casilla = mapa[fila]?.[columna]
  return casilla === '.' || casilla === 'C' || casilla === 'P'
}

// Los cambios de rumbo se resuelven únicamente en el centro de una casilla.
// Si todavía no existe una salida en la dirección solicitada, la conservamos:
// así un deslizamiento temprano sirve para doblar en la próxima esquina.
function elegirDireccion(estado, mapa) {
  if (puedeAvanzar(estado, mapa, estado.direccionPendiente)) {
    estado.direccion = estado.direccionPendiente
    estado.direccionPendiente = null
    estado.moviendose = true
  }

  if (!estado.moviendose || !puedeAvanzar(estado, mapa, estado.direccion)) {
    estado.moviendose = false
    return false
  }

  return true
}

export function crearMovimiento(mapa) {
  for (let fila = 0; fila < mapa.length; fila += 1) {
    const columna = mapa[fila].indexOf('C')
    if (columna !== -1) {
      return {
        fila,
        columna,
        direccion: 'abajo',
        direccionPendiente: null,
        progreso: 0,
        moviendose: false,
      }
    }
  }

  throw new Error('El mapa necesita una casilla C para iniciar al cuy.')
}

export function pedirDireccion(estado, direccion) {
  if (Object.hasOwn(DESPLAZAMIENTOS, direccion)) {
    estado.direccionPendiente = direccion
  }
  return estado
}

// fila y columna siempre señalan el centro de la casilla de origen. El progreso
// expresa la fracción recorrida hacia la siguiente casilla en «direccion».
// Consumimos el tiempo restante después de cada llegada para que un fotograma
// lento pueda recorrer varias casillas, revisando muros y giros en todas ellas.
export function avanzarMovimiento(estado, mapa, segundos, casillasPorSegundo = 3) {
  if (!Number.isFinite(segundos) || segundos < 0
    || !Number.isFinite(casillasPorSegundo) || casillasPorSegundo <= 0) {
    return estado
  }

  let distanciaRestante = segundos * casillasPorSegundo
  if (!Number.isFinite(distanciaRestante)) return estado
  if (estado.progreso === 0 && !elegirDireccion(estado, mapa)) return estado

  while (distanciaRestante > MARGEN_DECIMAL) {
    const hastaSiguienteCasilla = 1 - estado.progreso
    if (distanciaRestante + MARGEN_DECIMAL < hastaSiguienteCasilla) {
      estado.progreso += distanciaRestante
      break
    }

    const desplazamiento = DESPLAZAMIENTOS[estado.direccion]
    estado.fila += desplazamiento.fila
    estado.columna += desplazamiento.columna
    estado.progreso = 0
    distanciaRestante = Math.max(0, distanciaRestante - hastaSiguienteCasilla)

    // Decidimos también si se consumió exactamente la distancia disponible:
    // ante un muro, la animación debe quedar quieta en este mismo fotograma.
    if (!elegirDireccion(estado, mapa)) break
  }

  return estado
}

// inicio y fin usan las coordenadas de pantalla { x, y }. Una única función
// permite que el ratón, el dedo y las pruebas compartan el umbral de 30 px.
export function direccionDelDeslizamiento(inicio, fin, minimo = 30) {
  const horizontal = fin.x - inicio.x
  const vertical = fin.y - inicio.y
  const mayorDistancia = Math.max(Math.abs(horizontal), Math.abs(vertical))
  if (!Number.isFinite(mayorDistancia) || mayorDistancia < minimo) return null

  if (Math.abs(horizontal) >= Math.abs(vertical)) {
    return horizontal > 0 ? 'derecha' : 'izquierda'
  }
  return vertical > 0 ? 'abajo' : 'arriba'
}
