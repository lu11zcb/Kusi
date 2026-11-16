// Corta una figura entera en partes con Phaser: cada parte es un marco (un recorte) de la
// misma textura. Mira ../logica/partesDeFigura.js para los rectángulos.
//
//   cortarFigura(this, 'figura-muneco', PARTES)               // una vez, al crear la escena
//   const parte = crearParte(this, 'figura-muneco', 'cabeza', PARTES, { x, y, escala })
//   const lugar = lugarDeParte('cabeza', PARTES, { x: centroX, y: centroY, escala })

import { marcosDeFigura, desplazamientoDeParte, LADO_FIGURA } from '../logica/partesDeFigura.js'

// Agrega un marco por parte a la textura de la figura. Si ya se cortó, no repite.
export function cortarFigura(escena, clave, partes) {
  const textura = escena.textures.get(clave)
  const lado = textura.getSourceImage()?.width ?? LADO_FIGURA
  for (const marco of marcosDeFigura(partes, lado)) {
    if (!textura.has(marco.nombre)) textura.add(marco.nombre, 0, marco.x, marco.y, marco.ancho, marco.alto)
  }
  return textura
}

// Una parte suelta, como imagen, con su tamaño real (escala 1 = la figura a 768 px).
export function crearParte(escena, clave, nombre, partes, { x = 0, y = 0, escala = 1 } = {}) {
  cortarFigura(escena, clave, partes)
  return escena.add.image(x, y, clave, nombre).setScale(escala)
}

// El lugar donde la parte encaja cuando la figura se muestra centrada en (x, y) con «escala».
export function lugarDeParte(nombre, partes, { x, y, escala = 1 }, lado = LADO_FIGURA) {
  const marco = marcosDeFigura(partes, lado).find((parte) => parte.nombre === nombre)
  if (!marco) throw new Error('No existe la parte «' + nombre + '».')
  const caja = { x: marco.x / lado, y: marco.y / lado, ancho: marco.ancho / lado, alto: marco.alto / lado }
  const { dx, dy } = desplazamientoDeParte(caja, escala, lado)
  return { x: x + dx, y: y + dy }
}
