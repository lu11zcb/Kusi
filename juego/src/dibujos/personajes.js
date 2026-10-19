// Figuras simples de los personajes: Kusi, el cuy del niño y los vendedores.
// La plaza se ve desde arriba: los cuyes se ven de frente (mirando hacia abajo), de espaldas
// (mirando hacia los puestos) o, el del niño, de lado (mirando a la derecha); los vendedores miran
// al frente, detrás del mostrador.

import {
  pincel, elipse, circulo, rectangulo, poligono, trazado, linea, dentroDe,
  ojo, mejilla, sonrisa, colorDesdeClave, TINTA,
} from './pinceles.js'

const ROSADO = '#f4a7a3'
const BLANCO = '#fffaf2'

// ---------- Cuyes (110 x 120, de frente o de espaldas) ----------

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

// Cuy de espaldas: todo pelo, con las orejas asomando arriba de la cabeza.
function cuyDeEspaldas(lienzo, { pelaje, oreja, manchasCuerpo, manchasCabeza, ropa, sombrero }) {
  pincel(lienzo, 3)

  elipse(lienzo, 38, 115, 10, 4.5, ROSADO)
  elipse(lienzo, 72, 115, 10, 4.5, ROSADO)
  cuerpoDeCuy(lienzo, pelaje, (c) => manchasCuerpo?.(c))
  ropa?.(lienzo)
  cabezaDeCuy(lienzo, pelaje, (c) => manchasCabeza?.(c))
  elipse(lienzo, 25, 30, 11, 8, oreja, { giro: -0.6 })
  elipse(lienzo, 85, 30, 11, 8, oreja, { giro: 0.6 })

  sombrero?.(lienzo)
}

// Cuy de lado, mirando a la derecha (120 x 100). Para caminar a la izquierda, el juego lo voltea.
function cuyDeLado(lienzo, { pelaje, oreja, manchas, sombrero }) {
  pincel(lienzo, 3)

  // Patitas
  elipse(lienzo, 40, 93, 9, 5, ROSADO)
  elipse(lienzo, 84, 93, 9, 5, ROSADO)

  // Cuerpo redondo con la panza blanca
  const cuerpo = (c) => c.ellipse(56, 62, 50, 33, 0, 0, Math.PI * 2)
  trazado(lienzo, cuerpo, pelaje)
  dentroDe(lienzo, cuerpo, (c) => {
    elipse(c, 84, 82, 32, 18, BLANCO, { borde: false })
    manchas?.(c)
  })
  trazado(lienzo, cuerpo, null)

  // Cabeza con la franja blanca de la cara
  const cabeza = (c) => c.ellipse(88, 50, 27, 25, 0, 0, Math.PI * 2)
  trazado(lienzo, cabeza, pelaje)
  dentroDe(lienzo, cabeza, (c) => elipse(c, 105, 58, 13, 22, BLANCO, { borde: false }))
  trazado(lienzo, cabeza, null)

  // Oreja, ojo, cachete, nariz y boca
  elipse(lienzo, 75, 29, 10, 7, oreja, { giro: -0.4 })
  elipse(lienzo, 75, 30, 5, 3.5, ROSADO, { borde: false, giro: -0.4 })
  ojo(lienzo, 97, 44, 4.8)
  mejilla(lienzo, 103, 60)
  elipse(lienzo, 113, 53, 4, 3, '#e57f86')
  sonrisa(lienzo, 108, 63, 7)

  sombrero?.(lienzo)
}

// ---------- Kusi (124 x 140): cuy naranja con poncho de colores y sombrero con pluma ----------

const KUSI = { pelaje: '#e58a3a', oreja: '#b9612a' }

