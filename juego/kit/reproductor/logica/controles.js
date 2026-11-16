// Los controles de un juego del taller, sin Phaser (para probarlos con node --test): el niño mueve
// a su protagonista con un joystick en pantalla (o las flechas del teclado) y salta con un botón
// (o la barra espaciadora). La interfaz que los dibuja es ../interfaz/controles.js.

// El gesto del dedo sobre el joystick, de -1 a 1 en cada eje. Hasta «zonaMuerta» (una fracción del
// radio) no se mueve nada, así un dedo quieto no desplaza al personaje; más allá, la fuerza sube
// despacio hasta 1 en el borde de la base.
export function vectorDeJoystick(dx, dy, radio, zonaMuerta = 0.15) {
  if (![dx, dy, radio].every(Number.isFinite) || radio <= 0) return { x: 0, y: 0 }
  const distancia = Math.hypot(dx, dy)
  const proporcion = distancia / radio
  if (proporcion < zonaMuerta) return { x: 0, y: 0 }
  const fuerza = Math.min(1, (proporcion - zonaMuerta) / (1 - zonaMuerta))
  return { x: (dx / distancia) * fuerza, y: (dy / distancia) * fuerza }
}

// Une el joystick y el teclado: gana el que empuje más fuerte en cada eje.
export function combinarEntradas(a, b) {
  const mayor = (p, q) => (Math.abs(p) >= Math.abs(q) ? p : q)
  return { x: mayor(a.x, b.x), y: mayor(a.y, b.y) }
}

// Las flechas (o A, D, W y S) como un vector de -1, 0 o 1 en cada eje.
export function vectorDeTeclas({ izquierda = false, derecha = false, arriba = false, abajo = false } = {}) {
  return { x: (derecha ? 1 : 0) - (izquierda ? 1 : 0), y: (abajo ? 1 : 0) - (arriba ? 1 : 0) }
}

// Movimiento libre, visto desde arriba (explorar un lugar): el vector por la velocidad, dentro de los límites.
// Se mueve en diagonal sin ir más rápido que en línea recta.
export function moverLibre(posicion, vector, velocidad, segundos, limites = null) {
  const largo = Math.hypot(vector.x, vector.y)
  const escala = largo > 1 ? 1 / largo : 1
  let x = posicion.x + vector.x * escala * velocidad * segundos
  let y = posicion.y + vector.y * escala * velocidad * segundos
  if (limites) {
    x = Math.min(limites.derecha, Math.max(limites.izquierda, x))
    y = Math.min(limites.abajo, Math.max(limites.arriba, y))
  }
  return { x, y }
}

// La vista del personaje según hacia dónde se movió, con los nombres de las hojas del molde:
// «frente» (hacia abajo), «espaldas» (hacia arriba), «derecha» e «izquierda». Si no se movió, se
// queda en la vista de antes. Es lo que se le pasa a protagonista.animarMovimiento.
export function vistaDelMovimiento(dx, dy, anterior = 'frente') {
  if (Math.hypot(dx, dy) < 0.01) return anterior
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'derecha' : 'izquierda'
  return dy >= 0 ? 'frente' : 'espaldas'
}
