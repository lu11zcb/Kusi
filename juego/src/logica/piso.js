// El piso de la plaza: por dónde puede caminar el cuy y cómo llegar a un punto sin atravesar
// los puestos, la pileta, las casas ni a Kusi. Las cajas y elipses se guardan ya agrandadas con el
// tamaño de las patitas del cuy, así que basta con revisar un solo punto: el de sus patitas.
// Los polígonos (casas, iglesia, techos) no se agrandan: se revisan el centro y los bordes de las patitas.

const CELDA = 30 // px; para buscar caminos la plaza se divide en celdas de este tamaño
const PASO_REVISION = 8 // px entre los puntos que se revisan en una línea recta
const DIAGONAL = Math.SQRT2

export class Piso {
  // `zona`: { izquierda, derecha, arriba, abajo } donde pueden pisar las patitas.
  // `patitas`: { ancho, alto } de lo que ocupan las patitas en el piso.
  constructor(zona, patitas) {
    this.zona = zona
    this.patitas = patitas
    this.cajas = []
    this.elipses = []
    this.poligonos = []
    this.columnas = Math.floor((zona.derecha - zona.izquierda) / CELDA)
    this.filas = Math.floor((zona.abajo - zona.arriba) / CELDA)
    this.celdasLibres = null // se calculan la primera vez que se busca un camino
  }

  // Una caja que el cuy no puede pisar.
  agregarCaja(izquierda, arriba, derecha, abajo) {
    const { ancho, alto } = this.patitas
    this.cajas.push({ izquierda: izquierda - ancho / 2, derecha: derecha + ancho / 2, arriba: arriba - alto / 2, abajo: abajo + alto / 2 })
  }

  // Una elipse que el cuy no puede pisar (la pileta).
  agregarElipse(x, y, radioX, radioY) {
    this.elipses.push({ x, y, radioX: radioX + this.patitas.ancho / 2, radioY: radioY + this.patitas.alto / 2 })
  }

  // Un polígono que el cuy no puede pisar: puntos [x, y] en orden.
  agregarPoligono(puntos) {
    this.poligonos.push(puntos)
  }

  // Una forma del archivo de la plaza (src/datos/plaza.json): caja, elipse o polígono.
  agregarForma(forma) {
    if (forma.forma === 'caja') this.agregarCaja(forma.x, forma.y, forma.x + forma.ancho, forma.y + forma.alto)
    else if (forma.forma === 'elipse') this.agregarElipse(forma.x, forma.y, forma.radioX, forma.radioY)
    else if (forma.forma === 'poligono') this.agregarPoligono(forma.puntos)
    else console.warn('[plaza] Forma desconocida', forma)
  }

  libre(x, y) {
    const { zona } = this
    if (x < zona.izquierda || x > zona.derecha || y < zona.arriba || y > zona.abajo) return false
    for (const caja of this.cajas) {
      if (x > caja.izquierda && x < caja.derecha && y > caja.arriba && y < caja.abajo) return false
    }
    for (const elipse of this.elipses) {
      if (((x - elipse.x) / elipse.radioX) ** 2 + ((y - elipse.y) / elipse.radioY) ** 2 < 1) return false
    }
    if (this.poligonos.length) {
      const medioAncho = this.patitas.ancho / 2
      const medioAlto = this.patitas.alto / 2
      const puntos = [[x, y], [x - medioAncho, y], [x + medioAncho, y], [x, y - medioAlto], [x, y + medioAlto]]
      for (const poligono of this.poligonos) {
        if (puntos.some(([px, py]) => dentroDelPoligono(px, py, poligono))) return false
      }
    }
    return true
  }

  // Avanza si el lugar está libre. Si choca, prueba de lado y después hacia arriba o abajo:
  // así el cuy se desliza por el borde de un puesto en vez de quedarse pegado.
  mover(x, y, dx, dy) {
    if (this.libre(x + dx, y + dy)) return { x: x + dx, y: y + dy }
    const nuevoX = this.libre(x + dx, y) ? x + dx : x
    const nuevoY = this.libre(nuevoX, y + dy) ? y + dy : y
    return { x: nuevoX, y: nuevoY }
  }

