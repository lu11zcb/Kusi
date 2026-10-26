import * as Phaser from 'phaser'
import { DIRECCIONES_PERSONAJE } from '../datos/validarSpritePersonaje.js'

export const claveAnimacionPersonaje = (clave, direccion, estado) => clave + ':' + direccion + ':' + estado

// «reposo» describe el movimiento físico; «quieto» identifica el dibujo de apoyo
// del manifiesto. La compatibilidad permite abrir también las hojas anteriores.
const estadoQuieto = (animaciones) => animaciones.quieto ? 'quieto' : 'reposo'
const esLateral = (direccion) => direccion === 'izquierda' || direccion === 'derecha'

export function pedirHojaPersonaje(escena, datos, clave) {
  escena.load.spritesheet(clave, 'dibujos/' + datos.imagen, {
    frameWidth: datos.fotograma.ancho,
    frameHeight: datos.fotograma.alto,
  })
}

export function registrarAnimacionesPersonaje(escena, datos, clave) {
  if (!escena.textures.exists(clave)) throw new Error('[' + clave + '] No se pudo cargar la hoja animada')
  const textura = escena.textures.get(clave)
  const imagen = textura.getSourceImage()
  const { ancho, alto } = datos.fotograma
  const { columnas, filas } = datos.cuadricula
  if (imagen.width !== ancho * columnas || imagen.height !== alto * filas) {
    throw new Error('[' + clave + '] La hoja debe medir ' + ancho * columnas + ' × ' + alto * filas)
  }
  // El filtro suave conserva los bordes de los dibujos cartoon al reducirlos.
  // La hoja y cada ciclo se describen solamente en el JSON de este personaje.
  textura.setFilter(Phaser.Textures.FilterMode.LINEAR)
  for (const direccion of DIRECCIONES_PERSONAJE) {
    for (const [estado, animacion] of Object.entries(datos.animaciones[direccion])) {
      const nombre = claveAnimacionPersonaje(clave, direccion, estado)
      if (escena.anims.exists(nombre)) continue
      const { fotogramas, fps, repetir = -1 } = animacion
      escena.anims.create({
        key: nombre,
        frames: fotogramas.map((frame) => ({ key: clave, frame })),
        sortFrames: false,
        frameRate: fps,
        repeat: repetir,
      })
    }
  }
}

export class PersonajeAnimado extends Phaser.GameObjects.Sprite {
  constructor(escena, datos, clave, { relojManual = false } = {}) {
    const estado = estadoQuieto(datos.animaciones.frente)
    super(escena, 0, 0, clave, datos.animaciones.frente[estado].fotogramas[0])
    this.clavePersonaje = clave
    this.datosSprite = datos
    this.relojManual = relojManual
    this.estadoMovimiento = 'reposo'
    this.direccionAnimada = 'frente'
    this.estadoExpresivo = null
    this.setOrigin(datos.anclaje.x / datos.fotograma.ancho, datos.anclaje.y / datos.fotograma.alto)
      .setScale(datos.escala)
    escena.add.existing(this)
    this.on(Phaser.Animations.Events.ANIMATION_COMPLETE, this.terminarEstado, this)
    this.reproducirEstado('frente', estado)
  }

  // El jugador avanza su reloj después de resolver las colisiones, cuando se
  // conoce la distancia real. Los personajes sin movimiento usan el reloj de
  // Phaser; así un vendedor puede reproducir expresiones sin lógica duplicada.
  preUpdate(tiempo, delta) {
    if (!this.relojManual) super.preUpdate(tiempo, delta)
  }

  reproducirEstado(direccion, estado) {
    const animacion = this.datosSprite.animaciones[direccion][estado]
    this.direccionAnimada = direccion
    // El volteo se declara en el ciclo lateral. Arriba y abajo conservan siempre
    // la mancha en el lado dibujado, incluso si llega un manifiesto incorrecto.
    this.setFlipX(esLateral(direccion) && animacion.voltear === true)
    this.play(claveAnimacionPersonaje(this.clavePersonaje, direccion, estado), true)
  }

  mostrarEstado(estado, direccion = this.direccionAnimada) {
    const animacion = this.datosSprite.animaciones[direccion]?.[estado]
    if (!animacion) return false
    // Una expresión finita se mantiene aunque la escena siga llamando al método
    // de movimiento en cada cuadro. Al completarse, su transición sale del JSON.
    this.estadoExpresivo = animacion.repetir >= 0 ? estado : null
    this.reproducirEstado(direccion, estado)
    return true
  }

  terminarEstado(animacionTerminada) {
    if (!this.estadoExpresivo) return
    const estado = this.estadoExpresivo
    const direccion = this.direccionAnimada
    if (animacionTerminada.key !== claveAnimacionPersonaje(this.clavePersonaje, direccion, estado)) return
    const animacion = this.datosSprite.animaciones[direccion][estado]
    this.estadoExpresivo = null
    if (animacion.siguiente) this.mostrarEstado(animacion.siguiente, direccion)
  }

  // Una expresión menor, como el parpadeo, no debe retrasar el caminar: la
  // escena la corta al empezar el movimiento y animarMovimiento recupera el
  // control en el mismo cuadro. Solo actúa si esa expresión es la que está en curso.
  interrumpirEstado(estado) {
    if (this.estadoExpresivo !== estado) return false
    this.estadoExpresivo = null
    return true
  }

  animarMovimiento(direccion, distancia, segundos, tiempo) {
    const caminando = distancia > 0.01
    this.estadoMovimiento = caminando ? 'caminar' : 'reposo'
    if (!this.estadoExpresivo) {
      const animaciones = this.datosSprite.animaciones[direccion]
      let caminar = 'caminar'
      if (esLateral(direccion) && animaciones.caminar_lado) caminar = 'caminar_lado'
      else if (direccion === 'espaldas' && animaciones.caminar_espalda) caminar = 'caminar_espalda'
      this.reproducirEstado(direccion, caminando ? caminar : estadoQuieto(animaciones))
    }
    // La cadencia del manifiesto mide tiempo real: acelerar o frenar no cambia
    // ocho cuadros por segundo, y una colisión pasa al dibujo quieto.
    if (this.relojManual) this.anims.update(tiempo, segundos * 1000)
  }
}
