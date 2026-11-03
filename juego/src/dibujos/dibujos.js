// Dibujos del laberinto: paisaje, alimentos del guion y figuras de ayuda.
// Los alimentos se buscan por su tipo, también cuando llegan en un guion nuevo.

import { dibujarKusiFrente } from './personajes.js'
import { dibujarProducto } from './productos.js'
import { dibujarTerrenoLaberinto, dibujarPuertaLaberinto, dibujarClaseLaberinto, dibujarManoLaberinto, dibujarFondoLaberinto } from './laberinto.js'

// Incluye los tipos de cada nivel y los de la secuencia, aunque aún no estén en el mapa.
export function clavesDelPaquete(paquete) {
  const claves = new Map([
    ['kusi-frente', 'kusi-frente'],
    ['fondo-pueblito', 'fondo-laberinto'],
    ['muro-adobe-1', 'terreno-laberinto'],
    ['muro-adobe-2', 'terreno-laberinto'],
    ['piso-tierra', 'terreno-laberinto'],
    ['puerta-cerrada', 'puerta-laberinto'],
    ['puerta-abierta', 'puerta-laberinto'],
    ['mano-deslizar', 'mano-laberinto'],
  ])
  for (const reto of paquete.retos) {
    for (const objeto of reto.objetos) claves.set(objeto.tipo, 'producto')
    if (reto.regla.tipo === 'orden') {
      for (const tipo of reto.regla.secuencia) claves.set(tipo, 'producto')
    } else {
      claves.set('clase-' + reto.regla.clase, 'clase-laberinto')
    }
  }
  return claves
}

// Pide al cargador de Phaser el PNG de cada clave (el fondo del pueblito es un
// WebP, que pesa mucho menos). Si falta, no se reintenta.
export function pedirDibujos(escena, claves) {
  escena.load.maxRetries = 0
  escena.load.setPath('dibujos/')
  for (const [clave, tipo] of claves) {
    // Estas figuras se dibujan por código: pedir un PNG inexistente produciría
    // un 404 en cada carga aunque el reemplazo visual fuera correcto.
    if (tipo === 'clase-laberinto' || tipo === 'mano-laberinto') continue
    escena.load.image(clave, clave + '.' + (clave === 'fondo-pueblito' ? 'webp' : 'png'))
  }
  escena.load.setPath('')
}

// Después de cargar: lo que no llegó se dibuja con una figura simple.
export function completarConFiguras(escena, claves) {
  const dibujadas = []
  for (const [clave, tipo] of claves) {
    if (escena.textures.exists(clave)) continue
    crearFiguraSimple(escena, clave, tipo)
    dibujadas.push(clave)
  }
  return dibujadas
}

// Dibuja la figura simple de una clave en un lienzo y la guarda como textura con esa clave.
function crearFiguraSimple(escena, clave, tipo) {
  const { ancho, alto, dibujar } = elegirFigura(clave, tipo)
  const textura = escena.textures.createCanvas(clave, ancho, alto)
  const lienzo = textura.getContext()
  lienzo.save()
  dibujar(lienzo, ancho, alto)
  lienzo.restore()
  textura.refresh()
}

// Qué figura y de qué tamaño, según el tipo de cosa.
function elegirFigura(clave, tipo) {
  switch (tipo) {
    case 'kusi-frente':
      return { ancho: 124, alto: 140, dibujar: dibujarKusiFrente }
    case 'producto':
      return { ancho: 96, alto: 96, dibujar: (lienzo) => dibujarProducto(lienzo, clave) }
    case 'terreno-laberinto':
      return { ancho: 96, alto: 96, dibujar: (lienzo) => dibujarTerrenoLaberinto(lienzo, clave) }
    case 'fondo-laberinto':
      return { ancho: 1280, alto: 720, dibujar: dibujarFondoLaberinto }
    case 'puerta-laberinto':
      return { ancho: 96, alto: 96, dibujar: (lienzo) => dibujarPuertaLaberinto(lienzo, clave) }
    case 'clase-laberinto':
      return { ancho: 96, alto: 96, dibujar: (lienzo) => dibujarClaseLaberinto(lienzo, clave) }
    case 'mano-laberinto':
      return { ancho: 96, alto: 112, dibujar: dibujarManoLaberinto }
    default:
      return { ancho: 96, alto: 96, dibujar: (lienzo) => dibujarProducto(lienzo, clave) }
  }
}

// Escala una imagen para que entre en una caja sin deformarse.
// Así un PNG de cualquier tamaño ocupa el mismo lugar que su figura simple.
export function ajustarATamano(imagen, anchoMaximo, altoMaximo) {
  const escala = Math.min(anchoMaximo / imagen.width, altoMaximo / imagen.height)
  return imagen.setScale(escala)
}
