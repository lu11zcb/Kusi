// Esta lista pequeña describe los dibujos admitidos por el juego. La validación
// pedagógica y la comprobación completa de los caminos pertenecen a Spring (HU31).
export const CLASES_LABERINTO = {
  fruta: ['fresa', 'platano', 'mango', 'mandarina', 'pina'],
  verdura: ['zanahoria', 'papa', 'choclo'],
}

const TIPOS_OBJETO = new Set(Object.values(CLASES_LABERINTO).flat())
const MOVIMIENTOS_ZORRO = new Set(['patrulla', 'persigue_cerca'])

function validarMapa(mapa, nombre, errores) {
  // Antes de leer coordenadas necesitamos un rectángulo de texto. Un mapa
  // incompleto se rechaza aquí para no acceder a una fila que no existe.
  if (!Array.isArray(mapa) || mapa.length === 0 ||
      mapa.some((fila) => typeof fila !== 'string' || fila.length === 0)) {
    errores.push(nombre + ': el mapa debe contener filas de texto')
    return false
  }

  if (mapa.some((fila) => fila.length !== mapa[0].length)) {
    errores.push(nombre + ': las filas del mapa deben tener el mismo largo')
    return false
  }

  const casillas = mapa.join('')
  if (/[^#.CP]/.test(casillas)) {
    errores.push(nombre + ': el mapa contiene una casilla desconocida')
  }
  if ([...casillas].filter((casilla) => casilla === 'C').length !== 1) {
    errores.push(nombre + ': debe haber un solo inicio C')
  }
  if ([...casillas].filter((casilla) => casilla === 'P').length !== 1) {
    errores.push(nombre + ': debe haber una sola puerta P')
  }
  return true
}

function estaSobreCamino(elemento, mapa) {
  return Number.isInteger(elemento?.fila) && Number.isInteger(elemento?.columna) &&
    mapa[elemento.fila]?.[elemento.columna] === '.'
}

function validarRegla(regla, nombre, errores) {
  if (regla?.tipo === 'orden') {
    if (!Array.isArray(regla.secuencia) || regla.secuencia.length === 0 ||
        regla.secuencia.some((tipo) => !TIPOS_OBJETO.has(tipo))) {
      errores.push(nombre + ': la secuencia debe contener objetos conocidos')
    }
  } else if (regla?.tipo === 'solo_clase') {
    if (!Object.hasOwn(CLASES_LABERINTO, regla.clase) ||
        !Number.isInteger(regla.meta) || regla.meta <= 0) {
      errores.push(nombre + ': falta una clase conocida o una meta positiva')
    }
  } else {
    errores.push(nombre + ': la regla no es compatible')
  }
}

export function validarLaberinto(paquete) {
  const errores = []
  if (!paquete || typeof paquete !== 'object' || Array.isArray(paquete)) {
    return { valido: false, errores: ['El paquete debe ser un objeto JSON'] }
  }
  if (paquete.formato !== 'kusi-paquete/0' || paquete.familia !== 'laberinto') {
    errores.push('El formato o la familia del laberinto no es compatible')
  }
  if (!Array.isArray(paquete.retos) || paquete.retos.length === 0) {
    errores.push('El laberinto debe contener al menos un nivel')
  } else {
    paquete.retos.forEach((reto, indice) => {
      const nombre = 'Nivel ' + (indice + 1)
      if (!reto || typeof reto !== 'object' || Array.isArray(reto)) {
        errores.push(nombre + ': falta la información del nivel')
        return
      }

      const mapaLegible = validarMapa(reto.mapa, nombre, errores)
      validarRegla(reto.regla, nombre, errores)

      // Solo comprobamos las formas que la pantalla necesita para dibujar y
      // mostrar sus mensajes. No buscamos soluciones ni validamos dificultad.
      if (typeof reto.consigna !== 'string' || !reto.consigna.trim() ||
          !Array.isArray(reto.ayudas) || reto.ayudas.length !== 2 ||
          reto.ayudas.some((ayuda) => typeof ayuda !== 'string' || !ayuda.trim())) {
        errores.push(nombre + ': falta la consigna o las dos ayudas')
      }

      if (!Array.isArray(reto.objetos)) {
        errores.push(nombre + ': falta la lista de objetos')
      } else {
        reto.objetos.forEach((objeto) => {
          if (!TIPOS_OBJETO.has(objeto?.tipo) ||
              (mapaLegible && !estaSobreCamino(objeto, reto.mapa))) {
            errores.push(nombre + ': hay un objeto desconocido o fuera del camino')
          }
        })
      }

      if (!Array.isArray(reto.enemigos)) {
        errores.push(nombre + ': falta la lista de enemigos')
      } else {
        reto.enemigos.forEach((enemigo) => {
          if (enemigo?.tipo !== 'zorro' || !MOVIMIENTOS_ZORRO.has(enemigo?.movimiento) ||
              (mapaLegible && !estaSobreCamino(enemigo, reto.mapa))) {
            errores.push(nombre + ': hay un enemigo desconocido o fuera del camino')
          }
        })
      }
    })
  }

  return { valido: errores.length === 0, errores }
}
