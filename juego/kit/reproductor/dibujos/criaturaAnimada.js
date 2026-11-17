// Una criatura animada en la escena: un personaje secundario o un enemigo con su tira de 3 cuadros
// (piezas/criatura-<nombre>.png, que el dibujante crea con dibujar.mjs --criatura).
//
//   import { crearCriatura } from '#kit/reproductor/dibujos/criaturaAnimada.js'
//   this.llama = crearCriatura(this, 'criatura-llama', { alto: 130 })
//   this.llama.setPosition(x, y)                       // la posición es la de sus PIES
//   this.llama.animar(moviendose, mira, this.time.now) // en cada cuadro de update (mira: 1 derecha, -1 izquierda)
//
// Si la pieza no está (por ejemplo, el dibujante no pudo con ella), se ve una figura simple con ojos y se mueve igual:
// el juego nunca se rompe por una pieza faltante.

import * as Phaser from 'phaser'
import { NUMERO } from '../medidas.js'
import { cuadroDeLaCriatura, miraDeLaCriatura, CUADRO_QUIETO } from '../logica/criatura.js'

const CUADRO = 256
const CUADROS = 3
// El lado mayor de la criatura dentro de su cuadro (preparar_criatura.mjs) y la fila de sus pies.
const LADO_MAYOR = 200
const PIES = 244

function hojaValida(escena, clave) {
  if (!escena.textures.exists(clave)) return false
  const fuente = escena.textures.get(clave).getSourceImage()
  return fuente?.width === CUADRO * CUADROS && fuente?.height === CUADRO
}

// «alto» es lo que debe medir la criatura en pantalla (su lado mayor). Devuelve un objeto de Phaser con el método
// animar(moviendose, mira, tiempoMs) y la mirada actual en .mira.
export function crearCriatura(escena, clave, { alto = 130, fps = 8 } = {}) {
  const escala = alto / LADO_MAYOR
  let criatura
  if (hojaValida(escena, clave)) {
    const textura = escena.textures.get(clave)
    textura.setFilter(Phaser.Textures.FilterMode.LINEAR)
    for (let i = 0; i < CUADROS; i += 1) if (!textura.has(String(i))) textura.add(String(i), 0, i * CUADRO, 0, CUADRO, CUADRO)
    // El origen es el punto entre sus pies: así su posición es la del suelo y se ordena por altura sin cuentas.
    criatura = escena.add.sprite(0, 0, clave, String(CUADRO_QUIETO)).setOrigin(0.5, (PIES + 1) / CUADRO).setScale(escala)
    criatura.animar = (moviendose, mira, tiempoMs) => {
      criatura.mira = mira
      criatura.setFlipX(mira < 0)
      criatura.setFrame(String(cuadroDeLaCriatura(tiempoMs, moviendose, { fps })))
    }
  } else {
    const lado = alto / 2
    criatura = escena.add.container(0, 0, [
      escena.add.ellipse(0, -lado * 0.8, lado * 1.6, lado * 1.4, NUMERO.naranja).setStrokeStyle(4, NUMERO.tinta),
      escena.add.circle(-lado * 0.3, -lado * 0.95, 6, NUMERO.tinta),
      escena.add.circle(lado * 0.3, -lado * 0.95, 6, NUMERO.tinta),
    ])
    criatura.animar = (moviendose, mira, tiempoMs) => {
      criatura.mira = mira
      criatura.setScale(mira < 0 ? -1 : 1, 1)
      criatura.setAngle(moviendose ? Math.sin(tiempoMs / 120) * 6 : 0)
    }
  }
  criatura.mira = 1
  return criatura
}

export { miraDeLaCriatura }
