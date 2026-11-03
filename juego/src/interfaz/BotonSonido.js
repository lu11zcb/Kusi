// Botón de sonido del laberinto: un altavoz junto a Kusi, abajo a la izquierda,
// que apaga y vuelve a encender todos los sonidos de los personajes y de las
// frutas. No toca la voz de Kusi: esa se repite con «Escuchar». Con el sonido
// apagado el altavoz se tacha y el botón se pone gris.
import { NUMERO } from '../medidas.js'
import { crearBoton } from './piezas.js'

// Cuánto mide y de qué color es. Dónde queda lo decide la escena según la
// disposición (en la columna de Kusi, donde no llega el mapa de ningún nivel);
// «x» e «y» son solo el lugar donde nace antes de que la escena lo coloque.
export const BOTON_SONIDO = Object.freeze({
  x: 1220, y: 684, ancho: 76, alto: 64, radio: 20, profundidad: 1003,
  colorEncendido: NUMERO.naranja, colorApagado: 0xd9c9ad,
})

// Dibuja el altavoz centrado en (0, 0): la caja y el cono, y a la derecha dos
// ondas de sonido, o una cruz roja si está apagado.
export function dibujarAltavoz(graficos, silenciado) {
  graficos.clear()
  graficos.fillStyle(NUMERO.tinta, 1)
  graficos.fillRect(-20, -7, 9, 14)
  // El cono se arma con dos triángulos que cubren el cuadrilátero entre la caja y la boca.
  graficos.fillTriangle(-11, -7, 1, -17, 1, 17)
  graficos.fillTriangle(-11, -7, -11, 7, 1, 17)
  if (silenciado) {
    graficos.lineStyle(5, NUMERO.rojo, 1)
    graficos.lineBetween(8, -8, 20, 8)
    graficos.lineBetween(8, 8, 20, -8)
  } else {
    graficos.lineStyle(4, NUMERO.tinta, 1)
    for (const radio of [9, 16]) {
      graficos.beginPath()
      graficos.arc(2, 0, radio, -0.85, 0.85)
      graficos.strokePath()
    }
  }
}

// «alTocar» recibe el toque; la escena decide si fue un deslizamiento y cambia el
// silencio. Devuelve el botón, con «mostrar(silenciado)» para ponerlo al día.
export function crearBotonSonido(escena, { silenciado, alTocar }) {
  const icono = escena.add.graphics()
  const boton = crearBoton(escena, BOTON_SONIDO.x, BOTON_SONIDO.y, {
    ancho: BOTON_SONIDO.ancho, alto: BOTON_SONIDO.alto, radio: BOTON_SONIDO.radio, texto: '', icono, alTocar,
  }).setDepth(BOTON_SONIDO.profundidad)
  boton.mostrar = (apagado) => {
    dibujarAltavoz(icono, apagado)
    boton.fondo.setFillStyle(apagado ? BOTON_SONIDO.colorApagado : BOTON_SONIDO.colorEncendido)
    boton.silenciado = apagado
  }
  boton.mostrar(silenciado)
  return boton
}
