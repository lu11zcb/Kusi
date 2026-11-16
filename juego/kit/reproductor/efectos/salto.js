// Hace saltar a un objeto (el protagonista, un personaje secundario) de un punto a otro, con su
// arco y su aplastón. Lo normal en un mundo de plataformas, nubes o piedras separadas: el niño
// toca el destino y el protagonista salta, en vez de caminar por encima del vacío.
//
//   await saltarHasta(this, protagonista.contenedor, { x, y }, { altura: 90, alAterrizar: () => polvito() })
//
// Con ?vida=0 (sin efectos) llega al instante, sin arco.

import { puntoDelSalto, duracionDelSalto, formaDelSalto } from '../logica/salto.js'
import { vidaActiva } from './vida.js'

export function saltarHasta(escena, objeto, destino, { altura = 90, duracion = null, alAterrizar = null } = {}) {
  return new Promise((resolver) => {
    const inicio = { x: objeto.x, y: objeto.y }
    const base = { x: objeto.scaleX, y: objeto.scaleY }
    const terminar = () => {
      objeto.setPosition(destino.x, destino.y).setScale(base.x, base.y)
      alAterrizar?.(destino)
      resolver()
    }
    if (!vidaActiva()) return terminar()
    const control = { t: 0 }
    escena.tweens.add({
      targets: control, t: 1, duration: duracion ?? duracionDelSalto(inicio, destino), ease: 'Sine.InOut',
      onUpdate: () => {
        const punto = puntoDelSalto(inicio, destino, control.t, altura)
        const forma = formaDelSalto(control.t)
        objeto.setPosition(punto.x, punto.y).setScale(base.x * forma.escalaX, base.y * forma.escalaY)
      },
      onComplete: terminar,
    })
  })
}
