// Ayudantes para dibujar figuras simples con el lienzo 2D del navegador.
// Todas las figuras usan el mismo contorno marrón, como un dibujo animado.

import { COLOR, LETRA } from '../medidas.js'

export const TINTA = COLOR.tinta

// Prepara el contorno: grosor y color de la línea, con puntas redondas.
export function pincel(lienzo, grosor = 3, color = TINTA) {
  lienzo.lineWidth = grosor
  lienzo.strokeStyle = color
  lienzo.lineJoin = 'round'
  lienzo.lineCap = 'round'
}

// Rellena el camino actual y, si se pide, le pone contorno.
function pintar(lienzo, relleno, borde) {
  if (relleno) {
    lienzo.fillStyle = relleno
    lienzo.fill()
  }
  if (borde) lienzo.stroke()
}

export function elipse(lienzo, x, y, radioX, radioY, relleno, { borde = true, giro = 0 } = {}) {
  lienzo.beginPath()
  lienzo.ellipse(x, y, radioX, radioY, giro, 0, Math.PI * 2)
  pintar(lienzo, relleno, borde)
}

export function circulo(lienzo, x, y, radio, relleno, opciones) {
  elipse(lienzo, x, y, radio, radio, relleno, opciones)
}

export function rectangulo(lienzo, x, y, ancho, alto, radio, relleno, { borde = true } = {}) {
  lienzo.beginPath()
  lienzo.roundRect(x, y, ancho, alto, radio)
  pintar(lienzo, relleno, borde)
}

// Figura cerrada que une los puntos [[x, y], ...].
export function poligono(lienzo, puntos, relleno, { borde = true } = {}) {
  lienzo.beginPath()
  puntos.forEach(([x, y], i) => (i === 0 ? lienzo.moveTo(x, y) : lienzo.lineTo(x, y)))
  lienzo.closePath()
  pintar(lienzo, relleno, borde)
}

// Figura libre: `dibujarCamino` arma el camino con curvas y aquí se rellena.
export function trazado(lienzo, dibujarCamino, relleno, { borde = true } = {}) {
  lienzo.beginPath()
  dibujarCamino(lienzo)
  pintar(lienzo, relleno, borde)
}

// Línea abierta que pasa por los puntos.
export function linea(lienzo, puntos, grosor = 3, color = TINTA) {
  lienzo.save()
  pincel(lienzo, grosor, color)
  lienzo.beginPath()
  puntos.forEach(([x, y], i) => (i === 0 ? lienzo.moveTo(x, y) : lienzo.lineTo(x, y)))
  lienzo.stroke()
  lienzo.restore()
}

// Dibuja dentro de una forma sin salirse (por ejemplo, la mancha blanca del cuy).
export function dentroDe(lienzo, dibujarForma, dibujarAdentro) {
  lienzo.save()
  lienzo.beginPath()
  dibujarForma(lienzo)
  lienzo.clip()
  dibujarAdentro(lienzo)
  lienzo.restore()
}

// Ojo redondo con un brillito.
export function ojo(lienzo, x, y, radio = 4.5) {
  circulo(lienzo, x, y, radio, TINTA, { borde: false })
  circulo(lienzo, x - radio * 0.35, y - radio * 0.4, radio * 0.38, '#ffffff', { borde: false })
}

// Cachete rosado.
export function mejilla(lienzo, x, y, radioX = 7, radioY = 4.5) {
  lienzo.save()
  lienzo.globalAlpha = 0.55
  elipse(lienzo, x, y, radioX, radioY, '#f08a8a', { borde: false })
  lienzo.restore()
}

// Boca sonriente.
export function sonrisa(lienzo, x, y, ancho = 10) {
  lienzo.save()
  pincel(lienzo, 2.5)
  lienzo.beginPath()
  lienzo.arc(x, y - ancho * 0.35, ancho * 0.6, Math.PI * 0.2, Math.PI * 0.8)
  lienzo.stroke()
  lienzo.restore()
}

// Texto centrado con la letra del juego.
export function texto(lienzo, contenido, x, y, tamano, color = TINTA, peso = 700) {
  lienzo.save()
  lienzo.font = `${peso} ${tamano}px ${LETRA}, sans-serif`
  lienzo.fillStyle = color
  lienzo.textAlign = 'center'
  lienzo.textBaseline = 'middle'
  lienzo.fillText(contenido, x, y)
  lienzo.restore()
}

// Color estable para una clave desconocida: la misma clave siempre da el mismo color.
const COLORES_DE_RESERVA = ['#e0383e', '#f39a2b', '#f4cf3c', '#7cb342', '#4fa3a5', '#8d6ac8', '#e46aa8', '#a8642f']
export function colorDesdeClave(clave) {
  let suma = 0
  for (const letra of clave) suma = (suma * 31 + letra.charCodeAt(0)) >>> 0
  return COLORES_DE_RESERVA[suma % COLORES_DE_RESERVA.length]
}
