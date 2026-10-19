// Figuras simples del escenario: los puestos y el fondo de la plaza.

import plaza from '../datos/plaza.json'
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

// ---------- Fondo: la plaza vista desde arriba ----------
// Figura simple armada con src/datos/plaza.json: el piso de piedras y, encima, un dibujo sencillo
// de cada cosa que no se pisa, según su tipo. Así la figura siempre coincide con los datos.

export function dibujarPlaza(lienzo, ancho, alto) {
  pisoDePiedras(lienzo, ancho, alto)
  // Primero lo que está más arriba, para que lo de más abajo lo tape
  const formas = [...plaza.noSePisa].sort((a, b) => caja(a).abajo - caja(b).abajo)
  for (const forma of formas) DIBUJOS[forma.tipo]?.(lienzo, forma)
}

// Caja que encierra una forma: { izquierda, arriba, derecha, abajo }.
function caja(forma) {
  if (forma.forma === 'elipse') {
    return { izquierda: forma.x - forma.radioX, arriba: forma.y - forma.radioY, derecha: forma.x + forma.radioX, abajo: forma.y + forma.radioY }
  }
  if (forma.forma === 'poligono') {
    const xs = forma.puntos.map(([x]) => x)
    const ys = forma.puntos.map(([, y]) => y)
    return { izquierda: Math.min(...xs), arriba: Math.min(...ys), derecha: Math.max(...xs), abajo: Math.max(...ys) }
  }
  return { izquierda: forma.x, arriba: forma.y, derecha: forma.x + forma.ancho, abajo: forma.y + forma.alto }
}

// El camino de la forma, para rellenarla o dibujar dentro de ella.
function contorno(forma) {
  return (c) => {
    if (forma.forma === 'elipse') c.ellipse(forma.x, forma.y, forma.radioX, forma.radioY, 0, 0, Math.PI * 2)
    else if (forma.forma === 'poligono') forma.puntos.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)))
    else c.rect(forma.x, forma.y, forma.ancho, forma.alto)
    c.closePath()
  }
}

function pisoDePiedras(lienzo, ancho, alto) {
  lienzo.fillStyle = '#dccaa6'
  lienzo.fillRect(0, 0, ancho, alto)
  // Piedras en filas, cada fila corrida media piedra
  pincel(lienzo, 2, '#a8936f')
  const tonos = ['#cdbb9c', '#bfae90', '#d9cbb0', '#c4b296']
  const anchoPiedra = 64
  for (let fila = 0, y = 16; y < alto + 16; fila++, y += 32) {
    const corrimiento = fila % 2 ? anchoPiedra / 2 : 0
    for (let columna = 0, x = corrimiento; x < ancho + anchoPiedra; columna++, x += anchoPiedra) {
      const tono = tonos[(fila * 3 + columna * 5) % tonos.length]
      elipse(lienzo, x, y, 26 + ((fila + columna * 7) % 4), 12 + (columna % 2), tono)
    }
  }
}

// Pared con techo de tejas arriba y, abajo, ventanas y una puerta.
function edificio(pared) {
  return (lienzo, forma) => {
    const { izquierda, arriba, derecha, abajo } = caja(forma)
    pincel(lienzo, 3, '#8a5a40')
    trazado(lienzo, contorno(forma), pared)
    dentroDe(lienzo, contorno(forma), (c) => {
      const finTecho = arriba + (abajo - arriba) * 0.45
      c.fillStyle = '#c0573a'
      c.fillRect(izquierda, arriba, derecha - izquierda, finTecho - arriba)
      for (let y = arriba + 18; y < finTecho; y += 18) linea(c, [[izquierda, y], [derecha, y]], 2, '#9a3f28')
      for (let x = izquierda + 60; x < derecha - 40; x += 140) {
        rectangulo(c, x, abajo - 110, 34, 42, 4, '#f6e3b4')
        rectangulo(c, x + 60, abajo - 70, 40, 70, 6, '#8a5a2b')
      }
    })
    trazado(lienzo, contorno(forma), null)
  }
}

