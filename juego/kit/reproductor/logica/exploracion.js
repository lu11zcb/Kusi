// La exploración vista desde arriba, sin Phaser (para probarla con node --test): el protagonista
// recorre un lugar más grande que la pantalla con el joystick, choca con lo que no se puede atravesar
// (piedras, casas, árboles, muros) y resbala a lo largo de ellos en vez de quedarse pegado, y un
// adversario amable lo persigue sin castigarlo. Los dibujos y la cámara los pone la escena.
//
// Las posiciones son píxeles del mundo. Los obstáculos son rectángulos { x, y, ancho, alto } (la
// esquina de arriba a la izquierda); el protagonista y el adversario se miden como círculos.

// Mueve un círculo de «radio» por el mundo, un cuadro, sin atravesar los obstáculos ni salirse de los
// límites. Primero el eje x y después el eje y: así, al chocar de lado, sigue avanzando por el otro eje.
export function moverConColisiones(posicion, vector, velocidad, segundos, { limites = null, obstaculos = [], radio = 28 } = {}) {
  const dt = Math.min(Math.max(segundos, 0), 0.05)
  const largo = Math.hypot(vector.x, vector.y)
  const escala = largo > 1 ? 1 / largo : 1
  let x = posicion.x
  let y = posicion.y
  const choca = (px, py) => obstaculos.some((o) => px > o.x - radio && px < o.x + o.ancho + radio && py > o.y - radio && py < o.y + o.alto + radio)
  const nuevoX = x + vector.x * escala * velocidad * dt
  if (!choca(nuevoX, y)) x = nuevoX
  const nuevoY = y + vector.y * escala * velocidad * dt
  if (!choca(x, nuevoY)) y = nuevoY
  if (limites) {
    x = Math.min(limites.derecha - radio, Math.max(limites.izquierda + radio, x))
    y = Math.min(limites.abajo - radio, Math.max(limites.arriba + radio, y))
  }
  return { x, y }
}

// El adversario amable. Nunca castiga ni acaba el juego: si alcanza al protagonista, este vuelve al inicio
// con todo lo que había reunido. Es lento (el 60 % de la velocidad del protagonista, como máximo), avisa antes
// de perseguir y se cansa:
//   patrulla  recorre sus puntos, despacio
//   aviso     se detiene y se alerta 0,6 s al ver al protagonista cerca (para que el niño reaccione)
//   persigue  va tras el protagonista hasta 5 s
//   descansa  se queda quieto y cansado 2 s, y no atrapa a nadie
export const ADVERSARIO = Object.freeze({
  proporcionVelocidad: 0.6, // de la velocidad del protagonista, como máximo
  proporcionPatrulla: 0.35,
  radioVision: 360,
  radioCaptura: 46,
  avisoSegundos: 0.6,
  persigueSegundos: 5,
  descansaSegundos: 2,
})

export function crearAdversario({ x, y, patrulla = [] }) {
  const ruta = patrulla.length ? patrulla : [{ x, y }]
  return { x, y, estado: 'patrulla', reloj: 0, ruta, destino: 0, mira: 1, capturo: false, alerto: false, canso: false }
}

// Avanza un cuadro. «objetivo» es el protagonista { x, y }; «contexto» trae la velocidad del protagonista,
// los obstáculos y los límites. Devuelve el mismo adversario con las banderas de este cuadro:
// capturo (alcanzó al protagonista), alerto (empezó el aviso) y canso (empezó a descansar).
export function avanzarAdversario(adversario, objetivo, segundos, { velocidadProtagonista = 380, obstaculos = [], limites = null, radio = 30, reglas = ADVERSARIO } = {}) {
  const dt = Math.min(Math.max(segundos, 0), 0.05)
  adversario.capturo = false
  adversario.alerto = false
  adversario.canso = false
  adversario.reloj += dt
  const distancia = Math.hypot(objetivo.x - adversario.x, objetivo.y - adversario.y)

  const ir = (meta, proporcion) => {
    const dx = meta.x - adversario.x
    const dy = meta.y - adversario.y
    const largo = Math.hypot(dx, dy) || 1
    if (Math.abs(dx) > 1) adversario.mira = dx >= 0 ? 1 : -1
    const nuevo = moverConColisiones(adversario, { x: dx / largo, y: dy / largo }, velocidadProtagonista * proporcion, dt, { obstaculos, limites, radio })
    adversario.x = nuevo.x
    adversario.y = nuevo.y
  }

  if (adversario.estado === 'patrulla') {
    const punto = adversario.ruta[adversario.destino]
    if (Math.hypot(punto.x - adversario.x, punto.y - adversario.y) < 12) adversario.destino = (adversario.destino + 1) % adversario.ruta.length
    else ir(punto, reglas.proporcionPatrulla)
    if (distancia < reglas.radioVision) { adversario.estado = 'aviso'; adversario.reloj = 0; adversario.alerto = true }
  } else if (adversario.estado === 'aviso') {
    if (adversario.reloj >= reglas.avisoSegundos) { adversario.estado = 'persigue'; adversario.reloj = 0 }
  } else if (adversario.estado === 'persigue') {
    ir(objetivo, reglas.proporcionVelocidad)
    if (distancia < reglas.radioCaptura) { adversario.capturo = true; adversario.estado = 'descansa'; adversario.reloj = 0; adversario.canso = true }
    else if (adversario.reloj >= reglas.persigueSegundos) { adversario.estado = 'descansa'; adversario.reloj = 0; adversario.canso = true }
  } else if (adversario.estado === 'descansa') {
    if (adversario.reloj >= reglas.descansaSegundos) { adversario.estado = 'patrulla'; adversario.reloj = 0 }
  }
  return adversario
}
