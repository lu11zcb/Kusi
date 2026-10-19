// Figuras simples del escenario: los puestos y el fondo de la plaza.

import { PILETA } from '../medidas.js'
import { pincel, elipse, circulo, rectangulo, poligono, trazado, linea, dentroDe, colorDesdeClave } from './pinceles.js'

// ---------- Puesto (360 x 320) ----------
// Arriba el toldo, en medio un hueco transparente donde se ve al vendedor y abajo el mostrador.
// El borde de arriba del mostrador está a 206 px: ahí se apoyan los productos.
export const ALTURA_MOSTRADOR = 206

// Colores del toldo según el tipo de puesto.
const COLORES_TOLDO = {
  pan: ['#f3a12b', '#fff1d6'],
  frutas: ['#d8433a', '#fff1d6'],
  verduras: ['#5aa04a', '#f4f9e8'],
  granja: ['#f2c94c', '#fffbe9'],
  granos: ['#a8742f', '#f6e7c8'],
  dulces: ['#e46aa8', '#ffeef6'],
}

export function dibujarPuesto(lienzo, tipo) {
  pincel(lienzo, 3)
  const [color, claro] = COLORES_TOLDO[tipo] ?? [colorDesdeClave(tipo), '#fff1d6']

  // Postes de madera
  rectangulo(lienzo, 22, 40, 16, 270, 4, '#9a6a3f')
  rectangulo(lienzo, 322, 40, 16, 270, 4, '#9a6a3f')

  // Toldo a rayas con el borde de abajo en ondas
  const ondas = 10
  const anchoOnda = 352 / ondas
  const bordeToldo = 58
  const toldo = (c) => {
    c.moveTo(4, bordeToldo)
    c.lineTo(4, 22)
    c.quadraticCurveTo(4, 8, 18, 8)
    c.lineTo(342, 8)
    c.quadraticCurveTo(356, 8, 356, 22)
    c.lineTo(356, bordeToldo)
    for (let i = ondas - 1; i >= 0; i--) {
      c.arc(4 + (i + 0.5) * anchoOnda, bordeToldo, anchoOnda / 2, 0, Math.PI)
    }
    c.closePath()
  }
  trazado(lienzo, toldo, claro)
  dentroDe(lienzo, toldo, (c) => {
    for (let i = 0; i < ondas; i += 2) {
      rectangulo(c, 4 + i * anchoOnda, 0, anchoOnda, 120, 0, color, { borde: false })
    }
  })
  trazado(lienzo, toldo, null)

  // Mostrador de tablas con una tela de banderines
  rectangulo(lienzo, 10, 218, 340, 98, 6, '#c98b4f')
  for (let x = 52; x < 350; x += 42) linea(lienzo, [[x, 256], [x, 314]], 2, '#a8642f')
  rectangulo(lienzo, 10, 224, 340, 22, 0, color)
  for (let x = 10, i = 0; x < 350; x += 34, i++) {
    poligono(lienzo, [[x, 246], [Math.min(x + 34, 350), 246], [Math.min(x + 17, 350), 262]], i % 2 ? claro : color)
  }
  rectangulo(lienzo, 0, ALTURA_MOSTRADOR, 360, 20, 6, '#a8642f')
}

// ---------- Fondo: la plaza vista desde arriba (2560 x 1080) ----------
// Arriba las casas, a los lados jardineras, abajo un muro bajito con la entrada al centro y,
// en medio, la pileta. La pileta sale de medidas.js para que el dibujo coincida con lo que el cuy
// no puede pisar.

const PIE_CASAS = 250 // donde las casas tocan la vereda
const ANCHO_VEREDA = 40
const ARRIBA_MURO = 1036
const ENTRADA = { izquierda: 1130, derecha: 1430 } // hueco del muro de abajo
const ANCHO_JARDINERA = 76

export function dibujarPlaza(lienzo, ancho, alto) {
  pisoDePiedras(lienzo, ancho, alto)
  caminoALaPileta(lienzo, alto)
  casas(lienzo, ancho)
  banderines(lienzo, ancho)
  jardinera(lienzo, 0)
  jardinera(lienzo, ancho - ANCHO_JARDINERA)
  muro(lienzo, ancho, alto)
  pileta(lienzo)
}

function pisoDePiedras(lienzo, ancho, alto) {
  lienzo.fillStyle = '#dccaa6'
  lienzo.fillRect(0, 0, ancho, alto)
  // Piedras en filas, cada fila corrida media piedra
  pincel(lienzo, 2, '#a8936f')
  const tonos = ['#cdbb9c', '#bfae90', '#d9cbb0', '#c4b296']
  const anchoPiedra = 64
  for (let fila = 0, y = PIE_CASAS + ANCHO_VEREDA + 18; y < alto + 16; fila++, y += 32) {
    const corrimiento = fila % 2 ? anchoPiedra / 2 : 0
    for (let columna = 0, x = corrimiento; x < ancho + anchoPiedra; columna++, x += anchoPiedra) {
      const tono = tonos[(fila * 3 + columna * 5) % tonos.length]
      elipse(lienzo, x, y, 26 + ((fila + columna * 7) % 4), 12 + (columna % 2), tono)
    }
  }
}

