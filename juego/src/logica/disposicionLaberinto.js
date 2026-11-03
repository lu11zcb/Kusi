// Dónde va cada cosa del laberinto según la forma de la pantalla. Es lógica pura:
// reparte medidas y no toca Phaser, así que se prueba sin abrir un navegador.
//
// Hay dos disposiciones. La clásica es la de siempre: la barra arriba, la columna
// de Kusi a la izquierda y el mapa a la derecha, todo dentro del mundo de
// 1280 × 720. La lateral es para celulares alargados: el lienzo se ensancha (el
// alto base no cambia) y la barra y Kusi se juntan en un panel a la izquierda,
// de modo que el mapa puede ocupar todo el alto de la pantalla.
import { ANCHO, ALTO } from '../medidas.js'

// Dónde cabe el mapa en la disposición clásica, bajo la barra y a la derecha de Kusi.
const ZONA_CLASICA = Object.freeze({ x: 218, y: 136, ancho: 1040, alto: 568 })
// El panel lateral nunca es más angosto que «minimo» ni más ancho que «maximo»;
// «separacion» lo aparta del mapa. Son unidades del mundo, no píxeles.
const PANEL = Object.freeze({ minimo: 340, maximo: 420, separacion: 12 })
// La disposición lateral solo se elige si agranda las casillas al menos un 12 %.
// En una pantalla de 16:9 la diferencia es mínima y se conserva la clásica.
const GANANCIA_MINIMA = 1.12

// La columna de Kusi (letrero, globo, Kusi y altavoz) mide lo mismo en las dos
// disposiciones; solo cambia a qué distancia del borde izquierdo empieza.
const GUIA = Object.freeze({
  x: 10, y: 276, ancho: 196, alto: 432,
  etiqueta: { x: 108, y: 296, ancho: 190, alto: 58 },
  globo: { x: 108, y: 458, ancho: 196, alto: 220, cola: 28 },
  kusi: { x: 64, y: 702, ancho: 94, alto: 106 },
  sombraKusi: { x: 64, y: 701, ancho: 76, alto: 10 },
  altavoz: { x: 166, y: 674 },
})

// Flores y piedras, cada una con su lugar relativo. En la disposición clásica van
// en el pasto que rodea al mapa; en la lateral no sobra pasto junto al mapa y van
// en el hueco que deja el panel a la derecha del globo.
const DECORACION_LATERAL = Object.freeze([
  { x: 270, y: 336, tipo: 'flor' }, { x: 338, y: 440, tipo: 'piedra' },
  { x: 300, y: 552, tipo: 'flor' }, { x: 252, y: 646, tipo: 'piedra' },
])

function medirClasica(filas, columnas) {
  const casilla = Math.floor(Math.min(ZONA_CLASICA.ancho / columnas, ZONA_CLASICA.alto / filas))
  const origen = {
    x: ZONA_CLASICA.x + (ZONA_CLASICA.ancho - columnas * casilla) / 2,
    y: ZONA_CLASICA.y + (ZONA_CLASICA.alto - filas * casilla) / 2,
  }
  const mapa = { ...origen, ancho: columnas * casilla, alto: filas * casilla }
  return {
    tipo: 'clasica', casilla, origen, mapa, diseno: { ancho: ANCHO, alto: ALTO }, panel: null,
    decoracion: [
      { x: mapa.x - 23, y: mapa.y + mapa.alto * 0.18, tipo: 'flor' },
      { x: mapa.x - 21, y: mapa.y + mapa.alto * 0.51, tipo: 'piedra' },
      { x: mapa.x + mapa.ancho + 21, y: mapa.y + mapa.alto * 0.33, tipo: 'piedra' },
      { x: mapa.x + mapa.ancho + 22, y: mapa.y + mapa.alto * 0.72, tipo: 'flor' },
    ].filter(({ x }) => x > 12 && x < ANCHO - 12),
  }
}

function medirLateral(ancho, alto, filas, columnas) {
  const casilla = Math.floor(Math.min(alto / filas, (ancho - PANEL.minimo - PANEL.separacion) / columnas))
  if (casilla < 1) return null
  const mapaAncho = columnas * casilla
  const mapaAlto = filas * casilla
  const panelAncho = Math.min(PANEL.maximo, ancho - mapaAncho - PANEL.separacion)
  // El conjunto panel + mapa queda centrado; lo que sobra se reparte a los lados.
  const izquierda = (ancho - (panelAncho + PANEL.separacion + mapaAncho)) / 2
  const origen = { x: izquierda + panelAncho + PANEL.separacion, y: (alto - mapaAlto) / 2 }
  return {
    tipo: 'lateral', casilla, origen, mapa: { ...origen, ancho: mapaAncho, alto: mapaAlto },
    diseno: { ancho, alto }, panel: { x: izquierda, y: 0, ancho: panelAncho, alto },
    decoracion: DECORACION_LATERAL.map((lugar) => ({ ...lugar, x: lugar.x + izquierda })),
  }
}

