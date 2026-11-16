// El decorado de un mundo, sin Phaser (para probarlo con node --test): dónde van los árboles, las piedras, las
// matas y los detalles para que un lugar se vea lleno y natural, y no vacío ni con las cosas en fila. Es
// determinista: con la misma semilla sale siempre el mismo reparto (así un juego se ve igual cada vez que se abre).

// Un generador de números entre 0 y 1 que repite su secuencia con la misma semilla (mulberry32).
export function generador(semilla = 1) {
  let estado = (Number(semilla) >>> 0) || 1
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Cuántos adornos necesita un lugar para no verse vacío: «porPantalla» adornos por cada pantalla de 1280 × 720
// que cubre. Un lugar de 3 × 2 pantallas con 14 por pantalla pide 84.
export const PANTALLA = Object.freeze({ ancho: 1280, alto: 720 })
export function cantidadParaDensidad(area, porPantalla = 14) {
  return Math.max(1, Math.ceil((area.ancho * area.alto) / (PANTALLA.ancho * PANTALLA.alto) * porPantalla))
}

// Reparte «cantidad» puntos dentro de «area» sin que se amontonen (a «separacion» px unos de otros como mínimo),
// lejos de las zonas «evitar» (rectángulos { x, y, ancho, alto }: caminos, puertas, lo que se toca) y dentro del
// margen. Devuelve { x, y, variante, escala } para cada uno, con una variante (0, 1, 2…) y una escala
// distintas, para que no se repita el mismo dibujo igual cada vez. Si no caben todos, devuelve los que caben.
export function repartirDecorado({ area, cantidad, separacion = 110, margen = 40, evitar = [], variantes = 3, semilla = 1, intentos = 40 }) {
  const azar = generador(semilla)
  const puntos = []
  const prohibido = (x, y) => evitar.some((r) => x > r.x - margen && x < r.x + r.ancho + margen && y > r.y - margen && y < r.y + r.alto + margen)
  for (let i = 0; i < cantidad; i++) {
    for (let intento = 0; intento < intentos; intento++) {
      const x = area.x + margen + azar() * Math.max(0, area.ancho - 2 * margen)
      const y = area.y + margen + azar() * Math.max(0, area.alto - 2 * margen)
      if (prohibido(x, y)) continue
      if (puntos.some((p) => Math.hypot(p.x - x, p.y - y) < separacion)) continue
      puntos.push({ x: Math.round(x), y: Math.round(y), variante: Math.floor(azar() * variantes), escala: Number((0.85 + azar() * 0.35).toFixed(2)) })
      break
    }
  }
  return puntos
}

// La profundidad de un objeto según su altura en el mundo: lo que está más abajo se dibuja delante de lo que está
// más arriba. Así el protagonista pasa DETRÁS de un árbol cuando está arriba de él y DELANTE cuando está abajo.
export function profundidadPorY(y, base = 10) {
  return base + y / 10000
}

// Una partícula de ambiente (una hoja, una luciérnaga, polvo, una nube) que flota con su velocidad y, al salirse del
// área por un lado, reaparece por el opuesto. Devuelve la posición nueva.
export function avanzarParticula(particula, segundos, area) {
  let x = particula.x + particula.vx * segundos
  let y = particula.y + particula.vy * segundos
  const ancho = area.ancho
  const alto = area.alto
  if (x < area.x - 40) x += ancho + 80
  if (x > area.x + ancho + 40) x -= ancho + 80
  if (y < area.y - 40) y += alto + 80
  if (y > area.y + alto + 40) y -= alto + 80
  return { x, y }
}
