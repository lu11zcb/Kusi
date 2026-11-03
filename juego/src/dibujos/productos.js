// Figuras simples de las frutas y verduras del laberinto (96 x 96).

import {
  pincel, elipse, circulo, poligono, trazado, linea, dentroDe,
  colorDesdeClave,
} from './pinceles.js'

const HOJA = '#5aa04a'

// Puntitos repartidos dentro de la figura para semillas y marcas de la cáscara.
function puntitos(lienzo, lista, radio, color) {
  for (const [x, y] of lista) circulo(lienzo, x, y, radio, color, { borde: false })
}

// Hojita verde inclinada.
function hoja(lienzo, x, y, giro = -0.6, tamano = 1) {
  elipse(lienzo, x, y, 12 * tamano, 6 * tamano, HOJA, { giro })
}

const PRODUCTOS = {
  fresa(lienzo) {
    trazado(lienzo, (c) => {
      c.moveTo(48, 86)
      c.bezierCurveTo(16, 64, 18, 28, 48, 30)
      c.bezierCurveTo(78, 28, 80, 64, 48, 86)
    }, '#e0383e')
    puntitos(lienzo, [[38, 46], [56, 44], [46, 58], [36, 62], [60, 60], [48, 72]], 2.5, '#f8e06a')
    hoja(lienzo, 38, 28, -0.4)
    hoja(lienzo, 58, 28, 0.4)
    linea(lienzo, [[48, 28], [50, 14]], 4, HOJA)
  },
  platano(lienzo) {
    trazado(lienzo, (c) => {
      c.moveTo(18, 30)
      c.quadraticCurveTo(30, 80, 82, 66)
      c.quadraticCurveTo(84, 56, 76, 58)
      c.quadraticCurveTo(38, 64, 28, 26)
      c.closePath()
    }, '#f4cf3c')
    linea(lienzo, [[18, 30], [24, 24]], 5, '#6b4a2a')
  },
  mango(lienzo) {
    elipse(lienzo, 48, 54, 30, 34, '#f5a623', { giro: 0.4 })
    lienzo.save()
    lienzo.globalAlpha = 0.6
    elipse(lienzo, 38, 46, 14, 18, '#e8553e', { borde: false, giro: 0.4 })
    lienzo.restore()
    hoja(lienzo, 62, 20, -0.3)
  },
  pina(lienzo) {
    // Hojas de la corona y cuerpo con rombos
    poligono(lienzo, [[48, 6], [40, 30], [56, 30]], HOJA)
    poligono(lienzo, [[30, 14], [38, 32], [48, 28]], HOJA)
    poligono(lienzo, [[66, 14], [58, 32], [48, 28]], HOJA)
    const cuerpo = (c) => c.ellipse(48, 60, 24, 30, 0, 0, Math.PI * 2)
    trazado(lienzo, cuerpo, '#e9b53b')
    dentroDe(lienzo, cuerpo, (c) => {
      for (let i = -3; i <= 3; i++) {
        linea(c, [[24 + i * 14, 30], [72 + i * 14, 92]], 2, '#b8822a')
        linea(c, [[72 - i * 14, 30], [24 - i * 14, 92]], 2, '#b8822a')
      }
    })
    trazado(lienzo, cuerpo, null)
  },
  mandarina(lienzo) {
    circulo(lienzo, 48, 56, 30, '#f39a2b')
    puntitos(lienzo, [[38, 48], [56, 46], [44, 64], [60, 62]], 1.8, '#d9761a')
    hoja(lienzo, 58, 24, -0.5)
    circulo(lienzo, 48, 27, 3, '#6b4a2a', { borde: false })
  },
  papa(lienzo) {
    trazado(lienzo, (c) => {
      c.moveTo(20, 56)
      c.bezierCurveTo(16, 30, 60, 26, 76, 40)
      c.bezierCurveTo(88, 52, 78, 80, 50, 80)
      c.bezierCurveTo(30, 80, 22, 70, 20, 56)
    }, '#c8a06a')
    puntitos(lienzo, [[36, 46], [58, 44], [50, 64], [68, 58]], 2.5, '#8a6a40')
  },
  choclo(lienzo) {
    // Hojas verdes a los lados y granos amarillos
    elipse(lienzo, 34, 56, 12, 32, HOJA, { giro: 0.35 })
    elipse(lienzo, 62, 56, 12, 32, HOJA, { giro: -0.35 })
    const mazorca = (c) => c.ellipse(48, 46, 17, 34, 0, 0, Math.PI * 2)
    trazado(lienzo, mazorca, '#f3c93d')
    dentroDe(lienzo, mazorca, (c) => {
      for (let y = 18; y < 82; y += 9) linea(c, [[30, y], [66, y]], 1.5, '#c99a1f')
      linea(c, [[42, 12], [42, 82]], 1.5, '#c99a1f')
      linea(c, [[54, 12], [54, 82]], 1.5, '#c99a1f')
    })
    trazado(lienzo, mazorca, null)
    elipse(lienzo, 40, 74, 10, 20, '#6fb556', { giro: 0.25 })
    elipse(lienzo, 56, 74, 10, 20, '#6fb556', { giro: -0.25 })
  },
  zanahoria(lienzo) {
    poligono(lienzo, [[34, 30], [62, 30], [50, 90], [46, 90]], '#ee7d2b')
    linea(lienzo, [[40, 44], [48, 44]], 2.5)
    linea(lienzo, [[50, 58], [57, 58]], 2.5)
    linea(lienzo, [[44, 70], [50, 70]], 2.5)
    poligono(lienzo, [[48, 30], [36, 6], [46, 12], [48, 4], [52, 12], [62, 6]], HOJA)
  },
}

// Cualquier producto sin figura propia: una bolita de color con brillo.
function productoGenerico(lienzo, clave) {
  circulo(lienzo, 48, 52, 30, colorDesdeClave(clave))
  elipse(lienzo, 38, 42, 8, 5, '#ffffff', { borde: false, giro: -0.6 })
}

export function dibujarProducto(lienzo, clave) {
  pincel(lienzo, 3)
  const dibujar = PRODUCTOS[clave]
  if (dibujar) dibujar(lienzo)
  else productoGenerico(lienzo, clave)
}