function techo(lienzo, forma) {
  const { izquierda, arriba, derecha, abajo } = caja(forma)
  pincel(lienzo, 3, '#8a5a40')
  trazado(lienzo, contorno(forma), '#c0573a')
  dentroDe(lienzo, contorno(forma), (c) => {
    for (let y = arriba + 14; y < abajo; y += 22) linea(c, [[izquierda, y], [derecha, y]], 2, '#9a3f28')
  })
  trazado(lienzo, contorno(forma), null)
}

function muro(lienzo, forma) {
  pincel(lienzo, 3, '#8a5a40')
  trazado(lienzo, contorno(forma), '#d79b63')
  const { izquierda, arriba, derecha } = caja(forma)
  rectangulo(lienzo, izquierda, arriba - 6, derecha - izquierda, 14, 4, '#b97a45')
}

function pileta(lienzo, forma) {
  if (forma.forma !== 'elipse') return // la columna del chorro va dentro del dibujo de la pileta
  const { x, y, radioX, radioY } = forma
  pincel(lienzo, 3)
  elipse(lienzo, x, y + 16, radioX, radioY, '#a99c8a')
  rectangulo(lienzo, x - radioX, y, radioX * 2, 16, 0, '#a99c8a', { borde: false })
  elipse(lienzo, x, y, radioX, radioY, '#d8cfc0')
  elipse(lienzo, x, y - 2, radioX - 30, radioY - 22, '#7cc8e8')
  // Columna del centro con su platito y el chorrito
  rectangulo(lienzo, x - 14, y - 90, 28, 96, 6, '#d8cfc0')
  elipse(lienzo, x, y - 90, 50, 18, '#e6ded1')
  elipse(lienzo, x, y - 92, 36, 10, '#7cc8e8', { borde: false })
  linea(lienzo, [[x, y - 100], [x, y - 130]], 5, '#bfe7f5')
}

function banca(lienzo, forma) {
  const { izquierda, arriba, derecha, abajo } = caja(forma)
  pincel(lienzo, 3)
  rectangulo(lienzo, izquierda + 6, arriba + 16, 8, abajo - arriba - 16, 2, '#6b4a2a')
  rectangulo(lienzo, derecha - 14, arriba + 16, 8, abajo - arriba - 16, 2, '#6b4a2a')
  rectangulo(lienzo, izquierda, arriba, derecha - izquierda, 22, 4, '#a8642f')
}

function maceta(lienzo, forma) {
  const { izquierda, arriba, derecha, abajo } = caja(forma)
  const centro = (izquierda + derecha) / 2
  const radio = (derecha - izquierda) / 2
  pincel(lienzo, 3)
  circulo(lienzo, centro, arriba - radio * 0.3, radio * 0.9, '#6fa84a')
  circulo(lienzo, centro - radio * 0.3, arriba - radio * 0.5, 5, '#e46aa8', { borde: false })
  circulo(lienzo, centro + radio * 0.3, arriba - radio * 0.2, 5, '#f4cf3c', { borde: false })
  poligono(lienzo, [[izquierda, arriba], [derecha, arriba], [derecha - 8, abajo], [izquierda + 8, abajo]], '#c96f3f')
}

function farol(lienzo, forma) {
  const { izquierda, derecha, abajo } = caja(forma)
  const x = (izquierda + derecha) / 2
  pincel(lienzo, 3)
  elipse(lienzo, x, abajo - 4, 16, 6, '#3a3446')
  rectangulo(lienzo, x - 5, abajo - 170, 10, 166, 3, '#3a3446')
  rectangulo(lienzo, x - 16, abajo - 205, 32, 38, 6, '#ffe28a')
  poligono(lienzo, [[x - 22, abajo - 205], [x + 22, abajo - 205], [x, abajo - 222]], '#3a3446')
}

const DIBUJOS = {
  casas: edificio('#f6efe6'),
  iglesia: edificio('#efe3cc'),
  techo,
  muro,
  pileta,
  banca,
  maceta,
  farol,
}
