// Figuras simples de los productos (96 x 96), la plata, la cartera y el choclito.

import {
  pincel, elipse, circulo, rectangulo, poligono, trazado, linea, dentroDe, texto,
  colorDesdeClave, TINTA,
} from './pinceles.js'

const BLANCO = '#fffaf2'
const HOJA = '#5aa04a'

// Puntitos repartidos dentro de un rectángulo (semillas, chispas de chocolate...).
function puntitos(lienzo, lista, radio, color) {
  for (const [x, y] of lista) circulo(lienzo, x, y, radio, color, { borde: false })
}

// Hojita verde inclinada.
function hoja(lienzo, x, y, giro = -0.6, tamano = 1) {
  elipse(lienzo, x, y, 12 * tamano, 6 * tamano, HOJA, { giro })
}

const PRODUCTOS = {
  pan(lienzo) {
    elipse(lienzo, 48, 58, 38, 25, '#d9944a')
    elipse(lienzo, 48, 52, 30, 14, '#e8b072', { borde: false })
    linea(lienzo, [[30, 50], [36, 42]], 3)
    linea(lienzo, [[45, 50], [51, 42]], 3)
    linea(lienzo, [[60, 50], [66, 42]], 3)
  },
  harina(lienzo) {
    // Costal blanco amarrado, con una espiga dibujada
    rectangulo(lienzo, 22, 28, 52, 58, 14, '#f6efe2')
    poligono(lienzo, [[34, 30], [62, 30], [58, 14], [38, 14]], '#f6efe2')
    linea(lienzo, [[32, 28], [64, 28]], 4, '#c98b4f')
    linea(lienzo, [[48, 76], [48, 46]], 3, '#d9944a')
    for (const y of [50, 58, 66]) {
      elipse(lienzo, 42, y, 6, 3, '#f0b54a', { giro: 0.6, borde: false })
      elipse(lienzo, 54, y, 6, 3, '#f0b54a', { giro: -0.6, borde: false })
    }
  },
  galleta(lienzo) {
    circulo(lienzo, 48, 50, 32, '#e2b06a')
    puntitos(lienzo, [[36, 40], [56, 36], [62, 56], [42, 60], [50, 48], [32, 54]], 4.5, '#6b3a1f')
  },
  avena(lienzo) {
    // Tarro de avena con etiqueta
    rectangulo(lienzo, 26, 26, 44, 62, 8, '#e9d3a8')
    elipse(lienzo, 48, 26, 22, 7, '#d9b77a')
    rectangulo(lienzo, 26, 46, 44, 22, 0, '#d8433a')
    puntitos(lienzo, [[36, 57], [44, 54], [52, 59], [60, 55]], 3, '#f6efe2')
  },
  alfajor(lienzo) {
    elipse(lienzo, 48, 64, 34, 13, '#e7c48d')
    rectangulo(lienzo, 16, 50, 64, 12, 6, '#8a4b20')
    elipse(lienzo, 48, 48, 34, 13, '#e7c48d')
    puntitos(lienzo, [[34, 46], [46, 42], [58, 47], [42, 51], [62, 43]], 2.5, '#ffffff')
  },
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
  tomate(lienzo) {
    elipse(lienzo, 48, 56, 32, 28, '#e3402f')
    elipse(lienzo, 38, 46, 7, 4, '#f48a7c', { borde: false, giro: -0.6 })
    poligono(lienzo, [[48, 26], [40, 34], [30, 30], [38, 38], [48, 36], [58, 38], [66, 30], [56, 34]], HOJA)
  },
  palta(lienzo) {
    // Palta partida: cáscara, pulpa y pepa
    const forma = (c) => {
      c.moveTo(48, 14)
      c.bezierCurveTo(70, 14, 82, 70, 72, 80)
      c.bezierCurveTo(62, 92, 34, 92, 24, 80)
      c.bezierCurveTo(14, 70, 26, 14, 48, 14)
    }
    trazado(lienzo, forma, '#3f6b2a')
    lienzo.save()
    lienzo.translate(48, 56)
    lienzo.scale(0.8, 0.84)
    lienzo.translate(-48, -56)
    trazado(lienzo, forma, '#cfe08a', { borde: false })
    lienzo.restore()
    circulo(lienzo, 48, 64, 14, '#8a5a2b')
  },
  huevo(lienzo) {
    trazado(lienzo, (c) => {
      c.moveTo(48, 16)
      c.bezierCurveTo(72, 16, 80, 56, 76, 66)
      c.bezierCurveTo(70, 90, 26, 90, 20, 66)
      c.bezierCurveTo(16, 56, 24, 16, 48, 16)
    }, '#fbf3e4')
    elipse(lienzo, 38, 40, 5, 9, '#ffffff', { borde: false, giro: 0.3 })
  },
  leche(lienzo) {
    // Caja de leche con techo en punta
    rectangulo(lienzo, 28, 36, 40, 52, 4, BLANCO)
    poligono(lienzo, [[28, 36], [36, 18], [60, 18], [68, 36]], '#e8eef2')
    rectangulo(lienzo, 40, 10, 16, 9, 2, '#8fc3e6')
    rectangulo(lienzo, 28, 56, 40, 16, 0, '#8fc3e6')
    trazado(lienzo, (c) => {
      c.moveTo(48, 58)
      c.quadraticCurveTo(56, 66, 48, 70)
      c.quadraticCurveTo(40, 66, 48, 58)
    }, BLANCO, { borde: false })
  },
  queso(lienzo) {
    poligono(lienzo, [[14, 70], [82, 70], [82, 46], [24, 34]], '#f6c945')
    poligono(lienzo, [[14, 70], [24, 34], [82, 46], [82, 50], [14, 70]], '#f9d96a')
    puntitos(lienzo, [[34, 58], [56, 62], [70, 56]], 5, '#d9a52a')
  },
  yogur(lienzo) {
    poligono(lienzo, [[26, 30], [70, 30], [64, 86], [32, 86]], '#f4a3c0')
    rectangulo(lienzo, 22, 22, 52, 12, 4, BLANCO)
    circulo(lienzo, 48, 58, 10, '#e0383e')
    hoja(lienzo, 50, 46, -0.3, 0.6)
  },
  mantequilla(lienzo) {
    poligono(lienzo, [[14, 58], [48, 76], [84, 58], [50, 42]], BLANCO)
    poligono(lienzo, [[24, 50], [50, 38], [76, 52], [50, 64]], '#f8de7e')
    poligono(lienzo, [[24, 50], [50, 64], [50, 74], [24, 60]], '#efc952')
    poligono(lienzo, [[50, 64], [76, 52], [76, 62], [50, 74]], '#e2b83e')
  },
  chocolate(lienzo) {
    rectangulo(lienzo, 20, 22, 56, 64, 6, '#6b3a1f')
    for (const x of [38, 56]) linea(lienzo, [[x, 24], [x, 62]], 2, '#4a2512')
    for (const y of [36, 50]) linea(lienzo, [[22, y], [74, y]], 2, '#4a2512')
    rectangulo(lienzo, 20, 62, 56, 24, 0, '#d8433a')
    texto(lienzo, '★', 48, 74, 16, '#f4cf3c')
  },
  caramelo(lienzo) {
    poligono(lienzo, [[30, 48], [10, 34], [14, 62]], '#f4cf3c')
    poligono(lienzo, [[66, 48], [86, 34], [82, 62]], '#f4cf3c')
    const centro = (c) => c.ellipse(48, 48, 22, 18, 0, 0, Math.PI * 2)
    trazado(lienzo, centro, '#e5487a')
    dentroDe(lienzo, centro, (c) => {
      linea(c, [[34, 30], [52, 66]], 5, '#fbc6d8')
      linea(c, [[48, 30], [66, 66]], 5, '#fbc6d8')
    })
    trazado(lienzo, centro, null)
  },
  miel(lienzo) {
    rectangulo(lienzo, 24, 32, 48, 52, 14, '#e8a628')
    rectangulo(lienzo, 28, 20, 40, 14, 4, '#8a5a2b')
    rectangulo(lienzo, 32, 50, 32, 20, 6, BLANCO)
    texto(lienzo, 'M', 48, 61, 16, '#c47f12')
  },
  mermelada(lienzo) {
    rectangulo(lienzo, 26, 34, 44, 50, 10, '#c0303e')
    // Tapa con tela a cuadros
    poligono(lienzo, [[20, 34], [28, 18], [68, 18], [76, 34]], BLANCO)
    for (const x of [32, 44, 56]) rectangulo(lienzo, x, 21, 6, 6, 0, '#e0383e', { borde: false })
    for (const x of [38, 50, 62]) rectangulo(lienzo, x, 27, 6, 6, 0, '#e0383e', { borde: false })
    linea(lienzo, [[22, 34], [74, 34]], 4, '#e8a628')
    rectangulo(lienzo, 34, 50, 28, 18, 5, BLANCO)
    circulo(lienzo, 48, 59, 5, '#e0383e', { borde: false })
  },
  chupetin(lienzo) {
    linea(lienzo, [[48, 54], [48, 92]], 6, '#f3e3c3')
    linea(lienzo, [[48, 54], [48, 92]], 2)
    circulo(lienzo, 48, 36, 28, '#f6e05a')
    lienzo.save()
    pincel(lienzo, 5, '#e5487a')
    lienzo.beginPath()
    for (let a = 0; a < Math.PI * 5; a += 0.2) {
      const r = a * 1.6
      const x = 48 + Math.cos(a) * r
      const y = 36 + Math.sin(a) * r
      if (a === 0) lienzo.moveTo(x, y)
      else lienzo.lineTo(x, y)
    }
    lienzo.stroke()
    lienzo.restore()
    circulo(lienzo, 48, 36, 28, null)
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

// ---------- Íconos de los letreros (64 x 64) ----------

// Cada tipo de puesto usa un producto que lo representa.
const PRODUCTO_DEL_ICONO = {
  pan: 'pan',
  frutas: 'fresa',
  verduras: 'zanahoria',
  granja: 'huevo',
  dulces: 'caramelo',
}

export function dibujarIcono(lienzo, tipo, tamano) {
  lienzo.scale(tamano / 96, tamano / 96)
  if (tipo === 'granos') {
    // Costal abierto lleno de granos
    pincel(lienzo, 3)
    rectangulo(lienzo, 18, 34, 60, 52, 14, '#c98b4f')
    elipse(lienzo, 48, 36, 30, 10, '#f3c93d')
    puntitos(lienzo, [[36, 34], [46, 38], [56, 33], [62, 38], [42, 31]], 3, '#c99a1f')
    return
  }
  dibujarProducto(lienzo, PRODUCTO_DEL_ICONO[tipo] ?? tipo)
}

// ---------- Plata ----------

// Colores de los billetes según su valor (el de 10 soles es verde).
const COLOR_BILLETE = { 10: '#7fb88f', 20: '#f0a35a', 50: '#e98aa0', 100: '#8fb1d6', 200: '#c3a0d8' }

export function dibujarBillete(lienzo, valor, ancho, alto) {
  pincel(lienzo, 3)
  const color = COLOR_BILLETE[valor] ?? '#9cc79f'
  rectangulo(lienzo, 2, 2, ancho - 4, alto - 4, 8, color)
  rectangulo(lienzo, 9, 9, ancho - 18, alto - 18, 5, null)
  // Retrato, "S/" y el valor en un círculo
  elipse(lienzo, 32, alto / 2, 12, 16, '#e3f1e6', { borde: false })
  texto(lienzo, 'S/', 58, alto / 2 + 1, 18, TINTA)
  circulo(lienzo, ancho - 34, alto / 2, 21, '#ffffff')
  texto(lienzo, String(valor), ancho - 34, alto / 2 + 1, 25, TINTA)
}

// Monedas: la de 5 tiene el borde dorado, la de 2 el centro dorado y la de 1 es plateada.
export function dibujarMoneda(lienzo, valor, tamano) {
  pincel(lienzo, 3)
  const centro = tamano / 2
  const radio = centro - 3
  const dorado = '#e2b23a'
  const plateado = '#cfd4d8'
  const [borde, medio] = valor === 5 ? [dorado, plateado] : valor === 2 ? [plateado, dorado] : [plateado, '#dde1e4']
  circulo(lienzo, centro, centro, radio, borde)
  circulo(lienzo, centro, centro, radio * 0.72, medio)
  texto(lienzo, String(valor), centro, centro + 2, Math.round(tamano * 0.42), TINTA)
}

// Cartera: bolsita de tela con cordón y una moneda asomando.
export function dibujarCartera(lienzo) {
  pincel(lienzo, 3)
  circulo(lienzo, 50, 22, 9, '#e2b23a')
  trazado(lienzo, (c) => {
    c.moveTo(22, 26)
    c.quadraticCurveTo(4, 68, 36, 68)
    c.quadraticCurveTo(68, 68, 50, 26)
    c.closePath()
  }, '#a8642f')
  linea(lienzo, [[20, 26], [52, 26]], 4, '#f4cf3c')
  elipse(lienzo, 36, 50, 10, 8, '#c98b4f', { borde: false })
}

// Choclito: premio pequeño en forma de mazorca.
export function dibujarChoclito(lienzo, tamano) {
  lienzo.scale(tamano / 96, tamano / 96)
  dibujarProducto(lienzo, 'choclo')
}
