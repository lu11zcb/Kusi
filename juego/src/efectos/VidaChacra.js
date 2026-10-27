import { SPRITES_CENITALES, cuadroIlustrado } from '../dibujos/estiloFinal.js'
import { crearAzarLaberinto } from '../logica/presentacionLaberinto.js'

// El viento cambia el cuadro del sprite, sin estirar las plantas ni deslizar
// sus raíces. Ninguna ilustración invade los pasillos del laberinto.
export function distribuirVegetacion({ diseno, mapa }) {
  const azar = crearAzarLaberinto('jardin-cenital-' + diseno.ancho)
  const plantas = []
  for (let fila = 0, y = 32; y < diseno.alto; fila++, y += 103) {
    for (let columna = 0, x = 30; x < diseno.ancho; columna++, x += 100) {
      const indice = fila * 7 + columna
      const clave = indice % 5 === 0 ? 'cenital-arbusto'
        : indice % 4 === 0 ? 'cenital-margaritas' : indice % 3 === 0 ? 'cenital-flores' : 'cenital-pasto'
      const lado = (clave === 'cenital-arbusto' ? 112 : clave === 'cenital-pasto' ? 48 : 58) * (.85 + azar() * .3)
      const px = x + (azar() - .5) * 30, py = y + (azar() - .5) * 26
      const radio = lado / 2
      if (px + radio > mapa.x - 10 && px - radio < mapa.x + mapa.ancho + 10 &&
          py + radio > mapa.y - 10 && py - radio < mapa.y + mapa.alto + 10) continue
      plantas.push({ clave, x: px, y: py, lado, desfase: azar() * 4 })
    }
  }
  return plantas
}

export class VidaChacra {
  constructor(escena, { activo = true } = {}) {
    this.activo = activo; this.tiempo = 0
    this.plantas = distribuirVegetacion(escena.disposicion).map(p => ({ ...p,
      dibujo: escena.add.image(p.x, p.y, p.clave, 0).setOrigin(.5).setDisplaySize(p.lado, p.lado).setDepth(-8),
    }))
    this.aplicar()
  }
  aplicar() {
    for (const p of this.plantas) {
      const cuadro = this.activo ? cuadroIlustrado(this.tiempo, SPRITES_CENITALES[p.clave], p.desfase) : 0
      if (Number(p.dibujo.frame.name) !== cuadro) p.dibujo.setFrame(cuadro)
    }
  }
  actualizar(segundos) {
    if (!this.activo || !Number.isFinite(segundos) || segundos <= 0) return
    this.tiempo += segundos; this.aplicar()
  }
  estado() {
    return { activa: this.activo, vista: 'cenital', tiempo: this.tiempo,
      plantas: this.plantas.map(p => ({ clave: p.clave, x: p.dibujo.x, y: p.dibujo.y,
        lado: p.lado, cuadro: Number(p.dibujo.frame.name), visible: p.dibujo.visible })),
    }
  }
}
