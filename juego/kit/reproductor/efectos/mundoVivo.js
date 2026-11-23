// Lo que hace que un mundo se vea y se sienta vivo, y no como una imagen quieta. Todo lo anima el código sobre
// las imágenes del juego (no hacen falta cuadros nuevos). Con ?vida=0 se apagan los movimientos, no el decorado.
//
//   repartirYColocar(this, { area, cantidad, claves: ['arbol', 'piedra', 'mata'], evitar })   // decorado lleno y a la profundidad correcta
//   darVida(this, objeto, 'mecer')                                                            // cada cosa se mueve un poco
//   ambiente(this, { area, clave: 'hoja', cantidad: 18 })                                     // cosas que flotan por el mundo
//   sombraBajo(this, objeto)                                                                  // una sombra suave que ancla a los personajes
//   balanceo(objeto, moviendose, tiempo)                                                      // el paso de un personaje que camina

import { repartirDecorado, profundidadPorY, avanzarParticula, generador } from '../logica/decorado.js'
import { vidaActiva } from './vida.js'

// Coloca el decorado: reparte los puntos, elige un dibujo por variante, le da su escala, lo anima un poco y lo
// ordena por altura. Devuelve los objetos creados.
export function repartirYColocar(escena, { area, cantidad, claves, evitar = [], separacion = 110, semilla = 1, vida = 'mecer' }) {
  const existentes = claves.filter((clave) => escena.textures.exists(clave))
  if (!existentes.length) return []
  return repartirDecorado({ area, cantidad, separacion, evitar, variantes: existentes.length, semilla }).map((punto) => {
    const objeto = escena.add.image(punto.x, punto.y, existentes[punto.variante % existentes.length]).setOrigin(0.5, 0.95).setScale(punto.escala)
    objeto.setDepth(profundidadPorY(punto.y))
    if (vida) darVida(escena, objeto, vida)
    return objeto
  })
}

// Un movimiento suave y distinto para cada objeto (con un desfase al azar, para que no se muevan todos a la vez):
//   mecer     se inclina un poco a cada lado, como una planta con el viento
//   respirar  se estira y se encoge, como algo vivo quieto
//   flotar    sube y baja, como algo ligero
//   brillar   se aclara y se apaga, como una luz
export function darVida(escena, objeto, tipo = 'mecer', { fuerza = 1 } = {}) {
  if (!vidaActiva() || !objeto) return null
  const desfase = Math.random() * 1200
  const base = { targets: objeto, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: desfase }
  if (tipo === 'respirar') return escena.tweens.add({ ...base, scaleY: objeto.scaleY * (1 + 0.04 * fuerza), scaleX: objeto.scaleX * (1 - 0.02 * fuerza), duration: 1500 })
  if (tipo === 'flotar') return escena.tweens.add({ ...base, y: objeto.y - 10 * fuerza, duration: 1100 })
  if (tipo === 'brillar') return escena.tweens.add({ ...base, alpha: 0.6, duration: 900 })
  return escena.tweens.add({ ...base, angle: 3 * fuerza, duration: 1700 })
}

// Cosas que flotan por el mundo todo el tiempo (hojas, luciérnagas, polvo, nubes, burbujas, chispas): cada una
// avanza con su velocidad y, al salirse del área, vuelve a entrar por el lado opuesto. Con una textura («clave»)
// o, si no hay, con puntos de color.
export function ambiente(escena, { area, clave = null, color = 0xffffff, cantidad = 16, velocidad = 24, direccion = { x: 1, y: 0.2 }, escala = [0.5, 1], alfa = 0.8, profundidad = 20 }) {
  const azar = generador(7)
  const largo = Math.hypot(direccion.x, direccion.y) || 1
  const particulas = Array.from({ length: cantidad }, () => {
    const tam = escala[0] + azar() * (escala[1] - escala[0])
    const objeto = clave && escena.textures.exists(clave)
      ? escena.add.image(0, 0, clave).setScale(tam * 0.5)
      : escena.add.circle(0, 0, 4 * tam, color)
    objeto.setAlpha(alfa).setDepth(profundidad)
    const particula = { objeto, x: area.x + azar() * area.ancho, y: area.y + azar() * area.alto,
      vx: (direccion.x / largo) * velocidad * (0.6 + azar() * 0.8), vy: (direccion.y / largo) * velocidad * (0.6 + azar() * 0.8), fase: azar() * 6.28 }
    objeto.setPosition(particula.x, particula.y)
    return particula
  })
  const alActualizar = (_t, delta) => {
    if (!vidaActiva()) return
    const segundos = Math.min(delta / 1000, 0.05)
    const reloj = escena.time.now / 1000
    for (const p of particulas) {
      const nueva = avanzarParticula(p, segundos, area)
      p.x = nueva.x
      p.y = nueva.y
      p.objeto.setPosition(p.x, p.y + Math.sin(reloj * 1.3 + p.fase) * 6)
    }
  }
  escena.events.on('update', alActualizar)
  const destruir = () => { escena.events.off('update', alActualizar); for (const p of particulas) p.objeto.destroy() }
  escena.events.once('shutdown', destruir)
  return { particulas, destruir }
}

// Una sombra suave bajo un objeto o personaje, que lo apoya en el suelo. Sigue al objeto en cada cuadro.
export function sombraBajo(escena, objeto, { ancho = 70, alto = 22, alfa = 0.28 } = {}) {
  const sombra = escena.add.ellipse(objeto.x, objeto.y, ancho, alto, 0x000000, alfa).setDepth(objeto.depth - 0.001)
  const seguir = () => { if (objeto.active) sombra.setPosition(objeto.x, objeto.y).setDepth(objeto.depth - 0.001) }
  escena.events.on('update', seguir)
  escena.events.once('shutdown', () => escena.events.off('update', seguir))
  // Si el objeto se destruye (una prenda que se entrega, una fruta que se come), la sombra se va con él:
  // antes quedaba en el suelo como una mancha negra y su «update» seguía corriendo (juego 1, 20 de noviembre).
  objeto.once?.('destroy', () => { escena.events.off('update', seguir); sombra.destroy() })
  return sombra
}

// El paso de un personaje: al caminar sube y baja un poco y se inclina de lado a lado; quieto, se endereza.
// Se llama cada cuadro con el reloj de la escena. Sirve para personajes secundarios dibujados como una sola imagen.
export function balanceo(objeto, moviendose, tiempo, { inclinacion = 5, rebote = 6 } = {}) {
  if (!vidaActiva()) return
  if (moviendose) {
    objeto.setAngle(Math.sin(tiempo / 90) * inclinacion)
    objeto.setData('rebote', Math.abs(Math.sin(tiempo / 90)) * rebote)
  } else {
    objeto.setAngle(objeto.angle * 0.8)
    objeto.setData('rebote', (objeto.getData('rebote') ?? 0) * 0.8)
  }
  return objeto.getData('rebote') ?? 0
}

// Ordena a un objeto que se mueve: su profundidad sigue a su altura, para pasar delante o detrás de lo demás.
export function ordenarPorY(objeto) {
  objeto.setDepth(profundidadPorY(objeto.y))
}