  lineaLibre(a, b) {
    const pasos = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / PASO_REVISION)
    for (let i = 1; i <= pasos; i++) {
      const t = i / pasos
      if (!this.libre(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false
    }
    return true
  }

  // Puntos para ir de `desde` a `hasta` en líneas rectas, rodeando lo que haya en medio.
  // Si `hasta` cae sobre algo (la pileta, Kusi), llega a su borde del lado de donde viene el cuy.
  // Devuelve null si no hay cómo llegar.
  camino(desde, hasta) {
    const meta = this.libre(hasta.x, hasta.y) ? { x: hasta.x, y: hasta.y } : this.bordeHacia(hasta, desde)
    if (!meta) return null
    if (this.lineaLibre(desde, meta)) return [meta]
    const celdas = this.buscarCeldas(this.celdaLibreCercana(desde), this.celdaLibreCercana(meta))
    if (!celdas) return null
    const puntos = [{ x: desde.x, y: desde.y }, ...celdas.slice(1, -1).map((celda) => this.centro(celda)), meta]
    return this.acortar(puntos)
  }

  // Primer punto libre yendo de `punto` hacia `desde`. Si no hay ninguno, la celda libre más cercana.
  bordeHacia(punto, desde) {
    const pasos = Math.ceil(Math.hypot(desde.x - punto.x, desde.y - punto.y) / PASO_REVISION)
    for (let i = 1; i <= pasos; i++) {
      const t = i / pasos
      const x = punto.x + (desde.x - punto.x) * t
      const y = punto.y + (desde.y - punto.y) * t
      if (this.libre(x, y)) return { x, y }
    }
    return this.centro(this.celdaLibreCercana(punto))
  }

  // ---------- Celdas ----------

  centro(celda) {
    if (celda === null) return null
    const columna = celda % this.columnas
    const fila = Math.floor(celda / this.columnas)
    return { x: this.zona.izquierda + (columna + 0.5) * CELDA, y: this.zona.arriba + (fila + 0.5) * CELDA }
  }

  celdaLibre(columna, fila) {
    if (columna < 0 || fila < 0 || columna >= this.columnas || fila >= this.filas) return false
    if (!this.celdasLibres) {
      this.celdasLibres = new Uint8Array(this.columnas * this.filas)
      for (let i = 0; i < this.celdasLibres.length; i++) {
        const { x, y } = this.centro(i)
        this.celdasLibres[i] = this.libre(x, y) ? 1 : 0
      }
    }
    return this.celdasLibres[fila * this.columnas + columna] === 1
  }

  // La celda libre más cercana a un punto (la suya, si está libre).
  celdaLibreCercana(punto) {
    const columna = Math.floor((punto.x - this.zona.izquierda) / CELDA)
    const fila = Math.floor((punto.y - this.zona.arriba) / CELDA)
    if (this.celdaLibre(columna, fila)) return fila * this.columnas + columna
    let mejor = null
    let menor = Infinity
    for (let i = 0; i < this.columnas * this.filas; i++) {
      if (!this.celdaLibre(i % this.columnas, Math.floor(i / this.columnas))) continue
      const { x, y } = this.centro(i)
      const distancia = Math.hypot(x - punto.x, y - punto.y)
      if (distancia < menor) {
        menor = distancia
        mejor = i
      }
    }
    return mejor
  }

  // Búsqueda A* de celda en celda, en 8 direcciones. En diagonal no corta esquinas.
  buscarCeldas(inicio, fin) {
    if (inicio === null || fin === null) return null
    const total = this.columnas * this.filas
    const costo = new Float64Array(total).fill(Infinity)
    const anterior = new Int32Array(total).fill(-1)
    const cerrada = new Uint8Array(total)
    const finColumna = fin % this.columnas
    const finFila = Math.floor(fin / this.columnas)
    const estimar = (celda) => {
      const dx = Math.abs((celda % this.columnas) - finColumna)
      const dy = Math.abs(Math.floor(celda / this.columnas) - finFila)
      return dx + dy + (DIAGONAL - 2) * Math.min(dx, dy)
    }

    costo[inicio] = 0
    const abiertas = [inicio]
    while (abiertas.length) {
      // La celda abierta más prometedora
      let indice = 0
      for (let k = 1; k < abiertas.length; k++) {
        if (costo[abiertas[k]] + estimar(abiertas[k]) < costo[abiertas[indice]] + estimar(abiertas[indice])) indice = k
      }
      const actual = abiertas[indice]
      abiertas[indice] = abiertas[abiertas.length - 1]
      abiertas.pop()
      if (actual === fin) return this.recorrer(anterior, fin)
      if (cerrada[actual]) continue
      cerrada[actual] = 1

      const columna = actual % this.columnas
      const fila = Math.floor(actual / this.columnas)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue
          if (!this.celdaLibre(columna + dx, fila + dy)) continue
          if (dx && dy && (!this.celdaLibre(columna + dx, fila) || !this.celdaLibre(columna, fila + dy))) continue
          const vecina = (fila + dy) * this.columnas + columna + dx
          const nuevo = costo[actual] + (dx && dy ? DIAGONAL : 1)
          if (nuevo < costo[vecina]) {
            costo[vecina] = nuevo
            anterior[vecina] = actual
            abiertas.push(vecina)
          }
        }
      }
    }
    return null
  }

  recorrer(anterior, fin) {
    const celdas = [fin]
    while (anterior[celdas[0]] !== -1) celdas.unshift(anterior[celdas[0]])
    return celdas
  }

  // Quita los puntos que sobran: desde cada punto salta al más lejano que se ve en línea recta.
  acortar(puntos) {
    const resultado = []
    let i = 0
    while (i < puntos.length - 1) {
      let j = puntos.length - 1
      while (j > i + 1 && !this.lineaLibre(puntos[i], puntos[j])) j--
      resultado.push(puntos[j])
      i = j
    }
    return resultado
  }
}

// ¿El punto está dentro del polígono? Cuenta cuántas veces una línea hacia la derecha cruza sus bordes.
function dentroDelPoligono(x, y, puntos) {
  let dentro = false
  for (let i = 0, j = puntos.length - 1; i < puntos.length; j = i++) {
    const [xi, yi] = puntos[i]
    const [xj, yj] = puntos[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}