// Camino de losas claras desde la entrada hasta la pileta, y un anillo alrededor de ella.
function caminoALaPileta(lienzo, alto) {
  const { x, y, radioX, radioY } = PILETA
  pincel(lienzo, 3, '#b9a07a')
  rectangulo(lienzo, x - 110, y, 220, alto - y + 10, 0, '#eadfc6')
  elipse(lienzo, x, y + 8, radioX + 90, radioY + 52, '#eadfc6')
  // Juntas de las losas
  for (let fila = y + radioY + 70; fila < alto; fila += 44) linea(lienzo, [[x - 108, fila], [x + 108, fila]], 2, '#cdbb9c')
  linea(lienzo, [[x, y + radioY + 60], [x, alto]], 2, '#cdbb9c')
}

// ---------- Casas de arriba, con el techo visto desde arriba ----------

const CASAS = [
  { ancho: 240, pared: '#fbf3e4', techo: 96, flores: true },
  { ancho: 200, pared: '#f2d39b', techo: 116 },
  { ancho: 260, pared: '#f6efe6', techo: 84, flores: true },
  { ancho: 190, pared: '#e9c2a6', techo: 108 },
  { ancho: 230, pared: '#f4dcb0', techo: 92, flores: true },
  { ancho: 210, pared: '#fbf3e4', techo: 104 },
]

function ventana(lienzo, x, y, flores) {
  rectangulo(lienzo, x, y, 30, 38, 4, '#f6e3b4')
  linea(lienzo, [[x + 15, y], [x + 15, y + 38]], 2, '#7a4b2f')
  rectangulo(lienzo, x - 10, y, 10, 38, 2, '#5f8f3a')
  rectangulo(lienzo, x + 30, y, 10, 38, 2, '#5f8f3a')
  if (flores) {
    rectangulo(lienzo, x - 6, y + 38, 42, 10, 2, '#9a6a3f')
    for (const [dx, color] of [[2, '#d8433a'], [15, '#f4cf3c'], [28, '#e46aa8']]) circulo(lienzo, x + dx, y + 36, 5, color)
  }
}

function casa(lienzo, x, { ancho, pared, techo, flores }) {
  // Pared con la puerta de arco al medio y una ventana a cada lado
  rectangulo(lienzo, x, techo - 6, ancho, PIE_CASAS - techo + 6, 0, pared)
  const centro = x + ancho / 2
  trazado(lienzo, (c) => {
    c.moveTo(centro - 24, PIE_CASAS)
    c.lineTo(centro - 24, PIE_CASAS - 58)
    c.arc(centro, PIE_CASAS - 58, 24, Math.PI, 0)
    c.lineTo(centro + 24, PIE_CASAS)
  }, '#8a5a2b')
  ventana(lienzo, x + 34, PIE_CASAS - 100, flores)
  ventana(lienzo, x + ancho - 64, PIE_CASAS - 100, flores)

  // Techo de tejas: filas que bajan hasta el alero
  rectangulo(lienzo, x, -10, ancho, techo + 10, 0, '#c0573a')
  for (let fila = 0, y = 16; y < techo - 6; fila++, y += 18) {
    linea(lienzo, [[x + 3, y], [x + ancho - 3, y]], 2, '#9a3f28')
    for (let t = x + (fila % 2 ? 22 : 11); t < x + ancho - 6; t += 22) linea(lienzo, [[t, y - 16], [t, y]], 2, '#a8462d')
  }
  rectangulo(lienzo, x, techo - 8, ancho, 10, 3, '#9a3f28')
}

function casas(lienzo, ancho) {
  pincel(lienzo, 2.5, '#8a5a40')
  for (let x = 0, i = 0; x < ancho; i++) {
    const datos = CASAS[i % CASAS.length]
    casa(lienzo, x, datos)
    x += datos.ancho
  }
  // Vereda delante de las casas
  lienzo.fillStyle = '#c9b28a'
  lienzo.fillRect(0, PIE_CASAS, ancho, ANCHO_VEREDA)
  linea(lienzo, [[0, PIE_CASAS], [ancho, PIE_CASAS]], 3, '#8a5a40')
  linea(lienzo, [[0, PIE_CASAS + ANCHO_VEREDA], [ancho, PIE_CASAS + ANCHO_VEREDA]], 3, '#8a7350')
}

// Banderines de fiesta colgados de casa en casa.
function banderines(lienzo, ancho) {
  const tramo = 320
  const curva = (px) => 150 + 40 * Math.sin((Math.PI * (px % tramo)) / tramo)
  linea(lienzo, Array.from({ length: Math.ceil(ancho / 10) + 1 }, (_, i) => [i * 10, curva(i * 10)]), 2, '#6b4a2a')
  const colores = ['#d8433a', '#f4cf3c', '#5aa04a', '#e46aa8', '#f3a12b', '#7b3f8c']
  pincel(lienzo, 2.5, '#8a5a40')
  for (let px = 20, i = 0; px < ancho; px += 40, i++) {
    const y = curva(px)
    poligono(lienzo, [[px - 12, y], [px + 12, y], [px, y + 28]], colores[i % colores.length])
  }
}

