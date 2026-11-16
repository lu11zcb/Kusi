// Viajar entre lugares manejando un vehículo del mundo (un barco flotante, un globo, una carreta, un trineo…),
// sin Phaser (para probarlo con node --test). Se maneja con el joystick de forma natural para un niño: la
// dirección en que empuja el dedo es hacia donde quiere ir; el vehículo gira hacia allá poco a poco, acelera
// según qué tanto empuja y frena solo al soltar. Si choca con algo, rebota despacio y sigue (nunca se rompe).
// Las posiciones son píxeles del mundo; el ángulo está en radianes (0 = hacia la derecha).

import { moverConColisiones } from './exploracion.js'

export const VEHICULO = Object.freeze({
  velocidadMaxima: 430, // px/s con el joystick al máximo
  aceleracion: 520, // px/s²
  frenado: 640, // px/s² al soltar el joystick
  giro: 3.6, // rad/s: lo que gira hacia donde se empuja
  rebote: 0.45, // proporción de la velocidad que conserva tras un choque
  radio: 56,
})

export function crearVehiculo({ x, y, angulo = 0 }) {
  return { x, y, angulo, velocidad: 0, choco: false }
}

// La diferencia más corta entre dos ángulos, entre -π y π.
export function diferenciaDeAngulo(desde, hasta) {
  let d = (hasta - desde) % (2 * Math.PI)
  if (d > Math.PI) d -= 2 * Math.PI
  if (d < -Math.PI) d += 2 * Math.PI
  return d
}

// Avanza un cuadro. «entrada» es el joystick { x, y } de -1 a 1; «contexto» trae los obstáculos, los límites
// y, si lo hay, el empuje de una corriente { x, y } en px/s. Devuelve el mismo vehículo, con «choco» si rebotó.
export function avanzarVehiculo(vehiculo, entrada, segundos, { obstaculos = [], limites = null, corriente = null, reglas = VEHICULO } = {}) {
  const dt = Math.min(Math.max(segundos, 0), 0.05)
  vehiculo.choco = false
  const fuerza = Math.min(1, Math.hypot(entrada.x ?? 0, entrada.y ?? 0))
  if (fuerza > 0.12) {
    const deseado = Math.atan2(entrada.y, entrada.x)
    const giro = Math.max(-reglas.giro * dt, Math.min(reglas.giro * dt, diferenciaDeAngulo(vehiculo.angulo, deseado)))
    vehiculo.angulo += giro
  }
  const meta = fuerza > 0.12 ? reglas.velocidadMaxima * fuerza : 0
  const paso = (meta > vehiculo.velocidad ? reglas.aceleracion : reglas.frenado) * dt
  vehiculo.velocidad = vehiculo.velocidad < meta ? Math.min(meta, vehiculo.velocidad + paso) : Math.max(meta, vehiculo.velocidad - paso)

  const direccion = { x: Math.cos(vehiculo.angulo), y: Math.sin(vehiculo.angulo) }
  const empuje = { x: direccion.x * vehiculo.velocidad + (corriente?.x ?? 0), y: direccion.y * vehiculo.velocidad + (corriente?.y ?? 0) }
  const velocidadTotal = Math.hypot(empuje.x, empuje.y)
  const quiere = { x: vehiculo.x + empuje.x * dt, y: vehiculo.y + empuje.y * dt }
  const unidad = velocidadTotal > 0 ? { x: empuje.x / velocidadTotal, y: empuje.y / velocidadTotal } : { x: 0, y: 0 }
  const nuevo = moverConColisiones(vehiculo, unidad, velocidadTotal, dt, { obstaculos, limites, radio: reglas.radio })
  vehiculo.choco = velocidadTotal > 1 && Math.hypot(nuevo.x - quiere.x, nuevo.y - quiere.y) > 0.5
  vehiculo.x = nuevo.x
  vehiculo.y = nuevo.y
  if (vehiculo.choco) vehiculo.velocidad *= reglas.rebote
  return vehiculo
}

// Detenerse en una zona para subir o bajar. Se confirma cuando el vehículo (o el niño) está dentro de la zona,
// casi quieto, durante «segundos»; si se mueve o sale, el avance se reinicia. Así pasar por encima sin querer
// nunca cuenta (catálogo de géneros, regla de las selecciones).
export function avanzarParada(estado, { dentro, velocidad }, segundos, { segundos: espera = 0.8, velocidadMaxima = 60 } = {}) {
  const dt = Math.min(Math.max(segundos, 0), 0.05)
  estado.confirmada = false
  if (dentro && velocidad <= velocidadMaxima) estado.tiempo = (estado.tiempo ?? 0) + dt
  else estado.tiempo = 0
  estado.progreso = Math.min(1, estado.tiempo / espera)
  if (estado.tiempo >= espera) { estado.confirmada = true; estado.tiempo = 0; estado.progreso = 0 }
  return estado
}

export function enZona(posicion, zona) {
  return posicion.x >= zona.x && posicion.x <= zona.x + zona.ancho && posicion.y >= zona.y && posicion.y <= zona.y + zona.alto
}
