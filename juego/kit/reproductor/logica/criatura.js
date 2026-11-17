// La lógica de una criatura animada (un personaje o enemigo del juego que se mueve): qué cuadro de su tira se ve
// y hacia dónde mira. Es lógica pura, sin Phaser; la escena dibuja con dibujos/criaturaAnimada.js.
//
// La tira son 3 cuadros de 256 × 256 (kit/herramientas/preparar_criatura.mjs), de lado y mirando a la derecha. Se
// reproducen en el ciclo 0, 1, 2, 1 a 8 cuadros por segundo, como el cuy y el zorro; quieta, se queda en el cuadro 1.

export const CICLO_CRIATURA = Object.freeze([0, 1, 2, 1])
export const FPS_CRIATURA = 8
export const CUADRO_QUIETO = 1

// El cuadro de la tira que toca ahora. «tiempoMs» es un reloj que no para (el del juego).
export function cuadroDeLaCriatura(tiempoMs, moviendose, { fps = FPS_CRIATURA } = {}) {
  if (!moviendose) return CUADRO_QUIETO
  const paso = Math.floor(Math.max(0, tiempoMs) / (1000 / fps))
  return CICLO_CRIATURA[paso % CICLO_CRIATURA.length]
}

// Hacia dónde mira: 1 es la derecha (como se dibuja) y -1 la izquierda (se voltea). Con un movimiento muy chico
// conserva la mirada anterior: así no parpadea al detenerse.
export function miraDeLaCriatura(dx, anterior = 1) {
  if (dx > 0.5) return 1
  if (dx < -0.5) return -1
  return anterior
}