// Poncho sobre los hombros, con franjas. De espaldas termina en punta.
function ponchoDeKusi(conPunta) {
  return (c) => {
    const poncho = (p) => {
      p.moveTo(22, 70)
      p.quadraticCurveTo(55, 60, 88, 70)
      p.lineTo(98, 98)
      if (conPunta) {
        p.lineTo(55, 116)
        p.lineTo(12, 98)
      } else {
        p.quadraticCurveTo(55, 112, 12, 98)
      }
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
  cuyDeFrente(lienzo, { ...KUSI, ropa: ponchoDeKusi(false), sombrero: sombreroDeKusi(84) })
}

export function dibujarKusiEspaldas(lienzo) {
  lienzo.translate(7, 18)
  cuyDeEspaldas(lienzo, { ...KUSI, ropa: ponchoDeKusi(true), sombrero: sombreroDeKusi(26) })
}

// ---------- El cuy del niño (110 x 120): color caramelo con manchas y un chullo rojo con pompón ----------

// Las manchas están en el lado derecho del cuy: de frente se ven a la izquierda y de espaldas, a la derecha.
const mancha = (x, y, radioX, radioY) => (c) => elipse(c, x, y, radioX, radioY, '#a8642f', { borde: false })

const CUY_NINO = {
  pelaje: '#e2b27a',
  oreja: '#a8642f',
  sombrero: (c) => {
    // Chullo: gorro tejido con orejeras y pompón
    trazado(c, (p) => p.ellipse(55, 32, 33, 25, 0, Math.PI, Math.PI * 2), '#d8433a')
    linea(c, [[26, 29], [32, 23], [38, 29], [44, 23], [50, 29], [56, 23], [62, 29], [68, 23], [74, 29], [80, 23], [85, 29]], 2.5, BLANCO)
    poligono(c, [[22, 32], [36, 32], [27, 50]], '#d8433a')
    poligono(c, [[74, 32], [88, 32], [83, 50]], '#d8433a')
    linea(c, [[27, 50], [27, 58]], 2.5)
    linea(c, [[83, 50], [83, 58]], 2.5)
    circulo(c, 55, 8, 7, '#f4cf3c')
  },
}

export function dibujarCuyNinoFrente(lienzo) {
  cuyDeFrente(lienzo, { ...CUY_NINO, manchasCuerpo: mancha(20, 74, 18, 16), manchasCabeza: mancha(30, 40, 14, 12) })
}

export function dibujarCuyNinoEspaldas(lienzo) {
  cuyDeEspaldas(lienzo, { ...CUY_NINO, manchasCuerpo: mancha(90, 74, 18, 16), manchasCabeza: mancha(80, 40, 14, 12) })
}

// De lado (120 x 112), mirando a la derecha.
export function dibujarCuyNinoLado(lienzo) {
  lienzo.translate(0, 12)
  cuyDeLado(lienzo, {
    pelaje: CUY_NINO.pelaje,
    oreja: CUY_NINO.oreja,
    manchas: (c) => {
      elipse(c, 30, 50, 22, 17, '#a8642f', { borde: false })
      elipse(c, 64, 36, 12, 9, '#a8642f', { borde: false })
    },
    sombrero: (c) => {
      // Chullo de lado: gorro tejido con una orejera y el pompón
      trazado(c, (p) => p.ellipse(86, 30, 21, 17, 0, Math.PI, Math.PI * 2), '#d8433a')
      linea(c, [[67, 26], [72, 21], [77, 26], [82, 21], [87, 26], [92, 21], [97, 26], [102, 21]], 2.5, BLANCO)
      poligono(c, [[66, 30], [80, 30], [74, 46]], '#d8433a')
      linea(c, [[74, 46], [74, 54]], 2.5)
      circulo(c, 86, 11, 6.5, '#f4cf3c')
    },
  })
}

// ---------- Vendedores (150 x 150, mirando al frente) ----------

// Hombros con delantal; la parte de abajo queda escondida detrás del mostrador.
function hombros(lienzo, color, delantal = BLANCO) {
  elipse(lienzo, 75, 170, 60, 60, color)
  if (delantal) {
    rectangulo(lienzo, 51, 118, 48, 50, 10, delantal)
    rectangulo(lienzo, 63, 132, 24, 14, 4, null)
  }
}

// Ojos, cachetes y sonrisa de frente.
function caraDeFrente(lienzo, { x = 75, y = 66, separacion = 14, boca = 24 } = {}) {
  ojo(lienzo, x - separacion, y, 5)
  ojo(lienzo, x + separacion, y, 5)
  mejilla(lienzo, x - separacion - 8, y + 13)
  mejilla(lienzo, x + separacion + 8, y + 13)
  sonrisa(lienzo, x, y + boca, 9)
}

function dibujarVizcacha(lienzo) {
  pincel(lienzo, 3)
  // Orejas largas
  elipse(lienzo, 54, 28, 10, 30, '#b9ab98', { giro: -0.25 })
  elipse(lienzo, 54, 30, 4.5, 20, ROSADO, { borde: false, giro: -0.25 })
  elipse(lienzo, 96, 28, 10, 30, '#b9ab98', { giro: 0.25 })
  elipse(lienzo, 96, 30, 4.5, 20, ROSADO, { borde: false, giro: 0.25 })
  hombros(lienzo, '#a99a86')
  elipse(lienzo, 75, 74, 38, 33, '#c4b7a4')
  elipse(lienzo, 75, 88, 17, 12, '#ece4d8')
  // Bigotes
  linea(lienzo, [[60, 87], [34, 82]], 2)
  linea(lienzo, [[60, 91], [36, 96]], 2)
  linea(lienzo, [[90, 87], [116, 82]], 2)
  linea(lienzo, [[90, 91], [114, 96]], 2)
  caraDeFrente(lienzo, { y: 68, boca: 26 })
  elipse(lienzo, 75, 82, 5, 3.5, TINTA, { borde: false })
}

function dibujarZorro(lienzo) {
  pincel(lienzo, 3)
  // Orejas en punta
  poligono(lienzo, [[42, 60], [38, 14], [70, 42]], '#e07a2f')
  poligono(lienzo, [[47, 52], [44, 26], [62, 42]], '#3b2420', { borde: false })
  poligono(lienzo, [[108, 60], [112, 14], [80, 42]], '#e07a2f')
  poligono(lienzo, [[103, 52], [106, 26], [88, 42]], '#3b2420', { borde: false })
  hombros(lienzo, '#d96e2a', '#9bc27a')
  const cabeza = (c) => c.ellipse(75, 74, 38, 32, 0, 0, Math.PI * 2)
  trazado(lienzo, cabeza, '#e07a2f')
  dentroDe(lienzo, cabeza, (c) => elipse(c, 75, 96, 30, 18, BLANCO, { borde: false }))
  trazado(lienzo, cabeza, null)
  caraDeFrente(lienzo, { y: 66, boca: 31 })
  elipse(lienzo, 75, 88, 6, 4.5, TINTA, { borde: false })
}

function dibujarLlama(lienzo) {
  pincel(lienzo, 3)
  // Orejas largas con borlas de colores
  elipse(lienzo, 52, 24, 8, 22, '#efe2c8', { giro: -0.35 })
  elipse(lienzo, 98, 24, 8, 22, '#efe2c8', { giro: 0.35 })
  linea(lienzo, [[48, 38], [44, 50]], 2)
  linea(lienzo, [[102, 38], [106, 50]], 2)
  circulo(lienzo, 44, 52, 6, '#e46aa8')
  circulo(lienzo, 106, 52, 6, '#f4cf3c')
  // Manta tejida sobre los hombros
  elipse(lienzo, 75, 170, 60, 60, '#efe2c8')
  dentroDe(lienzo, (c) => c.ellipse(75, 170, 60, 60, 0, 0, Math.PI * 2), (c) => {
    rectangulo(c, 10, 118, 130, 12, 0, '#d8433a', { borde: false })
    rectangulo(c, 10, 130, 130, 8, 0, '#f4cf3c', { borde: false })
    rectangulo(c, 10, 138, 130, 12, 0, '#5aa04a', { borde: false })
  })
  rectangulo(lienzo, 59, 92, 32, 36, 8, '#f5ead6')
  // Cabeza alargada, hocico y copete
  elipse(lienzo, 75, 64, 28, 34, '#f5ead6')
  elipse(lienzo, 75, 88, 18, 13, '#e6d3b3')
  circulo(lienzo, 66, 32, 8, '#f5ead6')
  circulo(lienzo, 84, 32, 8, '#f5ead6')
  circulo(lienzo, 75, 28, 9, '#f5ead6')
  caraDeFrente(lienzo, { y: 58, separacion: 12, boca: 36 })
  elipse(lienzo, 70, 84, 2.5, 2, TINTA, { borde: false })
  elipse(lienzo, 80, 84, 2.5, 2, TINTA, { borde: false })
}

function dibujarOveja(lienzo) {
  pincel(lienzo, 3)
  // Hombros de lana
  elipse(lienzo, 75, 170, 60, 60, '#fbf8f2')
  rectangulo(lienzo, 51, 118, 48, 50, 10, '#f4a3c0')
  // Lana alrededor de la cara
  for (let i = 0; i < 10; i++) {
    const angulo = (i / 10) * Math.PI * 2
    circulo(lienzo, 75 + Math.cos(angulo) * 33, 64 + Math.sin(angulo) * 30, 15, '#fbf8f2')
  }
  elipse(lienzo, 36, 68, 14, 7, '#6b625e', { giro: 0.3 })
  elipse(lienzo, 114, 68, 14, 7, '#6b625e', { giro: -0.3 })
  elipse(lienzo, 75, 72, 25, 30, '#6b625e')
  circulo(lienzo, 64, 66, 6.5, BLANCO, { borde: false })
  circulo(lienzo, 86, 66, 6.5, BLANCO, { borde: false })
  ojo(lienzo, 65, 67, 3.8)
  ojo(lienzo, 87, 67, 3.8)
  elipse(lienzo, 75, 84, 5, 3.5, '#3a3330', { borde: false })
  lienzo.save()
  pincel(lienzo, 2.5, '#f3e9e2')
  lienzo.beginPath()
  lienzo.arc(75, 88, 6, Math.PI * 0.2, Math.PI * 0.8)
  lienzo.stroke()
  lienzo.restore()
}

function dibujarGallitoDeLasRocas(lienzo) {
  pincel(lienzo, 3)
  // Alas negras y pecho naranja
  elipse(lienzo, 75, 170, 60, 60, '#2b2523')
  elipse(lienzo, 75, 160, 30, 50, '#ef5a24')
  elipse(lienzo, 75, 74, 33, 31, '#ef5a24')
  // Cresta en forma de abanico que tapa el pico
  elipse(lienzo, 75, 54, 15, 36, '#f26b2f')
  linea(lienzo, [[75, 24], [75, 84]], 2, '#c4421a')
  poligono(lienzo, [[69, 86], [81, 86], [75, 96]], '#f4cf3c')
  ojo(lienzo, 54, 72, 5)
  ojo(lienzo, 96, 72, 5)
}

// Cualquier vendedor que todavía no tenga figura propia: un animalito de orejas redondas.
function dibujarVendedorGenerico(lienzo, clave) {
  const color = colorDesdeClave(clave)
  pincel(lienzo, 3)
  circulo(lienzo, 44, 42, 14, color)
  circulo(lienzo, 106, 42, 14, color)
  hombros(lienzo, color)
  elipse(lienzo, 75, 72, 38, 34, color)
  elipse(lienzo, 75, 88, 18, 12, BLANCO)
  caraDeFrente(lienzo, { y: 66, boca: 26 })
  elipse(lienzo, 75, 84, 5, 3.5, TINTA, { borde: false })
}

const VENDEDORES = {
  vizcacha: dibujarVizcacha,
  zorro: dibujarZorro,
  llama: dibujarLlama,
  oveja: dibujarOveja,
  'gallito-de-las-rocas': dibujarGallitoDeLasRocas,
}

export function dibujarVendedor(lienzo, clave) {
  const dibujar = VENDEDORES[clave]
  if (dibujar) dibujar(lienzo)
  else dibujarVendedorGenerico(lienzo, clave)
}
