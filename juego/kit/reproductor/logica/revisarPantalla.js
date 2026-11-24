import { ALTO, ANCHO } from '../medidas.js'

const LETRA_DEL_JUEGO = 48
const LETRA_DEL_KIT = 18

const esHud = (caja) => caja.tipo === 'hud' || caja.hud === true
const esObjeto = (caja) => !esHud(caja) && (caja.tipo === 'objeto' || caja.tocable === true || caja.objetoDeJuego === true)
const nombre = (caja) => '«' + (caja.texto?.trim().replace(/\s+/g, ' ') || caja.id) + '»'

function areaComun(a, b) {
  const ancho = Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x)
  const alto = Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y)
  return Math.max(0, ancho) * Math.max(0, alto)
}

export function revisarPantalla({ ancho, alto, cajas }) {
  const hallazgos = []
  // Scale.EXPAND conserva la escala del eje que limita el tamaño de la pantalla base.
  const escala = Math.min(ancho / ANCHO, alto / ALTO)
  for (const [indice, caja] of cajas.entries()) {
    const minimo = esHud(caja) || caja.letraDelKit ? LETRA_DEL_KIT : LETRA_DEL_JUEGO
    const letraBase = caja.letra / escala
    if (caja.tipo === 'texto' && letraBase < minimo) {
      hallazgos.push({ regla: '13.14', motivo: 'Texto chico ' + nombre(caja) + ' (' +
        Number(letraBase.toFixed(2)) + ' px en la pantalla base, mínimo ' + minimo + ' px).' })
    }
    if (caja.x < 0 || caja.y < 0 || caja.x + caja.ancho > ancho || caja.y + caja.alto > alto) {
      const regla = caja.tipo === 'texto' && !esHud(caja) ? '13.14' : '14.8'
      hallazgos.push({ regla, motivo: nombre(caja) + ' se sale de la pantalla.' })
    }

    for (let siguiente = indice + 1; siguiente < cajas.length; siguiente += 1) {
      const otra = cajas[siguiente]
      const dosTextos = caja.tipo === 'texto' && otra.tipo === 'texto'
      const objetoYHud = (esObjeto(caja) && esHud(otra)) || (esObjeto(otra) && esHud(caja))
      if (!dosTextos && !objetoYHud) continue
      const chica = Math.min(caja.ancho * caja.alto, otra.ancho * otra.alto)
      if (chica > 0 && areaComun(caja, otra) >= chica / 4) {
        hallazgos.push({ regla: objetoYHud || esHud(caja) || esHud(otra) ? '14.8' : '13.14',
          motivo: 'Están encimados ' + nombre(caja) + ' y ' + nombre(otra) + '.' })
      }
    }
  }
  return hallazgos
}