// ---------- Bordes de la plaza ----------

// Jardinera alargada a un lado de la plaza, con arbustos floridos.
function jardinera(lienzo, izquierda) {
  const arriba = PIE_CASAS + ANCHO_VEREDA
  pincel(lienzo, 3)
  rectangulo(lienzo, izquierda, arriba, ANCHO_JARDINERA, ARRIBA_MURO - arriba, 6, '#b97a45')
  rectangulo(lienzo, izquierda + 10, arriba + 10, ANCHO_JARDINERA - 20, ARRIBA_MURO - arriba - 20, 6, '#8fbf5a')
  const x = izquierda + ANCHO_JARDINERA / 2
  const colores = ['#d8433a', '#f4cf3c', '#e46aa8']
  for (let y = arriba + 70, i = 0; y < ARRIBA_MURO - 40; y += 120, i++) {
    circulo(lienzo, x, y, 26, '#6fa84a')
    circulo(lienzo, x - 9, y - 7, 5, colores[i % 3], { borde: false })
    circulo(lienzo, x + 10, y + 4, 5, colores[(i + 1) % 3], { borde: false })
  }
}

// Muro bajito de adobe con la entrada al medio, donde espera Kusi.
function muro(lienzo, ancho, alto) {
  pincel(lienzo, 3)
  for (const [desde, hasta] of [[0, ENTRADA.izquierda], [ENTRADA.derecha, ancho]]) {
    rectangulo(lienzo, desde, ARRIBA_MURO, hasta - desde, alto - ARRIBA_MURO + 10, 0, '#d79b63')
    for (let x = desde + 40; x < hasta; x += 80) linea(lienzo, [[x, ARRIBA_MURO + 14], [x, ARRIBA_MURO + 30]], 2, '#a8642f')
    linea(lienzo, [[desde, ARRIBA_MURO + 30], [hasta, ARRIBA_MURO + 30]], 2, '#a8642f')
    rectangulo(lienzo, desde, ARRIBA_MURO - 8, hasta - desde, 16, 4, '#b97a45')
  }
  // Pilares a los lados de la entrada, con una plantita encima
  for (const x of [ENTRADA.izquierda, ENTRADA.derecha]) {
    rectangulo(lienzo, x - 24, ARRIBA_MURO - 36, 48, alto - ARRIBA_MURO + 46, 6, '#c98b4f')
    circulo(lienzo, x, ARRIBA_MURO - 42, 18, '#6fa84a')
    circulo(lienzo, x - 5, ARRIBA_MURO - 46, 4, '#f4cf3c', { borde: false })
  }
}

// ---------- Pileta del centro ----------

function pileta(lienzo) {
  const { x, y, radioX, radioY } = PILETA
  const alto = 16 // lo que se ve del costado de piedra
  pincel(lienzo, 3)

  // Sombra, costado y borde de piedra
  elipse(lienzo, x + 10, y + alto + 10, radioX + 4, radioY + 4, 'rgba(75, 33, 27, 0.16)', { borde: false })
  elipse(lienzo, x, y + alto, radioX, radioY, '#a99c8a')
  rectangulo(lienzo, x - radioX, y, radioX * 2, alto, 0, '#a99c8a', { borde: false })
  linea(lienzo, [[x - radioX, y], [x - radioX, y + alto]])
  linea(lienzo, [[x + radioX, y], [x + radioX, y + alto]])
  elipse(lienzo, x, y, radioX, radioY, '#d8cfc0')

  // Agua con ondas
  elipse(lienzo, x, y - 2, radioX - 22, radioY - 14, '#7cc8e8')
  lienzo.save()
  pincel(lienzo, 2.5, '#d4f0fa')
  for (const [dx, dy, radio] of [[-80, 10, 24], [70, -14, 20], [40, 26, 16]]) {
    lienzo.beginPath()
    lienzo.ellipse(x + dx, y + dy, radio, radio * 0.45, 0, Math.PI * 1.1, Math.PI * 1.9)
    lienzo.stroke()
  }
  lienzo.restore()

  // Columna del centro con su platito y el chorrito de agua
  elipse(lienzo, x, y + 6, 26, 11, '#cfc5b5')
  rectangulo(lienzo, x - 13, y - 40, 26, 46, 6, '#d8cfc0')
  elipse(lienzo, x, y - 42, 32, 12, '#e6ded1')
  elipse(lienzo, x, y - 44, 22, 7, '#7cc8e8', { borde: false })
  linea(lienzo, [[x - 22, y - 34], [x - 30, y - 22]], 3, '#bfe7f5')
  linea(lienzo, [[x + 22, y - 34], [x + 30, y - 22]], 3, '#bfe7f5')
  linea(lienzo, [[x, y - 48], [x, y - 64]], 4, '#bfe7f5')
}
