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
import { validarSpriteCuy } from '../datos/validarSpriteCuy.js'
import { validarSpritePersonaje } from '../datos/validarSpritePersonaje.js'
import {
  ARCHIVO_MANIFIESTO_CUY, CLAVE_MANIFIESTO_CUY, pedirHojaCuy, registrarAnimacionesCuy,
} from '../dibujos/cuyAnimado.js'
import {
  ARCHIVO_MANIFIESTO_ZORRO, CLAVE_MANIFIESTO_ZORRO, pedirHojaZorro, registrarAnimacionesZorro,
} from '../dibujos/zorroAnimado.js'

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
    this.load.json(CLAVE_MANIFIESTO_CUY, ARCHIVO_MANIFIESTO_CUY)
    this.load.json(CLAVE_MANIFIESTO_ZORRO, ARCHIVO_MANIFIESTO_ZORRO)
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

      // El jugador animado es obligatorio: un fallo de carga debe quedar visible.
      const cuyAnimado = validarSpriteCuy(this.cache.json.get(CLAVE_MANIFIESTO_CUY))
      const zorroAnimado = validarSpritePersonaje(this.cache.json.get(CLAVE_MANIFIESTO_ZORRO), 'zorro')

      // Carga los dibujos necesarios para los puestos y productos.
      const claves = clavesDelPaquete(paquete)
      pedirDibujos(this, claves)
      pedirHojaCuy(this, cuyAnimado)
      pedirHojaZorro(this, zorroAnimado)

      this.load.once('complete', () => {
        try {
          const dibujadas = completarConFiguras(this, claves)

          if (dibujadas.length > 0) {
            console.info(
              `[dibujos] ${dibujadas.length} figuras simples creadas como reemplazo`,
            )
          }

          // Abre el mercado usando el paquete preparado.
          registrarAnimacionesCuy(this, cuyAnimado)
          registrarAnimacionesZorro(this, zorroAnimado)
          this.scene.start('mercado', { paquete, cuyAnimado, zorroAnimado })
        } catch (error) {
          this.mostrarError(error)
        }
      })

      this.load.start()
    } catch (error) {
      this.mostrarError(error)
    }
  }

  mostrarError(error) {
    console.error('[carga] No se pudo preparar el mercado:', error)

    this.add
      .text(
        ANCHO / 2,
        ALTO / 2 + 60,
        'No se pudo cargar el mercado',
        estiloTexto(28, COLOR.rojo),
      )
      .setOrigin(0.5)
  }
}

