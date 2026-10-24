import * as Phaser from 'phaser'
import { DIRECCIONES_CUY } from '../datos/validarSpriteCuy.js'

export const CLAVE_CUY_ANIMADO = 'cuy-nino-animado-v1'
export const CLAVE_MANIFIESTO_CUY = 'cuy-nino-manifiesto'
export const ARCHIVO_MANIFIESTO_CUY = 'dibujos/cuy-nino-animado-v1.json'

const claveAnimacion = (direccion, estado) => CLAVE_CUY_ANIMADO + ':' + direccion + ':' + estado

// «reposo» sigue siendo el estado de movimiento que consultan las escenas. La
// imagen quieta se define en el manifiesto, sin duplicar sus cuadros en código.
const estadoQuieto = (animaciones) => animaciones.quieto ? 'quieto' : 'reposo'

export function pedirHojaCuy(escena, datos) {
  escena.load.spritesheet(CLAVE_CUY_ANIMADO, 'dibujos/' + datos.imagen, {
    frameWidth: datos.fotograma.ancho,
    frameHeight: datos.fotograma.alto,
  })
}

export function registrarAnimacionesCuy(escena, datos) {
  if (!escena.textures.exists(CLAVE_CUY_ANIMADO)) throw new Error('[cuy] No se pudo cargar la hoja animada')
  const textura = escena.textures.get(CLAVE_CUY_ANIMADO)
  const imagen = textura.getSourceImage()
  const { ancho, alto } = datos.fotograma
  const { columnas, filas } = datos.cuadricula
  if (imagen.width !== ancho * columnas || imagen.height !== alto * filas) {
    throw new Error('[cuy] La hoja debe medir ' + ancho * columnas + ' × ' + alto * filas)
  }
  // Los dibujos cartoon se reducen suavemente; el filtro anterior correspondía
  // al recurso pixel art. Las celdas siguen siendo PNG independientes con alfa.
  textura.setFilter(Phaser.Textures.FilterMode.LINEAR)
  for (const direccion of DIRECCIONES_CUY) {
    // El JSON es el único lugar donde se describen los ciclos. Recorrer sus
    // estados conserva también feliz/asustado cuando se incorporen a la hoja.
    for (const [estado, animacion] of Object.entries(datos.animaciones[direccion])) {
      const clave = claveAnimacion(direccion, estado)
      if (escena.anims.exists(clave)) continue
      const { fotogramas, fps, repetir = -1 } = animacion
      escena.anims.create({
        key: clave,
        frames: fotogramas.map((frame) => ({ key: CLAVE_CUY_ANIMADO, frame })),
        sortFrames: false,
        frameRate: fps,
        repeat: repetir,
      })
    }
  }
}

export class CuyAnimado extends Phaser.GameObjects.Sprite {
  constructor(escena, datos) {
    super(escena, 0, 0, CLAVE_CUY_ANIMADO, datos.animaciones.frente.reposo.fotogramas[0])
    this.datosSprite = datos
    this.estadoMovimiento = 'reposo'
    this.setOrigin(datos.anclaje.x / datos.fotograma.ancho, datos.anclaje.y / datos.fotograma.alto)
      .setScale(datos.escala)
    escena.add.existing(this)
    this.play(claveAnimacion('frente', estadoQuieto(datos.animaciones.frente)))
  }

  // Phaser llama preUpdate antes de mover al personaje. Actualizamos el reloj una
  // sola vez después de las colisiones, cuando sabemos si realmente pudo avanzar.
  preUpdate() {}

  animarMovimiento(direccion, distancia, segundos, tiempo) {
    const caminando = distancia > 0.01
    this.estadoMovimiento = caminando ? 'caminar' : 'reposo'
    const estado = caminando ? 'caminar' : estadoQuieto(this.datosSprite.animaciones[direccion])
    // La izquierda reutiliza los mismos tres dibujos mediante el volteo de
    // Phaser. El anclaje central permanece fijo al cambiar de dirección.
    this.setFlipX(direccion === 'izquierda')
    this.play(claveAnimacion(direccion, estado), true)
    // La cadencia del manifiesto se mide en tiempo real: incluso al frenar,
    // caminar reproduce ocho cuadros por segundo; al bloquearse pasa a quieto.
    this.anims.update(tiempo, segundos * 1000)
  }
}
