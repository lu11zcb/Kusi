// Figuras simples del escenario: los puestos y las tres capas del fondo.
// Las capas se repiten de lado a lado, así que su borde izquierdo empata con el derecho.

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

// ---------- Fondo: cielo y cerros (1280 x 500) ----------

export function dibujarCerros(lienzo, ancho, alto) {
  // Cielo celeste que se aclara hacia abajo
  const cielo = lienzo.createLinearGradient(0, 0, 0, alto)
  cielo.addColorStop(0, '#8fd0ef')
  cielo.addColorStop(1, '#e4f5f7')
  lienzo.fillStyle = cielo
  lienzo.fillRect(0, 0, ancho, alto)

  // Sol y nubes (lejos de los bordes, para que la repetición no se note)
  circulo(lienzo, 1040, 92, 46, '#ffe28a', { borde: false })
  const nube = (x, y, escala) => {
    for (const [dx, dy, r] of [[0, 0, 26], [28, -12, 30], [58, 0, 24], [30, 8, 24]]) {
      circulo(lienzo, x + dx * escala, y + dy * escala, r * escala, '#ffffff', { borde: false })
    }
  }
  nube(170, 112, 1.1)
  nube(560, 70, 0.9)
  nube(820, 150, 1.2)

  // Montañas lejanas con nieve en las puntas. Las ondas dan vueltas completas en el ancho,
  // así el final empata con el principio.
  const vuelta = (veces, x) => Math.sin((Math.PI * 2 * veces * x) / ancho)
  const montanas = (c) => {
    c.moveTo(0, alto)
    for (let x = 0; x <= ancho; x += 8) {
      const y = 275 + 45 * vuelta(2, x + 120) + 28 * vuelta(5, x + 40) + 12 * vuelta(9, x)
      c.lineTo(x, y)
    }
    c.lineTo(ancho, alto)
    c.closePath()
  }
  trazado(lienzo, montanas, '#a9b8d6', { borde: false })
  dentroDe(lienzo, montanas, (c) => {
    c.fillStyle = '#fbfdff'
    c.fillRect(0, 0, ancho, 238)
  })

  // Cerros verdes, más cerca
  const cerros = (c) => {
    c.moveTo(0, alto)
    for (let x = 0; x <= ancho; x += 8) {
      c.lineTo(x, 385 + 30 * vuelta(3, x + 300) + 14 * vuelta(7, x))
    }
    c.lineTo(ancho, alto)
    c.closePath()
  }
  trazado(lienzo, cerros, '#9cc46a', { borde: false })
  dentroDe(lienzo, cerros, (c) => {
    c.fillStyle = '#86b05a'
    c.fillRect(0, 440, ancho, alto)
  })
}

// ---------- Fondo: casas del pueblo (1200 x 330) ----------

const CASAS = [
  { ancho: 200, alto: 240, pared: '#fbf3e4', balcon: true },
  { ancho: 170, alto: 200, pared: '#f2d39b' },
  { espacio: 30 },
  { ancho: 230, alto: 270, pared: '#f6efe6', balcon: true },
  { ancho: 160, alto: 210, pared: '#e9c2a6' },
  { espacio: 20 },
  { ancho: 190, alto: 250, pared: '#fbf3e4' },
  { ancho: 200, alto: 225, pared: '#f4dcb0', balcon: true },
]

function ventana(lienzo, x, y) {
  rectangulo(lienzo, x, y, 30, 38, 4, '#f6e3b4')
  linea(lienzo, [[x + 15, y], [x + 15, y + 38]], 2, '#7a4b2f')
  rectangulo(lienzo, x - 10, y, 10, 38, 2, '#5f8f3a')
  rectangulo(lienzo, x + 30, y, 10, 38, 2, '#5f8f3a')
}

