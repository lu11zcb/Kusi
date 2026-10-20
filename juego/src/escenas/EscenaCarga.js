// Primera escena: valida y prepara el paquete del juego antes de cargar sus dibujos.
// Si falta algún dibujo, se reemplaza por una figura simple.

import * as Phaser from 'phaser'
import { ANCHO, ALTO, COLOR, estiloTexto } from '../medidas.js'
import {
  clavesDelPaquete,
  pedirDibujos,
  completarConFiguras,
} from '../dibujos/dibujos.js'
import { generarPaquetePrueba } from '../datos/generarPaquetePrueba.js'
import { validarPaquete } from '../datos/validarPaquete.js'

// Paquete de ejemplo utilizado mientras se integra el generador real.
const ARCHIVO_DEL_PAQUETE = 'paquete-ejemplo.json'

export class EscenaCarga extends Phaser.Scene {
  constructor() {
    super('carga')
  }

  preload() {
    this.cameras.main.setBackgroundColor(COLOR.crema)

    this.add
      .text(
        ANCHO / 2,
        ALTO / 2,
        'Cargando el mercado...',
        estiloTexto(36),
      )
      .setOrigin(0.5)

    this.load.json('paquete', ARCHIVO_DEL_PAQUETE)
  }

  async create() {
    const paqueteBase = this.cache.json.get('paquete')

    try {
      // Simula la generación del paquete a partir del ejemplo.
      const paquete = await generarPaquetePrueba(paqueteBase)

      // Verifica que el paquete generado tenga la estructura necesaria.
      const resultado = validarPaquete(paquete)

      if (!resultado.valido) {
        throw new Error(resultado.errores.join('; '))
      }

      // Carga los dibujos necesarios para los puestos y productos.
      const claves = clavesDelPaquete(paquete)
      pedirDibujos(this, claves)

      this.load.once('complete', () => {
        const dibujadas = completarConFiguras(this, claves)

        if (dibujadas.length > 0) {
          console.info(
            `[dibujos] ${dibujadas.length} figuras simples creadas como reemplazo`,
          )
        }

        // Abre el mercado usando el paquete preparado.
        this.scene.start('mercado', { paquete })
      })

      this.load.start()
    } catch (error) {
      console.error(
        '[generador] No se pudo preparar el paquete:',
        error,
      )

      this.add
        .text(
          ANCHO / 2,
          ALTO / 2 + 60,
          'No se pudo preparar el paquete del juego',
          estiloTexto(28, COLOR.rojo),
        )
        .setOrigin(0.5)
    }
  }
}

