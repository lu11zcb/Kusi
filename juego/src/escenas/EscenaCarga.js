// Primera escena: lee el paquete del juego y carga sus dibujos.
// Lo que no tenga dibujo se reemplaza por una figura simple antes de abrir el mercado.

import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, estiloTexto } from '../medidas.js'
import { clavesDelPaquete, pedirDibujos, completarConFiguras } from '../dibujos/dibujos.js'

// El juego se arma con este archivo (puestos, vendedores, productos, precios, lista y plata).
const ARCHIVO_DEL_PAQUETE = 'paquete-ejemplo.json'

export class EscenaCarga extends Phaser.Scene {
  constructor() {
    super('carga')
  }

  preload() {
    this.cameras.main.setBackgroundColor(COLOR.crema)
    this.add.text(ANCHO / 2, ALTO / 2, 'Cargando el mercado…', estiloTexto(36)).setOrigin(0.5)
    this.load.json('paquete', ARCHIVO_DEL_PAQUETE)
  }

  create() {
    const paquete = this.cache.json.get('paquete')
    if (!paquete?.puestos?.length) {
      this.add.text(ANCHO / 2, ALTO / 2 + 60, 'No se pudo abrir el paquete del juego', estiloTexto(28, COLOR.rojo)).setOrigin(0.5)
      return
    }

    const claves = clavesDelPaquete(paquete)
    pedirDibujos(this, claves)
    this.load.once('complete', () => {
      const dibujadas = completarConFiguras(this, claves)
      if (dibujadas.length) console.info(`[dibujos] ${dibujadas.length} figuras simples (aún no están en dibujos/)`)
      this.scene.start('mercado', { paquete })
    })
    this.load.start()
  }
}