export function dibujarCasas(lienzo, ancho, alto) {
  pincel(lienzo, 2.5, '#8a5a40')
  let x = 0
  for (const casa of CASAS) {
    if (casa.espacio) {
      x += casa.espacio
      continue
    }
    const arriba = alto - casa.alto
    // Pared, techo de tejas y puerta con arco
    rectangulo(lienzo, x + 6, arriba, casa.ancho - 12, casa.alto + 4, 0, casa.pared)
    poligono(lienzo, [[x, arriba + 4], [x + casa.ancho, arriba + 4], [x + casa.ancho - 16, arriba - 30], [x + 16, arriba - 30]], '#c0573a')
    for (let t = x + 24; t < x + casa.ancho - 16; t += 16) linea(lienzo, [[t, arriba - 26], [t - 4, arriba + 2]], 2, '#9a3f28')
    const centro = x + casa.ancho / 2
    trazado(lienzo, (c) => {
      c.moveTo(centro - 22, alto)
      c.lineTo(centro - 22, alto - 62)
      c.arc(centro, alto - 62, 22, Math.PI, 0)
      c.lineTo(centro + 22, alto)
    }, '#8a5a2b')
    // Ventanas a los lados de la puerta y en el segundo piso
    ventana(lienzo, x + 30, alto - 100)
    ventana(lienzo, x + casa.ancho - 60, alto - 100)
    if (casa.alto > 205) {
      ventana(lienzo, x + 30, arriba + 26)
      ventana(lienzo, x + casa.ancho - 60, arriba + 26)
    }
    // Balcón de madera
    if (casa.balcon) {
      rectangulo(lienzo, x + 14, arriba + 70, casa.ancho - 28, 30, 2, '#9a6a3f')
      for (let b = x + 24; b < x + casa.ancho - 18; b += 12) linea(lienzo, [[b, arriba + 74], [b, arriba + 96]], 2, '#6b4a2a')
    }
    x += casa.ancho
  }

  // Banderines de fiesta de un lado al otro
  const curva = (px) => 96 + 34 * Math.sin((Math.PI * px) / (ancho / 2)) ** 2
  linea(lienzo, Array.from({ length: 61 }, (_, i) => [i * 20, curva(i * 20)]), 2, '#6b4a2a')
  const colores = ['#d8433a', '#f4cf3c', '#5aa04a', '#e46aa8', '#f3a12b', '#7b3f8c']
  for (let px = 10, i = 0; px < ancho; px += 40, i++) {
    const y = curva(px)
    poligono(lienzo, [[px - 12, y], [px + 12, y], [px, y + 28]], colores[i % colores.length])
  }
}

// ---------- Fondo: piso de piedras (512 x 220) ----------

export function dibujarPiso(lienzo, ancho, alto) {
  lienzo.fillStyle = '#d8c3a0'
  lienzo.fillRect(0, 0, ancho, alto)
  // Borde de la vereda
  lienzo.fillStyle = '#b9a07a'
  lienzo.fillRect(0, 0, ancho, 16)
  linea(lienzo, [[0, 16], [ancho, 16]], 2, '#8a7350')

  // Piedras en filas; cada fila corrida media piedra. Las que cruzan el borde se dibujan también
  // del otro lado para que la repetición empate.
  pincel(lienzo, 2, '#a8936f')
  const tonos = ['#cdbb9c', '#bfae90', '#d9cbb0', '#c4b296']
  const anchoPiedra = 64
  for (let fila = 0, y = 38; y < alto + 20; fila++, y += 32) {
    const corrimiento = fila % 2 ? anchoPiedra / 2 : 0
    for (let columna = 0; columna < ancho / anchoPiedra; columna++) {
      const x = columna * anchoPiedra + corrimiento + anchoPiedra / 2
      const tono = tonos[(fila * 3 + columna * 5) % tonos.length]
      const radioX = 26 + ((fila + columna * 7) % 4)
      for (const desplazamiento of [0, -ancho]) {
        elipse(lienzo, x + desplazamiento, y, radioX, 12 + (columna % 2), tono)
      }
    }
  }
}
