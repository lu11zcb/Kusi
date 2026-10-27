import { distribuirBarra } from '../logica/disposicionLaberinto.js'
import { tituloDeBarra } from '../logica/presentacionLaberinto.js'
import { estiloTexto } from '../medidas.js'
export function estadoFichaBarra(recogidos, indice) {
  return indice < recogidos ? 'recogida' : indice === recogidos ? 'siguiente' : 'pendiente'
}
export class BarraFrutas {
  constructor(escena, disposicion, regla, { activo = true, objetos = [] } = {}) {
    this.activo = activo; this.tiempo = 0; this.recogidos = 0
    this.orden = regla.tipo === 'orden'
    this.meta = this.orden ? regla.secuencia.length : regla.meta
    this.titulo = tituloDeBarra(regla)
    this.datos = distribuirBarra(disposicion, regla, objetos); this.caja = this.datos.caja
    const c = this.caja
    this.fondo = escena.add.image(c.x, c.y, 'barra-frutas').setOrigin(0).setDisplaySize(c.ancho, c.alto).setDepth(1000)
    this.etiqueta = escena.add.text(this.datos.titulo.x, this.datos.titulo.y, '', estiloTexto(18))
      .setOrigin(.5, 0).setDepth(1004)
    this.fichas = this.datos.fichas.map(f => ({
      tipo: f.tipo, indiceObjeto: f.indiceObjeto, estado: 'pendiente',
      imagen: escena.add.image(f.x, f.y, f.tipo).setDisplaySize(f.ancho, f.alto).setDepth(1001),
      marca: escena.add.image(f.marca.x, f.marca.y, 'check-fruta').setDisplaySize(26, 26).setDepth(1003).setVisible(false),
      destello: escena.add.image(f.x, f.y, 'destellos-siguiente', 0).setDisplaySize(Math.min(76, f.ancho + 16), Math.min(76, f.alto + 16)).setDepth(1002),
    }))
    this.actualizar(0)
  }
  actualizar(recogidos, objetos = []) {
    this.recogidos = recogidos
    this.etiqueta.setText(this.titulo + ' · ' + recogidos + '/' + this.meta + (this.orden ? '' : ' · En cualquier orden'))
    this.fichas.forEach((f, i) => {
      f.estado = this.orden ? estadoFichaBarra(recogidos, i)
        : objetos[f.indiceObjeto]?.recogido ? 'recogida' : 'disponible'
      // Todos los objetivos conservan su color: el niño reconoce qué buscar.
      f.imagen.setTexture(f.tipo)
      f.marca.setVisible(f.estado === 'recogida')
      f.destello.setVisible(f.estado === 'siguiente')
    })
  }
  animar(segundos) {
    if (this.activo && Number.isFinite(segundos)) this.tiempo += Math.max(0, segundos)
    const frame = this.activo ? Math.floor(this.tiempo / .26) % 3 : 0
    this.fichas.forEach(f => f.destello.setFrame(frame))
  }
  estado() { return this.fichas.map(f => ({ tipo: f.tipo, estado: f.estado, textura: f.imagen.texture.key, destello: Number(f.destello.frame?.name ?? 0) })) }
}
