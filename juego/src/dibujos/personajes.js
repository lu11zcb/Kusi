// Figura simple de Kusi de frente, usada si no llega su imagen.

import {
  pincel, elipse, trazado, linea, dentroDe,
  ojo, mejilla, sonrisa,
} from './pinceles.js'

const ROSADO = '#f4a7a3'
const BLANCO = '#fffaf2'

// ---------- Cuy de frente (110 x 120) ----------

// Cuerpo redondo; adentro se pintan la panza (solo de frente) y las manchas.
function cuerpoDeCuy(lienzo, pelaje, pintarAdentro) {
  const cuerpo = (c) => c.ellipse(55, 84, 42, 32, 0, 0, Math.PI * 2)
  trazado(lienzo, cuerpo, pelaje)
  dentroDe(lienzo, cuerpo, pintarAdentro)
  trazado(lienzo, cuerpo, null)
}

function cabezaDeCuy(lienzo, pelaje, pintarAdentro) {
  const cabeza = (c) => c.ellipse(55, 50, 34, 29, 0, 0, Math.PI * 2)
  trazado(lienzo, cabeza, pelaje)
  dentroDe(lienzo, cabeza, pintarAdentro)
  trazado(lienzo, cabeza, null)
}

// Cuy de frente. Los "extras" se pintan en su momento: manchas dentro del cuerpo y de la cabeza,
// ropa entre cuerpo y cabeza, y sombrero encima de todo.
function cuyDeFrente(lienzo, { pelaje, oreja, manchasCuerpo, manchasCabeza, ropa, sombrero }) {
  pincel(lienzo, 3)

  // Orejas a los lados de la cabeza y patitas de atrás
  elipse(lienzo, 22, 36, 11, 8, oreja, { giro: -0.5 })
  elipse(lienzo, 88, 36, 11, 8, oreja, { giro: 0.5 })
  elipse(lienzo, 36, 114, 11, 5, ROSADO)
  elipse(lienzo, 74, 114, 11, 5, ROSADO)

  // Cuerpo con la panza blanca y las manitos adelante
  cuerpoDeCuy(lienzo, pelaje, (c) => {
    elipse(c, 55, 100, 24, 22, BLANCO, { borde: false })
    manchasCuerpo?.(c)
  })
  ropa?.(lienzo)
  elipse(lienzo, 40, 104, 8, 6, ROSADO)
  elipse(lienzo, 70, 104, 8, 6, ROSADO)

  // Cabeza con la franja blanca al medio, ojos, cachetes, nariz y boca
  cabezaDeCuy(lienzo, pelaje, (c) => {
    elipse(c, 55, 66, 13, 24, BLANCO, { borde: false })
    manchasCabeza?.(c)
  })
  ojo(lienzo, 41, 49, 4.8)
  ojo(lienzo, 69, 49, 4.8)
  mejilla(lienzo, 32, 61)
  mejilla(lienzo, 78, 61)
  elipse(lienzo, 55, 60, 4.5, 3.2, '#e57f86')
  sonrisa(lienzo, 55, 70, 8)

  sombrero?.(lienzo)
}

// ---------- Kusi (124 x 140): cuy naranja con poncho de colores y sombrero con pluma ----------

const KUSI = { pelaje: '#e58a3a', oreja: '#b9612a' }

// Poncho sobre los hombros, con las franjas de la vista frontal.
function ponchoDeKusi() {
  return (c) => {
    const poncho = (p) => {
      p.moveTo(22, 70)
      p.quadraticCurveTo(55, 60, 88, 70)
      p.lineTo(98, 98)
      p.quadraticCurveTo(55, 112, 12, 98)
      p.closePath()
    }
    trazado(c, poncho, '#c2412f')
    dentroDe(c, poncho, (p) => {
      linea(p, [[10, 88], [55, 96], [100, 88]], 7, '#7b3f8c')
      linea(p, [[10, 100], [24, 94], [38, 102], [55, 94], [72, 102], [86, 94], [100, 100]], 3, '#f4cf3c')
    })
    trazado(c, poncho, null)
  }
}

// Sombrero de ala con una pluma en la cinta (de frente a la derecha, de espaldas a la izquierda).
function sombreroDeKusi(xPluma) {
  return (c) => {
    elipse(c, xPluma, 4, 18, 5.5, '#f3ead8', { giro: xPluma > 55 ? -1 : 1 })
    trazado(c, (p) => p.ellipse(55, 24, 27, 24, 0, Math.PI, Math.PI * 2), '#d6b07a')
    linea(c, [[29, 19], [81, 19]], 5, '#9a6a3f')
    elipse(c, 55, 26, 44, 9, '#d6b07a')
  }
}

export function dibujarKusiFrente(lienzo) {
  lienzo.translate(7, 18)
  cuyDeFrente(lienzo, { ...KUSI, ropa: ponchoDeKusi(), sombrero: sombreroDeKusi(84) })
}