// «ancho» y «alto» son el tamaño del lienzo en unidades del juego; con EXPAND el
// alto es siempre el base (720) cuando la pantalla es más ancha que 16:9.
export function calcularDisposicion({ ancho, alto, filas, columnas }) {
  const clasica = medirClasica(filas, columnas)
  const lateral = alto <= ALTO + 0.5 ? medirLateral(ancho, alto, filas, columnas) : null
  return lateral && lateral.casilla >= clasica.casilla * GANANCIA_MINIMA ? lateral : clasica
}

// Los textos y botones de la barra de progreso. En la clásica es una tira ancha
// arriba; en la lateral es una tarjeta alta dentro del panel. Devuelve la caja de
// la tarjeta y la posición de cada pieza, sin dibujar nada.
export function distribuirBarra(disposicion, regla) {
  return disposicion.tipo === 'lateral' ? barraLateral(disposicion.panel, regla) : barraClasica(regla)
}

function barraClasica(regla) {
  const barra = {
    caja: { x: 20, y: 12, ancho: ANCHO - 40, alto: 104 },
    titulo: { x: 48, y: 24 }, subtitulo: { x: 48, y: 68 }, icono: null,
    botones: {
      escuchar: { x: 1030, y: 62, ancho: 138, alto: 72, tamano: 27 },
      ayuda: { x: 1184, y: 62, ancho: 118, alto: 72, tamano: 28 },
    },
  }
  if (regla.tipo === 'orden') {
    const espacio = Math.min(110, 600 / regla.secuencia.length)
    const lado = Math.min(78, espacio - 10)
    barra.fichas = regla.secuencia.map((_, indice) => {
      const x = 346 + indice * espacio
      return {
        x, y: 64, ancho: lado, alto: lado,
        imagen: { x, y: 63, lado: lado - 10 }, marca: { x: x + lado * 0.34, y: 64 + lado * 0.34 },
      }
    })
    return barra
  }
  barra.icono = { x: 344, y: 64, lado: 78 }
  const espacio = Math.min(70, 480 / regla.meta)
  barra.fichas = Array.from({ length: regla.meta }, (_, indice) => {
    const x = 432 + indice * espacio
    return { x, y: 65, ancho: espacio - 12, alto: 58, imagen: null, marca: { x, y: 65 } }
  })
  return barra
}

function barraLateral(panel, regla) {
  const caja = { x: panel.x + 12, y: 10, ancho: panel.ancho - 24, alto: 254 }
  const centro = caja.x + caja.ancho / 2
  const interior = caja.ancho - 32
  const fila = 128
  const botonEscuchar = { ancho: 150, alto: 84 }
  const botonAyuda = { ancho: 124, alto: 84 }
  const separacion = 14
  const inicio = centro - (botonEscuchar.ancho + separacion + botonAyuda.ancho) / 2
  const barra = {
    caja, titulo: { x: caja.x + 24, y: 14 }, subtitulo: { x: caja.x + 24, y: 52 }, icono: null,
    botones: {
      escuchar: { x: inicio + botonEscuchar.ancho / 2, y: 214, ...botonEscuchar, tamano: 27 },
      ayuda: { x: inicio + botonEscuchar.ancho + separacion + botonAyuda.ancho / 2, y: 214, ...botonAyuda, tamano: 28 },
    },
  }
  if (regla.tipo === 'orden') {
    const cantidad = regla.secuencia.length
    const espacio = Math.min(84, interior / cantidad)
    const lado = Math.min(66, espacio - 8)
    const primero = centro - (cantidad * espacio) / 2 + espacio / 2
    barra.fichas = regla.secuencia.map((_, indice) => {
      const x = primero + indice * espacio
      return {
        x, y: fila, ancho: lado, alto: lado,
        imagen: { x, y: fila - 1, lado: lado - 10 }, marca: { x: x + lado * 0.34, y: fila + lado * 0.34 },
      }
    })
    return barra
  }
  // La clase de la meta (fruta, verdura) va como dibujo a la izquierda de las casillas.
  const lado = 64
  barra.icono = { x: caja.x + 16 + lado / 2, y: fila, lado }
  const espacio = Math.min(64, (interior - lado - 8) / regla.meta)
  const primero = caja.x + 16 + lado + 8 + espacio / 2
  barra.fichas = Array.from({ length: regla.meta }, (_, indice) => {
    const x = primero + indice * espacio
    const ladoCasilla = Math.min(58, espacio - 10)
    return { x, y: fila, ancho: ladoCasilla, alto: ladoCasilla, imagen: null, marca: { x, y: fila } }
  })
  return barra
}

// La columna de Kusi: el letrero que explica cómo moverse, el globo con la
// consigna, Kusi con su sombrita y el altavoz. En la lateral se corre al panel.
export function distribuirGuia(disposicion) {
  const dx = disposicion.panel ? disposicion.panel.x : 0
  const mover = (pieza) => ({ ...pieza, x: pieza.x + dx })
  return {
    caja: { x: GUIA.x + dx, y: GUIA.y, ancho: GUIA.ancho, alto: GUIA.alto },
    etiqueta: mover(GUIA.etiqueta), globo: mover(GUIA.globo), kusi: mover(GUIA.kusi),
    sombraKusi: mover(GUIA.sombraKusi), altavoz: mover(GUIA.altavoz),
  }
}
