// Dibujos del juego. Cada cosa se busca en public/dibujos/<clave>.png.
// Si el archivo no está, se dibuja una figura simple por código y se guarda como textura
// con la misma clave. Cuando lleguen los dibujos, basta con copiarlos a esa carpeta.

import plaza from '../datos/plaza.json'
import { tipoDePuesto } from '../logica/nombres.js'
import { DENOMINACIONES } from '../logica/compras.js'
import {
  dibujarKusiFrente, dibujarKusiEspaldas, dibujarCuyNinoFrente, dibujarCuyNinoEspaldas, dibujarCuyNinoLado,
  dibujarVendedor,
} from './personajes.js'
import {
  dibujarProducto, dibujarIcono, dibujarBillete, dibujarMoneda, dibujarCartera, dibujarChoclito,
} from './productos.js'
import { dibujarPuesto, dibujarPlaza } from './escenario.js'

// Clave del dibujo de cada billete o moneda: 10 → "billete-10", 5 → "moneda-5".
export function claveDinero(valor) {
  return valor >= 10 ? `billete-${valor}` : `moneda-${valor}`
}

// Clave del dibujito del letrero: "puesto-pan" → "icono-pan".
export function claveIcono(clavePuesto) {
  return `icono-${tipoDePuesto(clavePuesto)}`
}

// Tamaño de cada moneda: las de más valor son un poco más grandes.
function tamanoMoneda(valor) {
  return valor >= 5 ? 84 : valor >= 2 ? 78 : 72
}

// Todas las claves que usa este paquete, cada una con su tipo (para saber qué figura dibujar).
export function clavesDelPaquete(paquete) {
  const claves = new Map([
    ['kusi-frente', 'kusi-frente'],
    ['kusi-espaldas', 'kusi-espaldas'],
    ['cuy-nino-frente', 'cuy-nino-frente'],
    ['cuy-nino-espaldas', 'cuy-nino-espaldas'],
    ['cuy-nino', 'cuy-nino'],
    ['cartera', 'cartera'],
    ['choclito', 'choclito'],
    ['fondo-plaza', 'fondo-plaza'],
  ])
  for (const puesto of paquete.puestos) {
    claves.set(puesto.recurso, 'puesto')
    claves.set(claveIcono(puesto.recurso), 'icono')
    claves.set(puesto.vendedor.recurso, 'vendedor')
    for (const producto of puesto.productos) claves.set(producto.recurso, 'producto')
  }
  for (const valor of new Set([...DENOMINACIONES, ...paquete.cartera])) claves.set(claveDinero(valor), 'dinero')
  return claves
}

// Pide al cargador de Phaser el PNG de cada clave. Si falta, no se reintenta.
export function pedirDibujos(escena, claves) {
  escena.load.maxRetries = 0
  escena.load.setPath('dibujos/')
  for (const clave of claves.keys()) escena.load.image(clave, `${clave}.png`)
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
    case 'kusi-espaldas':
      return { ancho: 124, alto: 140, dibujar: dibujarKusiEspaldas }
    case 'cuy-nino-frente':
      return { ancho: 110, alto: 120, dibujar: dibujarCuyNinoFrente }
    case 'cuy-nino-espaldas':
      return { ancho: 110, alto: 120, dibujar: dibujarCuyNinoEspaldas }
    case 'cuy-nino':
      return { ancho: 120, alto: 112, dibujar: dibujarCuyNinoLado }
    case 'vendedor':
      return { ancho: 150, alto: 150, dibujar: (lienzo) => dibujarVendedor(lienzo, clave) }
    case 'producto':
      return { ancho: 96, alto: 96, dibujar: (lienzo) => dibujarProducto(lienzo, clave) }
    case 'puesto':
      return { ancho: 360, alto: 320, dibujar: (lienzo) => dibujarPuesto(lienzo, tipoDePuesto(clave)) }
    case 'icono':
      return { ancho: 64, alto: 64, dibujar: (lienzo) => dibujarIcono(lienzo, clave.replace(/^icono-/, ''), 64) }
    case 'dinero': {
      const valor = Number(clave.split('-')[1])
      if (valor >= 10) return { ancho: 132, alto: 70, dibujar: (lienzo, w, h) => dibujarBillete(lienzo, valor, w, h) }
      const tamano = tamanoMoneda(valor)
      return { ancho: tamano, alto: tamano, dibujar: (lienzo) => dibujarMoneda(lienzo, valor, tamano) }
    }
    case 'cartera':
      return { ancho: 72, alto: 72, dibujar: dibujarCartera }
    case 'choclito':
      return { ancho: 56, alto: 56, dibujar: (lienzo) => dibujarChoclito(lienzo, 56) }
    case 'fondo-plaza':
      return { ancho: plaza.ancho, alto: plaza.alto, dibujar: dibujarPlaza }
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
