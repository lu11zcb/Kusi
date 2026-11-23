import { guardarPng } from '../../kit/herramientas/animaciones/png_rgba.mjs'

// Una tira como la que entrega la herramienta de imágenes: la misma criatura (un cuerpo redondo con dos patas) dibujada
// sobre fondo blanco, con las patas en otro sitio en cada cuadro. La visión de macOS la recorta de verdad.
export function tiraSobreBlanco(ruta, { cuadro = 700, alto = 700, cuerpo = 180, patas = [[-90, 90], [0, 0], [90, -90]], vacio = null } = {}) {
  const ancho = cuadro * patas.length
  const pixeles = new Uint8Array(ancho * alto * 4).fill(255)
  const poner = (x, y, color) => { if (x >= 0 && y >= 0 && x < ancho && y < alto) pixeles.set(color, (y * ancho + x) * 4) }
  for (let c = 0; c < patas.length; c += 1) {
    if (c === vacio) continue
    const cx = c * cuadro + cuadro / 2
    const cy = alto / 2 - 40
    for (let y = 0; y < alto; y += 1) {
      for (let x = c * cuadro; x < (c + 1) * cuadro; x += 1) {
        const d = Math.hypot(x - cx, y - cy)
        if (d <= cuerpo) poner(x, y, d > cuerpo - 18 ? [75, 33, 14] : [240, 120, 48])
        // dos patas: rectángulos debajo del cuerpo, desplazadas según el cuadro
        for (const dx of patas[c]) {
          if (Math.abs(x - (cx + dx)) <= 22 && y >= cy + cuerpo - 30 && y <= cy + cuerpo + 90) poner(x, y, [75, 33, 14])
        }
      }
    }
  }
  guardarPng(ruta, { ancho, alto, datos: Buffer.from(pixeles) })
}
