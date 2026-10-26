// Reemplazos sencillos del kit del laberinto. Se guardan con la clave del PNG
// definitivo, de modo que incorporar arte después no requiere cambiar la escena.
import { dibujarProducto } from './productos.js'

export function dibujarTerrenoLaberinto(lienzo, clave) {
  if (clave.startsWith('muro-adobe')) {
    lienzo.fillStyle = '#b87547'
    lienzo.fillRect(0, 0, 96, 96)
    lienzo.fillStyle = '#dca66f'
    lienzo.fillRect(3, 3, 90, 11)
    lienzo.strokeStyle = '#885537'
    lienzo.lineWidth = 4
    lienzo.beginPath()
    for (const y of [32, 64]) {
      lienzo.moveTo(0, y)
      lienzo.lineTo(96, y)
    }
    for (const [x, y] of [[48, 0], [24, 32], [72, 32], [48, 64]]) {
      lienzo.moveTo(x, y)
      lienzo.lineTo(x, y + 32)
    }
    lienzo.stroke()
    lienzo.fillStyle = '#9b623d'
    lienzo.fillRect(0, 90, 96, 6)
    return
  }

  const pasto = clave === 'pasto'
  lienzo.fillStyle = pasto ? '#b9ce83' : '#f1d4a4'
  lienzo.fillRect(0, 0, 96, 96)
  lienzo.fillStyle = pasto ? '#9db968' : '#debb88'
  for (const [x, y] of [[14, 23], [72, 55], [34, 78]]) {
    lienzo.beginPath()
    lienzo.ellipse(x, y, pasto ? 3 : 4, 2, 0, 0, Math.PI * 2)
    lienzo.fill()
  }
}

// Si falta el paisaje, el resto del kit sigue siendo jugable sobre una pradera.
export function dibujarFondoLaberinto(lienzo, ancho, alto) {
  lienzo.fillStyle = '#a6ca63'
  lienzo.fillRect(0, 0, ancho, alto)
  lienzo.fillStyle = '#91d5ec'
  lienzo.fillRect(0, 0, ancho, alto * 0.15)
}

export function dibujarPuertaLaberinto(lienzo, clave) {
  const abierta = clave === 'puerta-abierta'
  lienzo.fillStyle = '#71462f'
  lienzo.beginPath()
  lienzo.roundRect(16, 8, 64, 84, [30, 30, 4, 4])
  lienzo.fill()
  lienzo.fillStyle = abierta ? '#dff1ac' : '#dca66f'
  lienzo.beginPath()
  lienzo.roundRect(24, 17, 48, 75, [22, 22, 0, 0])
  lienzo.fill()
  if (!abierta) {
    lienzo.strokeStyle = '#b07a49'
    lienzo.lineWidth = 3
    for (const x of [39, 56]) {
      lienzo.beginPath()
      lienzo.moveTo(x, 26)
      lienzo.lineTo(x, 89)
      lienzo.stroke()
    }
    lienzo.fillStyle = '#71462f'
    lienzo.fillRect(26, 48, 44, 9)
    lienzo.fillStyle = '#ffe19b'
    lienzo.beginPath()
    lienzo.arc(62, 63, 5, 0, Math.PI * 2)
    lienzo.fill()
  }
}

// La clase se reconoce por sus propios alimentos, usando los dibujos ya
// existentes en vez de crear un segundo catálogo de frutas y verduras.
export function dibujarClaseLaberinto(lienzo, clave) {
  const tipos = clave === 'clase-verdura' ? ['zanahoria', 'choclo'] : ['fresa', 'platano']
  tipos.forEach((tipo, indice) => {
    lienzo.save()
    lienzo.translate(indice * 34, indice * 10)
    lienzo.scale(0.64, 0.76)
    dibujarProducto(lienzo, tipo)
    lienzo.restore()
  })
}

export function dibujarManoLaberinto(lienzo) {
  lienzo.translate(34, 46)
  lienzo.fillStyle = '#ffdfb5'
  lienzo.strokeStyle = '#4b211b'
  lienzo.lineWidth = 3
  lienzo.lineJoin = 'round'
  lienzo.beginPath()
  lienzo.moveTo(-15, 37)
  lienzo.lineTo(-27, 13)
  lienzo.quadraticCurveTo(-32, 1, -22, -1)
  lienzo.lineTo(-12, 11)
  lienzo.lineTo(-12, -36)
  lienzo.quadraticCurveTo(-6, -48, 0, -36)
  lienzo.lineTo(0, -4)
  lienzo.quadraticCurveTo(10, -12, 12, 0)
  lienzo.quadraticCurveTo(22, -6, 23, 7)
  lienzo.quadraticCurveTo(34, 3, 33, 18)
  lienzo.lineTo(31, 32)
  lienzo.quadraticCurveTo(28, 46, 12, 48)
  lienzo.lineTo(-2, 48)
  lienzo.quadraticCurveTo(-10, 46, -15, 37)
  lienzo.closePath()
  lienzo.fill()
  lienzo.stroke()
}
